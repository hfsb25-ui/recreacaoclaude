import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Clock, MapPin, Users, Sparkles } from "lucide-react";
import { format, parseISO, isToday, isTomorrow, differenceInMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Activity {
  id: string;
  name: string;
  description: string | null;
  start_time: string;
  end_time: string;
  activity_date: string;
  age_groups: {
    name: string;
    color: string;
  } | null;
}

interface TotemSlideNextActivityProps {
  isActive: boolean;
}

export const TotemSlideNextActivity = ({ isActive }: TotemSlideNextActivityProps) => {
  const [nextActivity, setNextActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [countdown, setCountdown] = useState("");

  useEffect(() => {
    const fetchNextActivity = async () => {
      const now = new Date();
      const today = format(now, "yyyy-MM-dd");
      const tomorrow = format(new Date(now.getTime() + 24 * 60 * 60 * 1000), "yyyy-MM-dd");
      const currentTime = format(now, "HH:mm:ss");

      // First try to find an activity today that hasn't started yet
      let { data, error } = await supabase
        .from("activities")
        .select("*, age_groups(name, color)")
        .eq("activity_date", today)
        .gt("start_time", currentTime)
        .order("start_time", { ascending: true })
        .limit(1);

      // If no activity today, try tomorrow
      if (!data || data.length === 0) {
        const result = await supabase
          .from("activities")
          .select("*, age_groups(name, color)")
          .eq("activity_date", tomorrow)
          .order("start_time", { ascending: true })
          .limit(1);
        
        data = result.data;
        error = result.error;
      }

      if (!error && data && data.length > 0) {
        setNextActivity(data[0] as Activity);
      } else {
        setNextActivity(null);
      }
      setLoading(false);
    };

    fetchNextActivity();
    const interval = setInterval(fetchNextActivity, 60000); // Refresh every minute

    return () => clearInterval(interval);
  }, []);

  // Update countdown every second
  useEffect(() => {
    if (!nextActivity) return;

    const updateCountdown = () => {
      const now = new Date();
      setCurrentTime(now);

      const activityDate = parseISO(nextActivity.activity_date);
      const [hours, minutes] = nextActivity.start_time.split(":");
      activityDate.setHours(parseInt(hours), parseInt(minutes), 0);

      const diffMinutes = differenceInMinutes(activityDate, now);

      if (diffMinutes <= 0) {
        setCountdown("Começando agora!");
      } else if (diffMinutes < 60) {
        setCountdown(`em ${diffMinutes} minuto${diffMinutes > 1 ? "s" : ""}`);
      } else {
        const diffHours = Math.floor(diffMinutes / 60);
        const remainingMinutes = diffMinutes % 60;
        if (remainingMinutes === 0) {
          setCountdown(`em ${diffHours} hora${diffHours > 1 ? "s" : ""}`);
        } else {
          setCountdown(`em ${diffHours}h ${remainingMinutes}min`);
        }
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [nextActivity]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-pulse text-4xl text-muted-foreground">
          Carregando...
        </div>
      </div>
    );
  }

  if (!nextActivity) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center px-8">
        <Sparkles className="w-24 h-24 text-primary/50 mb-6" />
        <h2 className="text-5xl font-bold text-foreground mb-4">
          Nenhuma Atividade Programada
        </h2>
        <p className="text-2xl text-muted-foreground">
          Fique atento para as próximas atividades!
        </p>
      </div>
    );
  }

  const activityDate = parseISO(nextActivity.activity_date);
  const dateLabel = isToday(activityDate) 
    ? "Hoje" 
    : isTomorrow(activityDate) 
      ? "Amanhã" 
      : format(activityDate, "EEEE, dd 'de' MMMM", { locale: ptBR });

  const groupColor = nextActivity.age_groups?.color || "#00BCD4";

  return (
    <div className="h-full flex flex-col items-center justify-center text-center px-8 py-4">
      {/* Próxima Atividade Label */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-3 h-3 rounded-full bg-primary animate-pulse" />
        <span className="text-xl uppercase tracking-widest text-muted-foreground font-medium">
          Próxima Atividade
        </span>
        <div className="w-3 h-3 rounded-full bg-primary animate-pulse" />
      </div>

      {/* Activity Name */}
      <h1 
        className="text-6xl md:text-7xl lg:text-8xl font-bold mb-6 leading-tight"
        style={{ color: groupColor }}
      >
        {nextActivity.name}
      </h1>

      {/* Description */}
      {nextActivity.description && (
        <p className="text-2xl md:text-3xl text-muted-foreground mb-8 max-w-4xl">
          {nextActivity.description}
        </p>
      )}

      {/* Time and Details */}
      <div className="flex flex-wrap items-center justify-center gap-8 mb-8">
        {/* Time */}
        <div className="flex items-center gap-3 bg-card/50 backdrop-blur px-6 py-4 rounded-2xl">
          <Clock className="w-8 h-8 text-primary" />
          <span className="text-3xl font-semibold text-foreground">
            {nextActivity.start_time.substring(0, 5)} - {nextActivity.end_time.substring(0, 5)}
          </span>
        </div>

        {/* Date */}
        <div className="flex items-center gap-3 bg-card/50 backdrop-blur px-6 py-4 rounded-2xl">
          <MapPin className="w-8 h-8 text-primary" />
          <span className="text-3xl font-semibold text-foreground">
            {dateLabel}
          </span>
        </div>

        {/* Age Group */}
        {nextActivity.age_groups && (
          <div 
            className="flex items-center gap-3 px-6 py-4 rounded-2xl"
            style={{ backgroundColor: `${groupColor}20` }}
          >
            <Users className="w-8 h-8" style={{ color: groupColor }} />
            <span className="text-3xl font-semibold" style={{ color: groupColor }}>
              {nextActivity.age_groups.name}
            </span>
          </div>
        )}
      </div>

      {/* Countdown */}
      <div className="mt-4">
        <div className="inline-flex items-center gap-4 bg-primary/10 backdrop-blur-sm px-10 py-6 rounded-3xl border-2 border-primary/30">
          <Sparkles className="w-10 h-10 text-primary animate-pulse" />
          <span className="text-4xl md:text-5xl font-bold text-primary">
            {countdown}
          </span>
          <Sparkles className="w-10 h-10 text-primary animate-pulse" />
        </div>
      </div>
    </div>
  );
};
