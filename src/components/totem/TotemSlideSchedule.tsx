import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Clock, Users } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Activity {
  id: string;
  name: string;
  description: string | null;
  start_time: string;
  end_time: string;
  age_group: {
    id: string;
    name: string;
    color: string;
  };
}

interface TotemSlideScheduleProps {
  isActive: boolean;
}

export const TotemSlideSchedule = ({ isActive }: TotemSlideScheduleProps) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchActivities = async () => {
      const today = format(new Date(), "yyyy-MM-dd");
      
      const { data } = await supabase
        .from("activities")
        .select(`
          id,
          name,
          description,
          start_time,
          end_time,
          age_group:age_groups(id, name, color)
        `)
        .eq("activity_date", today)
        .order("start_time", { ascending: true });

      if (data) {
        setActivities(data as unknown as Activity[]);
      }
      setLoading(false);
    };

    fetchActivities();
    const interval = setInterval(fetchActivities, 300000);
    return () => clearInterval(interval);
  }, []);

  const isCurrentActivity = (start: string, end: string) => {
    const now = format(currentTime, "HH:mm:ss");
    return now >= start && now <= end;
  };

  const isUpcoming = (start: string) => {
    const now = format(currentTime, "HH:mm:ss");
    return start > now;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse text-2xl text-muted-foreground">
          Carregando programação...
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-3 mb-4">
          <Calendar className="w-12 h-12 text-primary" />
          <h2 className="text-5xl font-bold text-foreground">
            Programação de Hoje
          </h2>
        </div>
        <p className="text-2xl text-muted-foreground capitalize">
          {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
        </p>
      </div>

      {/* Activities Grid */}
      {activities.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-3xl text-muted-foreground">
            Nenhuma atividade programada para hoje
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-h-full overflow-y-auto pr-2">
            {activities.map((activity) => {
              const current = isCurrentActivity(activity.start_time, activity.end_time);
              const upcoming = isUpcoming(activity.start_time);

              return (
                <div
                  key={activity.id}
                  className={`p-6 rounded-2xl border-2 transition-all duration-500 ${
                    current
                      ? "border-primary bg-primary/10 scale-[1.02] shadow-lg shadow-primary/20"
                      : upcoming
                      ? "border-border bg-card"
                      : "border-border/50 bg-card/50 opacity-60"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Time */}
                    <div className="flex-shrink-0 text-center">
                      <div
                        className={`w-20 h-20 rounded-xl flex flex-col items-center justify-center ${
                          current ? "bg-primary text-primary-foreground" : "bg-muted"
                        }`}
                      >
                        <Clock className="w-5 h-5 mb-1" />
                        <span className="text-lg font-bold">
                          {activity.start_time.slice(0, 5)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        até {activity.end_time.slice(0, 5)}
                      </p>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <div
                          className="w-4 h-4 rounded-full flex-shrink-0"
                          style={{ backgroundColor: activity.age_group.color }}
                        />
                        <span
                          className="text-sm font-medium px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor: `${activity.age_group.color}20`,
                            color: activity.age_group.color,
                          }}
                        >
                          {activity.age_group.name}
                        </span>
                        {current && (
                          <span className="ml-auto px-3 py-1 bg-primary text-primary-foreground text-xs font-bold rounded-full animate-pulse">
                            AGORA
                          </span>
                        )}
                      </div>
                      <h3 className="text-2xl font-bold text-foreground truncate">
                        {activity.name}
                      </h3>
                      {activity.description && (
                        <p className="text-muted-foreground text-lg mt-1 line-clamp-2">
                          {activity.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
