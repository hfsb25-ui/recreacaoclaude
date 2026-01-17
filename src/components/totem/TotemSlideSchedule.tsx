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
        // Filter only current activities
        const now = format(new Date(), "HH:mm:ss");
        const currentActivities = (data as unknown as Activity[]).filter(
          (activity) => now >= activity.start_time && now <= activity.end_time
        );
        setActivities(currentActivities);
      }
      setLoading(false);
    };

    fetchActivities();
    // Check more frequently to update when activities change
    const interval = setInterval(fetchActivities, 60000);
    return () => clearInterval(interval);
  }, [currentTime]);

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
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="text-center mb-4 md:mb-6 flex-shrink-0">
        <div className="inline-flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
          <Calendar className="w-8 h-8 md:w-10 md:h-10 lg:w-12 lg:h-12 text-primary" />
          <h2 className="text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold text-foreground">
            Acontecendo Agora
          </h2>
        </div>
        <p className="text-lg md:text-xl lg:text-2xl text-muted-foreground capitalize">
          {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
        </p>
      </div>

      {/* Activities Grid */}
      {activities.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xl md:text-2xl lg:text-3xl text-muted-foreground">
            Nenhuma atividade acontecendo agora
          </p>
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 md:gap-3 lg:gap-4 h-full overflow-y-auto pr-1 md:pr-2">
            {activities.map((activity) => {
              const current = isCurrentActivity(activity.start_time, activity.end_time);
              const upcoming = isUpcoming(activity.start_time);

              return (
                <div
                  key={activity.id}
                  className={`p-3 md:p-4 lg:p-5 rounded-xl md:rounded-2xl border-2 transition-all duration-500 ${
                    current
                      ? "border-primary bg-primary/10 scale-[1.01] shadow-lg shadow-primary/20"
                      : upcoming
                      ? "border-border bg-card"
                      : "border-border/50 bg-card/50 opacity-60"
                  }`}
                >
                  <div className="flex items-start gap-2 md:gap-3 lg:gap-4">
                    {/* Time */}
                    <div className="flex-shrink-0 text-center">
                      <div
                        className={`w-14 h-14 md:w-16 md:h-16 lg:w-18 lg:h-18 rounded-lg md:rounded-xl flex flex-col items-center justify-center ${
                          current ? "bg-primary text-primary-foreground" : "bg-muted"
                        }`}
                      >
                        <Clock className="w-4 h-4 md:w-5 md:h-5 mb-0.5" />
                        <span className="text-sm md:text-base lg:text-lg font-bold">
                          {activity.start_time.slice(0, 5)}
                        </span>
                      </div>
                      <p className="text-xs md:text-sm text-muted-foreground mt-1">
                        até {activity.end_time.slice(0, 5)}
                      </p>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 md:gap-2 mb-1 md:mb-2 flex-wrap">
                        <div
                          className="w-3 h-3 md:w-4 md:h-4 rounded-full flex-shrink-0"
                          style={{ backgroundColor: activity.age_group.color }}
                        />
                        <span
                          className="text-xs md:text-sm font-medium px-1.5 md:px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor: `${activity.age_group.color}20`,
                            color: activity.age_group.color,
                          }}
                        >
                          {activity.age_group.name}
                        </span>
                        {current && (
                          <span className="ml-auto px-2 md:px-3 py-0.5 md:py-1 bg-primary text-primary-foreground text-xs font-bold rounded-full animate-pulse">
                            AGORA
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg md:text-xl lg:text-2xl font-bold text-foreground truncate">
                        {activity.name}
                      </h3>
                      {activity.description && (
                        <p className="text-muted-foreground text-sm md:text-base lg:text-lg mt-0.5 md:mt-1 line-clamp-1 md:line-clamp-2">
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
