import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useGuestAuth } from "@/hooks/useGuestAuth";

export interface Spin {
  id: string;
  guest_id: string;
  source: "checkin" | "rating" | "daily";
  used: boolean;
  created_at: string;
  used_at: string | null;
}

export interface SpinResult {
  id: string;
  guest_id: string;
  spin_id: string;
  result_type: "points" | "minigame" | "nothing";
  points_won: number;
  minigame_type: "memory" | "quiz" | "words" | null;
  created_at: string;
}

// Wheel sectors with probabilities
export const WHEEL_SECTORS = [
  { id: 1, label: "+5 pts", color: "#22C55E", type: "points" as const, points: 5, weight: 25 },
  { id: 2, label: "+10 pts", color: "#3B82F6", type: "points" as const, points: 10, weight: 20 },
  { id: 3, label: "Mini-Game", color: "#F97316", type: "minigame" as const, points: 0, weight: 20 },
  { id: 4, label: "+20 pts", color: "#A855F7", type: "points" as const, points: 20, weight: 10 },
  { id: 5, label: "Tente Novamente", color: "#9CA3AF", type: "nothing" as const, points: 0, weight: 20 },
  { id: 6, label: "+50 pts", color: "#EAB308", type: "points" as const, points: 50, weight: 5 },
];

export const useGameSpins = () => {
  const { guest, refreshGuest } = useGuestAuth();
  const [availableSpins, setAvailableSpins] = useState<Spin[]>([]);
  const [recentResults, setRecentResults] = useState<SpinResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [dailySpinGranted, setDailySpinGranted] = useState(false);

  const fetchSpins = useCallback(async () => {
    if (!guest?.id) {
      setAvailableSpins([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("guest_spins")
        .select("*")
        .eq("guest_id", guest.id)
        .eq("used", false)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAvailableSpins((data || []) as Spin[]);
    } catch (error) {
      console.error("Error fetching spins:", error);
    } finally {
      setLoading(false);
    }
  }, [guest?.id]);

  const fetchRecentResults = useCallback(async () => {
    if (!guest?.id) {
      setRecentResults([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("spin_results")
        .select("*")
        .eq("guest_id", guest.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setRecentResults((data || []) as SpinResult[]);
    } catch (error) {
      console.error("Error fetching spin results:", error);
    }
  }, [guest?.id]);

  // Check and grant daily spin
  const checkDailySpin = useCallback(async () => {
    if (!guest?.id || dailySpinGranted) return false;

    try {
      // Check if guest already got a daily spin today
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: existingDaily } = await supabase
        .from("guest_spins")
        .select("id")
        .eq("guest_id", guest.id)
        .eq("source", "daily")
        .gte("created_at", today.toISOString())
        .maybeSingle();

      if (existingDaily) {
        return false; // Already got daily spin
      }

      // Grant daily spin
      const { error } = await supabase.from("guest_spins").insert({
        guest_id: guest.id,
        source: "daily",
      });

      if (error) throw error;

      setDailySpinGranted(true);
      await fetchSpins();
      return true;
    } catch (error) {
      console.error("Error granting daily spin:", error);
      return false;
    }
  }, [guest?.id, dailySpinGranted, fetchSpins]);

  // Grant a spin (called after check-in or rating)
  const grantSpin = async (source: "checkin" | "rating") => {
    if (!guest?.id) return false;

    try {
      const { error } = await supabase.from("guest_spins").insert({
        guest_id: guest.id,
        source,
      });

      if (error) throw error;
      await fetchSpins();
      return true;
    } catch (error) {
      console.error("Error granting spin:", error);
      return false;
    }
  };

  // Use a spin and get result
  const useSpin = async (spinId: string): Promise<SpinResult | null> => {
    if (!guest?.id) return null;

    try {
      // Calculate weighted random result
      const totalWeight = WHEEL_SECTORS.reduce((sum, s) => sum + s.weight, 0);
      let random = Math.random() * totalWeight;
      let selectedSector = WHEEL_SECTORS[0];

      for (const sector of WHEEL_SECTORS) {
        random -= sector.weight;
        if (random <= 0) {
          selectedSector = sector;
          break;
        }
      }

      // Mark spin as used
      const { error: updateError } = await supabase
        .from("guest_spins")
        .update({ used: true, used_at: new Date().toISOString() })
        .eq("id", spinId);

      if (updateError) throw updateError;

      // Create spin result
      const resultData = {
        guest_id: guest.id,
        spin_id: spinId,
        result_type: selectedSector.type,
        points_won: selectedSector.points,
        minigame_type: selectedSector.type === "minigame" ? "memory" : null,
      };

      const { data: resultRow, error: resultError } = await supabase
        .from("spin_results")
        .insert(resultData)
        .select()
        .single();

      if (resultError) throw resultError;

      // If won points, update guest total
      if (selectedSector.type === "points" && selectedSector.points > 0) {
        const { error: pointsError } = await supabase
          .from("guests")
          .update({ total_points: (guest.total_points || 0) + selectedSector.points })
          .eq("id", guest.id);

        if (pointsError) throw pointsError;
        await refreshGuest();
      }

      await fetchSpins();
      await fetchRecentResults();

      return resultRow as SpinResult;
    } catch (error) {
      console.error("Error using spin:", error);
      return null;
    }
  };

  // Get sector index from result for animation
  const getSectorIndexFromResult = (result: SpinResult): number => {
    const sector = WHEEL_SECTORS.find(
      (s) =>
        s.type === result.result_type &&
        (result.result_type !== "points" || s.points === result.points_won)
    );
    return sector ? WHEEL_SECTORS.indexOf(sector) : 0;
  };

  useEffect(() => {
    fetchSpins();
    fetchRecentResults();
  }, [fetchSpins, fetchRecentResults]);

  return {
    availableSpins,
    spinCount: availableSpins.length,
    recentResults,
    loading,
    grantSpin,
    useSpin,
    checkDailySpin,
    getSectorIndexFromResult,
    refreshSpins: fetchSpins,
  };
};
