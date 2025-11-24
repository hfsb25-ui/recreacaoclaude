import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

interface Winner {
  id: string;
  guest_name: string;
  room_number: string;
  final_position: number;
  total_points: number;
  total_checkins: number;
  prize_name: string;
  ranking_periods: {
    period_number: number;
    start_date: string;
    end_date: string;
  };
}

const HallOfFame = () => {
  const navigate = useNavigate();
  const [winners, setWinners] = useState<Winner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWinners();
  }, []);

  const fetchWinners = async () => {
    const { data } = await supabase
      .from("ranking_winners")
      .select("*, ranking_periods(*)")
      .order("created_at", { ascending: false });

    if (data) {
      setWinners(data);
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

  const groupedWinners = winners.reduce((acc, winner) => {
    const periodKey = winner.ranking_periods.period_number;
    if (!acc[periodKey]) {
      acc[periodKey] = {
        period: winner.ranking_periods,
        winners: [],
      };
    }
    acc[periodKey].winners.push(winner);
    return acc;
  }, {} as Record<number, { period: any; winners: Winner[] }>);

  return (
    <div className="min-h-screen bg-[var(--gradient-bg)] p-6">
      <div className="max-w-4xl mx-auto">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/ranking")}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar ao Ranking
        </Button>

        <Card className="p-8">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🏆</div>
            <h1 className="text-3xl font-bold mb-2">Hall da Fama</h1>
            <p className="text-muted-foreground">
              Os maiores campeões da nossa recreação
            </p>
          </div>

          {loading ? (
            <p className="text-center text-muted-foreground">Carregando vencedores...</p>
          ) : Object.keys(groupedWinners).length === 0 ? (
            <p className="text-center text-muted-foreground">
              Ainda não há vencedores registrados
            </p>
          ) : (
            <div className="space-y-8">
              {Object.values(groupedWinners).map(({ period, winners }) => (
                <div key={period.id} className="border-b pb-6 last:border-b-0">
                  <h3 className="text-lg font-semibold mb-4">
                    Período {period.period_number} •{" "}
                    {new Date(period.start_date).toLocaleDateString("pt-BR")} -{" "}
                    {new Date(period.end_date).toLocaleDateString("pt-BR")}
                  </h3>
                  <div className="space-y-3">
                    {winners
                      .sort((a, b) => a.final_position - b.final_position)
                      .map((winner) => (
                        <div
                          key={winner.id}
                          className="flex items-center justify-between p-4 bg-gradient-to-r from-primary/20 to-primary/5 rounded-lg"
                        >
                          <div className="flex items-center gap-4">
                            <div className="text-3xl">
                              {getMedalEmoji(winner.final_position)}
                            </div>
                            <div>
                              <p className="font-semibold">{winner.guest_name}</p>
                              <p className="text-sm text-muted-foreground">
                                Quarto {winner.room_number}
                              </p>
                              <p className="text-sm text-primary font-medium">
                                {winner.prize_name}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-bold">{winner.total_points} pts</p>
                            <p className="text-sm text-muted-foreground">
                              {winner.total_checkins} check-ins
                            </p>
                          </div>
                        </div>
                      ))}
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

export default HallOfFame;
