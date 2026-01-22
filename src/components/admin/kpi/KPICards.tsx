import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus, Users, Activity, Star, Target, Calendar, Percent } from "lucide-react";

interface KPICardsProps {
  participationRate: number;
  avgCheckinsPerGuest: number;
  ratingRate: number;
  satisfactionScore: number;
  retentionRate: number;
  totalActiveGuests: number;
  previousParticipationRate?: number;
  previousSatisfaction?: number;
}

const getGrowthIcon = (current: number, previous?: number) => {
  if (previous === undefined) return <Minus className="h-4 w-4 text-muted-foreground" />;
  const diff = current - previous;
  if (diff > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
  if (diff < 0) return <TrendingDown className="h-4 w-4 text-red-500" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
};

const getGrowthText = (current: number, previous?: number) => {
  if (previous === undefined) return null;
  const diff = current - previous;
  const color = diff > 0 ? "text-green-500" : diff < 0 ? "text-red-500" : "text-muted-foreground";
  return (
    <span className={`text-xs ${color}`}>
      {diff > 0 ? "+" : ""}{diff.toFixed(1)}% vs anterior
    </span>
  );
};

export const KPICards = ({
  participationRate,
  avgCheckinsPerGuest,
  ratingRate,
  satisfactionScore,
  retentionRate,
  totalActiveGuests,
  previousParticipationRate,
  previousSatisfaction
}: KPICardsProps) => {
  const kpis = [
    {
      title: "Taxa de Participação",
      value: `${participationRate.toFixed(1)}%`,
      subtitle: "Hóspedes com 1+ check-in",
      icon: Target,
      color: "text-primary",
      bgColor: "bg-primary/10",
      previous: previousParticipationRate,
      current: participationRate
    },
    {
      title: "Média de Check-ins",
      value: avgCheckinsPerGuest.toFixed(1),
      subtitle: "Por hóspede ativo",
      icon: Activity,
      color: "text-green-600",
      bgColor: "bg-green-100"
    },
    {
      title: "Taxa de Avaliação",
      value: `${ratingRate.toFixed(1)}%`,
      subtitle: "Atividades avaliadas após check-in",
      icon: Percent,
      color: "text-blue-600",
      bgColor: "bg-blue-100"
    },
    {
      title: "Score de Satisfação",
      value: satisfactionScore.toFixed(2),
      subtitle: "Média geral das avaliações",
      icon: Star,
      color: "text-yellow-600",
      bgColor: "bg-yellow-100",
      previous: previousSatisfaction,
      current: satisfactionScore
    },
    {
      title: "Taxa de Retenção",
      value: `${retentionRate.toFixed(1)}%`,
      subtitle: "Participação em múltiplos dias",
      icon: Calendar,
      color: "text-purple-600",
      bgColor: "bg-purple-100"
    },
    {
      title: "Hóspedes Ativos",
      value: totalActiveGuests.toString(),
      subtitle: "Com pelo menos 1 atividade",
      icon: Users,
      color: "text-cyan-600",
      bgColor: "bg-cyan-100"
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {kpis.map((kpi, index) => (
        <Card key={index} className="p-4 relative overflow-hidden">
          <div className="flex items-start justify-between mb-2">
            <div className={`p-2 rounded-lg ${kpi.bgColor}`}>
              <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
            </div>
            {kpi.previous !== undefined && getGrowthIcon(kpi.current!, kpi.previous)}
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold">{kpi.value}</p>
            <p className="text-xs font-medium text-foreground">{kpi.title}</p>
            <p className="text-xs text-muted-foreground">{kpi.subtitle}</p>
            {kpi.previous !== undefined && getGrowthText(kpi.current!, kpi.previous)}
          </div>
        </Card>
      ))}
    </div>
  );
};
