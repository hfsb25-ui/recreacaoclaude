import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Megaphone,
  AlertTriangle,
  Info,
  CheckCircle,
  XCircle,
  Play,
  Trash2,
  Edit,
  Bell,
  BellOff,
  Clock,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

type AlertType = "info" | "warning" | "success" | "danger";

interface TotemAlert {
  id: string;
  title: string;
  message: string | null;
  alert_type: AlertType;
  duration_seconds: number;
  play_sound: boolean;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
}

interface AlertForm {
  title: string;
  message: string;
  alert_type: AlertType;
  duration_seconds: number;
  play_sound: boolean;
  expires_at: string;
}

const alertTypeOptions: ReadonlyArray<{
  value: AlertType;
  label: string;
  icon: typeof Info;
  color: string;
}> = [
  { value: "info", label: "Informação", icon: Info, color: "text-primary" },
  { value: "warning", label: "Atenção", icon: AlertTriangle, color: "text-warning" },
  { value: "success", label: "Sucesso", icon: CheckCircle, color: "text-success" },
  { value: "danger", label: "Urgente", icon: XCircle, color: "text-destructive" },
];

const defaultForm: AlertForm = {
  title: "",
  message: "",
  alert_type: "info",
  duration_seconds: 15,
  play_sound: false,
  expires_at: "",
};

