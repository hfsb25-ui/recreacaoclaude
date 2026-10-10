import { addDays, format, startOfDay } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

// As funções/visões de estatística ainda não estão nos tipos gerados do Supabase
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

/** Busca todas as linhas, de 1000 em 1000 (o Supabase corta em 1000 por consulta). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchAll<T = any>(makeQuery: () => any, pageSize = 1000): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await makeQuery().range(from, from + pageSize - 1);
    if (error) throw error;
    out.push(...((data as T[]) ?? []));
    if (!data || data.length < pageSize) break;
  }
  return out;
}

/** Dia no fuso do aparelho (o painel é usado no Brasil), ex.: "2026-10-10" */
export const dayKey = (d: Date | string) => format(typeof d === "string" ? new Date(d) : d, "yyyy-MM-dd");

/** Início e fim (exclusivo) de um ou mais dias no fuso local, em ISO */
export const dayBounds = (from: Date, to: Date = from) => ({
  from: startOfDay(from).toISOString(),
  to: startOfDay(addDays(to, 1)).toISOString(),
});

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T[]> {
  const { data, error } = await db.rpc(fn, args);
  if (error) throw new Error(`${fn}: ${error.message}`);
  return (data ?? []) as T[];
}

const n = (v: unknown) => Number(v ?? 0);

export interface DailyRow {
  day: string;
  visits: number;
  visitors: number;
  checkins: number;
  ratings: number;
  signups: number;
}

export const getDailyStats = async (from: Date, to: Date): Promise<DailyRow[]> =>
  (await rpc<Record<string, unknown>>("admin_daily_stats", { p_from: dayKey(from), p_to: dayKey(to) })).map((r) => ({
    day: String(r.day),
    visits: n(r.visits),
    visitors: n(r.visitors),
    checkins: n(r.checkins),
    ratings: n(r.ratings),
    signups: n(r.signups),
  }));

export const getVisitHours = async (fromIso: string, toIso: string) =>
  (await rpc<Record<string, unknown>>("admin_visit_hours", { p_from: fromIso, p_to: toIso })).map((r) => ({
    dow: n(r.dow),
    hour: n(r.hour),
    visits: n(r.visits),
  }));

export const getVisitTotals = async (fromIso: string, toIso: string) => {
  const [r] = await rpc<Record<string, unknown>>("admin_visit_totals", { p_from: fromIso, p_to: toIso });
  return { visits: n(r?.visits), visitors: n(r?.visitors) };
};

export const getTopPages = async (fromIso: string, toIso: string, limit = 6) =>
  (await rpc<Record<string, unknown>>("admin_top_pages", { p_from: fromIso, p_to: toIso, p_limit: limit })).map((r) => ({
    path: String(r.page_path),
    visits: n(r.visits),
  }));

export interface ActivityAgg {
  name: string;
  ageGroupId: string;
  checkins: number;
  ratings: number;
  ratingSum: number;
  fives: number;
  lows: number;
}

export const getActivityStats = async (fromIso: string | null = null, toIso: string | null = null): Promise<ActivityAgg[]> =>
  (await rpc<Record<string, unknown>>("admin_activity_stats", { p_from: fromIso, p_to: toIso })).map((r) => ({
    name: String(r.name),
    ageGroupId: String(r.age_group_id),
    checkins: n(r.checkins),
    ratings: n(r.ratings),
    ratingSum: n(r.rating_sum),
    fives: n(r.fives),
    lows: n(r.lows),
  }));

export const getAgeGroupStats = async (fromIso: string | null = null, toIso: string | null = null) =>
  (await rpc<Record<string, unknown>>("admin_age_group_stats", { p_from: fromIso, p_to: toIso })).map((r) => ({
    ageGroupId: String(r.age_group_id),
    checkins: n(r.checkins),
    guests: n(r.guests),
    ratings: n(r.ratings),
    ratingSum: n(r.rating_sum),
  }));

export const getPeriodStats = async (limit = 5) =>
  (await rpc<Record<string, unknown>>("admin_period_stats", { p_limit: limit })).map((r) => ({
    periodNumber: n(r.period_number),
    startDate: String(r.start_date),
    endDate: String(r.end_date),
    participants: n(r.participants),
    points: n(r.points),
    checkins: n(r.checkins),
  }));

/** Soma das avaliações (média, NPS) a partir do agregado por atividade */
export const summarizeRatings = (rows: ActivityAgg[]) => {
  const count = rows.reduce((s, r) => s + r.ratings, 0);
  const sum = rows.reduce((s, r) => s + r.ratingSum, 0);
  const fives = rows.reduce((s, r) => s + r.fives, 0);
  const lows = rows.reduce((s, r) => s + r.lows, 0);
  return {
    count,
    average: count > 0 ? sum / count : 0,
    nps: count > 0 ? ((fives - lows) / count) * 100 : 0,
  };
};

export const totalCheckinsAllTime = async (): Promise<number> => {
  const { count, error } = await db.from("all_checkins").select("id", { count: "exact", head: true });
  if (error) throw new Error(`all_checkins: ${error.message}`);
  return count ?? 0;
};

export const PAGE_NAMES: Record<string, string> = {
  "/": "Início",
  "/programacao": "Programação",
  "/ranking": "Ranking",
  "/guest-auth": "Login Hóspede",
  "/guest-profile": "Perfil",
  "/hall-of-fame": "Hall da Fama",
  "/instalar": "Instalar App",
  "/admin": "Admin",
  "/auth": "Login Admin",
  "/totem": "Totem",
  "/games": "Jogos",
  "/mapa": "Mapa",
  "/bichinho": "Bichinho",
};

export const pageName = (path: string) =>
  PAGE_NAMES[path] ?? (path.startsWith("/activities/") ? "Atividades (faixa)" : path);
