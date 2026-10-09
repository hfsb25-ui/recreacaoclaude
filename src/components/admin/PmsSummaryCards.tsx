import { useEffect, useState } from "react";
import { BedDouble, Users, Baby, Home } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";

interface Totals {
  rooms: number;
  adults: number;
  children: number;
  roomsWithKids: number;
}

// Tabela nova ainda não está nos tipos gerados do Supabase
const db = supabase as any;

/** Resumo da ocupação vinda do TOTVS: aparece no topo do painel assim que a equipe entra. */
export const PmsSummaryCards = () => {
  const [totals, setTotals] = useState<Totals | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const [{ data, error }, { data: log }] = await Promise.all([
        db.from("pms_stays").select("adults, children"),
        db.from("pms_sync_log").select("synced_at").order("synced_at", { ascending: false }).limit(1),
      ]);
      if (error || !data) return;
      setTotals({
        rooms: data.length,
        adults: data.reduce((t: number, s: { adults: number }) => t + (s.adults || 0), 0),
        children: data.reduce((t: number, s: { children: number }) => t + (s.children || 0), 0),
        roomsWithKids: data.filter((s: { children: number }) => s.children > 0).length,
      });
      setLastSync(log?.[0]?.synced_at ?? null);
    };
    load();
    const timer = setInterval(load, 5 * 60 * 1000); // atualiza a cada 5 minutos
    return () => clearInterval(timer);
  }, []);

  if (!totals) return null;

  const items = [
    { label: "Aptos ocupados", value: totals.rooms, icon: BedDouble, color: "text-sky-600" },
    { label: "Adultos", value: totals.adults, icon: Users, color: "text-violet-600" },
    { label: "Crianças", value: totals.children, icon: Baby, color: "text-orange-500" },
    { label: "Aptos com crianças", value: totals.roomsWithKids, icon: Home, color: "text-emerald-600" },
  ];

  return (
    <div className="mb-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {items.map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="p-4">
            <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1.5">
              <Icon className={`h-4 w-4 ${color}`} />
              {label}
            </p>
            <p className="text-3xl font-bold mt-1">{value}</p>
          </Card>
        ))}
      </div>
      {lastSync && (
        <p className="text-xs text-muted-foreground mt-2">
          Hóspedes no hotel agora, segundo o TOTVS · atualizado em{" "}
          {new Date(lastSync).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
        </p>
      )}
    </div>
  );
};
