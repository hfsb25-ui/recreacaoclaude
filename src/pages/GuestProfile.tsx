import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGuestAuth } from "@/hooks/useGuestAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Trophy, LogOut, Calendar } from "lucide-react";
import { toast } from "sonner";

interface CheckIn {
  id: string;
  checked_in_at: string;
  points_earned: number;
  activities: {
    name: string;
  };
}

const GuestProfile = () => {
  const navigate = useNavigate();
  const { guest, currentLevel, nextLevel, logout, refreshGuest, loading: guestLoading } = useGuestAuth();
  const [checkins, setCheckins] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Wait for guest data to load before checking
    if (guestLoading) return;
    
    if (!guest) {
      navigate("/guest-auth");
      return;
    }

    fetchCheckins();
  }, [guest, guestLoading, navigate]);

  const fetchCheckins = async () => {
    if (!guest) return;

    const { data } = await supabase
      .from("activity_checkins")
      .select("*, activities(name)")
      .eq("guest_id", guest.id)
      .order("checked_in_at", { ascending: false })
      .limit(10);

    if (data) {
      setCheckins(data);
    }
    setLoading(false);
  };

  const handleLogout = () => {
    logout();
    toast.success("Logout realizado com sucesso!");
    navigate("/");
  };

  if (guestLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--gradient-bg)]">
        <p className="text-foreground text-lg">Carregando perfil...</p>
      </div>
    );
  }

  if (!guest || !currentLevel) {
    return null;
  }

  const progressToNextLevel = nextLevel
    ? ((guest.total_points - currentLevel.min_points) /
        (nextLevel.min_points - currentLevel.min_points)) *
      100
    : 100;

  return (
    <div className="min-h-screen bg-[var(--gradient-bg)] p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </div>

        <Card className="p-8">
          <div className="text-center mb-6">
            <div className="text-6xl mb-4">{currentLevel.badge_emoji}</div>
            <h1 className="text-3xl font-bold mb-2">{guest.name}</h1>
            <p className="text-muted-foreground">Quarto {guest.room_number}</p>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="font-semibold">
                  {currentLevel.name} - Nível {currentLevel.level_number}
                </span>
                {nextLevel && (
                  <span className="text-sm text-muted-foreground">
                    Próximo: {nextLevel.name} {nextLevel.badge_emoji}
                  </span>
                )}
              </div>
              <Progress value={progressToNextLevel} className="h-3" />
              <div className="flex justify-between mt-2 text-sm text-muted-foreground">
                <span>{guest.total_points} pontos</span>
                {nextLevel && <span>{nextLevel.min_points} pontos</span>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
              <Button
                onClick={() => navigate("/programacao")}
                className="w-full bg-orange-500 hover:bg-orange-600"
              >
                <Calendar className="h-4 w-4 mr-2" />
                Acessar Programação
              </Button>
              <Button
                onClick={() => navigate("/ranking")}
                className="w-full"
              >
                <Trophy className="h-4 w-4 mr-2" />
                Ver Ranking
              </Button>
              <Button
                onClick={() => navigate("/hall-of-fame")}
                variant="outline"
                className="w-full"
              >
                🏆 Hall da Fama
              </Button>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">Últimos Check-ins</h2>
          {loading ? (
            <p className="text-muted-foreground">Carregando...</p>
          ) : checkins.length === 0 ? (
            <p className="text-muted-foreground">
              Você ainda não fez check-in em nenhuma atividade
            </p>
          ) : (
            <div className="space-y-3">
              {checkins.map((checkin) => (
                <div
                  key={checkin.id}
                  className="flex justify-between items-center p-3 bg-muted rounded-lg"
                >
                  <div>
                    <p className="font-medium">{checkin.activities.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(checkin.checked_in_at).toLocaleString("pt-BR")}
                    </p>
                  </div>
                  <div className="text-primary font-bold">
                    +{checkin.points_earned} pts
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default GuestProfile;
