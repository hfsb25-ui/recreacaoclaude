import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Users, Activity, Star, TrendingUp, Trophy, Calendar, CheckCircle, 
  Globe, Eye, UserPlus, Clock, ArrowUp, ArrowDown, Minus
} from "lucide-react";
import { format, subDays, subHours, startOfWeek, endOfWeek, startOfDay, endOfDay } from "date-fns";
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
      const today = format(new Date(), "yyyy-MM-dd");
      
      // ===== BASIC STATS =====
      
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
      const { data: todayCheckins } = await supabase
        .from("activity_checkins")
        .select("guest_id")
        .gte("checked_in_at", `${today}T00:00:00`)
        .lte("checked_in_at", `${today}T23:59:59`);
      const uniqueGuests = new Set(todayCheckins?.map(c => c.guest_id) || []);
      setActiveGuestsToday(uniqueGuests.size);

      // ===== VISIT STATS =====
      
      // Total visits
      const { count: totalVisitsCount } = await supabase
        .from("site_visits")
        .select("*", { count: "exact", head: true });
      setTotalVisits(totalVisitsCount || 0);

      // Visits today
      const { count: visitsTodayCount } = await supabase
        .from("site_visits")
        .select("*", { count: "exact", head: true })
        .gte("created_at", `${today}T00:00:00`)
        .lte("created_at", `${today}T23:59:59`);
      setVisitsToday(visitsTodayCount || 0);

      // Unique visitors today
      const { data: uniqueVisitorsData } = await supabase
        .from("site_visits")
        .select("session_id")
        .gte("created_at", `${today}T00:00:00`)
        .lte("created_at", `${today}T23:59:59`);
      const uniqueSessions = new Set(uniqueVisitorsData?.map(v => v.session_id) || []);
      setUniqueVisitorsToday(uniqueSessions.size);

      // New guests today
      const { count: newGuestsCount } = await supabase
        .from("guests")
        .select("*", { count: "exact", head: true })
        .gte("created_at", `${today}T00:00:00`)
        .lte("created_at", `${today}T23:59:59`);
      setNewGuestsToday(newGuestsCount || 0);

      // Conversion rate (guests / unique visitors)
      if (uniqueSessions.size > 0) {
        setConversionRate(((guestsCount || 0) / (totalVisitsCount || 1)) * 100);
      }

      // ===== HOURLY VISITS (last 24h) =====
      const hourlyData: HourlyVisits[] = [];
      let maxVisits = 0;
      let maxHour = "";
      
      for (let i = 23; i >= 0; i--) {
        const hourStart = subHours(new Date(), i);
        const hourEnd = subHours(new Date(), i - 1);
        
        const { count: hourCount } = await supabase
          .from("site_visits")
          .select("*", { count: "exact", head: true })
          .gte("created_at", hourStart.toISOString())
          .lt("created_at", hourEnd.toISOString());
        
        const hourLabel = format(hourStart, "HH:00");
        hourlyData.push({ hour: hourLabel, visits: hourCount || 0 });
        
        if ((hourCount || 0) > maxVisits) {
          maxVisits = hourCount || 0;
          maxHour = hourLabel;
        }
      }
      setHourlyVisits(hourlyData);
      setPeakHour(maxHour || null);

      // ===== PAGE VISITS =====
      const { data: pageData } = await supabase
        .from("site_visits")
        .select("page_path")
        .gte("created_at", `${today}T00:00:00`);
      
      if (pageData) {
        const pageCount = pageData.reduce((acc, v) => {
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

      // ===== DAILY STATS (last 7 days) =====
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

      // ===== WEEKLY COMPARISON =====
      const thisWeekStart = startOfWeek(new Date(), { weekStartsOn: 0 });
      const thisWeekEnd = endOfWeek(new Date(), { weekStartsOn: 0 });
      const lastWeekStart = subDays(thisWeekStart, 7);
      const lastWeekEnd = subDays(thisWeekEnd, 7);

      const { count: thisWeekVisits } = await supabase
        .from("site_visits")
        .select("*", { count: "exact", head: true })
        .gte("created_at", thisWeekStart.toISOString())
        .lte("created_at", thisWeekEnd.toISOString());

      const { count: lastWeekVisits } = await supabase
        .from("site_visits")
        .select("*", { count: "exact", head: true })
        .gte("created_at", lastWeekStart.toISOString())
        .lte("created_at", lastWeekEnd.toISOString());

      const { count: thisWeekCheckins } = await supabase
        .from("activity_checkins")
        .select("*", { count: "exact", head: true })
        .gte("checked_in_at", thisWeekStart.toISOString())
        .lte("checked_in_at", thisWeekEnd.toISOString());

      const { count: lastWeekCheckins } = await supabase
        .from("activity_checkins")
        .select("*", { count: "exact", head: true })
        .gte("checked_in_at", lastWeekStart.toISOString())
        .lte("checked_in_at", lastWeekEnd.toISOString());

      const { count: thisWeekGuests } = await supabase
        .from("guests")
        .select("*", { count: "exact", head: true })
        .gte("created_at", thisWeekStart.toISOString())
        .lte("created_at", thisWeekEnd.toISOString());

      const { count: lastWeekGuests } = await supabase
        .from("guests")
        .select("*", { count: "exact", head: true })
        .gte("created_at", lastWeekStart.toISOString())
        .lte("created_at", lastWeekEnd.toISOString());

      setWeeklyComparison([
        { label: "Visitas", thisWeek: thisWeekVisits || 0, lastWeek: lastWeekVisits || 0 },
        { label: "Check-ins", thisWeek: thisWeekCheckins || 0, lastWeek: lastWeekCheckins || 0 },
        { label: "Cadastros", thisWeek: thisWeekGuests || 0, lastWeek: lastWeekGuests || 0 },
      ]);

      // Weekly growth
      if ((lastWeekGuests || 0) > 0) {
        const growth = (((thisWeekGuests || 0) - (lastWeekGuests || 0)) / (lastWeekGuests || 1)) * 100;
        setWeeklyGrowth(growth);
      } else if ((thisWeekGuests || 0) > 0) {
        setWeeklyGrowth(100);
      }

      // ===== AGE GROUP STATS =====
      const { data: ageGroups } = await supabase
        .from("age_groups")
        .select("id, name, color");

      if (ageGroups) {
        const ageGroupCheckins: AgeGroupStats[] = [];
        for (const group of ageGroups) {
          const { data: activities } = await supabase
            .from("activities")
            .select("id")
            .eq("age_group_id", group.id);

          if (activities && activities.length > 0) {
            const activityIds = activities.map(a => a.id);
            const { count: groupCheckins } = await supabase
              .from("activity_checkins")
              .select("*", { count: "exact", head: true })
              .in("activity_id", activityIds);

            ageGroupCheckins.push({
              name: group.name,
              checkins: groupCheckins || 0,
              color: group.color,
            });
          }
        }
        setAgeGroupStats(ageGroupCheckins.filter(a => a.checkins > 0));
      }

      // ===== TOP ACTIVITIES =====
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

      // ===== BEST RATED ACTIVITY =====
      const { data: ratingsByActivity } = await supabase
        .from("activity_ratings")
        .select("activity_id, rating, activities(name)");

      if (ratingsByActivity && ratingsByActivity.length > 0) {
        const activityRatings = ratingsByActivity.reduce((acc, r) => {
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
      const { data: checkinsByGuest } = await supabase
        .from("activity_checkins")
        .select("guest_id, guests(name)");

      if (checkinsByGuest && checkinsByGuest.length > 0) {
        const guestCount = checkinsByGuest.reduce((acc, c) => {
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
    return <div className="text-center p-8">Carregando estatísticas...</div>;
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
            <p className="text-xs text-muted-foreground">mais acessos</p>
          </CardContent>
        </Card>
      </div>

      {/* Basic Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
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
            <p className="text-xs text-muted-foreground">participações</p>
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
              Média: {averageRating.toFixed(1)} ⭐
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Atividades</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalActivities}</div>
            <p className="text-xs text-muted-foreground">na programação</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Crescimento</CardTitle>
            {getGrowthIcon(weeklyGrowth)}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${weeklyGrowth >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {weeklyGrowth >= 0 ? '+' : ''}{weeklyGrowth.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">semanal</p>
          </CardContent>
        </Card>
      </div>

      {/* Insight Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {bestRatedActivity && (
          <Card className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Star className="h-4 w-4 text-yellow-500" />
                Atividade Mais Bem Avaliada
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">{bestRatedActivity.name}</div>
              <p className="text-sm text-muted-foreground">
                ⭐ {bestRatedActivity.rating.toFixed(1)} de média
              </p>
            </CardContent>
          </Card>
        )}

        {mostActiveGuest && (
          <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Trophy className="h-4 w-4 text-blue-500" />
                Hóspede Mais Ativo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">{mostActiveGuest.name}</div>
              <p className="text-sm text-muted-foreground">
                {mostActiveGuest.checkins} participações
              </p>
            </CardContent>
          </Card>
        )}

        <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              Resumo da Semana
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {weeklyComparison.map((item) => (
                <div key={item.label} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{item.label}:</span>
                  <span className="font-medium">
                    {item.thisWeek} 
                    {item.lastWeek > 0 && (
                      <span className={item.thisWeek >= item.lastWeek ? 'text-green-500' : 'text-red-500'}>
                        {' '}({item.thisWeek >= item.lastWeek ? '+' : ''}{item.thisWeek - item.lastWeek})
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hourly Visits Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Visitas por Hora (24h)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                visits: {
                  label: "Visitas",
                  color: "hsl(var(--primary))",
                },
              }}
              className="h-[250px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyVisits}>
                  <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={2} />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="visits" fill="hsl(var(--primary))" radius={2} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Page Visits Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Páginas Mais Acessadas (Hoje)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pageVisits.length > 0 ? (
              <ChartContainer
                config={{
                  visits: {
                    label: "Visitas",
                    color: "hsl(var(--primary))",
                  },
                }}
                className="h-[250px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={pageVisits} layout="vertical">
                    <XAxis type="number" />
                    <YAxis
                      dataKey="page"
                      type="category"
                      width={100}
                      tick={{ fontSize: 11 }}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="visits" fill="hsl(var(--primary))" radius={4} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                Nenhuma visita registrada hoje
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Comparison Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Comparativo Semanal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                thisWeek: {
                  label: "Esta Semana",
                  color: "hsl(var(--primary))",
                },
                lastWeek: {
                  label: "Semana Passada",
                  color: "hsl(var(--muted-foreground))",
                },
              }}
              className="h-[250px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyComparison}>
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="lastWeek" fill="hsl(var(--muted-foreground))" radius={4} name="Semana Passada" />
                  <Bar dataKey="thisWeek" fill="hsl(var(--primary))" radius={4} name="Esta Semana" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Age Group Participation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Participação por Faixa Etária
            </CardTitle>
          </CardHeader>
          <CardContent>
            {ageGroupStats.length > 0 ? (
              <ChartContainer
                config={{
                  checkins: {
                    label: "Check-ins",
                  },
                }}
                className="h-[250px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={ageGroupStats}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="checkins"
                      nameKey="name"
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      labelLine={false}
                    >
                      {ageGroupStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                Nenhum check-in por faixa etária
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 3 */}
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
              className="h-[250px]"
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
                className="h-[250px]"
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
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                Nenhum check-in registrado ainda
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
