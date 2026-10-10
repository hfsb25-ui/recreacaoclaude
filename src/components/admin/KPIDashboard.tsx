import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { differenceInCalendarDays, format, subDays } from "date-fns";
import {
  dayBounds,
  dayKey,
  fetchAll,
  getActivityStats,
  getAgeGroupStats,
  getDailyStats,
  getPeriodStats,
  getVisitHours,
  getVisitTotals,
  summarizeRatings,
  type DailyRow,
} from "@/lib/adminStats";
import { ptBR } from "date-fns/locale";
import { KPICards } from "./kpi/KPICards";
import { ActivityHeatmap } from "./kpi/ActivityHeatmap";
import { PeriodComparison } from "./kpi/PeriodComparison";
import { ActivityAnalysis } from "./kpi/ActivityAnalysis";
import { EngagementFunnel } from "./kpi/EngagementFunnel";
import { KPIAlerts } from "./kpi/KPIAlerts";
import { KPIFilters, FilterState, DateRange } from "./kpi/KPIFilters";
import { TrendChart, TrendDataPoint } from "./kpi/TrendChart";
import { SmartInsights, Insight } from "./kpi/SmartInsights";
import { AgeGroupMetrics, AgeGroupData } from "./kpi/AgeGroupMetrics";
import { KPIExport } from "./kpi/KPIExport";

interface HeatmapData {
  day: number;
  hour: number;
  value: number;
}

interface PeriodData {
  periodNumber: number;
  startDate: string;
  endDate: string;
  totalParticipants: number;
  totalPoints: number;
  totalCheckins: number;
  avgPointsPerGuest: number;
}

interface ActivityStats {
  id: string;
  name: string;
  totalCheckins: number;
  totalRatings: number;
  avgRating: number;
  ratingRate: number;
  ageGroup: string;
  ageGroupColor: string;
}

interface LevelData {
  level: number;
  name: string;
  emoji: string;
  guestCount: number;
  avgCheckins: number;
  percentOfTotal: number;
}

interface AgeGroup {
  id: string;
  name: string;
  color: string;
}

const getDefaultFilters = (): FilterState => ({
  dateRange: {
    from: subDays(new Date(), 7),
    to: new Date()
  },
  ageGroupId: null,
  preset: "7days"
});

