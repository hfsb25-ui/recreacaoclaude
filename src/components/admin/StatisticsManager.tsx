import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Users, Activity, Star, TrendingUp, Trophy, Calendar, CheckCircle, 
  Globe, Eye, UserPlus, Clock, ArrowUp, ArrowDown, Minus
} from "lucide-react";
import { addDays, format, subDays, startOfWeek, startOfDay, subWeeks } from "date-fns";
import {
  dayBounds,
  dayKey,
  fetchAll,
  getActivityStats,
  getAgeGroupStats,
  getDailyStats,
  getTopPages,
  getVisitHours,
  getVisitTotals,
  pageName,
  summarizeRatings,
  totalCheckinsAllTime,
} from "@/lib/adminStats";
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
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface DailyStats {
  date: string;
  checkins: number;
  ratings: number;
}

interface HourlyVisits {
  hour: string;
  visits: number;
}

interface PageVisits {
  page: string;
  visits: number;
}

interface AgeGroupStats {
  name: string;
  checkins: number;
  color: string;
}

interface WeeklyComparison {
  label: string;
  thisWeek: number;
  lastWeek: number;
}

interface MultiWeekStats {
  week: string;
  visits: number;
  checkins: number;
  guests: number;
}

const MIN_RATINGS_FOR_BEST = 5;

const COLORS = ['hsl(var(--primary))', 'hsl(142, 71%, 45%)', 'hsl(280, 65%, 60%)', 'hsl(45, 93%, 47%)', 'hsl(0, 72%, 51%)'];

