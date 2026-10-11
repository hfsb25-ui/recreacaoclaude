import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Receipt } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";

interface Consumption {
  available: boolean;
  restaurante?: number;
  bares?: number;
  banquete?: number;
  eventos?: number;
  lavanderia?: number;
  telefonia?: number;
  diversos?: number;
  taxas?: number;
  iss?: number;
  total?: number;
  synced_at?: string;
}

const LINES: { key: keyof Consumption; label: string }[] = [
  { key: "restaurante", label: "Restaurante" },
  { key: "bares", label: "Bares" },
  { key: "banquete", label: "Banquete" },
  { key: "eventos", label: "Eventos" },
  { key: "lavanderia", label: "Lavanderia" },
  { key: "telefonia", label: "Telefonia" },
  { key: "diversos", label: "Diversos" },
  { key: "taxas", label: "Taxa de serviço" },
  { key: "iss", label: "ISS" },
];

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const updatedLabel = (iso: string) => {
  const d = new Date(iso);
  const today = new Date().toDateString() === d.toDateString();
  const hm = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return today ? `hoje às ${hm}` : `${d.toLocaleDateString("pt-BR")} às ${hm}`;
};

/** Consumo do hóspede (vindo do TOTVS). Fica fechado até o hóspede tocar, para não expor valores na tela. */
export const GuestConsumptionCard = ({ guestId }: { guestId: string }) => {
  const [data, setData] = useState<Consumption | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: res, error } = await (supabase as any).rpc("guest_consumption", { p_guest_id: guestId });
      if (!cancelled && !error && res && !Array.isArray(res)) setData(res as Consumption);
    })();
    return () => {
      cancelled = true;
    };
  }, [guestId]);

  // Só aparece para hóspedes ligados a uma reserva do TOTVS com conta no relatório
  if (!data || !data.available) return null;

  const lines = LINES.filter((l) => Number(data[l.key] ?? 0) > 0);

  return (
    <Card className="p-5">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 text-left rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
      >
        <span className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <Receipt className="h-5 w-5 text-primary" />
          </span>
          <span>
            <span className="block font-semibold">Meu consumo</span>
            <span className="block text-sm text-muted-foreground">
              {open ? "Toque para esconder" : "Toque para ver os valores"}
            </span>
          </span>
        </span>
        {open ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
      </button>

      {open && (
        <div className="mt-4 space-y-3">
          {lines.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum consumo lançado até agora.</p>
          ) : (
            <dl className="divide-y">
              {lines.map((l) => (
                <div key={l.key} className="flex justify-between py-2 text-sm">
                  <dt>{l.label}</dt>
                  <dd className="tabular-nums">{brl(Number(data[l.key]))}</dd>
                </div>
              ))}
              <div className="flex justify-between py-2 font-semibold">
                <dt>Total</dt>
                <dd className="tabular-nums">{brl(Number(data.total ?? 0))}</dd>
              </div>
            </dl>
          )}
          <p className="text-xs text-muted-foreground">
            {data.synced_at && <>Atualizado {updatedLabel(data.synced_at)}. </>}
            Lançamentos recentes podem levar até 30 minutos para aparecer. Os valores finais são conferidos na recepção,
            no check-out. Diárias não estão incluídas.
          </p>
        </div>
      )}
    </Card>
  );
};