export const TotemAlertsManager = () => {
  const [alerts, setAlerts] = useState<TotemAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);

  const fetchAlerts = async () => {
    const { data, error } = await supabase
      .from("totem_alerts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar avisos");
      console.error(error);
    } else {
      setAlerts(
        (data || []).map((alert) => ({
          ...alert,
          alert_type: alertTypeOptions.some((option) => option.value === alert.alert_type)
            ? (alert.alert_type as AlertType)
            : "info",
        }))
      );
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAlerts();

    const channel = supabase
      .channel("totem_alerts_manager")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "totem_alerts" },
        () => {
          fetchAlerts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const resetForm = () => {
    setForm(defaultForm);
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error("O título é obrigatório");
      return;
    }

    setSaving(true);

    const payload = {
      title: form.title.trim(),
      message: form.message.trim() || null,
      alert_type: form.alert_type,
      duration_seconds: form.duration_seconds,
      play_sound: form.play_sound,
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
    };

    let error;
    if (editingId) {
      const result = await supabase
        .from("totem_alerts")
        .update(payload)
        .eq("id", editingId);
      error = result.error;
    } else {
      const result = await supabase.from("totem_alerts").insert(payload);
      error = result.error;
    }

    if (error) {
      toast.error("Erro ao salvar aviso");
      console.error(error);
    } else {
      toast.success(editingId ? "Aviso atualizado!" : "Aviso criado!");
      resetForm();
      fetchAlerts();
    }

    setSaving(false);
  };

  const handleEdit = (alert: TotemAlert) => {
    setEditingId(alert.id);
    setForm({
      title: alert.title,
      message: alert.message || "",
      alert_type: alert.alert_type,
      duration_seconds: alert.duration_seconds,
      play_sound: alert.play_sound,
      expires_at: alert.expires_at
        ? format(new Date(alert.expires_at), "yyyy-MM-dd'T'HH:mm", { locale: ptBR })
        : "",
    });
  };

  const toggleActive = async (alert: TotemAlert) => {
    const { error } = await supabase
      .from("totem_alerts")
      .update({ is_active: !alert.is_active })
      .eq("id", alert.id);

    if (error) {
      toast.error("Erro ao alterar status");
      console.error(error);
    } else {
      toast.success(!alert.is_active ? "Aviso ativado e disparado!" : "Aviso desativado");
      fetchAlerts();
    }
  };

  const triggerNow = async (alert: TotemAlert) => {
    const { error } = await supabase
      .from("totem_alerts")
      .update({ is_active: true, expires_at: null })
      .eq("id", alert.id);

    if (error) {
      toast.error("Erro ao disparar aviso");
      console.error(error);
    } else {
      toast.success("Aviso disparado no totem!");
      fetchAlerts();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este aviso?")) return;

    const { error } = await supabase.from("totem_alerts").delete().eq("id", id);

    if (error) {
      toast.error("Erro ao excluir aviso");
      console.error(error);
    } else {
      toast.success("Aviso excluído");
      if (editingId === id) resetForm();
      fetchAlerts();
    }
  };

  const getAlertTypeInfo = (type: string) => {
    return alertTypeOptions.find((o) => o.value === type) || alertTypeOptions[0];
  };

  return (
    <div className="space-y-6">
      {/* Form */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Megaphone className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">
            {editingId ? "Editar Aviso" : "Novo Aviso para o Totem"}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Ex: Atenção, mudança de horário!"
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo de alerta</Label>
              <Select
                value={form.alert_type}
                onValueChange={(value: typeof form.alert_type) =>
                  setForm({ ...form, alert_type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {alertTypeOptions.map((option) => {
                    const Icon = option.icon;
                    return (
                      <SelectItem key={option.value} value={option.value}>
                        <span className="flex items-center gap-2">
                          <Icon className={cn("w-4 h-4", option.color)} />
                          {option.label}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Mensagem</Label>
            <Textarea
              id="message"
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder="Digite o conteúdo do aviso..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="duration">Duração (segundos)</Label>
              <Input
                id="duration"
                type="number"
                min={5}
                max={300}
                value={form.duration_seconds}
                onChange={(e) =>
                  setForm({
                    ...form,
                    duration_seconds: Math.max(5, Math.min(300, parseInt(e.target.value) || 5)),
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expires">Expira em (opcional)</Label>
              <Input
                id="expires"
                type="datetime-local"
                value={form.expires_at}
                onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
              />
            </div>

            <div className="flex items-end gap-3 pb-2">
              <Switch
                id="play-sound"
                checked={form.play_sound}
                onCheckedChange={(checked) => setForm({ ...form, play_sound: checked })}
              />
              <Label htmlFor="play-sound" className="cursor-pointer">
                Tocar som no totem
              </Label>
            </div>
          </div>

          <div className="flex gap-3">
            <Button type="submit" disabled={saving}>
              {saving ? "Salvando..." : editingId ? "Atualizar Aviso" : "Criar Aviso"}
            </Button>
            {editingId && (
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancelar
              </Button>
            )}
          </div>
        </form>
      </Card>

      {/* List */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Bell className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">Avisos Cadastrados</h2>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Carregando...</p>
        ) : alerts.length === 0 ? (
          <p className="text-muted-foreground">Nenhum aviso cadastrado.</p>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => {
              const typeInfo = getAlertTypeInfo(alert.alert_type);
              const TypeIcon = typeInfo.icon;
              const isExpired = alert.expires_at && new Date(alert.expires_at) < new Date();

              return (
                <div
                  key={alert.id}
                  className={cn(
                    "flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-lg border",
                    alert.is_active && !isExpired
                      ? "bg-primary/10 border-primary/30"
                      : "bg-muted/30 border-border"
                  )}
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <TypeIcon className={cn("w-6 h-6 mt-1 flex-shrink-0", typeInfo.color)} />
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground truncate">
                        {alert.title}
                      </p>
                      {alert.message && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {alert.message}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {alert.duration_seconds}s
                        </span>
                        {alert.play_sound ? (
                          <span className="flex items-center gap-1">
                            <Bell className="w-3 h-3" /> com som
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <BellOff className="w-3 h-3" /> sem som
                          </span>
                        )}
                        {alert.expires_at && (
                          <span>
                            expira {format(new Date(alert.expires_at), "dd/MM HH:mm", { locale: ptBR })}
                          </span>
                        )}
                        <span className={cn(
                          "px-2 py-0.5 rounded-full font-medium",
                          alert.is_active && !isExpired
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                            : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                        )}>
                          {alert.is_active && !isExpired ? "Ativo" : "Inativo"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => triggerNow(alert)}
                      disabled={alert.is_active && !isExpired}
                    >
                      <Play className="w-4 h-4 mr-1" />
                      Disparar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleActive(alert)}
                    >
                      {alert.is_active && !isExpired ? (
                        <>
                          <BellOff className="w-4 h-4 mr-1" /> Desativar
                        </>
                      ) : (
                        <>
                          <Bell className="w-4 h-4 mr-1" /> Ativar
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(alert)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => handleDelete(alert.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};
