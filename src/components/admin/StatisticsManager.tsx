import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Activity, Star, TrendingUp, Trophy, Calendar, CheckCircle } from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
} from "recharts";

interface DailyStats {
  date: string;
  checkins: number;
  ratings: number;
}

export const StatisticsManager = () => {
  const [loading, setLoading] = useState(true);
  const [totalGuests, setTotalGuests] = useState(0);
  const [totalCheckins, setTotalCheckins] = useState(0);
  const [totalRatings, setTotalRatings] = useState(0);
  const [totalActivities, setTotalActivities] = useState(0);
  const [averageRating, setAverageRating] = useState(0);
  const [activeGuestsToday, setActiveGuestsToday] = useState(0);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [topActivities, setTopActivities] = useState<{ name: string; checkins: number }[]>([]);

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    setLoading(true);
    try {
      // Fetch total guests
      const { count: guestsCount } = await supabase
        .from("guests")
        .select("*", { count: "exact", head: true });
      setTotalGuests(guestsCount || 0);

      // Fetch total check-ins
      const { count: checkinsCount } = await supabase
        .from("activity_checkins")
        .select("*", { count: "exact", head: true });
      setTotalCheckins(checkinsCount || 0);

      // Fetch total ratings and average
      const { data: ratingsData, count: ratingsCount } = await supabase
        .from("activity_ratings")
        .select("rating", { count: "exact" });
      setTotalRatings(ratingsCount || 0);
      if (ratingsData && ratingsData.length > 0) {
        const avg = ratingsData.reduce((sum, r) => sum + r.rating, 0) / ratingsData.length;
        setAverageRating(avg);
      }

      // Fetch total activities
      const { count: activitiesCount } = await supabase
        .from("activities")
        .select("*", { count: "exact", head: true });
      setTotalActivities(activitiesCount || 0);

      // Fetch active guests today (those who checked in today)
      const today = format(new Date(), "yyyy-MM-dd");
      const { data: todayCheckins } = await supabase
        .from("activity_checkins")
        .select("guest_id")
        .gte("checked_in_at", `${today}T00:00:00`)
        .lte("checked_in_at", `${today}T23:59:59`);
      const uniqueGuests = new Set(todayCheckins?.map(c => c.guest_id) || []);
      setActiveGuestsToday(uniqueGuests.size);

      // Fetch daily stats for last 7 days
      const last7Days: DailyStats[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = subDays(new Date(), i);
        const dateStr = format(date, "yyyy-MM-dd");
        
        const { count: dayCheckins } = await supabase
          .from("activity_checkins")
          .select("*", { count: "exact", head: true })
          .gte("checked_in_at", `${dateStr}T00:00:00`)
          .lte("checked_in_at", `${dateStr}T23:59:59`);

        const { count: dayRatings } = await supabase
          .from("activity_ratings")
          .select("*", { count: "exact", head: true })
          .gte("created_at", `${dateStr}T00:00:00`)
          .lte("created_at", `${dateStr}T23:59:59`);

        last7Days.push({
          date: format(date, "dd/MM", { locale: ptBR }),
          checkins: dayCheckins || 0,
          ratings: dayRatings || 0,
        });
      }
      setDailyStats(last7Days);

      // Fetch top 5 activities by check-ins
      const { data: checkinsByActivity } = await supabase
        .from("activity_checkins")
        .select("activity_id, activities(name)");
      
      if (checkinsByActivity) {
        const activityCount = checkinsByActivity.reduce((acc, c) => {
          const name = (c.activities as any)?.name || "Desconhecida";
          acc[name] = (acc[name] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const sorted = Object.entries(activityCount)
          .map(([name, checkins]) => ({ name, checkins }))
          .sort((a, b) => b.checkins - a.checkins)
          .slice(0, 5);
        setTopActivities(sorted);
      }

    } catch (error) {
      console.error("Error fetching statistics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center p-8">Carregando estatísticas...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Estatísticas Detalhadas</h2>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Hóspedes Cadastrados
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalGuests}</div>
            <p className="text-xs text-muted-foreground">
              {activeGuestsToday} ativos hoje
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total de Check-ins
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCheckins}</div>
            <p className="text-xs text-muted-foreground">
              participações registradas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total de Avaliações
            </CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRatings}</div>
            <p className="text-xs text-muted-foreground">
              Média: {averageRating.toFixed(1)} ⭐
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Atividades Cadastradas
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalActivities}</div>
            <p className="text-xs text-muted-foreground">
              na programação
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Activity Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Atividade dos Últimos 7 Dias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                checkins: {
                  label: "Check-ins",
                  color: "hsl(var(--primary))",
                },
                ratings: {
                  label: "Avaliações",
                  color: "hsl(142, 71%, 45%)",
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyStats}>
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    type="monotone"
                    dataKey="checkins"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--primary))" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="ratings"
                    stroke="hsl(142, 71%, 45%)"
                    strokeWidth={2}
                    dot={{ fill: "hsl(142, 71%, 45%)" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Top Activities Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Top 5 Atividades Mais Populares
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topActivities.length > 0 ? (
              <ChartContainer
                config={{
                  checkins: {
                    label: "Check-ins",
                    color: "hsl(var(--primary))",
                  },
                }}
                className="h-[300px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topActivities} layout="vertical">
                    <XAxis type="number" />
                    <YAxis
                      dataKey="name"
                      type="category"
                      width={120}
                      tick={{ fontSize: 11 }}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="checkins" fill="hsl(var(--primary))" radius={4} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Nenhum check-in registrado ainda
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
