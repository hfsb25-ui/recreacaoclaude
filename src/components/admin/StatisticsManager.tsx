import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Users, Activity, Star, TrendingUp, Trophy, Calendar, CheckCircle, 
  Globe, Eye, UserPlus, Clock, ArrowUp, ArrowDown, Minus
} from "lucide-react";
import { format, subDays, startOfWeek, endOfWeek, startOfDay, endOfDay, subWeeks } from "date-fns";
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

const COLORS = ['hsl(var(--primary))', 'hsl(142, 71%, 45%)', 'hsl(280, 65%, 60%)', 'hsl(45, 93%, 47%)', 'hsl(0, 72%, 51%)'];

export const StatisticsManager = () => {
  const [loading, setLoading] = useState(true);
  
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
    try {
      const today = new Date();
      const todayStr = format(today, "yyyy-MM-dd");
      const todayStart = `${todayStr}T00:00:00`;
      const todayEnd = `${todayStr}T23:59:59`;
      const last24h = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      const last7Days = subDays(today, 6);
      const last8Weeks = subWeeks(today, 8);

      // ===== PARALLEL BATCH 1: All count queries =====
      const [
        guestsResult,
        checkinsResult,
        ratingsResult,
        activitiesResult,
        totalVisitsResult,
        visitsTodayResult,
        newGuestsTodayResult,
      ] = await Promise.all([
        supabase.from("guests").select("*", { count: "exact", head: true }),
        supabase.from("activity_checkins").select("*", { count: "exact", head: true }),
        supabase.from("activity_ratings").select("rating", { count: "exact" }),
        supabase.from("activities").select("*", { count: "exact", head: true }),
        supabase.from("site_visits").select("*", { count: "exact", head: true }),
        supabase.from("site_visits").select("*", { count: "exact", head: true }).gte("created_at", todayStart).lte("created_at", todayEnd),
        supabase.from("guests").select("*", { count: "exact", head: true }).gte("created_at", todayStart).lte("created_at", todayEnd),
      ]);

      const guestsCount = guestsResult.count || 0;
      const checkinsCount = checkinsResult.count || 0;
      const ratingsCount = ratingsResult.count || 0;
      const activitiesCount = activitiesResult.count || 0;
      const totalVisitsCount = totalVisitsResult.count || 0;
      const visitsTodayCount = visitsTodayResult.count || 0;
      const newGuestsCount = newGuestsTodayResult.count || 0;

      setTotalGuests(guestsCount);
      setTotalCheckins(checkinsCount);
      setTotalRatings(ratingsCount);
      setTotalActivities(activitiesCount);
      setTotalVisits(totalVisitsCount);
      setVisitsToday(visitsTodayCount);
      setNewGuestsToday(newGuestsCount);

      // Calculate average rating
      if (ratingsResult.data && ratingsResult.data.length > 0) {
        const avg = ratingsResult.data.reduce((sum, r) => sum + r.rating, 0) / ratingsResult.data.length;
        setAverageRating(avg);
      }

      // Conversion rate
      if (totalVisitsCount > 0) {
        setConversionRate((guestsCount / totalVisitsCount) * 100);
      }

      // ===== PARALLEL BATCH 2: Data for processing =====
      const [
        todayCheckinsResult,
        uniqueVisitorsResult,
        visitsLast24hResult,
        pageVisitsResult,
        checkinsLast7DaysResult,
        ratingsLast7DaysResult,
        visitsLast8WeeksResult,
        checkinsLast8WeeksResult,
        guestsLast8WeeksResult,
        ageGroupsResult,
        allCheckinsWithActivityResult,
        allRatingsWithActivityResult,
        allCheckinsWithGuestResult,
      ] = await Promise.all([
        // Today's check-ins for active guests
        supabase.from("activity_checkins").select("guest_id").gte("checked_in_at", todayStart).lte("checked_in_at", todayEnd),
        // Unique visitors today
        supabase.from("site_visits").select("session_id").gte("created_at", todayStart).lte("created_at", todayEnd),
        // Visits last 24h for hourly chart
        supabase.from("site_visits").select("created_at").gte("created_at", last24h.toISOString()),
        // Page visits today
        supabase.from("site_visits").select("page_path").gte("created_at", todayStart),
        // Check-ins last 7 days
        supabase.from("activity_checkins").select("checked_in_at").gte("checked_in_at", format(last7Days, "yyyy-MM-dd") + "T00:00:00"),
        // Ratings last 7 days
        supabase.from("activity_ratings").select("created_at").gte("created_at", format(last7Days, "yyyy-MM-dd") + "T00:00:00"),
        // Visits last 8 weeks
        supabase.from("site_visits").select("created_at").gte("created_at", last8Weeks.toISOString()),
        // Check-ins last 8 weeks
        supabase.from("activity_checkins").select("checked_in_at").gte("checked_in_at", last8Weeks.toISOString()),
        // Guests last 8 weeks
        supabase.from("guests").select("created_at").gte("created_at", last8Weeks.toISOString()),
        // Age groups
        supabase.from("age_groups").select("id, name, color"),
        // All check-ins with activity names
        supabase.from("activity_checkins").select("activity_id, activities(name, age_group_id)"),
        // All ratings with activity names
        supabase.from("activity_ratings").select("activity_id, rating, activities(name)"),
        // All check-ins with guest names
        supabase.from("activity_checkins").select("guest_id, guests(name)"),
      ]);

      // Active guests today
      const uniqueGuests = new Set(todayCheckinsResult.data?.map(c => c.guest_id) || []);
      setActiveGuestsToday(uniqueGuests.size);

      // Unique visitors today
      const uniqueSessions = new Set(uniqueVisitorsResult.data?.map(v => v.session_id) || []);
      setUniqueVisitorsToday(uniqueSessions.size);

      // ===== HOURLY VISITS (process from data, not queries) =====
      const hourlyData: HourlyVisits[] = [];
      const visitsData = visitsLast24hResult.data || [];
      
      // Group by hour
      const hourCounts: Record<number, number> = {};
      for (let i = 0; i < 24; i++) {
        hourCounts[i] = 0;
      }
      
      visitsData.forEach(v => {
        const hour = new Date(v.created_at).getHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      });

      let maxVisits = 0;
      let maxHour = "";
      
      for (let i = 0; i < 24; i++) {
        const hourLabel = `${i.toString().padStart(2, '0')}:00`;
        const visits = hourCounts[i] || 0;
        hourlyData.push({ hour: hourLabel, visits });
        
        if (visits > maxVisits) {
          maxVisits = visits;
          maxHour = hourLabel;
        }
      }
      
      setHourlyVisits(hourlyData);
      setPeakHour(maxHour || null);

      // ===== PAGE VISITS =====
      if (pageVisitsResult.data) {
        const pageCount = pageVisitsResult.data.reduce((acc, v) => {
          const page = v.page_path || "/";
          acc[page] = (acc[page] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const pageNames: Record<string, string> = {
          "/": "Início",
          "/programacao": "Programação",
          "/ranking": "Ranking",
          "/guest-auth": "Login Hóspede",
          "/guest-profile": "Perfil",
          "/hall-of-fame": "Hall da Fama",
          "/instalar": "Instalar App",
          "/admin": "Admin",
          "/auth": "Login Admin",
        };

        const sorted = Object.entries(pageCount)
          .map(([page, visits]) => ({ 
            page: pageNames[page] || page, 
            visits 
          }))
          .sort((a, b) => b.visits - a.visits)
          .slice(0, 6);
        setPageVisits(sorted);
      }

      // ===== DAILY STATS (process from data) =====
      const last7DaysData: DailyStats[] = [];
      const checkinsData = checkinsLast7DaysResult.data || [];
      const ratingsData = ratingsLast7DaysResult.data || [];
      
      for (let i = 6; i >= 0; i--) {
        const date = subDays(today, i);
        const dateStr = format(date, "yyyy-MM-dd");
        
        const dayCheckins = checkinsData.filter(c => 
          c.checked_in_at?.startsWith(dateStr)
        ).length;
        
        const dayRatings = ratingsData.filter(r => 
          r.created_at?.startsWith(dateStr)
        ).length;

        last7DaysData.push({
          date: format(date, "dd/MM", { locale: ptBR }),
          checkins: dayCheckins,
          ratings: dayRatings,
        });
      }
      setDailyStats(last7DaysData);

      // ===== MULTI-WEEK STATS (process from data) =====
      const weeksData: MultiWeekStats[] = [];
      const visitsWeekData = visitsLast8WeeksResult.data || [];
      const checkinsWeekData = checkinsLast8WeeksResult.data || [];
      const guestsWeekData = guestsLast8WeeksResult.data || [];
      
      for (let i = 7; i >= 0; i--) {
        const weekStart = startOfWeek(subWeeks(today, i), { weekStartsOn: 0 });
        const weekEnd = endOfWeek(subWeeks(today, i), { weekStartsOn: 0 });
        const weekLabel = i === 0 ? "Atual" : i === 1 ? "Sem. -1" : `Sem. -${i}`;

        const weekVisits = visitsWeekData.filter(v => {
          const date = new Date(v.created_at);
          return date >= weekStart && date <= weekEnd;
        }).length;

        const weekCheckins = checkinsWeekData.filter(c => {
          if (!c.checked_in_at) return false;
          const date = new Date(c.checked_in_at);
          return date >= weekStart && date <= weekEnd;
        }).length;

        const weekGuests = guestsWeekData.filter(g => {
          if (!g.created_at) return false;
          const date = new Date(g.created_at);
          return date >= weekStart && date <= weekEnd;
        }).length;

        weeksData.push({
          week: weekLabel,
          visits: weekVisits,
          checkins: weekCheckins,
          guests: weekGuests,
        });
      }
      
      setMultiWeekStats(weeksData);

      // Weekly comparison
      const thisWeekVisits = weeksData[weeksData.length - 1]?.visits || 0;
      const lastWeekVisits = weeksData[weeksData.length - 2]?.visits || 0;
      const thisWeekCheckins = weeksData[weeksData.length - 1]?.checkins || 0;
      const lastWeekCheckins = weeksData[weeksData.length - 2]?.checkins || 0;
      const thisWeekGuests = weeksData[weeksData.length - 1]?.guests || 0;
      const lastWeekGuests = weeksData[weeksData.length - 2]?.guests || 0;

      setWeeklyComparison([
        { label: "Visitas", thisWeek: thisWeekVisits, lastWeek: lastWeekVisits },
        { label: "Check-ins", thisWeek: thisWeekCheckins, lastWeek: lastWeekCheckins },
        { label: "Cadastros", thisWeek: thisWeekGuests, lastWeek: lastWeekGuests },
      ]);

      // Weekly growth
      if (lastWeekGuests > 0) {
        const growth = ((thisWeekGuests - lastWeekGuests) / lastWeekGuests) * 100;
        setWeeklyGrowth(growth);
      } else if (thisWeekGuests > 0) {
        setWeeklyGrowth(100);
      }

      // ===== AGE GROUP STATS (process from data) =====
      if (ageGroupsResult.data && allCheckinsWithActivityResult.data) {
        const ageGroupCheckins: AgeGroupStats[] = [];
        const checkinsWithActivity = allCheckinsWithActivityResult.data;
        
        for (const group of ageGroupsResult.data) {
          const groupCheckins = checkinsWithActivity.filter(c => 
            (c.activities as any)?.age_group_id === group.id
          ).length;

          if (groupCheckins > 0) {
            ageGroupCheckins.push({
              name: group.name,
              checkins: groupCheckins,
              color: group.color,
            });
          }
        }
        setAgeGroupStats(ageGroupCheckins);
      }

      // ===== TOP ACTIVITIES (process from data) =====
      if (allCheckinsWithActivityResult.data) {
        const activityCount = allCheckinsWithActivityResult.data.reduce((acc, c) => {
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

      // ===== BEST RATED ACTIVITY =====
      if (allRatingsWithActivityResult.data && allRatingsWithActivityResult.data.length > 0) {
        const activityRatings = allRatingsWithActivityResult.data.reduce((acc, r) => {
          const name = (r.activities as any)?.name || "Desconhecida";
          if (!acc[name]) acc[name] = { total: 0, count: 0 };
          acc[name].total += r.rating;
          acc[name].count += 1;
          return acc;
        }, {} as Record<string, { total: number; count: number }>);

        const best = Object.entries(activityRatings)
          .map(([name, data]) => ({ name, rating: data.total / data.count }))
          .sort((a, b) => b.rating - a.rating)[0];
        
        if (best) setBestRatedActivity(best);
      }

      // ===== MOST ACTIVE GUEST =====
      if (allCheckinsWithGuestResult.data && allCheckinsWithGuestResult.data.length > 0) {
        const guestCount = allCheckinsWithGuestResult.data.reduce((acc, c) => {
          const name = (c.guests as any)?.name || "Desconhecido";
          acc[name] = (acc[name] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const mostActive = Object.entries(guestCount)
          .map(([name, checkins]) => ({ name, checkins }))
          .sort((a, b) => b.checkins - a.checkins)[0];
        
        if (mostActive) setMostActiveGuest(mostActive);
      }

    } catch (error) {
      console.error("Error fetching statistics:", error);
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
            <p className="text-xs text-muted-foreground">visitantes → cadastros</p>
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
              {activeGuestsToday} ativos hoje
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
            <CardTitle className="text-sm font-medium">Atividades</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalActivities}</div>
            <p className="text-xs text-muted-foreground">programadas</p>
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
            <p className="text-xs text-muted-foreground">vs. semana passada</p>
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
            <p className="text-xs text-muted-foreground">check-ins por dia</p>
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
                {bestRatedActivity.rating.toFixed(1)} ⭐ de média
              </p>
            </CardContent>
          </Card>
        )}

        {mostActiveGuest && (
          <Card className="border-blue-500/30 bg-blue-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Trophy className="h-4 w-4 text-blue-500" />
                Hóspede Mais Ativo
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
          <CardTitle className="text-lg">Resumo Semanal</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {weeklyComparison.map((item) => {
              const diff = item.thisWeek - item.lastWeek;
              const percentChange = item.lastWeek > 0 
                ? ((diff / item.lastWeek) * 100).toFixed(0) 
                : item.thisWeek > 0 ? "+100" : "0";
              
              return (
                <div key={item.label} className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-sm text-muted-foreground">{item.label}</div>
                  <div className="text-2xl font-bold mt-1">{item.thisWeek}</div>
                  <div className={`text-xs mt-1 flex items-center justify-center gap-1 ${
                    diff > 0 ? 'text-green-500' : diff < 0 ? 'text-red-500' : 'text-muted-foreground'
                  }`}>
                    {diff > 0 ? <ArrowUp className="h-3 w-3" /> : diff < 0 ? <ArrowDown className="h-3 w-3" /> : null}
                    {diff > 0 ? "+" : ""}{percentChange}% vs sem. passada
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
