import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Guest {
  id: string;
  name: string;
  room_number: string;
  phone: string | null;
  total_points: number;
  current_level: number;
  created_at: string;
  updated_at: string;
}

interface Level {
  id: string;
  level_number: number;
  name: string;
  min_points: number;
  badge_emoji: string;
}

export const useGuestAuth = () => {
  const [guest, setGuest] = useState<Guest | null>(null);
  const [currentLevel, setCurrentLevel] = useState<Level | null>(null);
  const [nextLevel, setNextLevel] = useState<Level | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if guest is logged in
    const guestData = localStorage.getItem("guest");
    if (guestData) {
      const parsedGuest = JSON.parse(guestData);
      setGuest(parsedGuest);
      fetchLevelInfo(parsedGuest.current_level, parsedGuest.total_points);
    }
    setLoading(false);
  }, []);

  const fetchLevelInfo = async (levelNumber: number, points: number) => {
    const { data: levels } = await supabase
      .from("levels")
      .select("*")
      .order("level_number", { ascending: true });

    if (levels) {
      const current = levels.find((l) => l.level_number === levelNumber);
      const next = levels.find((l) => l.level_number === levelNumber + 1);
      setCurrentLevel(current || null);
      setNextLevel(next || null);
    }
  };

  const login = async (roomNumber: string, pin: string) => {
    const { data, error } = await supabase
      .from("guests")
      .select("*")
      .eq("room_number", roomNumber)
      .eq("pin_code", pin)
      .single();

    if (error || !data) {
      throw new Error("Quarto ou PIN incorretos");
    }

    localStorage.setItem("guest", JSON.stringify(data));
    setGuest(data);
    await fetchLevelInfo(data.current_level, data.total_points);
    return data;
  };

  const register = async (name: string, roomNumber: string, pin: string, phone?: string) => {
    if (pin.length !== 4 || !/^\d+$/.test(pin)) {
      throw new Error("PIN deve ter exatamente 4 dígitos numéricos");
    }

    const { data, error } = await supabase
      .from("guests")
      .insert({
        name,
        room_number: roomNumber,
        pin_code: pin,
        total_points: 50, // Welcome bonus!
        ...(phone ? { phone } : {}),
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        throw new Error("Este quarto e PIN já estão cadastrados");
      }
      throw error;
    }

    localStorage.setItem("guest", JSON.stringify(data));
    setGuest(data);
    await fetchLevelInfo(data.current_level, data.total_points);
    return data;
  };

  const logout = () => {
    localStorage.removeItem("guest");
    setGuest(null);
    setCurrentLevel(null);
    setNextLevel(null);
  };

  const refreshGuest = async () => {
    if (!guest) return;

    const { data } = await supabase
      .from("guests")
      .select("*")
      .eq("id", guest.id)
      .single();

    if (data) {
      localStorage.setItem("guest", JSON.stringify(data));
      setGuest(data);
      await fetchLevelInfo(data.current_level, data.total_points);
    }
  };

  return {
    guest,
    currentLevel,
    nextLevel,
    loading,
    login,
    register,
    logout,
    refreshGuest,
  };
};
