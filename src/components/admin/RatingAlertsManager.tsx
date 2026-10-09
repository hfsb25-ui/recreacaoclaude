import { useEffect, useState } from "react";
import { BellRing, Loader2, Plus, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Recipient {
  id: string;
  name: string;
  phone: string;
  is_active: boolean;
}

interface AlertConfig {
  id: string;
  instance_url: string;
  api_key: string;
  instance_name: string;
  rating_alert_enabled: boolean;
  rating_alert_threshold: number;
}

// Tabelas/colunas novas ainda não estão nos tipos gerados do Supabase
const db = supabase as any;

const normalizePhone = (value: string) => {
  let digits = value.replace(/\D/g, "");
  if (digits.length === 10 || digits.length === 11) digits = `55${digits}`;
  return digits;
};

const formatPhone = (value: string) => {
  const d = normalizePhone(value);
  if (d.length === 13) return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, 9)}-${d.slice(9)}`;
  if (d.length === 12) return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, 8)}-${d.slice(8)}`;
  return value;
};

export const RatingAlertsManager = () => {
  const [config, setConfig] = useState<AlertConfig | null>(null);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [adding, setAdding] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data: cfg, error: cfgError }, { data: list, error: listError }] = await Promise.all([
      db
        .from("whatsapp_config")
        .select("id, instance_url, api_key, instance_name, rating_alert_enabled, rating_alert_threshold")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      db.from("rating_alert_recipients").select("*").order("created_at", { ascending: true }),
    ]);

    if (cfgError?.message?.includes("rating_alert") || listError?.message?.includes("rating_alert_recipients")) {
      setNeedsSetup(true);
    } else {
      setNeedsSetup(false);
      setConfig(cfg ?? null);
      setRecipients(list ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const updateConfig = async (patch: Partial<AlertConfig>) => {
    if (!config) return;
    const { error } = await db.from("whatsapp_config").update(patch).eq("id", config.id);
    if (error) {
      toast.error("Não foi possível salvar");
      return;
    }
    setConfig({ ...config, ...patch });
    toast.success("Configuração do alerta salva");
  };

  const addRecipient = async () => {
    const digits = normalizePhone(newPhone);
    if (!newName.trim()) {
      toast.error("Informe o nome de quem vai receber");
      return;
    }
    if (digits.length < 12) {
      toast.error("Informe o celular com DDD. Ex.: (24) 99999-9999");
      return;
    }
    setAdding(true);
    const { error } = await db
      .from("rating_alert_recipients")
      .insert({ name: newName.trim(), phone: digits });
    setAdding(false);
    if (error) {
      toast.error("Erro ao cadastrar número");
      return;
    }
    setNewName("");
    setNewPhone("");
    toast.success("Número cadastrado");
    load();
  };

  const toggleRecipient = async (r: Recipient) => {
    const { error } = await db
      .from("rating_alert_recipients")
      .update({ is_active: !r.is_active })
      .eq("id", r.id);
    if (error) return toast.error("Erro ao atualizar");
    setRecipients((list) => list.map((x) => (x.id === r.id ? { ...x, is_active: !r.is_active } : x)));
  };

  const removeRecipient = async (r: Recipient) => {
    const { error } = await db.from("rating_alert_recipients").delete().eq("id", r.id);
    if (error) return toast.error("Erro ao remover");
    setRecipients((list) => list.filter((x) => x.id !== r.id));
    toast.success(`${r.name} removido`);
  };

  const sendTestAlert = async () => {
    if (!config) return;
    const active = recipients.filter((r) => r.is_active);
    if (active.length === 0) {
      toast.error("Cadastre pelo menos um número ativo");
      return;
    }
    setSendingTest(true);
    const text =
      "⚠️ *Avaliação baixa na recreação* (TESTE)\n\n" +
      "*Atividade:* Oficina de Pintura (Kids)\n" +
      "*Quando:* hoje às 15:00\n" +
      "*Nota:* ⭐⭐ (2 de 5)\n" +
      "*Hóspede:* Hóspede de teste, apto 000\n" +
      "*Comentário:* Esta é uma mensagem de teste do alerta.\n\n" +
      "Procure o hóspede antes do check-out 🙏";
    const url = `${config.instance_url.replace(/\/+$/, "")}/message/sendText/${config.instance_name}`;
    let ok = 0;
    for (const r of active) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: config.api_key },
          body: JSON.stringify({ number: normalizePhone(r.phone), text }),
        });
        if (res.ok) ok++;
      } catch {
        /* contabilizado como falha */
      }
    }
    setSendingTest(false);
    if (ok === active.length) toast.success(`Alerta de teste enviado para ${ok} número(s)`);
    else if (ok > 0) toast.warning(`Enviado para ${ok} de ${active.length} números`);
    else toast.error("Não foi possível enviar. Teste a conexão do WhatsApp acima");
  };

  if (loading) return <p className="text-sm text-muted-foreground">Carregando alertas...</p>;

  return (
    <div className="border-t pt-6 mt-6 space-y-5">
      <div className="flex items-center gap-3">
        <BellRing className="h-6 w-6 text-amber-500" />
        <div>
          <h3 className="text-lg font-semibold">Alerta de avaliação baixa</h3>
          <p className="text-sm text-muted-foreground">
            Quando um hóspede der uma nota baixa, os números abaixo recebem um aviso no WhatsApp na hora.
          </p>
        </div>
      </div>

      {needsSetup ? (
        <Card className="p-4 text-sm bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
          Falta ativar este recurso no banco de dados: rode o SQL
          <code className="mx-1">20261009180000_alerta_avaliacao_baixa.sql</code>
          no SQL Editor do Supabase e recarregue a página.
        </Card>
      ) : !config ? (
        <Card className="p-4 text-sm bg-muted">
          Salve a configuração da Evolution API acima para poder ativar os alertas.
        </Card>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <Switch
                checked={config.rating_alert_enabled}
                onCheckedChange={(v) => updateConfig({ rating_alert_enabled: v })}
              />
              <Label>Alertas ativos</Label>
            </div>
            <div className="flex items-center gap-2">
              <Label className="whitespace-nowrap">Alertar quando a nota for</Label>
              <Select
                value={String(config.rating_alert_threshold)}
                onValueChange={(v) => updateConfig({ rating_alert_threshold: Number(v) })}
              >
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">só 1 estrela</SelectItem>
                  <SelectItem value="2">2 estrelas ou menos</SelectItem>
                  <SelectItem value="3">3 estrelas ou menos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Quem recebe o alerta</Label>
            {recipients.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum número cadastrado ainda.</p>
            ) : (
              <div className="space-y-2">
                {recipients.map((r) => (
                  <Card key={r.id} className="p-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className={`font-medium truncate ${r.is_active ? "" : "text-muted-foreground line-through"}`}>
                        {r.name}
                      </p>
                      <p className="text-sm text-muted-foreground">{formatPhone(r.phone)}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Switch checked={r.is_active} onCheckedChange={() => toggleRecipient(r)} aria-label="Ativo" />
                      <Button variant="ghost" size="icon" onClick={() => removeRecipient(r)} aria-label="Remover">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Input placeholder="Nome (ex.: Gerente)" value={newName} onChange={(e) => setNewName(e.target.value)} />
            <Input
              type="tel"
              inputMode="tel"
              placeholder="(24) 99999-9999"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
            />
            <Button onClick={addRecipient} disabled={adding} className="shrink-0">
              {adding ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              Adicionar
            </Button>
          </div>

          <Button variant="outline" onClick={sendTestAlert} disabled={sendingTest}>
            {sendingTest ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
            Enviar alerta de teste
          </Button>
        </>
      )}
    </div>
  );
};
