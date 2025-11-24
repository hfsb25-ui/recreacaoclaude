import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Award, Star, TrendingUp } from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  ResponsiveContainer,
} from "recharts";

const STAR_COLORS = {
  5: "hsl(142, 71%, 45%)",
  4: "hsl(78, 70%, 50%)",
  3: "hsl(48, 96%, 53%)",
  2: "hsl(25, 95%, 53%)",
  1: "hsl(4, 90%, 58%)",
};

interface RatingsChartsProps {
  stats: {
    starDistribution: Array<{ name: string; value: number; star: number }>;
    activityCountData: Array<{ name: string; count: number }>;
    activityAvgData: Array<{ name: string; average: number }>;
    totalRatings: number;
    overallAverage: number;
    mostRated: { name: string; count: number };
    bestRated: { name: string; average: number };
  };
}

export const RatingsCharts = ({ stats }: RatingsChartsProps) => {
  return (
    <>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total de Avaliações
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRatings}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Média Geral</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.overallAverage.toFixed(1)} ⭐
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mais Avaliada</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold">{stats.mostRated.name}</div>
            <p className="text-xs text-muted-foreground">
              {stats.mostRated.count} avaliações
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Melhor Avaliada
            </CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold">{stats.bestRated.name}</div>
            <p className="text-xs text-muted-foreground">
              {stats.bestRated.average.toFixed(1)} ⭐
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Star Distribution Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição de Notas</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                value: {
                  label: "Quantidade",
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.starDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name} (${(percent * 100).toFixed(0)}%)`
                    }
                    outerRadius={80}
                    fill="hsl(var(--primary))"
                    dataKey="value"
                  >
                    {stats.starDistribution.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          STAR_COLORS[entry.star as keyof typeof STAR_COLORS]
                        }
                      />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Activity Count Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Quantidade por Atividade</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                count: {
                  label: "Avaliações",
                  color: "hsl(var(--primary))",
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.activityCountData} layout="vertical">
                  <XAxis type="number" />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={100}
                    tick={{ fontSize: 12 }}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={4} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Average Rating Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Média por Atividade</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              average: {
                label: "Média",
              },
            }}
            className="h-[300px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.activityAvgData}>
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={100}
                />
                <YAxis domain={[0, 5]} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="average" radius={4}>
                  {stats.activityAvgData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        entry.average >= 4.5
                          ? STAR_COLORS[5]
                          : entry.average >= 3.5
                          ? STAR_COLORS[4]
                          : entry.average >= 2.5
                          ? STAR_COLORS[3]
                          : entry.average >= 1.5
                          ? STAR_COLORS[2]
                          : STAR_COLORS[1]
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </>
  );
};
