import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, Trash2, TrendingUp, Activity, Award } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
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
  Legend,
} from "recharts";

interface Rating {
  id: string;
  activity_id: string;
  guest_name: string;
  room_number: string | null;
  rating: number;
  comment: string | null;
  created_at: string;
  activities: {
    name: string;
  };
}

const STAR_COLORS = {
  5: "hsl(142, 71%, 45%)", // green
  4: "hsl(78, 70%, 50%)", // lime
  3: "hsl(48, 96%, 53%)", // yellow
  2: "hsl(25, 95%, 53%)", // orange
  1: "hsl(4, 90%, 58%)", // red
};

export const RatingsManager = () => {
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);

  const calculateStats = () => {
    if (ratings.length === 0) return null;

    // Distribuição de estrelas
    const starDistribution = [1, 2, 3, 4, 5].map((star) => ({
      name: `${star}★`,
      value: ratings.filter((r) => r.rating === star).length,
      star,
    }));

    // Estatísticas por atividade
    const activityStats = ratings.reduce((acc, rating) => {
      const activityName = rating.activities.name;
      if (!acc[activityName]) {
        acc[activityName] = { name: activityName, ratings: [], total: 0 };
      }
      acc[activityName].ratings.push(rating.rating);
      acc[activityName].total++;
      return acc;
    }, {} as Record<string, { name: string; ratings: number[]; total: number }>);

    const activityCountData = Object.values(activityStats)
      .map((a) => ({ name: a.name, count: a.total }))
      .sort((a, b) => b.count - a.count);

    const activityAvgData = Object.values(activityStats)
      .map((a) => ({
        name: a.name,
        average: a.ratings.reduce((sum, r) => sum + r, 0) / a.ratings.length,
      }))
      .sort((a, b) => b.average - a.average);

    // Métricas gerais
    const totalRatings = ratings.length;
    const overallAverage =
      ratings.reduce((sum, r) => sum + r.rating, 0) / totalRatings;
    const mostRated = activityCountData[0];
    const bestRated = activityAvgData[0];

    return {
      starDistribution,
      activityCountData,
      activityAvgData,
      totalRatings,
      overallAverage,
      mostRated,
      bestRated,
    };
  };

  const stats = calculateStats();

  const fetchRatings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("activity_ratings")
      .select(`
        *,
        activities (
          name
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching ratings:", error);
      toast({
        title: "Erro ao carregar avaliações",
        variant: "destructive",
      });
    } else {
      setRatings(data || []);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("activity_ratings")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting rating:", error);
      toast({
        title: "Erro ao excluir avaliação",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Avaliação excluída com sucesso",
      });
      fetchRatings();
    }
  };

  useEffect(() => {
    fetchRatings();
  }, []);

  if (loading) {
    return <div className="text-center p-8">Carregando avaliações...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Avaliações das Atividades</h2>
        <p className="text-muted-foreground">{ratings.length} avaliações</p>
      </div>

      {ratings.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          Nenhuma avaliação ainda
        </Card>
      ) : (
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
                <div className="text-2xl font-bold">{stats?.totalRatings}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Média Geral
                </CardTitle>
                <Star className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats?.overallAverage.toFixed(1)} ⭐
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Mais Avaliada
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-sm font-bold">{stats?.mostRated.name}</div>
                <p className="text-xs text-muted-foreground">
                  {stats?.mostRated.count} avaliações
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
                <div className="text-sm font-bold">{stats?.bestRated.name}</div>
                <p className="text-xs text-muted-foreground">
                  {stats?.bestRated.average.toFixed(1)} ⭐
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
                        data={stats?.starDistribution}
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
                        {stats?.starDistribution.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={STAR_COLORS[entry.star as keyof typeof STAR_COLORS]}
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
                    <BarChart data={stats?.activityCountData} layout="vertical">
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
                  <BarChart data={stats?.activityAvgData}>
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
                      {stats?.activityAvgData.map((entry, index) => (
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

          {/* Recent Ratings List */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Avaliações Recentes</h3>
            <div className="grid gap-4">
              {ratings.map((rating) => (
                <Card key={rating.id} className="p-4">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{rating.activities.name}</h3>
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`h-4 w-4 ${
                                star <= rating.rating
                                  ? "fill-yellow-400 text-yellow-400"
                                  : "text-gray-300"
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Por: {rating.guest_name}
                        {rating.room_number && ` • Apto ${rating.room_number}`} •{" "}
                        {format(new Date(rating.created_at), "dd/MM/yyyy 'às' HH:mm", {
                          locale: ptBR,
                        })}
                      </p>
                      {rating.comment && (
                        <p className="text-sm mt-2">{rating.comment}</p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(rating.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
