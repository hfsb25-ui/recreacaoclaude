import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { MessageSquare, CheckCircle, XCircle, Loader2, History, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface WhatsAppConfig {
  id: string;
  instance_url: string;
  api_key: string;
  instance_name: string;
  is_active: boolean;
}

interface ReminderLog {
  id: string;
  status: string;
  sent_at: string | null;
  created_at: string;
  guest_name: string;
  guest_phone: string | null;
  activity_name: string;
  activity_time: string;
}

export const WhatsAppManager = () => {
  const [config, setConfig] = useState<WhatsAppConfig | null>(null);
  const [instanceUrl, setInstanceUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [instanceName, setInstanceName] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"unknown" | "connected" | "error">("unknown");
  const [reminders, setReminders] = useState<ReminderLog[]>([]);
  const [loadingReminders, setLoadingReminders] = useState(false);

  useEffect(() => {
    fetchConfig();
    fetchReminders();
  }, []);

  const fetchConfig = async () => {
    const { data } = await supabase
      .from("whatsapp_config")
      .select("*")
      .limit(1)
      .single();

    if (data) {
      setConfig(data);
      setInstanceUrl(data.instance_url);
      setApiKey(data.api_key);
      setInstanceName(data.instance_name);
      setIsActive(data.is_active);
    }
    setLoading(false);
  };

  const fetchReminders = async () => {
    setLoadingReminders(true);
    const { data } = await supabase
      .from("whatsapp_reminders")
      .select("id, status, sent_at, created_at, guest_id, activity_id")
      .order("created_at", { ascending: false })
      .limit(50);

    if (!data || data.length === 0) {
      setReminders([]);
      setLoadingReminders(false);
      return;
    }

    const guestIds = [...new Set(data.map((r) => r.guest_id))];
    const activityIds = [...new Set(data.map((r) => r.activity_id))];

    const [{ data: guests }, { data: activities }] = await Promise.all([
      supabase.from("guests").select("id, name, phone").in("id", guestIds),
      supabase.from("activities").select("id, name, start_time").in("id", activityIds),
    ]);

    const guestMap = new Map(guests?.map((g) => [g.id, g]) || []);
    const activityMap = new Map(activities?.map((a) => [a.id, a]) || []);

    const logs: ReminderLog[] = data.map((r) => {
      const guest = guestMap.get(r.guest_id);
      const activity = activityMap.get(r.activity_id);
      return {
        id: r.id,
        status: r.status,
        sent_at: r.sent_at,
        created_at: r.created_at,
        guest_name: guest?.name || "Desconhecido",
        guest_phone: guest?.phone || null,
        activity_name: activity?.name || "Atividade removida",
        activity_time: activity?.start_time?.substring(0, 5) || "--:--",
      };
    });

    setReminders(logs);
    setLoadingReminders(false);
  };

  const handleSave = async () => {
    if (!instanceUrl || !apiKey || !instanceName) {
      toast.error("Preencha todos os campos");
      return;
    }

    setSaving(true);
    try {
      if (config) {
        const { error } = await supabase
          .from("whatsapp_config")
          .update({
            instance_url: instanceUrl.replace(/\/+$/, ""),
            api_key: apiKey,
            instance_name: instanceName,
            is_active: isActive,
          })
          .eq("id", config.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("whatsapp_config")
          .insert({
            instance_url: instanceUrl.replace(/\/+$/, ""),
            api_key: apiKey,
            instance_name: instanceName,
            is_active: isActive,
          });

        if (error) throw error;
      }

      toast.success("Configuração salva com sucesso!");
      await fetchConfig();
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar configuração");
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!instanceUrl || !apiKey || !instanceName) {
      toast.error("Preencha todos os campos antes de testar");
      return;
    }

    setTesting(true);
    setConnectionStatus("unknown");

    try {
      const url = `${instanceUrl.replace(/\/+$/, "")}/instance/connectionState/${instanceName}`;
      const response = await fetch(url, {
        headers: { apikey: apiKey },
      });

      if (response.ok) {
        const data = await response.json();
        if (data?.instance?.state === "open" || data?.state === "open") {
          setConnectionStatus("connected");
          toast.success("Conexão estabelecida com sucesso!");
        } else {
          setConnectionStatus("error");
          toast.error("Instância não está conectada. Verifique o QR Code.");
        }
      } else {
        setConnectionStatus("error");
        toast.error("Erro ao conectar. Verifique URL e API Key.");
      }
    } catch {
      setConnectionStatus("error");
      toast.error("Erro de conexão. Verifique a URL da instância.");
    } finally {
      setTesting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "sent":
        return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-green-300 dark:border-green-700">Enviado</Badge>;
      case "failed":
        return <Badge variant="destructive">Falhou</Badge>;
      default:
        return <Badge variant="secondary">Pendente</Badge>;
    }
  };

  if (loading) {
    return <p className="text-muted-foreground">Carregando...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <MessageSquare className="h-6 w-6 text-green-500" />
        <div>
          <h3 className="text-lg font-semibold">Integração WhatsApp</h3>
          <p className="text-sm text-muted-foreground">
            Configure a Evolution API para enviar lembretes de atividades
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="instance_url">URL da Evolution API</Label>
          <Input
            id="instance_url"
            placeholder="https://sua-instancia.evolution-api.com"
            value={instanceUrl}
            onChange={(e) => setInstanceUrl(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="api_key">API Key</Label>
          <Input
            id="api_key"
            type="password"
            placeholder="Sua API Key"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="instance_name">Nome da Instância</Label>
          <Input
            id="instance_name"
            placeholder="nome-da-instancia"
            value={instanceName}
            onChange={(e) => setInstanceName(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3">
          <Switch checked={isActive} onCheckedChange={setIsActive} />
          <Label>Integração ativa</Label>
        </div>

        {connectionStatus !== "unknown" && (
          <Card className={`p-3 flex items-center gap-2 ${
            connectionStatus === "connected" 
              ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800" 
              : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
          }`}>
            {connectionStatus === "connected" ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-green-700 dark:text-green-300 font-medium">Conectado</span>
              </>
            ) : (
              <>
                <XCircle className="h-5 w-5 text-red-600" />
                <span className="text-red-700 dark:text-red-300 font-medium">Desconectado</span>
              </>
            )}
          </Card>
        )}

        <div className="flex gap-3">
          <Button onClick={handleTestConnection} variant="outline" disabled={testing}>
            {testing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Testar Conexão
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Salvar Configuração
          </Button>
        </div>
      </div>

      {/* Histórico de Lembretes */}
      <div className="border-t pt-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-lg font-semibold">Histórico de Lembretes</h3>
          </div>
          <Button variant="ghost" size="sm" onClick={fetchReminders} disabled={loadingReminders}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loadingReminders ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>

        {loadingReminders ? (
          <p className="text-muted-foreground text-sm">Carregando histórico...</p>
        ) : reminders.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nenhum lembrete registrado ainda.</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {reminders.map((r) => (
              <Card key={r.id} className="p-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{r.guest_name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {r.activity_name} às {r.activity_time}
                    </p>
                    {r.guest_phone && (
                      <p className="text-xs text-muted-foreground">{r.guest_phone}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {getStatusBadge(r.status)}
                    <span className="text-xs text-muted-foreground">
                      {r.sent_at
                        ? format(new Date(r.sent_at), "dd/MM HH:mm", { locale: ptBR })
                        : format(new Date(r.created_at), "dd/MM HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
