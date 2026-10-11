// Recebe o consumo por apartamento (relatório "Saldo das Contas" do TOTVS) enviado pelo script do Tampermonkey.
// Protegida pela mesma chave do pms-sync (segredo PMS_SYNC_KEY no Supabase).
// Cada envio é a lista COMPLETA do dia: contas que não vierem mais são apagadas.
// Não recebe nomes de hóspedes, só apto, reserva e valores.
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

const safeEqual = (a: string, b: string) => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
};

const str = (v: unknown, max = 60) => (typeof v === "string" ? v.trim().slice(0, max) : "");

const money = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) && Math.abs(n) < 10_000_000 ? Math.round(n * 100) / 100 : 0;
};

// aceita "2026-10-12" ou "12/10/2026"
const day = (v: unknown) => {
  if (typeof v !== "string") return null;
  const br = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
};

const FIELDS = [
  "diaria", "restaurante", "bares", "banquete", "eventos", "lavanderia",
  "telefonia", "diversos", "taxas", "iss", "creditos", "saldo",
] as const;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método não permitido" }, 405);

  const expected = Deno.env.get("PMS_SYNC_KEY") ?? "";
  const received = req.headers.get("x-sync-key") ?? "";
  if (expected.length < 20 || !safeEqual(received, expected)) {
    return json({ error: "Chave inválida" }, 401);
  }

  let payload: { accounts?: unknown[]; report_date?: string };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "JSON inválido" }, 400);
  }

  const raw = Array.isArray(payload.accounts) ? payload.accounts : null;
  if (!raw || raw.length > 3000) return json({ error: "Lista de contas inválida" }, 400);
  const reportDate = day(payload.report_date) ?? new Date().toISOString().slice(0, 10);

  const syncedAt = new Date().toISOString();
  const unique = new Map<string, Record<string, unknown>>();
  for (const a of raw as any[]) {
    const reservation_code = str(a?.reservation_code);
    const uh = str(a?.uh, 20);
    if (!reservation_code || !uh) continue;
    const row: Record<string, unknown> = {
      reservation_code,
      uh,
      account_type: str(a.account_type, 40) || null,
      status: str(a.status, 40) || null,
      arrival_date: day(a.arrival_date),
      departure_date: day(a.departure_date),
      report_date: reportDate,
      synced_at: syncedAt,
    };
    for (const f of FIELDS) row[f] = money(a[f]);
    unique.set(`${reservation_code}|${uh}`, row);
  }
  const rows = [...unique.values()];

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Lista vazia não apaga nada (pode ser falha momentânea do TOTVS)
  if (rows.length === 0) return json({ ok: true, accounts: 0, note: "Lista vazia ignorada" });

  const { error: upsertError } = await supabase
    .from("pms_consumption")
    .upsert(rows, { onConflict: "reservation_code,uh" });
  if (upsertError) {
    console.error(upsertError);
    return json({ error: `Erro ao salvar: ${upsertError.message}`, code: upsertError.code }, 500);
  }

  const { data: removed, error: deleteError } = await supabase
    .from("pms_consumption")
    .delete()
    .lt("synced_at", syncedAt)
    .select("uh");
  if (deleteError) console.error(deleteError);

  return json({ ok: true, accounts: rows.length, removed: removed?.length ?? 0 });
});
