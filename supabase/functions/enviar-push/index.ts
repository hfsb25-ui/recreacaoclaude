// Envia notificação push para os hóspedes (chamada pela aba "Notificações" do admin).
// Segredos necessários no Supabase (Edge Functions → Secrets):
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY e VAPID_SUBJECT (ex.: mailto:email@dominio.com)
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import webpush from "npm:web-push@3.6.7";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const resposta = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const PUBLICOS = ["hospedados", "criancas", "apto"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const publica = Deno.env.get("VAPID_PUBLIC_KEY");
    const privada = Deno.env.get("VAPID_PRIVATE_KEY");
    const assunto = Deno.env.get("VAPID_SUBJECT") || "mailto:contato@programacaohfsb.com.br";
    if (!publica || !privada) {
      return resposta({ error: "Faltam as chaves VAPID nos segredos do Supabase." }, 500);
    }
    webpush.setVapidDetails(assunto, publica, privada);

    const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Só gestor pode enviar
    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    const { data: u } = await admin.auth.getUser(token);
    if (!u?.user) return resposta({ error: "Não autorizado" }, 401);
    const { data: papel } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", u.user.id)
      .eq("role", "gestor")
      .maybeSingle();
    if (!papel) return resposta({ error: "Apenas gestores podem enviar notificações" }, 403);

    const corpo = await req.json();
    const titulo = String(corpo.titulo ?? "").trim().slice(0, 60);
    const mensagem = String(corpo.mensagem ?? "").trim().slice(0, 180);
    const publico = String(corpo.publico ?? "");
    const apto = corpo.apto ? String(corpo.apto).trim().slice(0, 10) : null;
    const link = typeof corpo.link === "string" && corpo.link.startsWith("/") ? corpo.link.slice(0, 100) : "/";
    if (!titulo || !mensagem) return resposta({ error: "Escreva o título e a mensagem." }, 400);
    if (!PUBLICOS.includes(publico)) return resposta({ error: "Escolha para quem enviar." }, 400);
    if (publico === "apto" && !apto) return resposta({ error: "Informe o apartamento." }, 400);

    const { data: alvos, error } = await admin.rpc("push_alvos", { p_publico: publico, p_apto: apto });
    if (error) throw error;
    const lista = (alvos ?? []) as { id: string; endpoint: string; p256dh: string; auth: string }[];

    const carga = JSON.stringify({ title: titulo, body: mensagem, url: link, tag: `hfsb-${Date.now()}` });
    let enviados = 0;
    const vencidas: string[] = [];

    // Envia em lotes pequenos para não estourar o tempo da função
    for (let i = 0; i < lista.length; i += 50) {
      const lote = lista.slice(i, i + 50);
      const res = await Promise.allSettled(
        lote.map((s) =>
          webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, carga, {
            TTL: 6 * 60 * 60,
            urgency: "high",
          }),
        ),
      );
      res.forEach((r, j) => {
        if (r.status === "fulfilled") enviados++;
        else {
          const code = (r.reason as { statusCode?: number })?.statusCode;
          // 404/410: o aparelho desativou ou desinstalou; apaga a inscrição
          if (code === 404 || code === 410) vencidas.push(lote[j].id);
          else console.error("Falha no envio", code, (r.reason as Error)?.message);
        }
      });
    }

    if (vencidas.length) await admin.from("push_subscriptions").delete().in("id", vencidas);

    await admin.from("push_envios").insert({
      titulo,
      mensagem,
      publico,
      apto,
      link,
      total: lista.length,
      enviados,
      falhas: lista.length - enviados,
      enviado_por: u.user.id,
    });

    return resposta({ total: lista.length, enviados, falhas: lista.length - enviados });
  } catch (e) {
    console.error(e);
    return resposta({ error: (e as Error).message || "Erro ao enviar" }, 500);
  }
});
