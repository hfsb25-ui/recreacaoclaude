// Recebe a lista de hóspedes hospedados enviada pelo script do TOTVS PMS.
// Protegida por chave secreta (segredo PMS_SYNC_KEY no Supabase).
// Cada envio é a lista COMPLETA: o que não vier mais é apagado (saiu, cancelou, no-show).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-sync-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// Comparação em tempo constante para a chave
const safeEqual = (a: string, b: string) => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
};

const normalize = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z ]/g, " ").replace(/\s+/g, " ").trim();

const surnameOf = (name: string) => {
  const parts = normalize(name).split(" ").filter((p) => p.length > 1 && !["de", "da", "do", "dos", "das", "e"].includes(p));
  return parts.length ? parts[parts.length - 1] : normalize(name);
};

const toInt = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 && n < 100 ? Math.trunc(n) : 0;
};

const toDate = (v: unknown) => {
  if (typeof v !== "string" || !v) return null;
  // O TOTVS manda horário local sem fuso (ex.: 2026-10-12T14:00:00)
  const withTz = /[zZ]|[+-]\d\d:?\d\d$/.test(v) ? v : `${v}-03:00`;
  const d = new Date(withTz);
  return isNaN(d.getTime()) ? null : d.toISOString();
};

const str = (v: unknown, max = 120) => (typeof v === "string" ? v.trim().slice(0, max) : "");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método não permitido" }, 405);

  const expected = Deno.env.get("PMS_SYNC_KEY") ?? "";
  const received = req.headers.get("x-sync-key") ?? "";
  if (expected.length < 20 || !safeEqual(received, expected)) {
    return json({ error: "Chave inválida" }, 401);
  }

  let payload: { stays?: unknown[]; source?: string };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "JSON inválido" }, 400);
  }

  const raw = Array.isArray(payload.stays) ? payload.stays : null;
  if (!raw || raw.length > 2000) return json({ error: "Lista de hóspedes inválida" }, 400);

  const syncedAt = new Date().toISOString();
  const rows = raw
    .map((s: any) => {
      const guest_name = str(s?.guest_name);
      const uh = str(s?.uh, 20);
      const reservation_code = str(s?.reservation_code, 60);
      if (!guest_name || !uh || !reservation_code) return null;
      return {
        reservation_code,
        uh,
        guest_name,
        surname: surnameOf(guest_name),
        adults: toInt(s.adults),
        children: toInt(s.children),
        guests_listed: toInt(s.guests_listed),
        arrival_date: toDate(s.arrival_date),
        departure_date: toDate(s.departure_date),
        status: str(s.status, 40),
        synced_at: syncedAt,
      };
    })
    .filter(Boolean) as Record<string, unknown>[];

  // Garante uma linha por reserva+apto (o upsert não aceita repetidos no mesmo envio)
  const unique = new Map<string, Record<string, unknown>>();
  for (const r of rows) unique.set(`${r.reservation_code}|${r.uh}`, r);
  rows.length = 0;
  rows.push(...unique.values());

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Proteção: uma lista vazia não apaga tudo (pode ser falha momentânea do PMS)
  if (rows.length === 0) {
    await supabase.from("pms_sync_log").insert({ rooms: 0, guests: 0, removed: 0, source: str(payload.source, 60) || "vazio" });
    return json({ ok: true, rooms: 0, removed: 0, note: "Lista vazia ignorada" });
  }

  const { error: upsertError } = await supabase
    .from("pms_stays")
    .upsert(rows, { onConflict: "reservation_code,uh" });
  if (upsertError) {
    console.error(upsertError);
    return json({ error: `Erro ao salvar: ${upsertError.message}`, code: upsertError.code }, 500);
  }

  // Remove quem não veio nesta lista (já saiu, cancelou ou não compareceu)
  const { data: removedRows, error: deleteError } = await supabase
    .from("pms_stays")
    .delete()
    .lt("synced_at", syncedAt)
    .select("id");
  if (deleteError) console.error(deleteError);

  const guests = rows.reduce((t, r) => t + ((r.adults as number) + (r.children as number)), 0);
  const removed = removedRows?.length ?? 0;
  await supabase.from("pms_sync_log").insert({ rooms: rows.length, guests, removed, source: str(payload.source, 60) });

  // Mantém só 30 dias de histórico do log
  await supabase.from("pms_sync_log").delete().lt("synced_at", new Date(Date.now() - 30 * 864e5).toISOString());

  return json({ ok: true, rooms: rows.length, guests, removed });
});
