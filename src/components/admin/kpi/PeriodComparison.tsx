import { Card } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface PeriodData {
  periodNumber: number;
  startDate: string;
  endDate: string;
  totalParticipants: number;
  totalPoints: number;
  totalCheckins: number;
  avgPointsPerGuest: number;
}

interface PeriodComparisonProps {
  periods: PeriodData[];
}

const chartConfig = {
  participants: {
    label: "Participantes",
    color: "hsl(var(--primary))"
  },
  checkins: {
    label: "Check-ins",
    color: "hsl(120, 60%, 45%)"
  }
};

export const PeriodComparison = ({ periods }: PeriodComparisonProps) => {
  if (periods.length === 0) {
    return (
      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-2">Comparativo entre Períodos</h3>
        <p className="text-muted-foreground text-sm">
          Nenhum período de ranking encerrado ainda.
        </p>
      </Card>
    );
  }

  const chartData = periods.map(p => ({
    name: `P${p.periodNumber}`,
    fullName: `Período ${p.periodNumber}`,
    dates: `${p.startDate} - ${p.endDate}`,
    participants: p.totalParticipants,
    checkins: p.totalCheckins,
    points: p.totalPoints,
    avgPoints: p.avgPointsPerGuest
  })).reverse(); // Show oldest to newest

  // Calculate trends
  const latestPeriod = periods[0];
  const previousPeriod = periods[1];
  
  const getGrowthInfo = (current: number, previous?: number) => {
    if (!previous) return { icon: Minus, color: "text-muted-foreground", percent: 0 };
    const percent = ((current - previous) / previous) * 100;
    if (percent > 0) return { icon: TrendingUp, color: "text-green-500", percent };
    if (percent < 0) return { icon: TrendingDown, color: "text-red-500", percent };
    return { icon: Minus, color: "text-muted-foreground", percent: 0 };
  };

  const participantsGrowth = getGrowthInfo(
    latestPeriod?.totalParticipants,
    previousPeriod?.totalParticipants
  );
  
  const checkinsGrowth = getGrowthInfo(
    latestPeriod?.totalCheckins,
    previousPeriod?.totalCheckins
  );

  return (
    <Card className="p-4">
      <h3 className="text-lg font-semibold mb-2">Comparativo entre Períodos de Ranking</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Evolução dos últimos {periods.length} períodos
      </p>

      {/* Trend indicators */}
      {previousPeriod && (
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
            <participantsGrowth.icon className={`h-5 w-5 ${participantsGrowth.color}`} />
            <div>
              <p className="text-sm font-medium">Participantes</p>
              <p className={`text-xs ${participantsGrowth.color}`}>
                {participantsGrowth.percent > 0 ? "+" : ""}
                {participantsGrowth.percent.toFixed(1)}% vs período anterior
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
            <checkinsGrowth.icon className={`h-5 w-5 ${checkinsGrowth.color}`} />
            <div>
              <p className="text-sm font-medium">Check-ins</p>
              <p className={`text-xs ${checkinsGrowth.color}`}>
                {checkinsGrowth.percent > 0 ? "+" : ""}
                {checkinsGrowth.percent.toFixed(1)}% vs período anterior
              </p>
            </div>
          </div>
        </div>
      )}

      <ChartContainer config={chartConfig} className="h-[300px]">
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <XAxis 
            dataKey="name" 
            tick={{ fontSize: 12 }}
            tickLine={false}
          />
          <YAxis tick={{ fontSize: 12 }} tickLine={false} />
          <ChartTooltip 
            content={
              <ChartTooltipContent 
                labelFormatter={(_, payload) => {
                  if (payload?.[0]?.payload) {
                    return `${payload[0].payload.fullName}\n${payload[0].payload.dates}`;
                  }
                  return "";
                }}
              />
            } 
          />
          <Legend />
          <Bar 
            dataKey="participants" 
            fill="var(--color-participants)" 
            radius={[4, 4, 0, 0]} 
            name="Participantes"
          />
          <Bar 
            dataKey="checkins" 
            fill="var(--color-checkins)" 
            radius={[4, 4, 0, 0]} 
            name="Check-ins"
          />
        </BarChart>
      </ChartContainer>

      {/* Period details table */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 font-medium">Período</th>
              <th className="text-right py-2 font-medium">Participantes</th>
              <th className="text-right py-2 font-medium">Check-ins</th>
              <th className="text-right py-2 font-medium">Pontos</th>
              <th className="text-right py-2 font-medium">Média/Hóspede</th>
            </tr>
          </thead>
          <tbody>
            {periods.map(period => (
              <tr key={period.periodNumber} className="border-b border-muted">
                <td className="py-2">
                  <span className="font-medium">P{period.periodNumber}</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    {period.startDate}
                  </span>
                </td>
                <td className="text-right py-2">{period.totalParticipants}</td>
                <td className="text-right py-2">{period.totalCheckins}</td>
                <td className="text-right py-2">{period.totalPoints.toLocaleString()}</td>
                <td className="text-right py-2">{period.avgPointsPerGuest.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};
