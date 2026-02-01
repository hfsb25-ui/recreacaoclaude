import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, subDays, startOfDay, endOfDay, eachDayOfInterval } from "date-fns";
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
  const [loading, setLoading] = useState(true);
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
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const getDateFilters = () => {
    const from = startOfDay(filters.dateRange.from).toISOString();
    const to = endOfDay(filters.dateRange.to).toISOString();
    return { from, to };
  };

  const fetchKPIData = async () => {
    const { from, to } = getDateFilters();
    
    const [guestsResult, checkinsResult, ratingsResult, visitsResult] = await Promise.all([
      supabase.from("guests").select("id, total_points, current_level"),
      supabase.from("activity_checkins").select("id, guest_id, checked_in_at, activity_id")
        .gte("checked_in_at", from).lte("checked_in_at", to),
      supabase.from("activity_ratings").select("id, rating, guest_id, activity_id")
        .gte("created_at", from).lte("created_at", to),
      supabase.from("site_visits").select("id, session_id, guest_id")
        .gte("created_at", from).lte("created_at", to)
    ]);

    const guests = guestsResult.data || [];
    const checkins = checkinsResult.data || [];
    const ratings = ratingsResult.data || [];
    const visits = visitsResult.data || [];

    setTotalGuests(guests.length);

    // Participation rate
    const guestsWithCheckins = new Set(checkins.map(c => c.guest_id));
    const activeGuestsCount = guestsWithCheckins.size;
    setTotalActiveGuests(activeGuestsCount);
    
    const partRate = guests.length > 0 ? (activeGuestsCount / guests.length) * 100 : 0;
    setParticipationRate(partRate);

    // Average check-ins per active guest
    const avgCheckins = activeGuestsCount > 0 ? checkins.length / activeGuestsCount : 0;
    setAvgCheckinsPerGuest(avgCheckins);

    // Rating rate
    const rateRating = checkins.length > 0 ? (ratings.length / checkins.length) * 100 : 0;
    setRatingRate(Math.min(rateRating, 100));

    // Satisfaction score
    const avgRating = ratings.length > 0
      ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
      : 0;
    setSatisfactionScore(avgRating);

    // NPS calculation
    const promoters = ratings.filter(r => r.rating === 5).length;
    const detractors = ratings.filter(r => r.rating <= 2).length;
    const npsValue = ratings.length > 0 ? ((promoters - detractors) / ratings.length) * 100 : 0;
    setNps(npsValue);

    // Conversion rate
    const uniqueVisitors = new Set(visits.map(v => v.session_id)).size;
    const convRate = uniqueVisitors > 0 ? (activeGuestsCount / uniqueVisitors) * 100 : 0;
    setConversionRate(Math.min(convRate, 100));

    // Retention rate
    const guestDays: Record<string, Set<string>> = {};
    checkins.forEach(c => {
      if (c.guest_id && c.checked_in_at) {
        if (!guestDays[c.guest_id]) guestDays[c.guest_id] = new Set();
        guestDays[c.guest_id].add(c.checked_in_at.split('T')[0]);
      }
    });
    const multiDayGuests = Object.values(guestDays).filter(days => days.size > 1).length;
    const retRate = activeGuestsCount > 0 ? (multiDayGuests / activeGuestsCount) * 100 : 0;
    setRetentionRate(retRate);

    // Generate insights
    generateInsights(checkins, ratings, visits, guests);
  };

  const generateInsights = (checkins: any[], ratings: any[], visits: any[], guests: any[]) => {
    const newInsights: Insight[] = [];

    // Peak hour insight
    const hourCounts: Record<number, number> = {};
    checkins.forEach(c => {
      if (c.checked_in_at) {
        const hour = new Date(c.checked_in_at).getHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      }
    });
    const peakHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0];
    if (peakHour) {
      newInsights.push({
        id: "peak-hour",
        type: "neutral",
        category: "time",
        title: "Horário de Pico",
        description: `A maioria dos check-ins acontece às ${peakHour[0]}h`,
        metric: `${peakHour[1]} check-ins neste horário`
      });
    }

    // Weekend vs weekday
    const weekendCheckins = checkins.filter(c => {
      const day = new Date(c.checked_in_at).getDay();
      return day === 0 || day === 6;
    }).length;
    const weekdayCheckins = checkins.length - weekendCheckins;
    const avgWeekend = weekendCheckins / 2;
    const avgWeekday = weekdayCheckins / 5;
    
    if (avgWeekend > avgWeekday * 1.3) {
      newInsights.push({
        id: "weekend-high",
        type: "positive",
        category: "time",
        title: "Fins de Semana Fortes",
        description: "Os finais de semana têm maior engajamento que os dias úteis",
        metric: `${((avgWeekend / avgWeekday - 1) * 100).toFixed(0)}% mais check-ins`
      });
    }

    // High rating insight
    const avgRating = ratings.length > 0
      ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
      : 0;
    if (avgRating >= 4.5) {
      newInsights.push({
        id: "high-satisfaction",
        type: "positive",
        category: "engagement",
        title: "Alta Satisfação",
        description: "Os hóspedes estão muito satisfeitos com as atividades",
        metric: `Média de ${avgRating.toFixed(1)} estrelas`
      });
    }

    setInsights(newInsights);
  };

  const fetchHeatmapData = async () => {
    const { from, to } = getDateFilters();
    
    const { data: visits } = await supabase
      .from("site_visits")
      .select("created_at")
      .gte("created_at", from)
      .lte("created_at", to);

    if (!visits) return;

    const heatmap: Record<string, number> = {};
    let maxVal = 0;

    visits.forEach(v => {
      if (v.created_at) {
        const date = new Date(v.created_at);
        const day = date.getDay();
        const hour = date.getHours();
        const key = `${day}-${hour}`;
        heatmap[key] = (heatmap[key] || 0) + 1;
        maxVal = Math.max(maxVal, heatmap[key]);
      }
    });

    const heatmapArray: HeatmapData[] = [];
    for (let day = 0; day < 7; day++) {
      for (let hour = 8; hour <= 22; hour++) {
        const key = `${day}-${hour}`;
        heatmapArray.push({ day, hour, value: heatmap[key] || 0 });
      }
    }

    setHeatmapData(heatmapArray);
    setMaxHeatmapValue(maxVal || 1);
  };

  const fetchPeriodData = async () => {
    const { data: periods } = await supabase
      .from("ranking_periods")
      .select("id, period_number, start_date, end_date, is_active")
      .order("period_number", { ascending: false })
      .limit(5);

    if (!periods || periods.length === 0) {
      setPeriodData([]);
      return;
    }

    const { data: winners } = await supabase
      .from("ranking_winners")
      .select("ranking_period_id, total_points, total_checkins, guest_id");

    const periodStats: PeriodData[] = periods
      .filter(p => !p.is_active)
      .map(period => {
        const periodWinners = (winners || []).filter(w => w.ranking_period_id === period.id);
        const totalParticipants = periodWinners.length;
        const totalPoints = periodWinners.reduce((sum, w) => sum + (w.total_points || 0), 0);
        const totalCheckins = periodWinners.reduce((sum, w) => sum + (w.total_checkins || 0), 0);
        const avgPoints = totalParticipants > 0 ? totalPoints / totalParticipants : 0;

        return {
          periodNumber: period.period_number,
          startDate: format(new Date(period.start_date), "dd/MM"),
          endDate: format(new Date(period.end_date), "dd/MM"),
          totalParticipants,
          totalPoints,
          totalCheckins,
          avgPointsPerGuest: avgPoints
        };
      });

    setPeriodData(periodStats);

    if (periodStats.length >= 2) {
      const latest = periodStats[0];
      const previous = periodStats[1];
      if (previous.totalParticipants > 0) {
        const drop = ((previous.totalParticipants - latest.totalParticipants) / previous.totalParticipants) * 100;
        setParticipationDrop(Math.max(0, drop));
        setPreviousParticipationRate(previous.totalParticipants);
      }
    }
  };

  const fetchActivityStats = async () => {
    const { from, to } = getDateFilters();
    
    let activitiesQuery = supabase.from("activities").select("id, name, age_group_id");
    if (filters.ageGroupId) {
      activitiesQuery = activitiesQuery.eq("age_group_id", filters.ageGroupId);
    }
    
    const [activitiesResult, checkinsResult, ratingsResult, ageGroupsResult] = await Promise.all([
      activitiesQuery,
      supabase.from("activity_checkins").select("activity_id")
        .gte("checked_in_at", from).lte("checked_in_at", to),
      supabase.from("activity_ratings").select("activity_id, rating")
        .gte("created_at", from).lte("created_at", to),
      supabase.from("age_groups").select("id, name, color")
    ]);

    const activities = activitiesResult.data || [];
    const checkins = checkinsResult.data || [];
    const ratings = ratingsResult.data || [];
    const ageGroupsList = ageGroupsResult.data || [];

    const ageGroupMap = new Map(ageGroupsList.map(ag => [ag.id, ag]));
    const activityMap = new Map<string, { name: string; checkins: number; ratings: number[]; ageGroup: string; ageGroupColor: string }>();

    activities.forEach(a => {
      const ag = ageGroupMap.get(a.age_group_id);
      activityMap.set(a.id, {
        name: a.name,
        checkins: 0,
        ratings: [],
        ageGroup: ag?.name || "Sem faixa",
        ageGroupColor: ag?.color || "#888888"
      });
    });

    checkins.forEach(c => {
      const activity = activityMap.get(c.activity_id);
      if (activity) activity.checkins++;
    });

    ratings.forEach(r => {
      const activity = activityMap.get(r.activity_id);
      if (activity) activity.ratings.push(r.rating);
    });

    const stats: ActivityStats[] = Array.from(activityMap.entries()).map(([id, data]) => {
      const avgRating = data.ratings.length > 0
        ? data.ratings.reduce((sum, r) => sum + r, 0) / data.ratings.length
        : 0;
      const ratingRate = data.checkins > 0 ? (data.ratings.length / data.checkins) * 100 : 0;

      return {
        id,
        name: data.name,
        totalCheckins: data.checkins,
        totalRatings: data.ratings.length,
        avgRating,
        ratingRate,
        ageGroup: data.ageGroup,
        ageGroupColor: data.ageGroupColor
      };
    });

    const sortedByEngagement = [...stats]
      .filter(a => a.totalCheckins > 0)
      .sort((a, b) => (b.totalCheckins * (b.avgRating || 3)) - (a.totalCheckins * (a.avgRating || 3)));

    const underperforming = stats
      .filter(a => (a.avgRating > 0 && a.avgRating < 3.5) || (a.totalCheckins > 0 && a.totalCheckins < 3))
      .sort((a, b) => a.avgRating - b.avgRating);

    setActivityStats(stats);
    setTopActivities(sortedByEngagement);
    setUnderperformingActivities(underperforming);

    const lowRated = stats
      .filter(a => a.avgRating > 0 && a.avgRating < 3.5)
      .map(a => ({ name: a.name, rating: a.avgRating }));
    setLowRatedActivities(lowRated);
  };

  const fetchLevelData = async () => {
    const [levelsResult, guestsResult, checkinsResult] = await Promise.all([
      supabase.from("levels").select("level_number, name, badge_emoji").order("level_number"),
      supabase.from("guests").select("id, current_level"),
      supabase.from("activity_checkins").select("guest_id")
    ]);

    const levels = levelsResult.data || [];
    const guests = guestsResult.data || [];
    const checkins = checkinsResult.data || [];

    const checkinCounts: Record<string, number> = {};
    checkins.forEach(c => {
      checkinCounts[c.guest_id] = (checkinCounts[c.guest_id] || 0) + 1;
    });

    const levelStats: LevelData[] = levels.map(level => {
      const guestsAtLevel = guests.filter(g => g.current_level === level.level_number);
      const guestCount = guestsAtLevel.length;
      const totalCheckins = guestsAtLevel.reduce((sum, g) => sum + (checkinCounts[g.id] || 0), 0);
      const avgCheckins = guestCount > 0 ? totalCheckins / guestCount : 0;
      const percentOfTotal = guests.length > 0 ? (guestCount / guests.length) * 100 : 0;

      return {
        level: level.level_number,
        name: level.name,
        emoji: level.badge_emoji,
        guestCount,
        avgCheckins,
        percentOfTotal
      };
    });

    setLevelData(levelStats);
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
        const lastTime = new Date(lastCheckin[0].checked_in_at);
        const hoursDiff = (now.getTime() - lastTime.getTime()) / (1000 * 60 * 60);
        setHoursWithoutCheckin(Math.floor(hoursDiff));
      }
    }
  };

  const fetchTrendData = async () => {
    const { from, to } = getDateFilters();
    const days = eachDayOfInterval({ start: filters.dateRange.from, end: filters.dateRange.to });

    const [checkinsResult, ratingsResult, visitsResult, guestsResult] = await Promise.all([
      supabase.from("activity_checkins").select("checked_in_at").gte("checked_in_at", from).lte("checked_in_at", to),
      supabase.from("activity_ratings").select("created_at").gte("created_at", from).lte("created_at", to),
      supabase.from("site_visits").select("created_at").gte("created_at", from).lte("created_at", to),
      supabase.from("guests").select("created_at").gte("created_at", from).lte("created_at", to)
    ]);

    const checkins = checkinsResult.data || [];
    const ratings = ratingsResult.data || [];
    const visits = visitsResult.data || [];
    const guests = guestsResult.data || [];

    const trendPoints: TrendDataPoint[] = days.map(day => {
      const dayStr = format(day, "yyyy-MM-dd");
      const label = format(day, "dd/MM", { locale: ptBR });

      return {
        date: dayStr,
        label,
        checkins: checkins.filter(c => c.checked_in_at?.startsWith(dayStr)).length,
        ratings: ratings.filter(r => r.created_at?.startsWith(dayStr)).length,
        visits: visits.filter(v => v.created_at?.startsWith(dayStr)).length,
        registrations: guests.filter(g => g.created_at?.startsWith(dayStr)).length
      };
    });

    setTrendData(trendPoints);
  };

  const fetchAgeGroupMetrics = async () => {
    const { from, to } = getDateFilters();

    const [ageGroupsResult, activitiesResult, checkinsResult, ratingsResult, guestsResult] = await Promise.all([
      supabase.from("age_groups").select("id, name, color").order("sort_order"),
      supabase.from("activities").select("id, age_group_id"),
      supabase.from("activity_checkins").select("activity_id, guest_id").gte("checked_in_at", from).lte("checked_in_at", to),
      supabase.from("activity_ratings").select("activity_id, rating").gte("created_at", from).lte("created_at", to),
      supabase.from("guests").select("id")
    ]);

    const ageGroupsList = ageGroupsResult.data || [];
    const activities = activitiesResult.data || [];
    const checkins = checkinsResult.data || [];
    const ratings = ratingsResult.data || [];
    const guests = guestsResult.data || [];

    const activityAgeMap = new Map(activities.map(a => [a.id, a.age_group_id]));

    const metrics: AgeGroupData[] = ageGroupsList.map(ag => {
      const agActivityIds = activities.filter(a => a.age_group_id === ag.id).map(a => a.id);
      const agCheckins = checkins.filter(c => agActivityIds.includes(c.activity_id));
      const agRatings = ratings.filter(r => agActivityIds.includes(r.activity_id));
      const uniqueGuests = new Set(agCheckins.map(c => c.guest_id));

      const avgRating = agRatings.length > 0
        ? agRatings.reduce((sum, r) => sum + r.rating, 0) / agRatings.length
        : 0;

      return {
        id: ag.id,
        name: ag.name,
        color: ag.color,
        totalCheckins: agCheckins.length,
        totalGuests: uniqueGuests.size,
        avgCheckins: uniqueGuests.size > 0 ? agCheckins.length / uniqueGuests.size : 0,
        avgRating,
        engagementScore: agCheckins.length * (avgRating || 3)
      };
    });

    setAgeGroupMetrics(metrics);
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
