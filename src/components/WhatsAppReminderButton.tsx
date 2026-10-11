import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useGuestAuth } from "@/hooks/useGuestAuth";
import { toast } from "sonner";
import { MessageSquare, Check, Loader2 } from "lucide-react";

interface WhatsAppReminderButtonProps {
  activityId: string;
  activityStartTime: string;
  activityDate: string;
}

const WhatsAppReminderButton = ({ activityId, activityStartTime, activityDate }: WhatsAppReminderButtonProps) => {
  const { guest, refreshGuest } = useGuestAuth();
  const [askPhone, setAskPhone] = useState(false);
  const [phoneInput, setPhoneInput] = useState("");
  const [reminderSet, setReminderSet] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  // telefones da reserva no TOTVS, mascarados (o número completo não vem para o navegador)
  const [pmsPhones, setPmsPhones] = useState<{ id: string; label: string }[]>([]);

  useEffect(() => {
    if (guest) {
      checkExistingReminder();
    } else {
      setChecking(false);
    }
  }, [guest, activityId]);

  // Só para hóspede logado (se não tiver telefone, pedimos na hora)
  if (!guest) return null;

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

  const createReminder = async () => {
    if (!guest) return;
    const { error } = await supabase.from("whatsapp_reminders").insert({
      guest_id: guest.id,
      activity_id: activityId,
      status: "pending",
    });
    if (error) throw error;
    setReminderSet(true);
    toast.success("Lembrete ativado! Você receberá uma mensagem no WhatsApp antes da atividade.");
  };

  const handleSavePhone = async () => {
    if (!guest) return;
    let digits = phoneInput.replace(/\D/g, "");
    if (digits.length === 10 || digits.length === 11) digits = `55${digits}`;
    if (digits.length < 12) {
      toast.error("Informe o celular com DDD. Ex.: (24) 99999-9999");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.from("guests").update({ phone: digits }).eq("id", guest.id);
      if (error) throw error;
      await refreshGuest();
      await createReminder();
      setAskPhone(false);
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar o telefone");
    } finally {
      setLoading(false);
    }
  };

  const openAskPhone = async () => {
    setAskPhone(true);
    if (!guest) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any).rpc("guest_pms_phones", { p_guest_id: guest.id });
    if (Array.isArray(data)) setPmsPhones(data);
  };

  const handleUsePmsPhone = async (stayGuestId: string) => {
    if (!guest) return;
    setLoading(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc("guest_use_pms_phone", {
        p_guest_id: guest.id,
        p_stay_guest_id: stayGuestId,
      });
      if (error) throw error;
      if (!data) throw new Error("Não foi possível usar este número. Digite o celular abaixo.");
      await refreshGuest();
      await createReminder();
      setAskPhone(false);
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar o telefone");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleReminder = async () => {
    if (!guest) return;
    if (!guest.phone && !reminderSet) {
      openAskPhone();
      return;
    }
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
        await createReminder();
      }
    } catch (error: any) {
      toast.error(error.message || "Erro ao configurar lembrete");
    } finally {
      setLoading(false);
    }
  };

  if (checking) return null;

  if (askPhone) {
    return (
      <div className="w-full space-y-2 rounded-md border p-2">
        <p className="text-xs text-muted-foreground">Qual WhatsApp deve receber o lembrete?</p>
        {pmsPhones.length > 0 && (
          <div className="flex flex-col gap-1.5">
            {pmsPhones.map((p) => (
              <Button
                key={p.id}
                type="button"
                variant="outline"
                size="sm"
                className="h-9 justify-start"
                onClick={() => handleUsePmsPhone(p.id)}
                disabled={loading}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Usar {p.label}
              </Button>
            ))}
            <p className="text-xs text-muted-foreground">ou digite outro número:</p>
          </div>
        )}
        <div className="flex gap-2">
          <Input
            type="tel"
            inputMode="tel"
            placeholder="(24) 99999-9999"
            value={phoneInput}
            onChange={(e) => setPhoneInput(e.target.value)}
            className="h-9"
            autoFocus={pmsPhones.length === 0}
          />
          <Button size="sm" onClick={handleSavePhone} disabled={loading} className="shrink-0">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "OK"}
          </Button>
        </div>
        <button type="button" onClick={() => setAskPhone(false)} className="text-xs text-muted-foreground hover:underline">
          Cancelar
        </button>
      </div>
    );
  }

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
