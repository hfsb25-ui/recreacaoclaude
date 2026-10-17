import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/** Mensagem quando o cadastro salvo no celular não existe mais (ex.: depois de fechar a semana do ranking). */
export const AVISO_SESSAO_EXPIRADA = "Seu acesso expirou. Entre de novo com o apartamento e o sobrenome.";

/** Erro de chave estrangeira do hóspede: o cadastro foi apagado do banco. */
export const hospedeNaoExiste = (error: { code?: string; message?: string } | null | undefined) =>
  Boolean(error && (error.code === "23503" || /guest_id_fkey/.test(error.message ?? "")));

// Confere uma vez por abertura do app se o hóspede salvo no celular ainda existe no banco
const conferencias = new Map<string, Promise<boolean>>();
const hospedeExiste = (id: string) => {
  let conferencia = conferencias.get(id);
  if (!conferencia) {
    conferencia = (async () => {
      try {
        const { data, error } = await supabase.from("guests").select("id").eq("id", id).maybeSingle();
        if (error) return true; // sem internet ou erro do banco: não desloga à toa
        return Boolean(data);
      } catch {
        return true;
      }
    })();
    conferencias.set(id, conferencia);
  }
  return conferencia;
};

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

// Mensagem amigável quando o servidor bloqueia por excesso de tentativas
const loginErrorMessage = (error: { message?: string } | null) =>
  error?.message?.includes("BLOQUEADO")
    ? "Muitas tentativas erradas. Aguarde 15 minutos ou fale com a recepção (ramal 9)."
    : "Não foi possível entrar agora. Tente novamente.";

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
      hospedeExiste(parsedGuest.id).then((existe) => {
        if (existe) return;
        // O cadastro foi apagado (a semana do ranking fechou): pede para entrar de novo
        if (localStorage.getItem("guest")) {
          localStorage.removeItem("guest");
          toast.info(AVISO_SESSAO_EXPIRADA, { id: "sessao-expirada", duration: 8000 });
        }
        setGuest(null);
        setCurrentLevel(null);
        setNextLevel(null);
      });
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
    const { data, error } = await (supabase as any).rpc("guest_login_pin", {
      p_room: roomNumber.trim(),
      p_pin: pin.trim(),
    });

    if (error) throw new Error(loginErrorMessage(error));
    if (!data) {
      throw new Error("Quarto ou PIN incorretos");
    }

    localStorage.setItem("guest", JSON.stringify(data));
    setGuest(data);
    await fetchLevelInfo(data.current_level, data.total_points);
    return data;
  };

  // Entra com apartamento + sobrenome, conferindo a lista de hóspedes do TOTVS
  const loginByStay = async (roomNumber: string, surname: string) => {
    const { data, error } = await (supabase as any).rpc("guest_login_pms", {
      p_uh: roomNumber.trim(),
      p_surname: surname.trim(),
    });
    if (error) throw new Error(loginErrorMessage(error));
    if (!data) return null;

    const { is_new, ...guestData } = data as Guest & { is_new?: boolean };
    localStorage.setItem("guest", JSON.stringify(guestData));
    setGuest(guestData);
    await fetchLevelInfo(guestData.current_level, guestData.total_points);
    return { guest: guestData as Guest, isNew: Boolean(is_new) };
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
    loginByStay,
    register,
    logout,
    refreshGuest,
  };
};
