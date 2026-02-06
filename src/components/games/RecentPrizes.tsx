import { Gift, Gamepad2, XCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { SpinResult } from "@/hooks/useGameSpins";

interface RecentPrizesProps {
  results: SpinResult[];
}

export const RecentPrizes = ({ results }: RecentPrizesProps) => {
  if (results.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Histórico de Prêmios</h3>
        <p className="text-sm text-muted-foreground text-center py-4">
          Você ainda não girou a roda. Faça seu primeiro giro!
        </p>
      </Card>
    );
  }

  const getIcon = (type: string) => {
    switch (type) {
      case "points":
        return <Gift className="h-4 w-4 text-green-500" />;
      case "minigame":
        return <Gamepad2 className="h-4 w-4 text-orange-500" />;
      default:
        return <XCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getLabel = (result: SpinResult) => {
    switch (result.result_type) {
      case "points":
        return `+${result.points_won} pontos`;
      case "minigame":
        return "Mini-Game Desbloqueado";
      default:
        return "Tente Novamente";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Histórico de Prêmios</h3>
      <div className="space-y-3">
        {results.map((result) => (
          <div
            key={result.id}
            className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
          >
            <div className="flex items-center gap-3">
              {getIcon(result.result_type)}
              <div>
                <p className="font-medium text-sm">{getLabel(result)}</p>
                <p className="text-xs text-muted-foreground">{formatDate(result.created_at)}</p>
              </div>
            </div>
            {result.result_type === "points" && (
              <span className="text-green-600 font-bold text-sm">+{result.points_won}</span>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
};
