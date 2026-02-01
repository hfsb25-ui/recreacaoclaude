import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { TrendingUp, TrendingDown, Minus, Users, Activity, Star, Target, Calendar, Percent, ThumbsUp, ArrowRightLeft, Info } from "lucide-react";

interface KPICardsProps {
  participationRate: number;
  avgCheckinsPerGuest: number;
  ratingRate: number;
  satisfactionScore: number;
  retentionRate: number;
  totalActiveGuests: number;
  previousParticipationRate?: number;
  previousSatisfaction?: number;
  // New metrics
  nps?: number;
  previousNps?: number;
  conversionRate?: number;
  previousConversionRate?: number;
  weeklyGrowth?: number;
}

const getGrowthIcon = (current: number, previous?: number) => {
  if (previous === undefined) return <Minus className="h-4 w-4 text-muted-foreground" />;
  const diff = current - previous;
  if (diff > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
  if (diff < 0) return <TrendingDown className="h-4 w-4 text-red-500" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
};

const getGrowthText = (current: number, previous?: number, isPercentage = false) => {
  if (previous === undefined) return null;
  const diff = current - previous;
  const percentChange = previous !== 0 ? ((diff / previous) * 100) : 0;
  const color = diff > 0 ? "text-green-500" : diff < 0 ? "text-red-500" : "text-muted-foreground";
  
  if (isPercentage) {
    return (
      <span className={`text-xs ${color}`}>
        {diff > 0 ? "+" : ""}{diff.toFixed(1)}pp vs anterior
      </span>
    );
  }
  
  return (
    <span className={`text-xs ${color}`}>
      {percentChange > 0 ? "+" : ""}{percentChange.toFixed(1)}% vs anterior
    </span>
  );
};

const getNpsColor = (nps: number) => {
  if (nps >= 50) return "text-green-600";
  if (nps >= 0) return "text-yellow-600";
  return "text-red-600";
};

export const KPICards = ({
  participationRate,
  avgCheckinsPerGuest,
  ratingRate,
  satisfactionScore,
  retentionRate,
  totalActiveGuests,
  previousParticipationRate,
  previousSatisfaction,
  nps = 0,
  previousNps,
  conversionRate = 0,
  previousConversionRate,
  weeklyGrowth = 0
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
      current: participationRate,
      isPercentage: true,
      tooltip: "Percentual de hóspedes cadastrados que fizeram pelo menos um check-in em atividades.",
      formula: "(Hóspedes com check-in / Total de hóspedes) × 100"
    },
    {
      title: "Média de Check-ins",
      value: avgCheckinsPerGuest.toFixed(1),
      subtitle: "Por hóspede ativo",
      icon: Activity,
      color: "text-green-600",
      bgColor: "bg-green-100 dark:bg-green-900/30",
      tooltip: "Quantidade média de check-ins por hóspede que participou de atividades.",
      formula: "Total de check-ins / Hóspedes com 1+ check-in"
    },
    {
      title: "Taxa de Avaliação",
      value: `${ratingRate.toFixed(1)}%`,
      subtitle: "Atividades avaliadas após check-in",
      icon: Percent,
      color: "text-blue-600",
      bgColor: "bg-blue-100 dark:bg-blue-900/30",
      tooltip: "Percentual de check-ins que resultaram em avaliação.",
      formula: "(Total de avaliações / Total de check-ins) × 100"
    },
    {
      title: "Score de Satisfação",
      value: satisfactionScore.toFixed(2),
      subtitle: "Média geral das avaliações",
      icon: Star,
      color: "text-yellow-600",
      bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
      previous: previousSatisfaction,
      current: satisfactionScore,
      tooltip: "Média aritmética de todas as avaliações (1-5 estrelas).",
      formula: "Soma das avaliações / Total de avaliações"
    },
    {
      title: "Taxa de Retenção",
      value: `${retentionRate.toFixed(1)}%`,
      subtitle: "Participação em múltiplos dias",
      icon: Calendar,
      color: "text-purple-600",
      bgColor: "bg-purple-100 dark:bg-purple-900/30",
      tooltip: "Percentual de hóspedes ativos que fizeram check-in em mais de um dia.",
      formula: "(Hóspedes com check-in em 2+ dias / Hóspedes ativos) × 100"
    },
    {
      title: "Hóspedes Ativos",
      value: totalActiveGuests.toString(),
      subtitle: "Com pelo menos 1 atividade",
      icon: Users,
      color: "text-cyan-600",
      bgColor: "bg-cyan-100 dark:bg-cyan-900/30",
      tooltip: "Número total de hóspedes que fizeram pelo menos um check-in.",
      formula: "Contagem de hóspedes únicos com check-in"
    },
    {
      title: "NPS Estimado",
      value: nps.toFixed(0),
      subtitle: "Net Promoter Score",
      icon: ThumbsUp,
      color: getNpsColor(nps),
      bgColor: nps >= 50 ? "bg-green-100 dark:bg-green-900/30" : nps >= 0 ? "bg-yellow-100 dark:bg-yellow-900/30" : "bg-red-100 dark:bg-red-900/30",
      previous: previousNps,
      current: nps,
      tooltip: "NPS estimado baseado nas avaliações. Promotores (5★) - Detratores (1-2★).",
      formula: "((5★ - (1★+2★)) / Total) × 100"
    },
    {
      title: "Taxa de Conversão",
      value: `${conversionRate.toFixed(1)}%`,
      subtitle: "Visitantes → Hóspedes ativos",
      icon: ArrowRightLeft,
      color: "text-emerald-600",
      bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
      previous: previousConversionRate,
      current: conversionRate,
      isPercentage: true,
      tooltip: "Percentual de visitantes do site que se tornaram hóspedes com check-in.",
      formula: "(Hóspedes com check-in / Visitantes únicos) × 100"
    }
  ];

  return (
    <TooltipProvider>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        {kpis.map((kpi, index) => (
          <Card key={index} className="p-4 relative overflow-hidden hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-2">
              <div className={`p-2 rounded-lg ${kpi.bgColor}`}>
                <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
              </div>
              <div className="flex items-center gap-1">
                {kpi.previous !== undefined && getGrowthIcon(kpi.current!, kpi.previous)}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="p-1 rounded-full hover:bg-muted">
                      <Info className="h-3 w-3 text-muted-foreground" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[250px]">
                    <p className="font-medium mb-1">{kpi.title}</p>
                    <p className="text-xs text-muted-foreground mb-2">{kpi.tooltip}</p>
                    <p className="text-xs font-mono bg-muted px-2 py-1 rounded">{kpi.formula}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold">{kpi.value}</p>
              <p className="text-xs font-medium text-foreground">{kpi.title}</p>
              <p className="text-xs text-muted-foreground">{kpi.subtitle}</p>
              {kpi.previous !== undefined && getGrowthText(kpi.current!, kpi.previous, kpi.isPercentage)}
            </div>
          </Card>
        ))}
      </div>
    </TooltipProvider>
  );
};
