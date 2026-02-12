import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useGuestAuth } from "@/hooks/useGuestAuth";
import { toast } from "sonner";
import { MessageSquare, Check, Loader2 } from "lucide-react";

interface WhatsAppReminderButtonProps {
  activityId: string;
  activityStartTime: string;
  activityDate: string;
}

const WhatsAppReminderButton = ({ activityId, activityStartTime, activityDate }: WhatsAppReminderButtonProps) => {
  const { guest } = useGuestAuth();
  const [reminderSet, setReminderSet] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (guest) {
      checkExistingReminder();
    } else {
      setChecking(false);
    }
  }, [guest, activityId]);

  // Don't show if no guest or no phone
  if (!guest || !guest.phone) return null;

  // Don't show for past activities
  const now = new Date();
  const [startHour, startMinute] = activityStartTime.split(":").map(Number);
  const activityStart = new Date();
  const [year, month, day] = activityDate.split("-").map(Number);
  activityStart.setFullYear(year, month - 1, day);
  activityStart.setHours(startHour, startMinute, 0);
  
  if (now >= activityStart) return null;

  async function checkExistingReminder() {
    if (!guest) return;
    const { data } = await supabase
      .from("whatsapp_reminders")
      .select("id")
      .eq("guest_id", guest.id)
      .eq("activity_id", activityId)
      .maybeSingle();

    setReminderSet(!!data);
    setChecking(false);
  }

  const handleToggleReminder = async () => {
    if (!guest) return;
    setLoading(true);

    try {
      if (reminderSet) {
        await supabase
          .from("whatsapp_reminders")
          .delete()
          .eq("guest_id", guest.id)
          .eq("activity_id", activityId);

        setReminderSet(false);
        toast.success("Lembrete removido!");
      } else {
        const { error } = await supabase
          .from("whatsapp_reminders")
          .insert({
            guest_id: guest.id,
            activity_id: activityId,
            status: "pending",
          });

        if (error) throw error;
        setReminderSet(true);
        toast.success("Lembrete ativado! Você receberá uma mensagem 10 min antes.");
      }
    } catch (error: any) {
      toast.error(error.message || "Erro ao configurar lembrete");
    } finally {
      setLoading(false);
    }
  };

  if (checking) return null;

  return (
    <Button
      variant={reminderSet ? "secondary" : "outline"}
      size="sm"
      className={`w-full ${reminderSet ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700" : ""}`}
      onClick={handleToggleReminder}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : reminderSet ? (
        <Check className="h-4 w-4 mr-2" />
      ) : (
        <MessageSquare className="h-4 w-4 mr-2" />
      )}
      {reminderSet ? "Lembrete Ativado ✓" : "Lembrar no WhatsApp"}
    </Button>
  );
};

export default WhatsAppReminderButton;
