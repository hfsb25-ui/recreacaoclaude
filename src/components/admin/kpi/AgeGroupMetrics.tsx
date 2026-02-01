import { Card } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from "recharts";
import { Users, Trophy, TrendingUp } from "lucide-react";

export interface AgeGroupData {
  id: string;
  name: string;
  color: string;
  totalCheckins: number;
  totalGuests: number;
  avgCheckins: number;
  avgRating: number;
  engagementScore: number;
}

interface AgeGroupMetricsProps {
  data: AgeGroupData[];
}

const chartConfig = {
  checkins: {
    label: "Check-ins",
    color: "hsl(var(--primary))"
  }
};

export const AgeGroupMetrics = ({ data }: AgeGroupMetricsProps) => {
  const sortedByEngagement = [...data].sort((a, b) => b.engagementScore - a.engagementScore);
  const totalCheckins = data.reduce((sum, d) => sum + d.totalCheckins, 0);

  const pieData = data.map(d => ({
    name: d.name,
    value: d.totalCheckins,
    color: d.color,
    percent: totalCheckins > 0 ? (d.totalCheckins / totalCheckins) * 100 : 0
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Pie Chart */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Distribuição por Faixa</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Participação nos check-ins por faixa etária
        </p>

        {data.length === 0 ? (
          <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">
            Nenhum dado disponível
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[250px]">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
                label={({ name, percent }) => `${name}: ${percent.toFixed(0)}%`}
                labelLine={false}
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <ChartTooltip 
                content={
                  <ChartTooltipContent 
                    formatter={(value, name) => [`${value} check-ins`, name]}
                  />
                } 
              />
            </PieChart>
          </ChartContainer>
        )}
      </Card>

      {/* Ranking by Engagement */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="h-5 w-5 text-yellow-500" />
          <h3 className="text-lg font-semibold">Ranking de Engajamento</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Faixas ordenadas por engajamento (check-ins × avaliação)
        </p>

        <div className="space-y-3">
          {sortedByEngagement.map((ageGroup, index) => (
            <div
              key={ageGroup.id}
              className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-sm"
                style={{ backgroundColor: ageGroup.color }}
              >
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium">{ageGroup.name}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{ageGroup.totalGuests} hóspedes</span>
                  <span>•</span>
                  <span>{ageGroup.totalCheckins} check-ins</span>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-green-500" />
                  <span className="font-medium text-sm">
                    {ageGroup.avgCheckins.toFixed(1)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">média/hóspede</p>
              </div>
            </div>
          ))}

          {data.length === 0 && (
            <p className="text-muted-foreground text-sm text-center py-4">
              Nenhuma faixa etária cadastrada
            </p>
          )}
        </div>
      </Card>

      {/* Detailed Comparison Table */}
      <Card className="p-4 lg:col-span-2">
        <h3 className="text-lg font-semibold mb-4">Comparativo Detalhado</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 font-medium">Faixa Etária</th>
                <th className="text-right py-2 font-medium">Hóspedes</th>
                <th className="text-right py-2 font-medium">Check-ins</th>
                <th className="text-right py-2 font-medium">Média/Hóspede</th>
                <th className="text-right py-2 font-medium">Avaliação Média</th>
                <th className="text-right py-2 font-medium">% do Total</th>
              </tr>
            </thead>
            <tbody>
              {data.map(ageGroup => (
                <tr key={ageGroup.id} className="border-b border-muted hover:bg-muted/50">
                  <td className="py-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: ageGroup.color }}
                      />
                      <span className="font-medium">{ageGroup.name}</span>
                    </div>
                  </td>
                  <td className="text-right py-2">{ageGroup.totalGuests}</td>
                  <td className="text-right py-2">{ageGroup.totalCheckins}</td>
                  <td className="text-right py-2">{ageGroup.avgCheckins.toFixed(1)}</td>
                  <td className="text-right py-2">
                    {ageGroup.avgRating > 0 ? (
                      <span className="inline-flex items-center gap-1">
                        {ageGroup.avgRating.toFixed(1)} ★
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="text-right py-2">
                    {totalCheckins > 0
                      ? ((ageGroup.totalCheckins / totalCheckins) * 100).toFixed(1)
                      : 0}
                    %
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
