import { useEffect, useState } from "react";
import { FileBarChart, Eye, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ReportConfig {
  id: string;
  report_enabled: boolean;
  report_days: number[];
  report_hour: number;
  report_last_sent_at: string | null;
}

// Colunas/funções novas ainda não estão nos tipos gerados do Supabase
const db = supabase as any;

const DAYS = [
  { value: 1, label: "Seg" },
  { value: 2, label: "Ter" },
  { value: 3, label: "Qua" },
  { value: 4, label: "Qui" },
  { value: 5, label: "Sex" },
  { value: 6, label: "Sáb" },
  { value: 0, label: "Dom" },
];

// Mostra o texto do WhatsApp com *negrito* aplicado
const renderWhatsApp = (text: string) =>
  text.split("\n").map((line, i) => (
    <div key={i} className="min-h-[1.25rem]">
      {line.split(/(\*[^*]+\*)/g).map((part, j) =>
        part.startsWith("*") && part.endsWith("*") ? <strong key={j}>{part.slice(1, -1)}</strong> : <span key={j}>{part}</span>
      )}
    </div>
  ));

export const RecreationReportManager = () => {
  const [config, setConfig] = useState<ReportConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await db
        .from("whatsapp_config")
        .select("id, report_enabled, report_days, report_hour, report_last_sent_at")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error?.message?.includes("report_")) setNeedsSetup(true);
      else setConfig(data ?? null);
      setLoading(false);
    })();
  }, []);

  const save = async (patch: Partial<ReportConfig>) => {
    if (!config) return;
    const next = { ...config, ...patch };
    setConfig(next);
    const { error } = await db.from("whatsapp_config").update(patch).eq("id", config.id);
    if (error) toast.error("Não foi possível salvar");
    else toast.success("Relatório atualizado");
  };

  const toggleDay = (day: number) => {
    if (!config) return;
    const days = config.report_days.includes(day)
      ? config.report_days.filter((d) => d !== day)
      : [...config.report_days, day].sort();
    save({ report_days: days });
  };

  const loadPreview = async () => {
    setPreviewing(true);
    const { data, error } = await db.rpc("preview_recreation_report");
    setPreviewing(false);
    if (error) return toast.error("Não foi possível gerar a prévia");
    setPreview(data as string);
  };

  const sendNow = async () => {
    setSending(true);
    const { data, error } = await db.rpc("send_recreation_report", { p_force: true });
    setSending(false);
    if (error) return toast.error("Erro ao enviar o relatório");
    const sent = (data as { sent: number; reason?: string })?.sent ?? 0;
    if (sent > 0) toast.success(`Relatório enviado para ${sent} número(s)`);
    else toast.error((data as { reason?: string })?.reason || "Nenhum número ativo para receber");
  };

  if (loading) return <p className="text-sm text-muted-foreground">Carregando relatório...</p>;

  return (
    <div className="border-t pt-6 mt-6 space-y-5">
      <div className="flex items-center gap-3">
        <FileBarChart className="h-6 w-6 text-sky-600" />
        <div>
          <h3 className="text-lg font-semibold">Relatório da Recreação</h3>
          <p className="text-sm text-muted-foreground">
            Resumo de ocupação, uso do app e avaliações, enviado no WhatsApp para os mesmos números do alerta acima.
          </p>
        </div>
      </div>

      {needsSetup ? (
        <Card className="p-4 text-sm bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
          Falta ativar este recurso no banco: rode o SQL <code>20261009220000_relatorio_recreacao.sql</code> no SQL
          Editor do Supabase e recarregue a página.
        </Card>
      ) : !config ? (
        <Card className="p-4 text-sm bg-muted">Salve a configuração da Evolution API acima para ativar o relatório.</Card>
      ) : (
        <>
          <div className="flex items-center gap-3">
            <Switch checked={config.report_enabled} onCheckedChange={(v) => save({ report_enabled: v })} />
            <Label>Envio automático ativo</Label>
          </div>

          <div className="space-y-2">
            <Label>Dias de envio</Label>
            <div className="flex flex-wrap gap-2">
              {DAYS.map((d) => {
                const on = config.report_days.includes(d.value);
                return (
                  <Button
                    key={d.value}
                    type="button"
                    size="sm"
                    variant={on ? "default" : "outline"}
                    onClick={() => toggleDay(d.value)}
                    aria-pressed={on}
                    className="w-14"
                  >
                    {d.label}
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Label className="whitespace-nowrap">Horário</Label>
            <Select value={String(config.report_hour)} onValueChange={(v) => save({ report_hour: Number(v) })}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 24 }, (_, h) => (
                  <SelectItem key={h} value={String(h)}>
                    {String(h).padStart(2, "0")}:00
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {config.report_last_sent_at && (
            <p className="text-xs text-muted-foreground">
              Último envio automático:{" "}
              {new Date(config.report_last_sent_at).toLocaleString("pt-BR", {
                weekday: "short",
                day: "2-digit",
                month: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={loadPreview} disabled={previewing}>
              {previewing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Eye className="h-4 w-4 mr-2" />}
              Ver prévia
            </Button>
            <Button onClick={sendNow} disabled={sending} className="bg-green-600 hover:bg-green-700 text-white">
              {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Enviar agora
            </Button>
          </div>

          {preview && (
            <Card className="p-4 bg-[#e7fbe6] dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900 text-sm text-foreground max-w-md">
              {renderWhatsApp(preview)}
            </Card>
          )}
        </>
      )}
    </div>
  );
};
