// Atendimento pelo WhatsApp do app (Evolution API).
//
// Dois usos:
// 1) A Evolution chama esta função quando chega mensagem no número do app
//    (endereço com ?token=...). A função identifica o hóspede e encaminha
//    a mensagem para os números de atendimento cadastrados no admin.
// 2) O admin chama esta função (com login) para:
//    - enviar mensagem para um apartamento     { acao: "enviar", reservation_code, uh, texto }
//    - ver se o encaminhamento está ligado      { acao: "status" }
//    - ligar o encaminhamento na Evolution      { acao: "ativar" }
//    - mandar um teste aos números de atendimento { acao: "testar" }
//
// IMPORTANTE: no Supabase, deixe "Verify JWT" DESLIGADO nesta função
// (a Evolution não manda login; a segurança é o token do endereço e o login checado aqui dentro).
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const resposta = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const admin = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", {
  auth: { autoRefreshToken: false, persistSession: false },
});

interface Config {
  id: string;
  instance_url: string;
  api_key: string;
  instance_name: string;
  webhook_token: string;
  encaminhar_respostas: boolean;
  encaminhar_desconhecidos?: boolean;
}

const carregarConfig = async (): Promise<Config | null> => {
  const { data } = await admin
    .from("whatsapp_config")
    .select("*")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();
  return (data as Config) ?? null;
};