export const StatisticsManager = () => {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  
  // Basic stats
  const [totalGuests, setTotalGuests] = useState(0);
  const [totalCheckins, setTotalCheckins] = useState(0);
  const [totalRatings, setTotalRatings] = useState(0);
  const [totalActivities, setTotalActivities] = useState(0);
  const [averageRating, setAverageRating] = useState(0);
  const [activeGuestsToday, setActiveGuestsToday] = useState(0);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [topActivities, setTopActivities] = useState<{ name: string; checkins: number }[]>([]);
  
  // Visit stats
  const [visitsToday, setVisitsToday] = useState(0);
  const [totalVisits, setTotalVisits] = useState(0);
  const [uniqueVisitorsToday, setUniqueVisitorsToday] = useState(0);
  const [newGuestsToday, setNewGuestsToday] = useState(0);
  const [peakHour, setPeakHour] = useState<string | null>(null);
  const [conversionRate, setConversionRate] = useState(0);
  const [hourlyVisits, setHourlyVisits] = useState<HourlyVisits[]>([]);
  const [pageVisits, setPageVisits] = useState<PageVisits[]>([]);
  const [weeklyComparison, setWeeklyComparison] = useState<WeeklyComparison[]>([]);
  const [multiWeekStats, setMultiWeekStats] = useState<MultiWeekStats[]>([]);
  const [ageGroupStats, setAgeGroupStats] = useState<AgeGroupStats[]>([]);
  
  // Insights
  const [weeklyGrowth, setWeeklyGrowth] = useState<number>(0);
  const [bestRatedActivity, setBestRatedActivity] = useState<{ name: string; rating: number } | null>(null);
  const [mostActiveGuest, setMostActiveGuest] = useState<{ name: string; checkins: number } | null>(null);

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const now = new Date();
      const today = startOfDay(now);
      const todayStr = dayKey(today);
      const todayB = dayBounds(today);
      const weekStart = startOfWeek(today, { weekStartsOn: 0 });
      const firstWeek = subWeeks(weekStart, 7);
      const last7 = dayBounds(subDays(today, 6), today);

      const [
        daily,
        visitsToday,
        visitsLast7,
        hours,
        topPages,
        activityAgg,
        ageAgg,
        allTimeCheckins,
        totalVisitsResult,
        guestsResult,
        activitiesTodayResult,
        ageGroupsResult,
        todayCheckins,
        periodCheckins,
      ] = await Promise.all([
        getDailyStats(firstWeek, today),
        getVisitTotals(todayB.from, todayB.to),
        getVisitTotals(last7.from, last7.to),
        getVisitHours(new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(), now.toISOString()),
        getTopPages(todayB.from, todayB.to),
        getActivityStats(),
        getAgeGroupStats(),
        totalCheckinsAllTime(),
        supabase.from("site_visits").select("id", { count: "exact", head: true }),
        supabase.from("guests").select("id", { count: "exact", head: true }),
        supabase.from("activities").select("id", { count: "exact", head: true }).eq("activity_date", todayStr),
        supabase.from("age_groups").select("id, name, color"),
        fetchAll<{ guest_id: string }>(() =>
          supabase.from("activity_checkins").select("guest_id").gte("checked_in_at", todayB.from).lt("checked_in_at", todayB.to).order("id")
        ),
        fetchAll<{ guest_id: string; guests: { name: string } | null }>(() =>
          supabase.from("activity_checkins").select("guest_id, guests(name)").order("id")
        ),
      ]);

      // ===== Cartões do topo =====
      const todayRow = daily.find((d) => d.day === todayStr);
      setVisitsToday(visitsToday.visits);
      setUniqueVisitorsToday(visitsToday.visitors);
      setTotalVisits(totalVisitsResult.count || 0);
      setNewGuestsToday(todayRow?.signups ?? 0);
      setTotalGuests(guestsResult.count || 0);
      setTotalActivities(activitiesTodayResult.count || 0);
      setTotalCheckins(allTimeCheckins);
      setActiveGuestsToday(new Set(todayCheckins.map((c) => c.guest_id)).size);

      const signupsLast7 = daily.filter((d) => d.day >= dayKey(subDays(today, 6))).reduce((s, d) => s + d.signups, 0);
      setConversionRate(visitsLast7.visitors > 0 ? Math.min(100, (signupsLast7 / visitsLast7.visitors) * 100) : 0);

      const ratingSummary = summarizeRatings(activityAgg);
      setTotalRatings(ratingSummary.count);
      setAverageRating(ratingSummary.average);

      // ===== Visitas por hora (últimas 24h, horário de Brasília) =====
      const byHour: Record<number, number> = {};
      hours.forEach((h) => (byHour[h.hour] = (byHour[h.hour] || 0) + h.visits));
      let maxVisits = 0;
      let maxHour: string | null = null;
      const hourlyData: HourlyVisits[] = Array.from({ length: 24 }, (_, i) => {
        const label = `${String(i).padStart(2, "0")}:00`;
        const visits = byHour[i] || 0;
        if (visits > maxVisits) {
          maxVisits = visits;
          maxHour = label;
        }
        return { hour: label, visits };
      });
      setHourlyVisits(hourlyData);
      setPeakHour(maxHour);

      // ===== Páginas mais visitadas hoje =====
      setPageVisits(topPages.map((p) => ({ page: pageName(p.path), visits: p.visits })));

      // ===== Últimos 7 dias =====
      setDailyStats(
        daily.slice(-7).map((d) => ({
          date: format(new Date(`${d.day}T12:00:00`), "dd/MM", { locale: ptBR }),
          checkins: d.checkins,
          ratings: d.ratings,
        }))
      );

      // ===== 8 semanas (domingo a sábado) =====
      const weeksData: MultiWeekStats[] = [];
      for (let i = 7; i >= 0; i--) {
        const ws = dayKey(subWeeks(weekStart, i));
        const we = dayKey(addDays(subWeeks(weekStart, i), 6));
        const rows = daily.filter((d) => d.day >= ws && d.day <= we);
        weeksData.push({
          week: i === 0 ? "Atual" : `Sem. -${i}`,
          visits: rows.reduce((s, d) => s + d.visits, 0),
          checkins: rows.reduce((s, d) => s + d.checkins, 0),
          guests: rows.reduce((s, d) => s + d.signups, 0),
        });
      }
      setMultiWeekStats(weeksData);

      // ===== Esta semana x mesmos dias da semana passada =====
      const sumRange = (from: Date, to: Date, key: "visits" | "checkins" | "signups") =>
        daily.filter((d) => d.day >= dayKey(from) && d.day <= dayKey(to)).reduce((s, d) => s + d[key], 0);
      const lwStart = subWeeks(weekStart, 1);
      const lwEnd = subWeeks(today, 1);
      const cmp = (label: string, key: "visits" | "checkins" | "signups") => ({
        label,
        thisWeek: sumRange(weekStart, today, key),
        lastWeek: sumRange(lwStart, lwEnd, key),
      });
      const comparison = [cmp("Visitas", "visits"), cmp("Check-ins", "checkins"), cmp("Cadastros", "signups")];
      setWeeklyComparison(comparison);
      const signupsCmp = comparison[2];
      setWeeklyGrowth(
        signupsCmp.lastWeek > 0
          ? ((signupsCmp.thisWeek - signupsCmp.lastWeek) / signupsCmp.lastWeek) * 100
          : signupsCmp.thisWeek > 0
            ? 100
            : 0
      );

      // ===== Faixas etárias =====
      const groups = ageGroupsResult.data || [];
      setAgeGroupStats(
        ageAgg
          .filter((a) => a.checkins > 0)
          .map((a) => {
            const g = groups.find((x) => x.id === a.ageGroupId);
            return { name: g?.name || "Sem faixa", checkins: a.checkins, color: g?.color || "" };
          })
      );

      // ===== Atividades (agrupadas pelo nome) =====
      const byName = new Map<string, { checkins: number; ratings: number; ratingSum: number }>();
      activityAgg.forEach((a) => {
        const cur = byName.get(a.name) || { checkins: 0, ratings: 0, ratingSum: 0 };
        cur.checkins += a.checkins;
        cur.ratings += a.ratings;
        cur.ratingSum += a.ratingSum;
        byName.set(a.name, cur);
      });
      const named = Array.from(byName.entries()).map(([name, v]) => ({ name, ...v }));
      setTopActivities(
        named
          .filter((a) => a.checkins > 0)
          .sort((a, b) => b.checkins - a.checkins)
          .slice(0, 5)
          .map((a) => ({ name: a.name, checkins: a.checkins }))
      );
      const best = named
        .filter((a) => a.ratings >= MIN_RATINGS_FOR_BEST)
        .map((a) => ({ name: a.name, rating: a.ratingSum / a.ratings, count: a.ratings }))
        .sort((a, b) => b.rating - a.rating || b.count - a.count)[0];
      setBestRatedActivity(best ? { name: best.name, rating: best.rating } : null);

      // ===== Hóspede mais ativo (período atual), contando por hóspede e não pelo nome =====
      const perGuest = new Map<string, { name: string; checkins: number }>();
      periodCheckins.forEach((c) => {
        const cur = perGuest.get(c.guest_id) || { name: c.guests?.name || "Hóspede", checkins: 0 };
        cur.checkins += 1;
        perGuest.set(c.guest_id, cur);
      });
      setMostActiveGuest(Array.from(perGuest.values()).sort((a, b) => b.checkins - a.checkins)[0] ?? null);
    } catch (error) {
      console.error("Error fetching statistics:", error);
      setLoadError(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  };

  const getGrowthIcon = (value: number) => {
    if (value > 0) return <ArrowUp className="h-4 w-4 text-green-500" />;
    if (value < 0) return <ArrowDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="text-muted-foreground">Carregando estatísticas...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Estatísticas Detalhadas</h2>
      </div>

      {loadError && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="p-4 text-sm">
            Não foi possível carregar as estatísticas. Confira se o SQL de estatísticas foi rodado no Supabase.
            <span className="block text-xs text-muted-foreground mt-1">{loadError}</span>
          </CardContent>
        </Card>
      )}

      {/* Visit Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Visitas Hoje</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{visitsToday}</div>
            <p className="text-xs text-muted-foreground">
              {uniqueVisitorsToday} visitantes únicos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Visitas Totais</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalVisits}</div>
            <p className="text-xs text-muted-foreground">desde o início</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa Conversão</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{conversionRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">visitantes → cadastros (7 dias)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Novos Cadastros</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{newGuestsToday}</div>
            <p className="text-xs text-muted-foreground">hoje</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Horário Pico</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{peakHour || "-"}</div>
            <p className="text-xs text-muted-foreground">maior movimento</p>
          </CardContent>
        </Card>
      </div>

      {/* Basic Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hóspedes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalGuests}</div>
            <p className="text-xs text-muted-foreground">
              no período atual · {activeGuestsToday} ativos hoje
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Check-ins</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCheckins}</div>
            <p className="text-xs text-muted-foreground">total de participações</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avaliações</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRatings}</div>
            <p className="text-xs text-muted-foreground">
              média {averageRating.toFixed(1)} ⭐
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Atividades Hoje</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalActivities}</div>
            <p className="text-xs text-muted-foreground">na programação de hoje</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Crescimento</CardTitle>
            {getGrowthIcon(weeklyGrowth)}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {weeklyGrowth > 0 ? "+" : ""}{weeklyGrowth.toFixed(0)}%
            </div>
            <p className="text-xs text-muted-foreground">cadastros vs. mesmos dias da sem. passada</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Média/Dia</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dailyStats.length > 0 
                ? (dailyStats.reduce((sum, d) => sum + d.checkins, 0) / dailyStats.length).toFixed(1)
                : 0}
            </div>
            <p className="text-xs text-muted-foreground">check-ins por dia (7 dias)</p>
          </CardContent>
        </Card>
      </div>

      {/* Insight Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {bestRatedActivity && (
          <Card className="border-yellow-500/30 bg-yellow-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Star className="h-4 w-4 text-yellow-500" />
                Atividade Melhor Avaliada
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">{bestRatedActivity.name}</div>
              <p className="text-sm text-muted-foreground">
                {bestRatedActivity.rating.toFixed(1)} ⭐ de média (mín. {MIN_RATINGS_FOR_BEST} avaliações)
              </p>
            </CardContent>
          </Card>
        )}

        {mostActiveGuest && (
          <Card className="border-blue-500/30 bg-blue-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Trophy className="h-4 w-4 text-blue-500" />
                Hóspede Mais Ativo (período atual)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">{mostActiveGuest.name}</div>
              <p className="text-sm text-muted-foreground">
                {mostActiveGuest.checkins} check-ins realizados
              </p>
            </CardContent>
          </Card>
        )}

        {topActivities.length > 0 && (
          <Card className="border-green-500/30 bg-green-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                Atividade Mais Popular
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">{topActivities[0]?.name}</div>
              <p className="text-sm text-muted-foreground">
                {topActivities[0]?.checkins} participações
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hourly Visits Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Visitas por Hora (Últimas 24h)</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyVisits}>
                  <XAxis 
                    dataKey="hour" 
                    tick={{ fontSize: 10 }}
                    interval={2}
                  />
                  <YAxis tick={{ fontSize: 10 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="visits" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Page Visits Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Páginas Mais Visitadas (Hoje)</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pageVisits} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis 
                    dataKey="page" 
                    type="category" 
                    tick={{ fontSize: 10 }} 
                    width={80}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="visits" fill="hsl(142, 71%, 45%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Multi-Week Comparison Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Comparativo Semanal (8 semanas)</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={multiWeekStats}>
                  <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line 
                    type="monotone" 
                    dataKey="visits" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    name="Visitas"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="checkins" 
                    stroke="hsl(142, 71%, 45%)" 
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    name="Check-ins"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="guests" 
                    stroke="hsl(280, 65%, 60%)" 
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    name="Cadastros"
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
            <div className="flex justify-center gap-4 mt-2 text-xs">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-primary"></span>
                Visitas
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(142, 71%, 45%)' }}></span>
                Check-ins
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(280, 65%, 60%)' }}></span>
                Cadastros
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Age Group Stats */}
        {ageGroupStats.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Participação por Faixa Etária</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{}} className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={ageGroupStats}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      dataKey="checkins"
                      nameKey="name"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {ageGroupStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        )}

        {/* Daily Activity Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Atividade Diária (Últimos 7 dias)</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyStats}>
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="checkins" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Check-ins" />
                  <Bar dataKey="ratings" fill="hsl(45, 93%, 47%)" radius={[4, 4, 0, 0]} name="Avaliações" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Top Activities */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top 5 Atividades</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topActivities} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    tick={{ fontSize: 10 }} 
                    width={100}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="checkins" fill="hsl(280, 65%, 60%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Comparison Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Resumo da Semana (domingo até hoje)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {weeklyComparison.map((item) => {
              const diff = item.thisWeek - item.lastWeek;
              const percentChange = item.lastWeek > 0 
                ? ((diff / item.lastWeek) * 100).toFixed(0) 
                : item.thisWeek > 0 ? "100" : "0";
              
              return (
                <div key={item.label} className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-sm text-muted-foreground">{item.label}</div>
                  <div className="text-2xl font-bold mt-1">{item.thisWeek}</div>
                  <div className={`text-xs mt-1 flex items-center justify-center gap-1 ${
                    diff > 0 ? 'text-green-500' : diff < 0 ? 'text-red-500' : 'text-muted-foreground'
                  }`}>
                    {diff > 0 ? <ArrowUp className="h-3 w-3" /> : diff < 0 ? <ArrowDown className="h-3 w-3" /> : null}
                    {diff > 0 ? "+" : ""}{percentChange}% vs mesmos dias da sem. passada
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