export const KPIDashboard = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>(getDefaultFilters());
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [ageGroups, setAgeGroups] = useState<AgeGroup[]>([]);
  
  // KPI Cards data
  const [participationRate, setParticipationRate] = useState(0);
  const [avgCheckinsPerGuest, setAvgCheckinsPerGuest] = useState(0);
  const [ratingRate, setRatingRate] = useState(0);
  const [satisfactionScore, setSatisfactionScore] = useState(0);
  const [retentionRate, setRetentionRate] = useState(0);
  const [totalActiveGuests, setTotalActiveGuests] = useState(0);
  const [previousParticipationRate, setPreviousParticipationRate] = useState<number>();
  const [previousSatisfaction, setPreviousSatisfaction] = useState<number>();
  const [nps, setNps] = useState(0);
  const [previousNps, setPreviousNps] = useState<number>();
  const [conversionRate, setConversionRate] = useState(0);
  
  // Heatmap data
  const [heatmapData, setHeatmapData] = useState<HeatmapData[]>([]);
  const [maxHeatmapValue, setMaxHeatmapValue] = useState(1);
  
  // Period comparison data
  const [periodData, setPeriodData] = useState<PeriodData[]>([]);
  
  // Activity analysis data
  const [activityStats, setActivityStats] = useState<ActivityStats[]>([]);
  const [topActivities, setTopActivities] = useState<ActivityStats[]>([]);
  const [underperformingActivities, setUnderperformingActivities] = useState<ActivityStats[]>([]);
  
  // Level data
  const [levelData, setLevelData] = useState<LevelData[]>([]);
  const [totalGuests, setTotalGuests] = useState(0);
  
  // Alert data
  const [participationDrop, setParticipationDrop] = useState(0);
  const [lowRatedActivities, setLowRatedActivities] = useState<{ name: string; rating: number }[]>([]);
  const [hoursWithoutCheckin, setHoursWithoutCheckin] = useState(0);
  const [isOperatingHours, setIsOperatingHours] = useState(false);

  // Trend data
  const [trendData, setTrendData] = useState<TrendDataPoint[]>([]);
  
  // Smart insights
  const [insights, setInsights] = useState<Insight[]>([]);
  
  // Age group metrics
  const [ageGroupMetrics, setAgeGroupMetrics] = useState<AgeGroupData[]>([]);

  // Site settings
  const [siteName, setSiteName] = useState("Hotel");
  const [logoUrl, setLogoUrl] = useState<string>();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchAgeGroups();
    fetchSiteSettings();
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [filters]);

  const fetchAgeGroups = async () => {
    const { data } = await supabase.from("age_groups").select("id, name, color").order("sort_order");
    if (data) setAgeGroups(data);
  };

  const fetchSiteSettings = async () => {
    const { data } = await supabase.from("site_settings").select("site_name, logo_url").single();
    if (data) {
      setSiteName(data.site_name || "Hotel");
      setLogoUrl(data.logo_url || undefined);
    }
  };

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      await Promise.all([
        fetchKPIData(),
        fetchHeatmapData(),
        fetchPeriodData(),
        fetchActivityStats(),
        fetchLevelData(),
        fetchAlertData(),
        fetchTrendData(),
        fetchAgeGroupMetrics()
      ]);
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Error fetching KPI data:", error);
      setLoadError(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const getDateFilters = () => dayBounds(filters.dateRange.from, filters.dateRange.to);

  /** Intervalo anterior com o mesmo número de dias (para comparar) */
  const getPreviousDateFilters = () => {
    const days = differenceInCalendarDays(filters.dateRange.to, filters.dateRange.from) + 1;
    return dayBounds(subDays(filters.dateRange.from, days), subDays(filters.dateRange.from, 1));
  };

  const fetchKPIData = async () => {
    const { from, to } = getDateFilters();
    const prev = getPreviousDateFilters();

    const [guests, checkins, ratingsNow, ratingsPrev, visits, daily] = await Promise.all([
      fetchAll<{ id: string }>(() => supabase.from("guests").select("id").order("id")),
      fetchAll<{ guest_id: string; checked_in_at: string }>(() =>
        supabase.from("activity_checkins").select("guest_id, checked_in_at").gte("checked_in_at", from).lt("checked_in_at", to).order("id")
      ),
      getActivityStats(from, to),
      getActivityStats(prev.from, prev.to),
      getVisitTotals(from, to),
      getDailyStats(filters.dateRange.from, filters.dateRange.to),
    ]);

    setTotalGuests(guests.length);

    // Participação: hóspedes do período atual com 1+ check-in no intervalo
    const guestsWithCheckins = new Set(checkins.map((c) => c.guest_id));
    const activeGuestsCount = guestsWithCheckins.size;
    setTotalActiveGuests(activeGuestsCount);
    setParticipationRate(guests.length > 0 ? (activeGuestsCount / guests.length) * 100 : 0);
    setPreviousParticipationRate(undefined);

    setAvgCheckinsPerGuest(activeGuestsCount > 0 ? checkins.length / activeGuestsCount : 0);

    // Avaliações x check-ins no intervalo (inclui o histórico dos períodos já encerrados)
    const now = summarizeRatings(ratingsNow);
    const before = summarizeRatings(ratingsPrev);
    const checkinsInRange = daily.reduce((s, d) => s + d.checkins, 0);
    setRatingRate(checkinsInRange > 0 ? Math.min((now.count / checkinsInRange) * 100, 100) : 0);
    setSatisfactionScore(now.average);
    setPreviousSatisfaction(before.count > 0 ? before.average : undefined);
    setNps(now.nps);
    setPreviousNps(before.count > 0 ? before.nps : undefined);

    setConversionRate(visits.visitors > 0 ? Math.min((activeGuestsCount / visits.visitors) * 100, 100) : 0);

    // Retenção: check-in em 2 ou mais dias (dia no horário local)
    const guestDays: Record<string, Set<string>> = {};
    checkins.forEach((c) => {
      if (!guestDays[c.guest_id]) guestDays[c.guest_id] = new Set();
      guestDays[c.guest_id].add(dayKey(c.checked_in_at));
    });
    const multiDayGuests = Object.values(guestDays).filter((days) => days.size > 1).length;
    setRetentionRate(activeGuestsCount > 0 ? (multiDayGuests / activeGuestsCount) * 100 : 0);

    generateInsights(checkins, daily, now.average);
  };

  const generateInsights = (checkins: { checked_in_at: string }[], daily: DailyRow[], avgRating: number) => {
    const newInsights: Insight[] = [];

    // Horário de pico dos check-ins
    const hourCounts: Record<number, number> = {};
    checkins.forEach((c) => {
      const hour = new Date(c.checked_in_at).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });
    const peakHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0];
    if (peakHour) {
      newInsights.push({
        id: "peak-hour",
        type: "neutral",
        category: "time",
        title: "Horário de Pico",
        description: `A maioria dos check-ins acontece às ${peakHour[0]}h`,
        metric: `${peakHour[1]} check-ins neste horário`,
      });
    }

    // Fim de semana x dias úteis: média por dia, contando quantos dias de cada tipo há no intervalo
    const isWeekend = (d: DailyRow) => {
      const dow = new Date(`${d.day}T12:00:00`).getDay();
      return dow === 0 || dow === 6;
    };
    const weekendDays = daily.filter(isWeekend);
    const weekDays = daily.filter((d) => !isWeekend(d));
    const avgWeekend = weekendDays.length ? weekendDays.reduce((s, d) => s + d.checkins, 0) / weekendDays.length : 0;
    const avgWeekday = weekDays.length ? weekDays.reduce((s, d) => s + d.checkins, 0) / weekDays.length : 0;
    if (avgWeekday > 0 && avgWeekend > avgWeekday * 1.3) {
      newInsights.push({
        id: "weekend-high",
        type: "positive",
        category: "time",
        title: "Fins de Semana Fortes",
        description: "Os finais de semana têm maior engajamento que os dias úteis",
        metric: `${((avgWeekend / avgWeekday - 1) * 100).toFixed(0)}% mais check-ins por dia`,
      });
    }

    if (avgRating >= 4.5) {
      newInsights.push({
        id: "high-satisfaction",
        type: "positive",
        category: "engagement",
        title: "Alta Satisfação",
        description: "Os hóspedes estão muito satisfeitos com as atividades",
        metric: `Média de ${avgRating.toFixed(1)} estrelas`,
      });
    }

    setInsights(newInsights);
  };

  const fetchHeatmapData = async () => {
    const { from, to } = getDateFilters();
    const rows = await getVisitHours(from, to);

    const heatmap: Record<string, number> = {};
    let maxVal = 0;
    rows.forEach((r) => {
      const key = `${r.dow}-${r.hour}`;
      heatmap[key] = (heatmap[key] || 0) + r.visits;
      maxVal = Math.max(maxVal, heatmap[key]);
    });

    const heatmapArray: HeatmapData[] = [];
    for (let day = 0; day < 7; day++) {
      for (let hour = 8; hour <= 22; hour++) {
        heatmapArray.push({ day, hour, value: heatmap[`${day}-${hour}`] || 0 });
      }
    }

    setHeatmapData(heatmapArray);
    setMaxHeatmapValue(maxVal || 1);
  };

  const fetchPeriodData = async () => {
    const rows = await getPeriodStats(5);
    const short = (d: string) => format(new Date(`${d}T12:00:00`), "dd/MM");

    const periodStats: PeriodData[] = rows.map((p) => ({
      periodNumber: p.periodNumber,
      startDate: short(p.startDate),
      endDate: short(p.endDate),
      totalParticipants: p.participants,
      totalPoints: p.points,
      totalCheckins: p.checkins,
      avgPointsPerGuest: p.participants > 0 ? p.points / p.participants : 0,
    }));
    setPeriodData(periodStats);

    if (periodStats.length >= 2 && periodStats[1].totalParticipants > 0) {
      const [latest, previous] = periodStats;
      const drop = ((previous.totalParticipants - latest.totalParticipants) / previous.totalParticipants) * 100;
      setParticipationDrop(Math.max(0, drop));
    } else {
      setParticipationDrop(0);
    }
  };

  const fetchActivityStats = async () => {
    const { from, to } = getDateFilters();
    const [rows, ageGroupsResult] = await Promise.all([
      getActivityStats(from, to),
      supabase.from("age_groups").select("id, name, color"),
    ]);
    const ageGroupMap = new Map((ageGroupsResult.data || []).map((ag) => [ag.id, ag]));

    const stats: ActivityStats[] = rows
      .filter((r) => !filters.ageGroupId || r.ageGroupId === filters.ageGroupId)
      .map((r) => {
        const ag = ageGroupMap.get(r.ageGroupId);
        return {
          id: `${r.name}|${r.ageGroupId}`,
          name: r.name,
          totalCheckins: r.checkins,
          totalRatings: r.ratings,
          avgRating: r.ratings > 0 ? r.ratingSum / r.ratings : 0,
          ratingRate: r.checkins > 0 ? Math.min((r.ratings / r.checkins) * 100, 100) : 0,
          ageGroup: ag?.name || "Sem faixa",
          ageGroupColor: ag?.color || "#888888",
        };
      })
      .sort((a, b) => b.totalCheckins - a.totalCheckins || b.totalRatings - a.totalRatings);

    const sortedByEngagement = stats
      .filter((a) => a.totalCheckins > 0)
      .sort((a, b) => b.totalCheckins * (b.avgRating || 3) - a.totalCheckins * (a.avgRating || 3));

    const underperforming = stats
      .filter((a) => (a.totalRatings >= 3 && a.avgRating < 3.5) || (a.totalCheckins > 0 && a.totalCheckins < 3))
      .sort((a, b) => a.avgRating - b.avgRating);

    setActivityStats(stats);
    setTopActivities(sortedByEngagement);
    setUnderperformingActivities(underperforming);
    setLowRatedActivities(
      stats.filter((a) => a.totalRatings >= 3 && a.avgRating < 3.5).map((a) => ({ name: a.name, rating: a.avgRating }))
    );
  };

  const fetchLevelData = async () => {
    const [levelsResult, guests, checkins] = await Promise.all([
      supabase.from("levels").select("level_number, name, badge_emoji").order("level_number"),
      fetchAll<{ id: string; current_level: number }>(() => supabase.from("guests").select("id, current_level").order("id")),
      fetchAll<{ guest_id: string }>(() => supabase.from("activity_checkins").select("guest_id").order("id")),
    ]);

    const levels = levelsResult.data || [];
    const checkinCounts: Record<string, number> = {};
    checkins.forEach((c) => {
      checkinCounts[c.guest_id] = (checkinCounts[c.guest_id] || 0) + 1;
    });

    setLevelData(
      levels.map((level) => {
        const guestsAtLevel = guests.filter((g) => g.current_level === level.level_number);
        const guestCount = guestsAtLevel.length;
        const totalCheckins = guestsAtLevel.reduce((sum, g) => sum + (checkinCounts[g.id] || 0), 0);
        return {
          level: level.level_number,
          name: level.name,
          emoji: level.badge_emoji,
          guestCount,
          avgCheckins: guestCount > 0 ? totalCheckins / guestCount : 0,
          percentOfTotal: guests.length > 0 ? (guestCount / guests.length) * 100 : 0,
        };
      })
    );
  };

  const fetchAlertData = async () => {
    const now = new Date();
    const currentHour = now.getHours();
    const isOperating = currentHour >= 8 && currentHour <= 22;
    setIsOperatingHours(isOperating);

    if (isOperating) {
      const { data: lastCheckin } = await supabase
        .from("activity_checkins")
        .select("checked_in_at")
        .order("checked_in_at", { ascending: false })
        .limit(1);

      if (lastCheckin && lastCheckin.length > 0) {
        const hoursDiff = (now.getTime() - new Date(lastCheckin[0].checked_in_at).getTime()) / (1000 * 60 * 60);
        setHoursWithoutCheckin(Math.floor(hoursDiff));
      } else {
        setHoursWithoutCheckin(0);
      }
    }
  };

  const fetchTrendData = async () => {
    const daily = await getDailyStats(filters.dateRange.from, filters.dateRange.to);
    setTrendData(
      daily.map((d) => ({
        date: d.day,
        label: format(new Date(`${d.day}T12:00:00`), "dd/MM", { locale: ptBR }),
        checkins: d.checkins,
        ratings: d.ratings,
        visits: d.visits,
        registrations: d.signups,
      }))
    );
  };

  const fetchAgeGroupMetrics = async () => {
    const { from, to } = getDateFilters();
    const [ageGroupsResult, rows] = await Promise.all([
      supabase.from("age_groups").select("id, name, color").order("sort_order"),
      getAgeGroupStats(from, to),
    ]);

    setAgeGroupMetrics(
      (ageGroupsResult.data || []).map((ag) => {
        const r = rows.find((x) => x.ageGroupId === ag.id);
        const checkins = r?.checkins ?? 0;
        const guests = r?.guests ?? 0;
        const avgRating = r && r.ratings > 0 ? r.ratingSum / r.ratings : 0;
        return {
          id: ag.id,
          name: ag.name,
          color: ag.color,
          totalCheckins: checkins,
          totalGuests: guests,
          avgCheckins: guests > 0 ? checkins / guests : 0,
          avgRating,
          engagementScore: checkins * (avgRating || 3),
        };
      })
    );
  };

  const handleRefresh = () => {
    fetchAllData();
  };

  const getPeriodLabel = () => {
    return `${format(filters.dateRange.from, "dd/MM/yyyy", { locale: ptBR })} - ${format(filters.dateRange.to, "dd/MM/yyyy", { locale: ptBR })}`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-16" />
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-64" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Clock and Title */}
      <div className="flex justify-between items-end bg-card p-4 rounded-xl border shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Dashboard Geral</h2>
          <p className="text-sm text-muted-foreground">Visão analítica do sistema</p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-mono font-bold text-primary tabular-nums">
            {format(currentTime, "HH:mm:ss")}
          </div>
          <div className="text-sm text-muted-foreground font-medium">
            {format(currentTime, "EEEE, d 'de' MMMM", { locale: ptBR })}
          </div>
        </div>
      </div>

      {/* Filters and Export */}
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <KPIFilters
            filters={filters}
            onFiltersChange={setFilters}
            ageGroups={ageGroups}
            onRefresh={handleRefresh}
            lastUpdated={lastUpdated}
            isLoading={loading}
          />
        </div>
        <KPIExport
          data={{
            participationRate,
            avgCheckinsPerGuest,
            ratingRate,
            satisfactionScore,
            retentionRate,
            totalActiveGuests,
            nps,
            conversionRate,
            periodLabel: getPeriodLabel()
          }}
          logoUrl={logoUrl}
          siteName={siteName}
        />
      </div>

      {loadError && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm">
          Não foi possível carregar todos os indicadores. Confira se o SQL de estatísticas foi rodado no Supabase.
          <span className="block text-xs text-muted-foreground mt-1">{loadError}</span>
        </div>
      )}

      {/* KPI Alerts */}
      <KPIAlerts
        participationDrop={participationDrop}
        lowRatedActivities={lowRatedActivities}
        hoursWithoutCheckin={hoursWithoutCheckin}
        isOperatingHours={isOperatingHours}
      />

      {/* Main KPI Cards */}
      <KPICards
        participationRate={participationRate}
        avgCheckinsPerGuest={avgCheckinsPerGuest}
        ratingRate={ratingRate}
        satisfactionScore={satisfactionScore}
        retentionRate={retentionRate}
        totalActiveGuests={totalActiveGuests}
        previousParticipationRate={previousParticipationRate}
        previousSatisfaction={previousSatisfaction}
        nps={nps}
        previousNps={previousNps}
        conversionRate={conversionRate}
      />

      {/* Trend Chart */}
      <TrendChart data={trendData} />

      {/* Smart Insights */}
      <SmartInsights insights={insights} />

      {/* Tabbed Content */}
      <Tabs defaultValue="heatmap" className="w-full">
        <TabsList className="grid w-full grid-cols-5 mb-4">
          <TabsTrigger value="heatmap">Horários</TabsTrigger>
          <TabsTrigger value="periods">Períodos</TabsTrigger>
          <TabsTrigger value="activities">Atividades</TabsTrigger>
          <TabsTrigger value="ageGroups">Faixas Etárias</TabsTrigger>
          <TabsTrigger value="levels">Níveis</TabsTrigger>
        </TabsList>

        <TabsContent value="heatmap">
          <ActivityHeatmap data={heatmapData} maxValue={maxHeatmapValue} />
        </TabsContent>

        <TabsContent value="periods">
          <PeriodComparison periods={periodData} />
        </TabsContent>

        <TabsContent value="activities">
          <ActivityAnalysis
            activities={activityStats}
            topActivities={topActivities}
            underperformingActivities={underperformingActivities}
          />
        </TabsContent>

        <TabsContent value="ageGroups">
          <AgeGroupMetrics data={ageGroupMetrics} />
        </TabsContent>

        <TabsContent value="levels">
          <EngagementFunnel levelData={levelData} totalGuests={totalGuests} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
