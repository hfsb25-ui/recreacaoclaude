import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, RefreshCw, Search, Users, Phone, UserCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
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
  total_points: number;
  total_checkins: number;
  total_ratings: number;
  imported_at: string;
}

export const LeadsManager = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "with_phone" | "without_phone">("all");
  const [deleteLeadId, setDeleteLeadId] = useState<string | null>(null);

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .order("imported_at", { ascending: false });

      if (error) throw error;
      setLeads((data as Lead[]) || []);
    } catch (err: any) {
      toast.error("Erro ao carregar leads");
    } finally {
      setLoading(false);
    }
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

  const filtered = leads.filter((lead) => {
    const matchesSearch =
      !search ||
      lead.guest_name.toLowerCase().includes(search.toLowerCase()) ||
      lead.room_number.toLowerCase().includes(search.toLowerCase()) ||
      (lead.phone && lead.phone.includes(search));

    const matchesFilter =
      filterType === "all" ||
      (filterType === "with_phone" && lead.phone) ||
      (filterType === "without_phone" && !lead.phone);

    return matchesSearch && matchesFilter;
  });

  const exportCSV = () => {
    if (filtered.length === 0) {
      toast.error("Nenhum lead para exportar");
      return;
    }

    const headers = ["Nome", "Quarto", "Telefone", "Pontos", "Check-ins", "Avaliações", "Data Import"];
    const rows = filtered.map((l) => [
      l.guest_name,
      l.room_number,
      l.phone || "",
      String(l.total_points || 0),
      String(l.total_checkins),
      String(l.total_ratings),
      format(new Date(l.imported_at), "dd/MM/yyyy HH:mm", { locale: ptBR }),
    ]);

    const csvContent = [headers, ...rows].map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `leads_${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`${filtered.length} leads exportados com sucesso!`);
  };

  const withPhone = leads.filter((l) => l.phone).length;

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center gap-3">
          <Users className="h-8 w-8 text-primary" />
          <div>
            <p className="text-2xl font-bold text-foreground">{leads.length}</p>
            <p className="text-xs text-muted-foreground">Total de Leads</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <Phone className="h-8 w-8 text-green-500" />
          <div>
            <p className="text-2xl font-bold text-foreground">{withPhone}</p>
            <p className="text-xs text-muted-foreground">Com Telefone</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <UserCheck className="h-8 w-8 text-blue-500" />
          <div>
            <p className="text-2xl font-bold text-foreground">
              {leads.filter((l) => l.total_checkins > 0).length}
            </p>
            <p className="text-xs text-muted-foreground">Com Check-ins</p>
          </div>
        </Card>
      </div>

      {/* Filters & Actions */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-2 flex-1 w-full">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, quarto ou telefone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-1">
              <Button variant={filterType === "all" ? "default" : "outline"} size="sm" onClick={() => setFilterType("all")}>
                Todos
              </Button>
              <Button variant={filterType === "with_phone" ? "default" : "outline"} size="sm" onClick={() => setFilterType("with_phone")}>
                Com Tel.
              </Button>
              <Button variant={filterType === "without_phone" ? "default" : "outline"} size="sm" onClick={() => setFilterType("without_phone")}>
                Sem Tel.
              </Button>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchLeads} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
            <Button size="sm" onClick={exportCSV}>
              <Download className="h-4 w-4 mr-1" />
              Exportar CSV
            </Button>
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Quarto</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead className="text-center">Pontos</TableHead>
                <TableHead className="text-center">Check-ins</TableHead>
                <TableHead className="text-center">Avaliações</TableHead>
                <TableHead>Importado em</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Nenhum lead encontrado. Os leads são salvos automaticamente quando o ranking é resetado.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell className="font-medium">{lead.guest_name}</TableCell>
                    <TableCell>{lead.room_number}</TableCell>
                    <TableCell>
                      {lead.phone ? (
                        <Badge variant="outline" className="text-green-600 border-green-300">
                          {lead.phone}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">{lead.total_points}</TableCell>
                    <TableCell className="text-center">{lead.total_checkins}</TableCell>
                    <TableCell className="text-center">{lead.total_ratings}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {format(new Date(lead.imported_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteLeadId(lead.id)}>
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

      {/* Delete Lead Dialog */}
      <AlertDialog open={!!deleteLeadId} onOpenChange={() => setDeleteLeadId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este lead? Esta ação não pode ser desfeita.
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
