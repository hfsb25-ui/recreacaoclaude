import { Card } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend } from "recharts";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp } from "lucide-react";
import { useState } from "react";

export interface TrendDataPoint {
  date: string;
  label: string;
  checkins: number;
  ratings: number;
  visits: number;
  registrations: number;
}

interface TrendChartProps {
  data: TrendDataPoint[];
}

const chartConfig = {
  checkins: {
    label: "Check-ins",
    color: "hsl(var(--primary))"
  },
  ratings: {
    label: "Avaliações",
    color: "hsl(45, 90%, 50%)"
  },
  visits: {
    label: "Acessos",
    color: "hsl(200, 80%, 50%)"
  },
  registrations: {
    label: "Cadastros",
    color: "hsl(160, 80%, 45%)"
  }
};

type MetricKey = keyof typeof chartConfig;

export const TrendChart = ({ data }: TrendChartProps) => {
  const [selectedMetrics, setSelectedMetrics] = useState<MetricKey[]>(["checkins", "visits"]);

  const toggleMetric = (metric: MetricKey) => {
    setSelectedMetrics(prev => {
      if (prev.includes(metric)) {
        if (prev.length === 1) return prev; // Keep at least one
        return prev.filter(m => m !== metric);
      }
      return [...prev, metric];
    });
  };

  // Calculate totals and trends
  const totals = data.reduce(
    (acc, day) => ({
      checkins: acc.checkins + day.checkins,
      ratings: acc.ratings + day.ratings,
      visits: acc.visits + day.visits,
      registrations: acc.registrations + day.registrations
    }),
    { checkins: 0, ratings: 0, visits: 0, registrations: 0 }
  );

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Tendência Temporal</h3>
        </div>
      </div>

      {/* Metric Toggle Buttons */}
      <div className="flex flex-wrap gap-2 mb-4">
        {(Object.keys(chartConfig) as MetricKey[]).map(metric => (
          <button
            key={metric}
            onClick={() => toggleMetric(metric)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              selectedMetrics.includes(metric)
                ? "text-white"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
            style={{
              backgroundColor: selectedMetrics.includes(metric) 
                ? chartConfig[metric].color 
                : undefined
            }}
          >
            {chartConfig[metric].label}
            <span className="ml-2 opacity-75">
              {totals[metric]}
            </span>
          </button>
        ))}
      </div>

      {data.length === 0 ? (
        <div className="flex items-center justify-center h-[300px] text-muted-foreground">
          Nenhum dado disponível para o período selecionado
        </div>
      ) : (
        <ChartContainer config={chartConfig} className="h-[300px]">
          <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="label" 
              tick={{ fontSize: 11 }}
              tickLine={false}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Legend />
            {selectedMetrics.includes("checkins") && (
              <Line
                type="monotone"
                dataKey="checkins"
                stroke={chartConfig.checkins.color}
                strokeWidth={2}
                dot={{ fill: chartConfig.checkins.color, strokeWidth: 2 }}
                name="Check-ins"
              />
            )}
            {selectedMetrics.includes("ratings") && (
              <Line
                type="monotone"
                dataKey="ratings"
                stroke={chartConfig.ratings.color}
                strokeWidth={2}
                dot={{ fill: chartConfig.ratings.color, strokeWidth: 2 }}
                name="Avaliações"
              />
            )}
            {selectedMetrics.includes("visits") && (
              <Line
                type="monotone"
                dataKey="visits"
                stroke={chartConfig.visits.color}
                strokeWidth={2}
                dot={{ fill: chartConfig.visits.color, strokeWidth: 2 }}
                name="Acessos"
              />
            )}
            {selectedMetrics.includes("registrations") && (
              <Line
                type="monotone"
                dataKey="registrations"
                stroke={chartConfig.registrations.color}
                strokeWidth={2}
                dot={{ fill: chartConfig.registrations.color, strokeWidth: 2 }}
                name="Cadastros"
              />
            )}
          </LineChart>
        </ChartContainer>
      )}
    </Card>
  );
};
