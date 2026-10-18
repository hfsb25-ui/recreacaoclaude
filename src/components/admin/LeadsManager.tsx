import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, RefreshCw, Search, Users, Baby, CalendarRange, Trash2, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Lead {
  id: string;
  guest_name: string;
  room_number: string;
  phone: string | null;
  arrival_date: string | null;
  departure_date: string | null;
  adults: number;
  children: number;
}

type Atalho = "agora" | "mes" | "mes-passado" | "tudo" | "personalizado";

const hojeIso = () => format(new Date(), "yyyy-MM-dd");

const periodoDoAtalho = (a: Atalho): { de: string; ate: string } => {
  const hoje = new Date();
  if (a === "agora") return { de: hojeIso(), ate: hojeIso() };
  if (a === "mes") return { de: format(startOfMonth(hoje), "yyyy-MM-dd"), ate: format(endOfMonth(hoje), "yyyy-MM-dd") };
  if (a === "mes-passado") {
    const m = subMonths(hoje, 1);
    return { de: format(startOfMonth(m), "yyyy-MM-dd"), ate: format(endOfMonth(m), "yyyy-MM-dd") };
  }
  return { de: "", ate: "" };
};

// 5511988887777 -> (11) 98888-7777
const formatarTelefone = (p: string) => {
  const d = p.replace(/\D/g, "");
  const local = d.length >= 12 && d.startsWith("55") ? d.slice(2) : d;
  if (local.length === 11) return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
  if (local.length === 10) return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
  return p;
};

const dataCurta = (iso: string | null) => (iso ? format(new Date(iso), "dd/MM/yy") : "—");

const pessoas = (l: Lead) => {
  const partes = [`${l.adults} ${l.adults === 1 ? "adulto" : "adultos"}`];
  if (l.children > 0) partes.push(`${l.children} ${l.children === 1 ? "criança" : "crianças"}`);
  return partes.join(" · ");
};

