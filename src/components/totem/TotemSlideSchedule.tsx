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
        <div className="flex-1 min-h-0">
          <div className="grid grid-cols-2 gap-3 md:gap-4 lg:gap-6 h-full">
            {activities.slice(0, 4).map((activity) => {
              const current = isCurrentActivity(activity.start_time, activity.end_time);

              return (
                <div
                  key={activity.id}
                  className="p-4 md:p-5 lg:p-6 rounded-xl md:rounded-2xl border-2 transition-all duration-500 border-primary bg-primary/10 shadow-lg shadow-primary/20 flex flex-col"
                >
                  <div className="flex items-start gap-3 md:gap-4 h-full">
                    {/* Time */}
                    <div className="flex-shrink-0 text-center">
                      <div className="w-16 h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 rounded-xl flex flex-col items-center justify-center bg-primary text-primary-foreground">
                        <Clock className="w-5 h-5 md:w-6 md:h-6 lg:w-7 lg:h-7 mb-1" />
                        <span className="text-lg md:text-xl lg:text-2xl font-bold">
                          {activity.start_time.slice(0, 5)}
                        </span>
                      </div>
                      <p className="text-sm md:text-base lg:text-lg text-muted-foreground mt-1">
                        até {activity.end_time.slice(0, 5)}
                      </p>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 flex flex-col">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <div
                          className="w-4 h-4 md:w-5 md:h-5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: activity.age_group.color }}
                        />
                        <span
                          className="text-sm md:text-base lg:text-lg font-medium px-2 md:px-3 py-0.5 md:py-1 rounded-full"
                          style={{
                            backgroundColor: `${activity.age_group.color}20`,
                            color: activity.age_group.color,
                          }}
                        >
                          {activity.age_group.name}
                        </span>
                        <span className="ml-auto px-3 md:px-4 py-1 bg-primary text-primary-foreground text-sm md:text-base font-bold rounded-full animate-pulse">
                          AGORA
                        </span>
                      </div>
                      <h3 className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground line-clamp-2">
                        {activity.name}
                      </h3>
                      {activity.description && (
                        <p className="text-muted-foreground text-base md:text-lg lg:text-xl mt-1 md:mt-2 line-clamp-2">
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
