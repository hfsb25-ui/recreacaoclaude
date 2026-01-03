import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock, Star, WifiOff, User, Crown } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ActivityRating } from "@/components/ActivityRating";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import CheckInButton from "@/components/CheckInButton";
import { useGuestAuth } from "@/hooks/useGuestAuth";
import { getLocalDateString } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Activity {
  id: string;
  name: string;
  description: string;
  activity_date: string;
  start_time: string;
  end_time: string;
  is_master: boolean;
}

interface AgeGroup {
  id: string;
  name: string;
  color: string;
}

const Activities = () => {
  const { ageGroupId } = useParams();
  const navigate = useNavigate();
  const { guest, currentLevel, logout } = useGuestAuth();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [ageGroup, setAgeGroup] = useState<AgeGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedActivityForRating, setSelectedActivityForRating] = useState<Activity | null>(null);
  const [ratings, setRatings] = useState<Record<string, { average: number; count: number }>>({});
  const currentActivityRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    fetchData();
  }, [ageGroupId]);

  useEffect(() => {
    if (!loading && currentActivityRef.current) {
      setTimeout(() => {
        currentActivityRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 100);
    }
  }, [loading, activities]);

  const fetchData = async () => {
    try {
      if (!isOnline) {
        setLoading(false);
        return;
      }

      // Fetch age group
      const { data: groupData } = await supabase
        .from("age_groups")
        .select("*")
        .eq("id", ageGroupId)
        .single();

      if (groupData) {
        setAgeGroup(groupData);
      }

      // Fetch today's activities for this age group and master activities
      const today = getLocalDateString();
      const { data: activitiesData } = await supabase
        .from("activities")
        .select("*")
        .eq("activity_date", today)
        .or(`age_group_id.eq.${ageGroupId},is_master.eq.true`)
        .order("start_time", { ascending: true });

      if (activitiesData) {
        setActivities(activitiesData as Activity[]);
        
        // Fetch ratings for all activities
        const activityIds = activitiesData.map(a => a.id);
        if (activityIds.length > 0) {
          const { data: ratingsData } = await supabase
            .from("activity_ratings")
            .select("activity_id, rating")
            .in("activity_id", activityIds);

          if (ratingsData) {
            const ratingsMap: Record<string, { average: number; count: number }> = {};
            ratingsData.forEach(r => {
              if (!ratingsMap[r.activity_id]) {
                ratingsMap[r.activity_id] = { average: 0, count: 0 };
              }
              ratingsMap[r.activity_id].average += r.rating;
              ratingsMap[r.activity_id].count++;
            });
            
            Object.keys(ratingsMap).forEach(activityId => {
              ratingsMap[activityId].average = 
                ratingsMap[activityId].average / ratingsMap[activityId].count;
            });
            
            setRatings(ratingsMap);
          }
        }
      }
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
    <div className="min-h-screen bg-[var(--gradient-bg)] p-4 sm:p-6 overflow-x-hidden w-full">
      <div className="max-w-4xl mx-auto">
        {guest && (
          <Card className="mb-4 p-3 bg-primary/10 border-primary/20">
            <div className="flex items-center justify-center">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2 hover:bg-primary/20">
                    <User className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-foreground">
                      Olá, {guest.name}!
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="w-56 bg-background z-50">
                  <div className="px-2 py-3 space-y-2">
                    <div className="flex items-center gap-2 px-2">
                      <User className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-semibold text-foreground">{guest.name}</p>
                        <p className="text-xs text-muted-foreground">Quarto {guest.room_number}</p>
                      </div>
                    </div>
                    <div className="border-t border-border my-2"></div>
                    <div className="px-2 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Pontos:</span>
                        <span className="font-bold text-primary">{guest.total_points}</span>
                      </div>
                      {currentLevel && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Nível:</span>
                          <span className="font-bold text-foreground">
                            {currentLevel.badge_emoji} {currentLevel.name}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="border-t border-border my-2"></div>
                    <DropdownMenuItem 
                      onClick={() => {
                        logout();
                        navigate("/");
                      }}
                      className="cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                    >
                      Sair
                    </DropdownMenuItem>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </Card>
        )}
        {!isOnline && (
          <Card className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
            <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
              <WifiOff className="h-5 w-5" />
              <span className="font-medium">Você está offline. Mostrando dados salvos.</span>
            </div>
          </Card>
        )}
        
        <Button
          variant="ghost"
          onClick={() => navigate("/programacao")}
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
                  ref={isHappening ? currentActivityRef : null}
                  className={`p-4 sm:p-6 transition-[var(--transition-smooth)] hover:shadow-[var(--shadow-hover)] ${
                    isHappening
                      ? "bg-gradient-to-r from-primary to-primary/90 text-primary-foreground ring-4 ring-primary/30 sm:scale-105"
                      : activity.is_master
                        ? "bg-destructive/10 border-2 border-destructive hover:scale-[1.02]"
                        : "bg-card hover:scale-[1.02]"
                  }`}
                >
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:justify-between gap-3">
                      <div className="flex-1 min-w-0 w-full">
                        {activity.is_master && !isHappening && (
                          <div className="flex items-center gap-1 text-destructive text-xs font-bold uppercase tracking-wide mb-2">
                            <Crown className="h-3 w-3" />
                            Atividade Master - Todas as idades
                          </div>
                        )}
                        <h3 className={`text-lg sm:text-xl font-semibold mb-2 break-words ${
                          activity.is_master && !isHappening ? "text-destructive" : ""
                        }`}>
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
                        <div className="flex items-center gap-4 flex-wrap">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span className="font-medium text-sm sm:text-base">
                              {activity.start_time.slice(0, 5)} - {activity.end_time.slice(0, 5)}
                            </span>
                          </div>
                          {ratings[activity.id] && (
                            <div className="flex items-center gap-1">
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                              <span className="font-medium text-sm">
                                {ratings[activity.id].average.toFixed(1)} ({ratings[activity.id].count})
                              </span>
                            </div>
                          )}
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
                    
                    <div className="space-y-2">
                      <CheckInButton
                        activityId={activity.id}
                        activityStartTime={activity.start_time}
                        activityEndTime={activity.end_time}
                        activityDate={activity.activity_date}
                      />
                      <Dialog open={selectedActivityForRating?.id === activity.id} onOpenChange={(open) => !open && setSelectedActivityForRating(null)}>
                        <DialogTrigger asChild>
                          <Button
                            variant={isHappening ? "secondary" : "outline"}
                            size="sm"
                            className="w-full"
                            onClick={() => setSelectedActivityForRating(activity)}
                          >
                            <Star className="h-4 w-4 mr-2" />
                            Avaliar Atividade
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Avaliar Atividade</DialogTitle>
                          </DialogHeader>
                          <ActivityRating
                            activityId={activity.id}
                            activityName={activity.name}
                          />
                        </DialogContent>
                      </Dialog>
                    </div>
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
