import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { MessageSquare, CheckCircle, XCircle, Loader2 } from "lucide-react";

interface WhatsAppConfig {
  id: string;
  instance_url: string;
  api_key: string;
  instance_name: string;
  is_active: boolean;
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

  useEffect(() => {
    fetchConfig();
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
    </div>
  );
};
