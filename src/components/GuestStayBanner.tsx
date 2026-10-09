import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarHeart, Clock, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Props {
  guestId: string;
  guestName: string;
  roomNumber: string;
}

interface StayInfo {
  uh: string;
  departure_date: string | null;
}

interface NextActivity {
  name: string;
  start_time: string;
}

const WEEKDAYS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

const localYmd = (d: Date) => {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return z.toISOString().slice(0, 10);
};

const familyName = (name: string) => {
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 ? parts[parts.length - 1] : parts[0];
};

/** Boas-vindas personalizadas e aviso de "último dia" para hóspedes vindos do TOTVS. */
export const GuestStayBanner = ({ guestId, guestName, roomNumber }: Props) => {
  const navigate = useNavigate();
  const [stay, setStay] = useState<StayInfo | null>(null);
  const [nextActivity, setNextActivity] = useState<NextActivity | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await (supabase as any).rpc("guest_stay_info", { p_guest_id: guestId });
      if (cancelled || !data || Array.isArray(data) || !data.uh) return;
      setStay(data as StayInfo);

      const dep = data.departure_date ? new Date(data.departure_date) : null;
      if (dep && localYmd(dep) === localYmd(new Date())) {
        const now = new Date();
        const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
        const { data: acts } = await supabase
          .from("activities")
          .select("name, start_time")
          .eq("activity_date", localYmd(now))
          .gte("start_time", hhmm)
          .order("start_time", { ascending: true })
          .limit(1);
        if (!cancelled && acts?.[0]) setNextActivity(acts[0] as NextActivity);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [guestId]);

  if (!stay) return null;

  const dep = stay.departure_date ? new Date(stay.departure_date) : null;
  const isLastDay = dep ? localYmd(dep) === localYmd(new Date()) : false;
  const family = familyName(guestName);
  const depLabel = dep
    ? `${WEEKDAYS[dep.getDay()]} (${dep.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })})`
    : null;

  if (isLastDay) {
    return (
      <Card className="mb-6 p-5 border-amber-400/50 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-pink-500/10">
        <div className="flex items-start gap-3">
          <div className="text-3xl leading-none">💚</div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-foreground">Hoje é seu último dia, família {family}!</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Aproveitem cada momento. Foi um prazer receber vocês no Hotel Fazenda Santa Bárbara.
            </p>
            {nextActivity && (
              <p className="text-sm mt-3 flex items-center gap-1.5 font-medium text-foreground">
                <Clock className="h-4 w-4 text-orange-500 shrink-0" />
                Não percam: {nextActivity.name} às {nextActivity.start_time.slice(0, 5)}
              </p>
            )}
            <div className="flex flex-wrap gap-2 mt-4">
              <Button size="sm" onClick={() => navigate("/programacao")} className="bg-orange-500 hover:bg-orange-600 text-white">
                <CalendarHeart className="h-4 w-4 mr-1.5" />
                Ver programação de hoje
              </Button>
              <Button size="sm" variant="outline" onClick={() => navigate("/programacao")}>
                <Star className="h-4 w-4 mr-1.5" />
                Avaliar as atividades
              </Button>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="mb-6 p-5 border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-sky-500/10">
      <div className="flex items-start gap-3">
        <div className="text-3xl leading-none">🌿</div>
        <div className="min-w-0">
          <h3 className="text-lg font-bold text-foreground">Olá, família {family}!</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Apto {roomNumber}
            {depLabel ? ` · Vocês ficam até ${depLabel}` : ""}
          </p>
        </div>
      </div>
    </Card>
  );
};