const base = (c: Config) => String(c.instance_url).replace(/\/+$/, "");
const so = (t: string) => String(t ?? "").replace(/\D/g, "");
const comPais = (t: string) => {
  const n = so(t);
  return n.length === 10 || n.length === 11 ? `55${n}` : n;
};
const chave = (t: string) => {
  let n = so(t);
  if (n.startsWith("55") && n.length >= 12) n = n.slice(2);
  return n.length >= 10 ? n.slice(0, 2) + n.slice(-8) : n;
};
const telBonito = (t: string) => {
  const n = so(t).replace(/^55/, "");
  if (n.length === 11) return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`;
  if (n.length === 10) return `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`;
  return t;
};
const dataBr = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" }) : "";

const enviarTexto = async (c: Config, numero: string, texto: string) => {
  const r = await fetch(`${base(c)}/message/sendText/${c.instance_name}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: c.api_key },
    body: JSON.stringify({ number: comPais(numero), text: texto }),
  });
  if (!r.ok) throw new Error(`Evolution respondeu ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return r.json().catch(() => ({}));
};

const numerosAtendimento = async () => {
  const { data } = await admin.from("atendimento_numeros").select("nome, telefone").eq("ativo", true);
  return (data ?? []) as { nome: string; telefone: string }[];
};

// ---------- 1) Mensagem chegando da Evolution ----------

const textoDaMensagem = (m: Record<string, any> | undefined): string => {
  if (!m) return "";
  if (m.conversation) return m.conversation;
  if (m.extendedTextMessage?.text) return m.extendedTextMessage.text;
  if (m.imageMessage) return `📷 [enviou uma foto]${m.imageMessage.caption ? ` ${m.imageMessage.caption}` : ""}`;
  if (m.videoMessage) return `🎥 [enviou um vídeo]${m.videoMessage.caption ? ` ${m.videoMessage.caption}` : ""}`;
  if (m.audioMessage) return "🎤 [enviou um áudio]";
  if (m.documentMessage) return `📄 [enviou um arquivo] ${m.documentMessage.fileName ?? ""}`.trim();
  if (m.stickerMessage) return "[enviou uma figurinha]";
  if (m.locationMessage) return "📍 [enviou uma localização]";
  if (m.contactMessage) return `👤 [enviou um contato] ${m.contactMessage.displayName ?? ""}`.trim();
  if (m.buttonsResponseMessage?.selectedDisplayText) return m.buttonsResponseMessage.selectedDisplayText;
  if (m.listResponseMessage?.title) return m.listResponseMessage.title;
  if (m.ephemeralMessage?.message) return textoDaMensagem(m.ephemeralMessage.message);
  return "";
};

const receber = async (c: Config, corpo: any) => {
  const evento = String(corpo?.event ?? "").toLowerCase().replace(/_/g, ".");
  if (evento && evento !== "messages.upsert") return { ignorado: "evento" };
  if (!c.encaminhar_respostas) return { ignorado: "desligado" };

  const itens = Array.isArray(corpo?.data) ? corpo.data : corpo?.data?.messages ?? [corpo?.data];
  const resultados: unknown[] = [];

  for (const d of itens) {
    const key = d?.key ?? {};
    if (!key || key.fromMe) continue;
    let jid: string = key.remoteJid ?? "";
    if (jid.endsWith("@g.us") || jid.includes("broadcast") || jid.includes("newsletter")) continue;
    // Contas novas do WhatsApp podem vir com @lid; o telefone vem em outro campo
    if (jid.endsWith("@lid")) jid = key.senderPn ?? key.remoteJidAlt ?? key.participantPn ?? d?.senderPn ?? "";
    const telefone = so(jid.split("@")[0]);
    if (telefone.length < 10) continue;

    const texto = textoDaMensagem(d?.message);
    if (!texto) continue; // reações, confirmações de leitura etc.

    // Não encaminha o que os próprios números de atendimento mandam
    const destinos = await numerosAtendimento();
    if (destinos.some((n) => chave(n.telefone) === chave(telefone))) continue;

    const waId = key.id ? String(key.id) : null;
    const { data: quem } = await admin.rpc("whatsapp_identificar", { p_tel: telefone });
    const q = quem as Record<string, any> | null;

    // Registra (o id da mensagem evita encaminhar duas vezes se a Evolution repetir o aviso)
    const { data: registro, error: erroRegistro } = await admin
      .from("whatsapp_mensagens")
      .insert({
        direcao: "entrada",
        telefone,
        uh: q?.uh ?? null,
        reservation_code: q?.reservation_code ?? null,
        guest_name: q?.pessoa || q?.guest_name || d?.pushName || null,
        texto,
        wa_id: waId,
      })
      .select("id")
      .single();
    if (erroRegistro) {
      if (erroRegistro.code === "23505") continue; // já recebida
      console.error(erroRegistro);
    }

    if (destinos.length === 0) {
      resultados.push({ telefone, encaminhada: false, motivo: "sem números de atendimento" });
      continue;
    }
    // Quem não é hóspede nem ex-hóspede: só registra, se o encaminhamento desses estiver desligado
    if (!q && c.encaminhar_desconhecidos === false) {
      resultados.push({ telefone, encaminhada: false, motivo: "contato não identificado" });
      continue;
    }

    let cabecalho: string;
    if (q?.situacao === "hospedado") {
      const pessoas = [q.adults ? `${q.adults} adulto${q.adults > 1 ? "s" : ""}` : "", q.children ? `${q.children} criança${q.children > 1 ? "s" : ""}` : ""]
        .filter(Boolean)
        .join(", ");
      const nome = q.pessoa && q.pessoa.toLowerCase() !== String(q.guest_name).toLowerCase() ? `${q.pessoa} (titular: ${q.guest_name})` : q.guest_name;
      cabecalho = `📩 *Mensagem de hóspede*\n*Apto ${q.uh} – ${nome}*\n${[
        q.reservation_code ? `Reserva ${q.reservation_code}` : "",
        q.departure_date ? `sai ${dataBr(q.departure_date)}` : "",
        pessoas,
      ]
        .filter(Boolean)
        .join(" · ")}`;
    } else if (q?.situacao === "ex_hospede") {
      cabecalho = `📩 *Mensagem de ex-hóspede*\n*${q.guest_name ?? "Hóspede"}* – esteve no apto ${q.uh ?? "?"}${
        q.departure_date ? ` (saiu ${dataBr(q.departure_date)})` : ""
      }`;
    } else {
      cabecalho = `📩 *Mensagem de contato não identificado*${d?.pushName ? `\nNome no WhatsApp: ${d.pushName}` : ""}`;
    }
    const msg = `${cabecalho}\nTel: ${telBonito(telefone)}\n\n“${texto}”\n\nResponder: https://wa.me/${comPais(telefone)}`;

    let ok = 0;
    for (const n of destinos) {
      try {
        await enviarTexto(c, n.telefone, msg);
        ok++;
      } catch (e) {
        console.error("Falha ao encaminhar para", n.nome, (e as Error).message);
      }
    }
    if (registro?.id && ok > 0) await admin.from("whatsapp_mensagens").update({ encaminhada: true }).eq("id", registro.id);
    resultados.push({ telefone, encaminhada: ok > 0 });
  }
  return { resultados };
};

// ---------- 2) Pedidos do admin ----------

const usuarioEquipe = async (req: Request) => {
  const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
  if (!token) return null;
  const { data } = await admin.auth.getUser(token);
  if (!data?.user) return null;
  const { data: papeis } = await admin.from("user_roles").select("role").eq("user_id", data.user.id);
  const roles = (papeis ?? []).map((p: { role: string }) => p.role);
  if (!roles.length) return null;
  return { id: data.user.id, gestor: roles.includes("gestor") };
};

const urlWebhook = (c: Config) => `${SUPABASE_URL}/functions/v1/whatsapp-atendimento?token=${c.webhook_token}`;

