import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useGuestAuth } from "@/hooks/useGuestAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { getLocalDateString } from "@/lib/utils";
import { useGameSpins } from "@/hooks/useGameSpins";

interface CheckInButtonProps {
  activityId: string;
  activityStartTime: string;
  activityEndTime: string;
  activityDate: string;
  /** "hotel" = visual novo do app do hotel */
  estilo?: "hotel";
}

const CheckInButton = ({
  activityId,
  activityStartTime,
  activityEndTime,
  activityDate,
  estilo,
}: CheckInButtonProps) => {
  const hotel = estilo === "hotel";
  const navigate = useNavigate();
  const { guest, refreshGuest } = useGuestAuth();
  const { grantSpin } = useGameSpins();
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
      
      // Grant a spin for the check-in
      await grantSpin("checkin");
      
      // Show animated toast
      toast.success("Check-in realizado! +10 pontos + 1 giro! 🎰", {
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
      <Button variant="outline" disabled className={hotel ? "w-full h-12 rounded-xl border-[#1E8E4E] text-[#1E6B3E] font-extrabold opacity-100" : "w-full"}>
        <Check className="h-4 w-4 mr-2" />
        Check-in realizado ✓
      </Button>
    );
  }

  if (!isActivityTime) {
    return (
      <Button variant="outline" disabled className={hotel ? "w-full h-11 rounded-xl" : "w-full"}>
        Check-in disponível durante a atividade
      </Button>
    );
  }

  return (
    <Button
      onClick={handleCheckIn}
      disabled={loading || !guest}
      className={
        hotel
          ? "w-full h-[50px] rounded-xl bg-[#1E8E4E] text-base font-extrabold text-white hover:bg-[#187A42]"
          : "w-full bg-primary hover:bg-primary/90"
      }
    >
      {hotel && !loading && <Check className="h-5 w-5 mr-2" />}
      {loading ? "Processando..." : guest ? "Fazer Check-in (+10 pts)" : "Entre para fazer Check-in"}
    </Button>
  );
};

export default CheckInButton;
