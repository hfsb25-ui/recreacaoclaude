import { Card } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, Cell, ResponsiveContainer } from "recharts";
import { Users, TrendingUp } from "lucide-react";

interface LevelData {
  level: number;
  name: string;
  emoji: string;
  guestCount: number;
  avgCheckins: number;
  percentOfTotal: number;
}

interface EngagementFunnelProps {
  levelData: LevelData[];
  totalGuests: number;
}

const chartConfig = {
  guests: {
    label: "Hóspedes",
    color: "hsl(var(--primary))"
  }
};

const COLORS = [
  "hsl(var(--primary))",
  "hsl(200, 80%, 50%)",
  "hsl(160, 80%, 45%)",
  "hsl(45, 90%, 50%)",
  "hsl(280, 70%, 55%)",
  "hsl(340, 75%, 55%)"
];

export const EngagementFunnel = ({ levelData, totalGuests }: EngagementFunnelProps) => {
  const chartData = levelData.map((level, index) => ({
    name: `${level.emoji} ${level.name}`,
    shortName: `Nv ${level.level}`,
    guests: level.guestCount,
    avgCheckins: level.avgCheckins,
    percent: level.percentOfTotal,
    color: COLORS[index % COLORS.length]
  }));

  // Calculate progression insights
  const levelTransitions = levelData.map((level, index) => {
    if (index === 0) return null;
    const previousLevel = levelData[index - 1];
    const retentionRate = previousLevel.guestCount > 0 
      ? (level.guestCount / previousLevel.guestCount) * 100 
      : 0;
    return {
      from: previousLevel.level,
      to: level.level,
      retentionRate
    };
  }).filter(Boolean);

  const avgRetention = levelTransitions.length > 0
    ? levelTransitions.reduce((sum, t) => sum + (t?.retentionRate || 0), 0) / levelTransitions.length
    : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Funnel Chart */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Distribuição por Nível</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Hóspedes em cada nível de gamificação
        </p>
        
        <ChartContainer config={chartConfig} className="h-[250px]">
          <BarChart 
            data={chartData} 
            layout="vertical"
            margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
          >
            <XAxis type="number" tick={{ fontSize: 12 }} />
            <YAxis 
              type="category" 
              dataKey="name" 
              tick={{ fontSize: 11 }}
              width={80}
            />
            <ChartTooltip 
              content={
                <ChartTooltipContent 
                  labelFormatter={(value) => value}
                  formatter={(value, name, item) => [
                    `${value} hóspedes (${item.payload.percent.toFixed(1)}%)`,
                    "Quantidade"
                  ]}
                />
              } 
            />
            <Bar dataKey="guests" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </Card>

      {/* Level Details */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-green-500" />
          <h3 className="text-lg font-semibold">Progressão de Níveis</h3>
        </div>
        
        {avgRetention > 0 && (
          <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 mb-4">
            <p className="text-sm">
              <span className="font-medium text-green-700 dark:text-green-400">
                Taxa média de progressão: {avgRetention.toFixed(1)}%
              </span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Percentual de hóspedes que avançam entre níveis
            </p>
          </div>
        )}
        
        <div className="space-y-3">
          {levelData.map((level, index) => (
            <div key={level.level} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
                style={{ backgroundColor: COLORS[index % COLORS.length] + "20" }}
              >
                {level.emoji}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{level.name}</p>
                  <span className="text-xs text-muted-foreground">Nível {level.level}</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{level.guestCount} hóspedes</span>
                  <span>•</span>
                  <span>Média: {level.avgCheckins.toFixed(1)} check-ins</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold" style={{ color: COLORS[index % COLORS.length] }}>
                  {level.percentOfTotal.toFixed(0)}%
                </p>
              </div>
            </div>
          ))}
          
          {levelData.length === 0 && (
            <p className="text-muted-foreground text-sm text-center py-4">
              Nenhum dado de nível disponível
            </p>
          )}
        </div>
      </Card>
    </div>
  );
};
