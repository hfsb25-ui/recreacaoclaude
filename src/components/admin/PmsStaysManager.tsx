import { useEffect, useMemo, useState } from "react";
import { BedDouble, RefreshCw, Search, Users, Baby, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface Stay {
  id: string;
  uh: string;
  guest_name: string;
  adults: number;
  children: number;
  arrival_date: string | null;
  departure_date: string | null;
  status: string | null;
}

interface SyncLog {
  synced_at: string;
  rooms: number;
  guests: number;
  removed: number;
}

// Tabelas novas ainda não estão nos tipos gerados do Supabase
const db = supabase as any;

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : "—";

const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

const minutesAgo = (iso: string) => Math.round((Date.now() - new Date(iso).getTime()) / 60000);

export const PmsStaysManager = () => {
  const [stays, setStays] = useState<Stay[]>([]);
  const [lastSync, setLastSync] = useState<SyncLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [query, setQuery] = useState("");

  const load = async () => {
    setLoading(true);
    const [{ data: list, error }, { data: log }] = await Promise.all([
      db
        .from("pms_stays")
        .select("id, uh, guest_name, adults, children, arrival_date, departure_date, status")
        .order("uh", { ascending: true }),
      db.from("pms_sync_log").select("synced_at, rooms, guests, removed").order("synced_at", { ascending: false }).limit(1),
    ]);
    if (error?.message?.includes("pms_stays")) {
      setNeedsSetup(true);
    } else {
      setNeedsSetup(false);
      setStays(list ?? []);
      setLastSync(log?.[0] ?? null);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const sorted = [...stays].sort((a, b) => a.uh.localeCompare(b.uh, "pt-BR", { numeric: true }));
    if (!q) return sorted;
    return sorted.filter((s) => s.uh.toLowerCase().includes(q) || s.guest_name.toLowerCase().includes(q));
  }, [stays, query]);

  const totals = useMemo(
    () => ({
      rooms: stays.length,
      adults: stays.reduce((t, s) => t + s.adults, 0),
      children: stays.reduce((t, s) => t + s.children, 0),
      roomsWithKids: stays.filter((s) => s.children > 0).length,
    }),
    [stays]
  );

  if (loading) return <p className="text-sm text-muted-foreground">Carregando hóspedes...</p>;

  if (needsSetup) {
    return (
      <Card className="p-4 text-sm bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
        Falta ativar este recurso no banco: rode o SQL <code>20261009190000_hospedes_totvs.sql</code> no SQL Editor do
        Supabase e recarregue a página.
      </Card>
    );
  }

  const stale = lastSync ? minutesAgo(lastSync.synced_at) > 60 : true;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <BedDouble className="h-5 w-5" /> Hóspedes no hotel (TOTVS)
          </h2>
          <p className="text-sm text-muted-foreground">
            {lastSync
              ? `Última sincronização: ${fmtDateTime(lastSync.synced_at)} (há ${minutesAgo(lastSync.synced_at)} min)`
              : "Ainda não houve sincronização com o PMS."}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className="h-4 w-4 mr-2" /> Atualizar
        </Button>
      </div>

      {stale && (
        <Card className="p-3 flex items-start gap-2 text-sm bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
          <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-600 shrink-0" />
          <span>
            Faz mais de 1 hora sem sincronizar. Verifique se o PMS está aberto em algum computador com o script da
            Recreação ativo.
          </span>
        </Card>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Aptos ocupados</p>
          <p className="text-2xl font-bold">{totals.rooms}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" /> Adultos</p>
          <p className="text-2xl font-bold">{totals.adults}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground flex items-center gap-1"><Baby className="h-3 w-3" /> Crianças</p>
          <p className="text-2xl font-bold">{totals.children}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Aptos com crianças</p>
          <p className="text-2xl font-bold">{totals.roomsWithKids}</p>
        </Card>
      </div>

      <div className="relative">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por apto ou nome"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">Nenhum hóspede encontrado.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="p-2 font-medium">Apto</th>
                <th className="p-2 font-medium">Titular</th>
                <th className="p-2 font-medium text-center">Adultos</th>
                <th className="p-2 font-medium text-center">Crianças</th>
                <th className="p-2 font-medium">Entrada</th>
                <th className="p-2 font-medium">Saída</th>
                <th className="p-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="p-2 font-semibold">{s.uh}</td>
                  <td className="p-2">{s.guest_name}</td>
                  <td className="p-2 text-center">{s.adults}</td>
                  <td className="p-2 text-center">{s.children > 0 ? <Badge variant="secondary">{s.children}</Badge> : "—"}</td>
                  <td className="p-2 whitespace-nowrap">{fmtDate(s.arrival_date)}</td>
                  <td className="p-2 whitespace-nowrap">{fmtDate(s.departure_date)}</td>
                  <td className="p-2">
                    <Badge variant={s.status?.toLowerCase().includes("check") ? "default" : "outline"}>
                      {s.status?.toLowerCase().includes("check") ? "Hospedado" : "Chega hoje"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Os dados vêm do TOTVS PMS e são apagados automaticamente após o check-out.
      </p>
    </div>
  );
};
