import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2, Gift, RefreshCw, Search, Undo2 } from "lucide-react";
import { toast } from "sonner";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

interface Brinde {
  id: string;
  codigo: string;
  guest_name: string | null;
  room_number: string | null;
  liberado_em: string;
  entregue_em: string | null;
}

type Filtro = "pendentes" | "entregues" | "todos";

const dataHora = (s: string) => new Date(s).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

const BrindesManager = () => {
  const [lista, setLista] = useState<Brinde[]>([]);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("pendentes");
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    setCarregando(true);
    const { data, error } = await db
      .from("brindes_tripadvisor")
      .select("id, codigo, guest_name, room_number, liberado_em, entregue_em")
      .order("liberado_em", { ascending: false })
      .limit(300);
    if (error) toast.error("Não foi possível carregar os brindes.");
    setLista((data ?? []) as Brinde[]);
    setCarregando(false);
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const visiveis = useMemo(() => {
    const t = busca.trim().toUpperCase();
    return lista.filter((b) => {
      if (filtro === "pendentes" && b.entregue_em) return false;
      if (filtro === "entregues" && !b.entregue_em) return false;
      if (!t) return true;
      return (
        b.codigo.includes(t) ||
        (b.room_number ?? "").toUpperCase().includes(t) ||
        (b.guest_name ?? "").toUpperCase().includes(t)
      );
    });
  }, [lista, busca, filtro]);

  const pendentes = lista.filter((b) => !b.entregue_em).length;

  const marcar = async (b: Brinde, entregue: boolean) => {
    const { data: u } = await supabase.auth.getUser();
    const { error } = await db
      .from("brindes_tripadvisor")
      .update({ entregue_em: entregue ? new Date().toISOString() : null, entregue_por: entregue ? u.user?.id ?? null : null })
      .eq("id", b.id);
    if (error) {
      toast.error("Não foi possível salvar.");
      return;
    }
    toast.success(entregue ? `Brinde do apto ${b.room_number ?? ""} entregue.` : "Entrega desfeita.");
    carregar();
  };

  return (
    <Card className="p-4 sm:p-6 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" /> Brindes
          </h2>
          <p className="text-sm text-muted-foreground">
            O hóspede ganha um código depois de 3 avaliações com 4 ou 5 estrelas. Confira o código e marque como entregue.
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={carregar} aria-label="Atualizar">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Código, apartamento ou nome"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          {(
            [
              ["pendentes", `A entregar (${pendentes})`],
              ["entregues", "Entregues"],
              ["todos", "Todos"],
            ] as [Filtro, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setFiltro(id)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${filtro === id ? "bg-background shadow" : "text-muted-foreground"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {carregando ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : visiveis.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {busca ? "Nenhum brinde encontrado com essa busca." : "Nenhum brinde nesta lista."}
        </p>
      ) : (
        <ul className="divide-y">
          {visiveis.map((b) => (
            <li key={b.id} className="flex flex-wrap items-center gap-3 py-3">
              <span className="rounded-lg bg-primary/10 px-3 py-1.5 font-mono text-lg font-bold tracking-widest text-primary">
                {b.codigo}
              </span>
              <div className="min-w-0 flex-1">
                <div className="font-medium">
                  Apto {b.room_number ?? "—"} · {b.guest_name ?? "Hóspede"}
                </div>
                <div className="text-xs text-muted-foreground">
                  Liberado em {dataHora(b.liberado_em)}
                  {b.entregue_em ? ` · entregue em ${dataHora(b.entregue_em)}` : ""}
                </div>
              </div>
              {b.entregue_em ? (
                <Button variant="ghost" size="sm" onClick={() => marcar(b, false)}>
                  <Undo2 className="mr-1.5 h-4 w-4" /> Desfazer
                </Button>
              ) : (
                <Button size="sm" onClick={() => marcar(b, true)}>
                  <CheckCircle2 className="mr-1.5 h-4 w-4" /> Marcar entregue
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
};

export default BrindesManager;
