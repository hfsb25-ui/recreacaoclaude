import { useState, useEffect } from "react";
import { Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useGuestAuth } from "@/hooks/useGuestAuth";

export const NotificationSettings = () => {
  const { guest } = useGuestAuth();
  const { permission, isSupported, requestPermission, unsubscribe } = usePushNotifications();
  const [preferences, setPreferences] = useState({
    notify_before_activity: true,
    minutes_before: 15,
    notify_new_activities: true,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (guest) {
      loadPreferences();
    }
  }, [guest]);

  const loadPreferences = async () => {
    if (!guest) return;

    const { data, error } = await supabase
      .from("notification_preferences")
      .select("*")
      .eq("guest_id", guest.id)
      .single();

    if (data) {
      setPreferences({
        notify_before_activity: data.notify_before_activity,
        minutes_before: data.minutes_before,
        notify_new_activities: data.notify_new_activities,
      });
    } else if (error && error.code !== "PGRST116") {
      console.error("Error loading preferences:", error);
    }
  };

  const savePreferences = async () => {
    if (!guest) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("notification_preferences")
        .upsert({
          guest_id: guest.id,
          ...preferences,
        });

      if (error) throw error;

      toast.success("Preferências salvas com sucesso!");
    } catch (error) {
      console.error("Error saving preferences:", error);
      toast.error("Erro ao salvar preferências");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleNotifications = async () => {
    if (permission === "granted") {
      await unsubscribe();
    } else {
      await requestPermission();
    }
  };

  if (!isSupported) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground">
          <BellOff className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>Notificações push não são suportadas neste navegador</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-full">
            <Bell className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">Notificações Push</h3>
            <p className="text-sm text-muted-foreground">
              {permission === "granted"
                ? "Notificações ativadas"
                : permission === "denied"
                ? "Notificações bloqueadas"
                : "Notificações desativadas"}
            </p>
          </div>
        </div>
        <Button
          onClick={handleToggleNotifications}
          variant={permission === "granted" ? "destructive" : "default"}
          disabled={permission === "denied"}
        >
          {permission === "granted" ? "Desativar" : "Ativar"}
        </Button>
      </div>

      {permission === "denied" && (
        <div className="text-sm text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-950/20 p-3 rounded-md">
          As notificações foram bloqueadas. Para reativar, você precisa alterar as
          configurações do navegador.
        </div>
      )}

      {permission === "granted" && (
        <div className="space-y-4 pt-4 border-t">
          <h4 className="font-medium">Preferências de Notificação</h4>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="before-activity">Avisar antes das atividades</Label>
              <p className="text-sm text-muted-foreground">
                Receba um lembrete antes do início
              </p>
            </div>
            <Switch
              id="before-activity"
              checked={preferences.notify_before_activity}
              onCheckedChange={(checked) =>
                setPreferences({ ...preferences, notify_before_activity: checked })
              }
            />
          </div>

          {preferences.notify_before_activity && (
            <div className="pl-4 space-y-2">
              <Label htmlFor="minutes">Com quantos minutos de antecedência?</Label>
              <select
                id="minutes"
                className="w-full p-2 rounded-md border bg-background"
                value={preferences.minutes_before}
                onChange={(e) =>
                  setPreferences({ ...preferences, minutes_before: parseInt(e.target.value) })
                }
              >
                <option value="5">5 minutos</option>
                <option value="10">10 minutos</option>
                <option value="15">15 minutos</option>
                <option value="30">30 minutos</option>
                <option value="60">1 hora</option>
              </select>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="new-activities">Novas atividades</Label>
              <p className="text-sm text-muted-foreground">
                Avise quando houver novas atividades
              </p>
            </div>
            <Switch
              id="new-activities"
              checked={preferences.notify_new_activities}
              onCheckedChange={(checked) =>
                setPreferences({ ...preferences, notify_new_activities: checked })
              }
            />
          </div>

          <Button
            onClick={savePreferences}
            disabled={loading}
            className="w-full"
          >
            {loading ? "Salvando..." : "Salvar Preferências"}
          </Button>
        </div>
      )}
    </Card>
  );
};
