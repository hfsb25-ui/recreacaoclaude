import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useGuestAuth } from "@/hooks/useGuestAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { getLocalDateString } from "@/lib/utils";

interface CheckInButtonProps {
  activityId: string;
  activityStartTime: string;
  activityEndTime: string;
  activityDate: string;
}

const CheckInButton = ({
  activityId,
  activityStartTime,
  activityEndTime,
  activityDate,
}: CheckInButtonProps) => {
  const navigate = useNavigate();
  const { guest, refreshGuest } = useGuestAuth();
  const [hasCheckedIn, setHasCheckedIn] = useState(false);
  const [isActivityTime, setIsActivityTime] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkIfCheckedIn();
    checkIfActivityTime();
  }, [guest, activityId]);

  const checkIfCheckedIn = async () => {
    if (!guest) return;

    const { data } = await supabase
      .from("activity_checkins")
      .select("id")
      .eq("guest_id", guest.id)
      .eq("activity_id", activityId)
      .single();

    setHasCheckedIn(!!data);
  };

  const checkIfActivityTime = () => {
    const now = new Date();
    const today = getLocalDateString(now);

    // Check if activity is today
    if (activityDate !== today) {
      setIsActivityTime(false);
      return;
    }

    const currentTime = now.toTimeString().split(" ")[0].substring(0, 5);
    const isInTimeRange =
      currentTime >= activityStartTime && currentTime <= activityEndTime;

    setIsActivityTime(isInTimeRange);
  };

  const handleCheckIn = async () => {
    if (!guest) {
      navigate("/guest-auth");
      return;
    }

    if (!isActivityTime) {
      toast.error("Check-in disponível apenas durante o horário da atividade");
      return;
    }

    if (hasCheckedIn) {
      toast.info("Você já fez check-in nesta atividade");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.from("activity_checkins").insert({
        guest_id: guest.id,
        activity_id: activityId,
        points_earned: 10,
      });

      if (error) throw error;

      setHasCheckedIn(true);
      await refreshGuest();
      
      // Show animated toast
      toast.success("Check-in realizado! +10 pontos! 🎉", {
        duration: 3000,
      });
    } catch (error: any) {
      toast.error(error.message || "Erro ao fazer check-in");
    } finally {
      setLoading(false);
    }
  };

  if (hasCheckedIn) {
    return (
      <Button variant="outline" disabled className="w-full">
        <Check className="h-4 w-4 mr-2" />
        Check-in realizado ✓
      </Button>
    );
  }

  if (!isActivityTime) {
    return (
      <Button variant="outline" disabled className="w-full">
        Check-in disponível durante a atividade
      </Button>
    );
  }

  return (
    <Button
      onClick={handleCheckIn}
      disabled={loading || !guest}
      className="w-full bg-primary hover:bg-primary/90"
    >
      {loading ? "Processando..." : guest ? "Fazer Check-in (+10 pts)" : "Entre para fazer Check-in"}
    </Button>
  );
};

export default CheckInButton;