const statusWebhook = async (c: Config) => {
  try {
    const r = await fetch(`${base(c)}/webhook/find/${c.instance_name}`, { headers: { apikey: c.api_key } });
    if (!r.ok) return { conectado: null as boolean | null, detalhe: `Evolution respondeu ${r.status}` };
    const w = await r.json();
    const url: string = w?.url ?? w?.webhook?.url ?? "";
    const ligado: boolean = Boolean(w?.enabled ?? w?.webhook?.enabled ?? url);
    const eventos: string[] = w?.events ?? w?.webhook?.events ?? [];
    const nosso = url.includes("/functions/v1/whatsapp-atendimento") && url.includes(c.webhook_token);
    const recebeMensagens = !eventos.length || eventos.some((e) => /MESSAGES_UPSERT|messages\.upsert/i.test(e));
    return { conectado: ligado && nosso && recebeMensagens, url_atual: url || null };
  } catch (e) {
    return { conectado: null, detalhe: (e as Error).message };
  }
};

const ativarWebhook = async (c: Config) => {
  const url = urlWebhook(c);
  const tentativas = [
    { webhook: { enabled: true, url, byEvents: false, base64: false, events: ["MESSAGES_UPSERT"] } },
    { enabled: true, url, webhookByEvents: false, webhookBase64: false, events: ["MESSAGES_UPSERT"] },
    { url, webhook_by_events: false, webhook_base64: false, events: ["MESSAGES_UPSERT"], enabled: true },
  ];
  let ultimoErro = "";
  for (const corpo of tentativas) {
    const r = await fetch(`${base(c)}/webhook/set/${c.instance_name}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: c.api_key },
      body: JSON.stringify(corpo),
    });
    if (r.ok) return true;
    ultimoErro = `${r.status}: ${(await r.text()).slice(0, 200)}`;
  }
  throw new Error(`Não foi possível ligar na Evolution (${ultimoErro}). Configure manualmente com o endereço mostrado.`);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const c = await carregarConfig();
    const url = new URL(req.url);
    const tokenUrl = url.searchParams.get("token");

    // Chamada da Evolution
    if (tokenUrl !== null) {
      if (!c || tokenUrl !== c.webhook_token) return resposta({ error: "token inválido" }, 401);
      const corpo = await req.json().catch(() => ({}));
      return resposta(await receber(c, corpo));
    }

    // Chamada do admin
    const u = await usuarioEquipe(req);
    if (!u) return resposta({ error: "Não autorizado" }, 401);
    if (!c) return resposta({ error: "Configure o WhatsApp (Evolution) em Configurações → WhatsApp." }, 400);
    const corpo = await req.json().catch(() => ({}));
    const acao = String(corpo.acao ?? "");

    if (acao === "enviar") {
      const texto = String(corpo.texto ?? "").trim().slice(0, 1500);
      if (!texto) return resposta({ error: "Escreva a mensagem." }, 400);
      const { data: quarto } = await admin.rpc("whatsapp_telefone_quarto", {
        p_reserva: String(corpo.reservation_code ?? ""),
        p_uh: String(corpo.uh ?? ""),
      });
      const qt = quarto as Record<string, string> | null;
      if (!qt) return resposta({ error: "Apartamento não encontrado entre os hospedados." }, 404);
      if (!qt.telefone) return resposta({ error: `O apto ${qt.uh} não tem telefone cadastrado no TOTVS.` }, 400);
      const r = await enviarTexto(c, qt.telefone, texto);
      await admin.from("whatsapp_mensagens").insert({
        direcao: "saida",
        telefone: qt.telefone,
        uh: qt.uh,
        reservation_code: qt.reservation_code,
        guest_name: qt.guest_name,
        texto,
        wa_id: (r as any)?.key?.id ?? null,
        enviado_por: u.id,
      });
      return resposta({ ok: true, uh: qt.uh, guest_name: qt.guest_name });
    }

    if (!u.gestor) return resposta({ error: "Apenas gestores." }, 403);

    if (acao === "status") {
      return resposta({ url: urlWebhook(c), ...(await statusWebhook(c)) });
    }
    if (acao === "ativar") {
      await ativarWebhook(c);
      return resposta({ ok: true, url: urlWebhook(c), ...(await statusWebhook(c)) });
    }
    if (acao === "testar") {
      const destinos = await numerosAtendimento();
      if (!destinos.length) return resposta({ error: "Cadastre pelo menos um número de atendimento." }, 400);
      let ok = 0;
      for (const n of destinos) {
        try {
          await enviarTexto(c, n.telefone, `✅ Teste do atendimento do app Meu Santa Bárbara.\nAs respostas dos hóspedes vão chegar aqui, ${n.nome}.`);
          ok++;
        } catch (e) {
          console.error(e);
        }
      }
      return resposta({ ok: ok > 0, enviados: ok, total: destinos.length });
    }
    return resposta({ error: "Ação desconhecida" }, 400);
  } catch (e) {
    console.error(e);
    return resposta({ error: (e as Error).message || "Erro" }, 500);
  }
});
