import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Trophy } from "lucide-react";

interface RankingGuest {
  id: string;
  name: string;
  room_number: string;
  total_points: number;
  current_level: number;
}

interface RankingPeriod {
  id: string;
  start_date: string;
  end_date: string;
}

const Ranking = () => {
  const navigate = useNavigate();
  const [guests, setGuests] = useState<RankingGuest[]>([]);
  const [period, setPeriod] = useState<RankingPeriod | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRanking();
  }, []);

  const fetchRanking = async () => {
    // Fetch active period
    const { data: periodData } = await supabase
      .from("ranking_periods")
      .select("*")
      .eq("is_active", true)
      .single();

    if (periodData) {
      setPeriod(periodData);
    }

    // Fetch top guests
    const { data: guestsData } = await supabase
      .from("guests")
      .select("*")
      .order("total_points", { ascending: false })
      .limit(10);

    if (guestsData) {
      setGuests(guestsData);
    }

    setLoading(false);
  };

  const getMedalEmoji = (position: number) => {
    switch (position) {
      case 1:
        return "🥇";
      case 2:
        return "🥈";
      case 3:
        return "🥉";
      default:
        return "";
    }
  };

  return (
    <div className="min-h-screen bg-[var(--gradient-bg)] p-6">
      <div className="max-w-4xl mx-auto">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/guest-profile")}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar ao Perfil
        </Button>

        <Card className="p-8">
          <div className="text-center mb-8">
            <Trophy className="h-16 w-16 mx-auto mb-4 text-primary" />
            <h1 className="text-3xl font-bold mb-2">Ranking Semanal</h1>
            {period && (
              <p className="text-muted-foreground">
                Período: {new Date(period.start_date).toLocaleDateString("pt-BR")} -{" "}
                {new Date(period.end_date).toLocaleDateString("pt-BR")}
              </p>
            )}
          </div>

          {loading ? (
            <p className="text-center text-muted-foreground">Carregando ranking...</p>
          ) : guests.length === 0 ? (
            <p className="text-center text-muted-foreground">
              Nenhum hóspede cadastrado ainda
            </p>
          ) : (
            <div className="space-y-3">
              {guests.map((guest, index) => (
                <div
                  key={guest.id}
                  className={`flex items-center justify-between p-4 rounded-lg ${
                    index < 3
                      ? "bg-gradient-to-r from-primary/20 to-primary/5"
                      : "bg-muted"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="text-2xl font-bold w-8">
                      {getMedalEmoji(index + 1) || `${index + 1}º`}
                    </div>
                    <div>
                      <p className="font-semibold">{guest.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Quarto {guest.room_number} • Nível {guest.current_level}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary">
                      {guest.total_points}
                    </p>
                    <p className="text-sm text-muted-foreground">pontos</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-8 text-center">
            <Button
              onClick={() => navigate("/hall-of-fame")}
              variant="outline"
            >
              🏆 Ver Hall da Fama
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Ranking;
