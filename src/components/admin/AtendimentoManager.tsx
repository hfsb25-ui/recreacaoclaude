import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ArrowDownLeft, ArrowUpRight, Headset, Plus, RefreshCw, Send, Trash2, Zap } from "lucide-react";
import { toast } from "sonner";
import { erroDaFuncao } from "@/components/admin/MensagemQuartoDialog";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

interface Numero {
  id: string;
  nome: string;
  telefone: string;
  ativo: boolean;
}

interface Mensagem {
  id: string;
  direcao: "saida" | "entrada";
  telefone: string;
  uh: string | null;
  guest_name: string | null;
  texto: string;
  encaminhada: boolean;
  created_at: string;
}

interface Status {
  url?: string;
  conectado?: boolean | null;
  url_atual?: string | null;
  detalhe?: string;
}

const soDigitos = (t: string) => t.replace(/\D/g, "");
const telBonito = (t: string) => {
  const n = soDigitos(t).replace(/^55(?=\d{10,11}$)/, "");
  if (n.length === 11) return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`;
  if (n.length === 10) return `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`;
  return t;
};
const quando = (s: string) => new Date(s).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

const AtendimentoManager = () => {
  const [numeros, setNumeros] = useState<Numero[]>([]);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [encaminhar, setEncaminhar] = useState(true);
  const [desconhecidos, setDesconhecidos] = useState(true);
  const [configId, setConfigId] = useState<string | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [verificando, setVerificando] = useState(false);
  const [nome, setNome] = useState("");
  const [tel, setTel] = useState("");
  const [ocupado, setOcupado] = useState(false);

  const chamar = async (acao: string) => {
    const { data, error } = await supabase.functions.invoke("whatsapp-atendimento", { body: { acao } });
    if (error || data?.error) throw new Error(await erroDaFuncao(error, data));
    return data;
  };

  const carregar = useCallback(async () => {
    const [{ data: n }, { data: m }, { data: c }] = await Promise.all([
      db.from("atendimento_numeros").select("*").order("created_at"),
      db.from("whatsapp_mensagens").select("*").order("created_at", { ascending: false }).limit(40),
      db.from("whatsapp_config").select("id, encaminhar_respostas, encaminhar_desconhecidos").eq("is_active", true).limit(1).maybeSingle(),
    ]);
    setNumeros((n ?? []) as Numero[]);
    setMensagens((m ?? []) as Mensagem[]);
    if (c) {
      setConfigId(c.id);
      setEncaminhar(c.encaminhar_respostas !== false);
      setDesconhecidos(c.encaminhar_desconhecidos !== false);
    }
  }, []);

  const verificar = useCallback(async () => {
    setVerificando(true);
    try {
      setStatus(await chamar("status"));
    } catch (e) {
      setStatus({ conectado: null, detalhe: (e as Error).message });
    } finally {
      setVerificando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
    verificar();
  }, [carregar, verificar]);

  const adicionar = async () => {
    const d = soDigitos(tel);
    if (!nome.trim() || d.length < 10) {
      toast.error("Informe o nome e o WhatsApp com DDD.");
      return;
    }
    const { error } = await db.from("atendimento_numeros").insert({ nome: nome.trim(), telefone: d.length <= 11 ? `55${d}` : d });
    if (error) toast.error("Não foi possível salvar.");
    else {
      setNome("");
      setTel("");
      carregar();
    }
  };

  const alternar = async (n: Numero, ativo: boolean) => {
    await db.from("atendimento_numeros").update({ ativo }).eq("id", n.id);
    carregar();
  };

  const remover = async (n: Numero) => {
    await db.from("atendimento_numeros").delete().eq("id", n.id);
    carregar();
  };

  const mudarEncaminhar = async (v: boolean) => {
    setEncaminhar(v);
    if (configId) await db.from("whatsapp_config").update({ encaminhar_respostas: v }).eq("id", configId);
  };

  const mudarDesconhecidos = async (v: boolean) => {
    setDesconhecidos(v);
    if (configId) await db.from("whatsapp_config").update({ encaminhar_desconhecidos: v }).eq("id", configId);
  };

  const ativar = async () => {
    setOcupado(true);
    try {
      setStatus(await chamar("ativar"));
      toast.success("Encaminhamento ligado na Evolution.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setOcupado(false);
    }
  };

  const testar = async () => {
    setOcupado(true);
    try {
      const r = await chamar("testar");
      toast.success(`Teste enviado para ${r.enviados} de ${r.total} número(s).`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setOcupado(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 sm:p-6 space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Headset className="h-5 w-5 text-primary" /> Atendimento pelo WhatsApp
            </h2>
            <p className="text-sm text-muted-foreground">
              Quando alguém responde o WhatsApp do app, a mensagem é encaminhada para os números abaixo, já dizendo o
              apartamento e o nome do hóspede.
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => { carregar(); verificar(); }} aria-label="Atualizar">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Situação da ligação com a Evolution */}
        <div className="rounded-xl border p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="font-medium">Receber respostas</span>
              {verificando ? (
                <Badge variant="outline">Verificando…</Badge>
              ) : status?.conectado ? (
                <Badge className="bg-green-600 hover:bg-green-600">Ligado</Badge>
              ) : status?.conectado === false ? (
                <Badge variant="destructive">Desligado</Badge>
              ) : (
                <Badge variant="outline">Não verificado</Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="enc" className="text-sm">Encaminhar</Label>
              <Switch id="enc" checked={encaminhar} onCheckedChange={mudarEncaminhar} />
            </div>
          </div>
          <div className="flex items-start justify-between gap-3 border-t pt-3">
            <div>
              <Label htmlFor="desc" className="text-sm font-medium">Encaminhar também contatos não identificados</Label>
              <p className="text-xs text-muted-foreground">
                {desconhecidos
                  ? "Ligado: quem não é hóspede nem ex-hóspede também é encaminhado."
                  : "Desligado: só hóspedes e ex-hóspedes são encaminhados. As outras mensagens ficam só no histórico abaixo."}
              </p>
            </div>
            <Switch id="desc" checked={desconhecidos} onCheckedChange={mudarDesconhecidos} disabled={!encaminhar} />
          </div>
          {status?.conectado ? null : (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Clique para o sistema avisar a Evolution que deve mandar as mensagens recebidas para cá.
              </p>
              <Button onClick={ativar} disabled={ocupado}>
                <Zap className="mr-2 h-4 w-4" /> Ligar encaminhamento
              </Button>
              {status?.detalhe && <p className="text-xs text-destructive">{status.detalhe}</p>}
              {status?.url && (
                <details className="text-xs text-muted-foreground">
                  <summary className="cursor-pointer">Configurar manualmente na Evolution</summary>
                  <p className="mt-2">
                    Na instância do WhatsApp do app, abra <b>Webhook</b>, ative, cole o endereço abaixo e marque o evento{" "}
                    <b>MESSAGES_UPSERT</b>:
                  </p>
                  <code className="mt-1 block break-all rounded bg-muted p-2">{status.url}</code>
                </details>
              )}
            </div>
          )}
        </div>

        {/* Números de atendimento */}
        <div className="space-y-3">
          <h3 className="font-semibold">Números que recebem as respostas</h3>
          {numeros.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum número cadastrado ainda.</p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {numeros.map((n) => (
                <li key={n.id} className="flex items-center gap-3 px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{n.nome}</div>
                    <div className="text-sm text-muted-foreground">{telBonito(n.telefone)}</div>
                  </div>
                  <Switch checked={n.ativo} onCheckedChange={(v) => alternar(n, v)} aria-label="Ativo" />
                  <Button variant="ghost" size="icon" onClick={() => remover(n)} aria-label="Remover">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <Input placeholder="Nome (ex.: Recepção)" value={nome} onChange={(e) => setNome(e.target.value)} />
            <Input
              placeholder="WhatsApp com DDD"
              inputMode="tel"
              value={tel}
              onChange={(e) => setTel(e.target.value)}
            />
            <Button onClick={adicionar}>
              <Plus className="mr-1.5 h-4 w-4" /> Adicionar
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={testar} disabled={ocupado || numeros.length === 0}>
            <Send className="mr-2 h-4 w-4" /> Mandar teste para esses números
          </Button>
        </div>
      </Card>

      <Card className="p-4 sm:p-6">
        <h3 className="mb-3 font-semibold">Últimas mensagens</h3>
        {mensagens.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma mensagem ainda.</p>
        ) : (
          <ul className="divide-y">
            {mensagens.map((m) => (
              <li key={m.id} className="flex gap-3 py-2.5">
                <span
                  className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                    m.direcao === "entrada" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"
                  }`}
                  title={m.direcao === "entrada" ? "Recebida" : "Enviada"}
                >
                  {m.direcao === "entrada" ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 text-sm">
                    <span className="font-medium">
                      {m.uh ? `Apto ${m.uh}` : telBonito(m.telefone)}
                      {m.guest_name ? ` · ${m.guest_name}` : ""}
                    </span>
                    <span className="text-xs text-muted-foreground">{quando(m.created_at)}</span>
                    {m.direcao === "entrada" && !m.encaminhada && (
                      <Badge variant="outline" className="text-xs">não encaminhada</Badge>
                    )}
                  </div>
                  <p className="whitespace-pre-line break-words text-sm text-muted-foreground">{m.texto}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
};

export default AtendimentoManager;
