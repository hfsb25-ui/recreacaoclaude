import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock } from "lucide-react";
import { format, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Activity {
  id: string;
  name: string;
  description: string;
  activity_date: string;
  start_time: string;
  end_time: string;
}

interface AgeGroup {
  id: string;
  name: string;
  color: string;
}

const Activities = () => {
  const { ageGroupId } = useParams();
  const navigate = useNavigate();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [ageGroup, setAgeGroup] = useState<AgeGroup | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [ageGroupId]);

  const fetchData = async () => {
    try {
      // Fetch age group
      const { data: groupData } = await supabase
        .from("age_groups")
        .select("*")
        .eq("id", ageGroupId)
        .single();

      if (groupData) setAgeGroup(groupData);

      // Fetch today's activities
      const today = new Date().toISOString().split("T")[0];
      const { data: activitiesData } = await supabase
        .from("activities")
        .select("*")
        .eq("age_group_id", ageGroupId)
        .eq("activity_date", today)
        .order("start_time", { ascending: true });

      if (activitiesData) setActivities(activitiesData);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const isActivityHappening = (startTime: string, endTime: string) => {
    const now = new Date();
    const [startHour, startMinute] = startTime.split(":").map(Number);
    const [endHour, endMinute] = endTime.split(":").map(Number);

    const start = new Date(now);
    start.setHours(startHour, startMinute, 0);

    const end = new Date(now);
    end.setHours(endHour, endMinute, 0);

    return now >= start && now <= end;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
        <p className="text-foreground text-lg">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--gradient-bg)] p-6">
      <div className="max-w-4xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-6 hover:bg-primary/10 transition-[var(--transition-smooth)]"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>

        <div className="mb-8">
          <div
            className="inline-block px-6 py-2 rounded-full mb-4"
            style={{ backgroundColor: ageGroup?.color || "#00BCD4" }}
          >
            <h1 className="text-3xl font-bold text-white">{ageGroup?.name}</h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Programação de hoje - {format(new Date(), "dd 'de' MMMM", { locale: ptBR })}
          </p>
        </div>

        {activities.length === 0 ? (
          <Card className="p-12 text-center shadow-[var(--shadow-soft)]">
            <p className="text-muted-foreground text-lg">
              Nenhuma atividade programada para hoje.
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => {
              const isHappening = isActivityHappening(
                activity.start_time,
                activity.end_time
              );

              return (
                <Card
                  key={activity.id}
                  className={`p-4 sm:p-6 transition-[var(--transition-smooth)] hover:shadow-[var(--shadow-hover)] ${
                    isHappening
                      ? "bg-gradient-to-r from-primary to-primary/90 text-primary-foreground ring-4 ring-primary/30 sm:scale-105"
                      : "bg-card hover:scale-[1.02]"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row items-start sm:justify-between gap-3">
                    <div className="flex-1 min-w-0 w-full">
                      <h3 className="text-lg sm:text-xl font-semibold mb-2 break-words">
                        {activity.name}
                      </h3>
                      {activity.description && (
                        <p
                          className={`mb-3 break-words ${
                            isHappening ? "text-primary-foreground/90" : "text-muted-foreground"
                          }`}
                        >
                          {activity.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span className="font-medium text-sm sm:text-base">
                          {activity.start_time.slice(0, 5)} - {activity.end_time.slice(0, 5)}
                        </span>
                      </div>
                    </div>
                    {isHappening && (
                      <div className="w-full sm:w-auto sm:ml-4 flex-shrink-0">
                        <span className="inline-block w-full sm:w-auto text-center px-3 py-1.5 sm:px-4 sm:py-2 bg-white/20 backdrop-blur-sm rounded-full text-xs sm:text-sm font-bold uppercase tracking-wide">
                          Acontecendo agora!
                        </span>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Activities;
