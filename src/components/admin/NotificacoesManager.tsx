import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { BellRing, RefreshCw, Send, Smartphone } from "lucide-react";
import { toast } from "sonner";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

type Publico = "hospedados" | "criancas" | "apto";

const PUBLICOS: { id: Publico; label: string }[] = [
  { id: "hospedados", label: "Todos os hospedados agora" },
  { id: "criancas", label: "Só famílias com crianças" },
  { id: "apto", label: "Um apartamento" },
];

const DESTINOS = [
  { link: "/", label: "Tela inicial" },
  { link: "/programacao", label: "Programação" },
  { link: "/recreacao", label: "Recreação" },
  { link: "/avisos", label: "Avisos" },
  { link: "/estadia", label: "Minha estadia" },
  { link: "/regiao", label: "Passeios na região" },
  { link: "/ranking", label: "Ranking" },
];

const MAX_TITULO = 60;
const MAX_MSG = 180;

interface Envio {
  id: string;
  titulo: string;
  mensagem: string;
  publico: string;
  apto: string | null;
  total: number;
  enviados: number;
  created_at: string;
}

const nomePublico = (e: Pick<Envio, "publico" | "apto">) =>
  e.publico === "apto" ? `Apto ${e.apto}` : PUBLICOS.find((p) => p.id === e.publico)?.label ?? e.publico;