export const LeadsManager = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [atalho, setAtalho] = useState<Atalho>("tudo");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [deleteLeadId, setDeleteLeadId] = useState<string | null>(null);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const todos: Lead[] = [];
      const PAGINA = 1000;
      for (let inicio = 0; ; inicio += PAGINA) {
        let q = supabase
          .from("leads")
          .select("id, guest_name, room_number, phone, arrival_date, departure_date, adults, children")
          .eq("origem", "pms")
          .order("arrival_date", { ascending: false, nullsFirst: false })
          .range(inicio, inicio + PAGINA - 1);
        // Estadia que encosta no período: entrou até o fim e saiu a partir do início
        if (ate) q = q.lte("arrival_date", `${ate}T23:59:59-03:00`);
        if (de) q = q.gte("departure_date", `${de}T00:00:00-03:00`);
        const { data, error } = await q;
        if (error) throw error;
        todos.push(...((data as Lead[]) || []));
        if (!data || data.length < PAGINA) break;
      }
      setLeads(todos);
    } catch {
      toast.error("Erro ao carregar leads");
    } finally {
      setLoading(false);
    }
  }, [de, ate]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const escolherAtalho = (a: Atalho) => {
    setAtalho(a);
    const p = periodoDoAtalho(a);
    setDe(p.de);
    setAte(p.ate);
  };

  const handleDeleteLead = async () => {
    if (!deleteLeadId) return;
    try {
      const { error } = await supabase.from("leads").delete().eq("id", deleteLeadId);
      if (error) throw error;
      toast.success("Lead removido!");
      setDeleteLeadId(null);
      fetchLeads();
    } catch {
      toast.error("Erro ao remover lead");
    }
  };

  const filtered = useMemo(() => {
    const termo = search.trim().toLowerCase();
    const digitos = termo.replace(/\D/g, "");
    return leads.filter((lead) => {
      const matchesSearch =
        !termo ||
        lead.guest_name.toLowerCase().includes(termo) ||
        lead.room_number.toLowerCase().includes(termo) ||
        (digitos.length >= 3 && !!lead.phone && lead.phone.includes(digitos));
      return matchesSearch;
    });
  }, [leads, search]);

  const exportCSV = () => {
    if (filtered.length === 0) {
      toast.error("Nenhum lead para exportar");
      return;
    }
    const headers = ["Nome", "Apto", "Telefone", "Entrada", "Saída", "Adultos", "Crianças"];
    const rows = filtered.map((l) => [
      l.guest_name,
      l.room_number,
      l.phone ? formatarTelefone(l.phone) : "",
      l.arrival_date ? format(new Date(l.arrival_date), "dd/MM/yyyy") : "",
      l.departure_date ? format(new Date(l.departure_date), "dd/MM/yyyy") : "",
      String(l.adults),
      String(l.children),
    ]);
    const csvContent = [headers, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";"))
      .join("\n");
    const blob = new Blob(["﻿" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const sufixo = de || ate ? `_${de || "inicio"}_a_${ate || "hoje"}` : "";
    link.download = `leads${sufixo}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`${filtered.length} leads exportados!`);
  };

  const comCriancas = leads.filter((l) => l.children > 0).length;
  const totalPessoas = leads.reduce((s, l) => s + l.adults + l.children, 0);

  const ATALHOS: { id: Atalho; label: string }[] = [
    { id: "agora", label: "Hospedados hoje" },
    { id: "mes", label: "Este mês" },
    { id: "mes-passado", label: "Mês passado" },
    { id: "tudo", label: "Tudo" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center gap-3">
          <Users className="h-8 w-8 text-primary" />
          <div>
            <p className="text-2xl font-bold text-foreground">{leads.length}</p>
            <p className="text-xs text-muted-foreground">Reservas no período</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <Baby className="h-8 w-8 text-green-500" />
          <div>
            <p className="text-2xl font-bold text-foreground">{comCriancas}</p>
            <p className="text-xs text-muted-foreground">Com crianças</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <CalendarRange className="h-8 w-8 text-blue-500" />
          <div>
            <p className="text-2xl font-bold text-foreground">{totalPessoas}</p>
            <p className="text-xs text-muted-foreground">Pessoas hospedadas</p>
          </div>
        </Card>
      </div>

      <Card className="p-4 space-y-3">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-end">
          <div className="flex-1 space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Período da estadia</p>
            <div className="flex flex-wrap gap-1">
              {ATALHOS.map((a) => (
                <Button
                  key={a.id}
                  size="sm"
                  variant={atalho === a.id ? "default" : "outline"}
                  onClick={() => escolherAtalho(a.id)}
                >
                  {a.label}
                </Button>
              ))}
            </div>
          </div>
          <div className="flex items-end gap-2">
            <label className="space-y-1">
              <span className="block text-xs text-muted-foreground">De</span>
              <Input
                type="date"
                value={de}
                onChange={(e) => {
                  setDe(e.target.value);
                  setAtalho("personalizado");
                }}
                className="w-[150px]"
              />
            </label>
            <label className="space-y-1">
              <span className="block text-xs text-muted-foreground">Até</span>
              <Input
                type="date"
                value={ate}
                onChange={(e) => {
                  setAte(e.target.value);
                  setAtalho("personalizado");
                }}
                className="w-[150px]"
              />
            </label>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-2 flex-1 w-full">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, apto ou telefone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchLeads} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
            <Button size="sm" onClick={exportCSV}>
              <Download className="h-4 w-4 mr-1" />
              Exportar
            </Button>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Titular</TableHead>
                <TableHead>Apto</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Entrada</TableHead>
                <TableHead>Saída</TableHead>
                <TableHead>Pessoas</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nenhum lead neste período. Os leads entram sozinhos a cada sincronização do PMS (só quem tem telefone).
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell className="font-medium">{lead.guest_name}</TableCell>
                    <TableCell>{lead.room_number}</TableCell>
                    <TableCell>
                      {lead.phone ? (
                        <a
                          href={`https://wa.me/${lead.phone.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-green-700 hover:underline whitespace-nowrap"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                          {formatarTelefone(lead.phone)}
                        </a>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{dataCurta(lead.arrival_date)}</TableCell>
                    <TableCell className="whitespace-nowrap">{dataCurta(lead.departure_date)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{pessoas(lead)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteLeadId(lead.id)} aria-label="Remover lead">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {!loading && (
          <div className="p-3 border-t text-xs text-muted-foreground text-right">
            Exibindo {filtered.length} de {leads.length} leads
          </div>
        )}
      </Card>

      <AlertDialog open={!!deleteLeadId} onOpenChange={() => setDeleteLeadId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover lead?</AlertDialogTitle>
            <AlertDialogDescription>
              Use quando o hóspede pedir para não receber contato. Se ele ainda estiver hospedado, o lead volta na
              próxima sincronização.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteLead}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
