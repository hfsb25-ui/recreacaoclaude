import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { KPICards } from "./kpi/KPICards";
import { ActivityHeatmap } from "./kpi/ActivityHeatmap";
import { PeriodComparison } from "./kpi/PeriodComparison";
import { ActivityAnalysis } from "./kpi/ActivityAnalysis";
import { EngagementFunnel } from "./kpi/EngagementFunnel";
import { KPIAlerts } from "./kpi/KPIAlerts";

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

export const KPIDashboard = () => {
  const [loading, setLoading] = useState(true);
  
  // KPI Cards data
  const [participationRate, setParticipationRate] = useState(0);
  const [avgCheckinsPerGuest, setAvgCheckinsPerGuest] = useState(0);
  const [ratingRate, setRatingRate] = useState(0);
  const [satisfactionScore, setSatisfactionScore] = useState(0);
  const [retentionRate, setRetentionRate] = useState(0);
  const [totalActiveGuests, setTotalActiveGuests] = useState(0);
  const [previousParticipationRate, setPreviousParticipationRate] = useState<number>();
  const [previousSatisfaction, setPreviousSatisfaction] = useState<number>();
  
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

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchKPIData(),
        fetchHeatmapData(),
        fetchPeriodData(),
        fetchActivityStats(),
        fetchLevelData(),
        fetchAlertData()
      ]);
    } catch (error) {
      console.error("Error fetching KPI data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchKPIData = async () => {
    // Fetch guests and checkins in parallel
    const [guestsResult, checkinsResult, ratingsResult] = await Promise.all([
      supabase.from("guests").select("id, total_points, current_level"),
      supabase.from("activity_checkins").select("id, guest_id, checked_in_at"),
      supabase.from("activity_ratings").select("id, rating, guest_id")
    ]);

    const guests = guestsResult.data || [];
    const checkins = checkinsResult.data || [];
    const ratings = ratingsResult.data || [];

    setTotalGuests(guests.length);

    // Participation rate: guests with at least 1 check-in
    const guestsWithCheckins = new Set(checkins.map(c => c.guest_id));
    const activeGuestsCount = guestsWithCheckins.size;
    setTotalActiveGuests(activeGuestsCount);
    
    const partRate = guests.length > 0 ? (activeGuestsCount / guests.length) * 100 : 0;
    setParticipationRate(partRate);

    // Average check-ins per active guest
    const avgCheckins = activeGuestsCount > 0 ? checkins.length / activeGuestsCount : 0;
    setAvgCheckinsPerGuest(avgCheckins);

    // Rating rate: ratings / unique activity-guest combinations from checkins
    const uniqueCheckinPairs = new Set(checkins.map(c => `${c.guest_id}`));
    const rateRating = uniqueCheckinPairs.size > 0 ? (ratings.length / checkins.length) * 100 : 0;
    setRatingRate(Math.min(rateRating, 100));

    // Satisfaction score: average rating
    const avgRating = ratings.length > 0
      ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
      : 0;
    setSatisfactionScore(avgRating);

    // Retention rate: guests who checked in on multiple days
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
  };

  const fetchHeatmapData = async () => {
    const { data: visits } = await supabase
      .from("site_visits")
      .select("created_at");

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
        heatmapArray.push({
          day,
          hour,
          value: heatmap[key] || 0
        });
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
      .filter(p => !p.is_active) // Only completed periods
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

    // Calculate participation drop for alerts
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
    const [activitiesResult, checkinsResult, ratingsResult, ageGroupsResult] = await Promise.all([
      supabase.from("activities").select("id, name, age_group_id"),
      supabase.from("activity_checkins").select("activity_id"),
      supabase.from("activity_ratings").select("activity_id, rating"),
      supabase.from("age_groups").select("id, name, color")
    ]);

    const activities = activitiesResult.data || [];
    const checkins = checkinsResult.data || [];
    const ratings = ratingsResult.data || [];
    const ageGroups = ageGroupsResult.data || [];

    const ageGroupMap = new Map(ageGroups.map(ag => [ag.id, ag]));

    // Aggregate stats per activity
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
      const ratingRate = data.checkins > 0
        ? (data.ratings.length / data.checkins) * 100
        : 0;

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

    // Sort by engagement score (checkins * rating weight)
    const sortedByEngagement = [...stats]
      .filter(a => a.totalCheckins > 0)
      .sort((a, b) => {
        const scoreA = a.totalCheckins * (a.avgRating || 3);
        const scoreB = b.totalCheckins * (b.avgRating || 3);
        return scoreB - scoreA;
      });

    // Underperforming: low checkins or low rating
    const underperforming = stats
      .filter(a => (a.avgRating > 0 && a.avgRating < 3.5) || (a.totalCheckins > 0 && a.totalCheckins < 3))
      .sort((a, b) => a.avgRating - b.avgRating);

    setActivityStats(stats);
    setTopActivities(sortedByEngagement);
    setUnderperformingActivities(underperforming);

    // Low rated activities for alerts
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

    // Count checkins per guest
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
    // Check operating hours (8:00 - 22:00)
    const now = new Date();
    const currentHour = now.getHours();
    const isOperating = currentHour >= 8 && currentHour <= 22;
    setIsOperatingHours(isOperating);

    if (isOperating) {
      // Check last check-in time
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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
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
      />

      {/* Tabbed Content */}
      <Tabs defaultValue="heatmap" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-4">
          <TabsTrigger value="heatmap">Horários</TabsTrigger>
          <TabsTrigger value="periods">Períodos</TabsTrigger>
          <TabsTrigger value="activities">Atividades</TabsTrigger>
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

        <TabsContent value="levels">
          <EngagementFunnel levelData={levelData} totalGuests={totalGuests} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