const NotificacoesManager = () => {
  const [titulo, setTitulo] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [publico, setPublico] = useState<Publico>("hospedados");
  const [apto, setApto] = useState("");
  const [link, setLink] = useState("/programacao");
  const [contagem, setContagem] = useState<{ hospedados: number; criancas: number; apto: number } | null>(null);
  const [historico, setHistorico] = useState<Envio[]>([]);
  const [confirmar, setConfirmar] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const carregar = useCallback(async () => {
    const [{ data: c }, { data: h }] = await Promise.all([
      db.rpc("push_contagem", { p_apto: publico === "apto" ? apto : null }),
      db.from("push_envios").select("*").order("created_at", { ascending: false }).limit(15),
    ]);
    if (c) setContagem(c);
    setHistorico((h ?? []) as Envio[]);
  }, [publico, apto]);

  useEffect(() => {
    const t = setTimeout(carregar, publico === "apto" ? 400 : 0);
    return () => clearTimeout(t);
  }, [carregar, publico]);

  const alcance = contagem ? contagem[publico] : 0;
  const podeEnviar = titulo.trim() && mensagem.trim() && (publico !== "apto" || apto.trim()) && alcance > 0;

  const enviar = async () => {
    setConfirmar(false);
    setEnviando(true);
    try {
      const { data, error } = await supabase.functions.invoke("enviar-push", {
        body: { titulo, mensagem, publico, apto: publico === "apto" ? apto : null, link },
      });
      if (error || data?.error) {
        let msg = data?.error;
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          msg = msg || (await (error as any)?.context?.json?.())?.error;
        } catch {
          // ignora
        }
        throw new Error(msg || "Não foi possível enviar.");
      }
      toast.success(
        data.enviados === data.total
          ? `Enviada para ${data.enviados} ${data.enviados === 1 ? "aparelho" : "aparelhos"}.`
          : `Enviada para ${data.enviados} de ${data.total} aparelhos.`,
      );
      setTitulo("");
      setMensagem("");
      carregar();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 sm:p-6 space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <BellRing className="h-5 w-5 text-primary" /> Notificações
            </h2>
            <p className="text-sm text-muted-foreground">
              Chega no celular de quem ativou os avisos no app, mesmo com o app fechado.
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={carregar} aria-label="Atualizar">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-muted/60 p-3">
            <div className="text-2xl font-bold">{contagem?.hospedados ?? "–"}</div>
            <div className="text-xs text-muted-foreground">aparelhos de hospedados com avisos ativos</div>
          </div>
          <div className="rounded-xl bg-muted/60 p-3">
            <div className="text-2xl font-bold">{contagem?.criancas ?? "–"}</div>
            <div className="text-xs text-muted-foreground">de famílias com crianças</div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="push-titulo">Título</Label>
              <Input
                id="push-titulo"
                value={titulo}
                maxLength={MAX_TITULO}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ex.: 🎉 Gincana na piscina!"
              />
              <p className="text-right text-xs text-muted-foreground">
                {titulo.length}/{MAX_TITULO}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="push-msg">Mensagem</Label>
              <Textarea
                id="push-msg"
                rows={3}
                value={mensagem}
                maxLength={MAX_MSG}
                onChange={(e) => setMensagem(e.target.value)}
                placeholder="Ex.: Começa em 15 minutos, perto do quiosque. Traga a toalha!"
              />
              <p className="text-right text-xs text-muted-foreground">
                {mensagem.length}/{MAX_MSG}
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Para quem</Label>
                <Select value={publico} onValueChange={(v) => setPublico(v as Publico)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PUBLICOS.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {publico === "apto" ? (
                <div className="space-y-1.5">
                  <Label htmlFor="push-apto">Apartamento</Label>
                  <Input
                    id="push-apto"
                    inputMode="numeric"
                    value={apto}
                    onChange={(e) => setApto(e.target.value.replace(/[^0-9A-Za-z]/g, "").slice(0, 10))}
                    placeholder="Ex.: 104"
                  />
                </div>
              ) : null}
              <div className="space-y-1.5">
                <Label>Ao tocar, abrir</Label>
                <Select value={link} onValueChange={setLink}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DESTINOS.map((d) => (
                      <SelectItem key={d.link} value={d.link}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={() => setConfirmar(true)} disabled={!podeEnviar || enviando}>
                <Send className="mr-2 h-4 w-4" />
                {enviando ? "Enviando…" : "Enviar notificação"}
              </Button>
              <span className="text-sm text-muted-foreground">
                {contagem
                  ? alcance > 0
                    ? `Vai para ${alcance} ${alcance === 1 ? "aparelho" : "aparelhos"}`
                    : publico === "apto" && !apto.trim()
                      ? "Digite o apartamento"
                      : "Ninguém desse grupo ativou os avisos ainda"
                  : ""}
              </span>
            </div>
          </div>

          {/* Prévia */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Smartphone className="h-4 w-4" /> Como aparece no celular
            </Label>
            <div className="rounded-2xl bg-neutral-900 p-3">
              <div className="flex gap-3 rounded-xl bg-white/95 p-3 shadow">
                <img src="/icon-192x192.png" alt="" className="h-10 w-10 shrink-0 rounded-lg" />
                <div className="min-w-0">
                  <div className="text-[11px] text-neutral-500">Meu Santa Bárbara · agora</div>
                  <div className="truncate text-sm font-semibold text-neutral-900">{titulo || "Título da notificação"}</div>
                  <div className="line-clamp-3 text-sm text-neutral-700">{mensagem || "Texto da mensagem"}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-4 sm:p-6">
        <h3 className="mb-3 font-semibold">Últimos envios</h3>
        {historico.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma notificação enviada ainda.</p>
        ) : (
          <ul className="divide-y">
            {historico.map((e) => (
              <li key={e.id} className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <div className="min-w-0">
                  <div className="truncate font-medium">{e.titulo}</div>
                  <div className="truncate text-sm text-muted-foreground">{e.mensagem}</div>
                </div>
                <div className="shrink-0 text-xs text-muted-foreground sm:text-right">
                  <div>{new Date(e.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</div>
                  <div>
                    {nomePublico(e)} · {e.enviados}/{e.total} entregues
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <AlertDialog open={confirmar} onOpenChange={setConfirmar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Enviar notificação?</AlertDialogTitle>
            <AlertDialogDescription>
              “{titulo}” vai para {alcance} {alcance === 1 ? "aparelho" : "aparelhos"} (
              {publico === "apto" ? `apto ${apto}` : PUBLICOS.find((p) => p.id === publico)?.label.toLowerCase()}). Não dá para
              desfazer depois de enviada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={enviar}>Enviar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default NotificacoesManager;
