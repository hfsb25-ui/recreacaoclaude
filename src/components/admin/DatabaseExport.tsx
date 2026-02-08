import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Database, Download, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

const ALL_TABLES = [
  { key: "guests", label: "Hóspedes" },
  { key: "activities", label: "Atividades" },
  { key: "activity_checkins", label: "Check-ins" },
  { key: "activity_ratings", label: "Avaliações" },
  { key: "activity_templates", label: "Catálogo de Atividades" },
  { key: "age_groups", label: "Faixas Etárias" },
  { key: "age_group_recreadores", label: "Recreadores por Faixa" },
  { key: "announcements", label: "Anúncios" },
  { key: "guest_spins", label: "Giros dos Hóspedes" },
  { key: "spin_results", label: "Resultados dos Giros" },
  { key: "minigame_results", label: "Resultados dos Minigames" },
  { key: "quiz_questions", label: "Perguntas do Quiz" },
  { key: "levels", label: "Níveis" },
  { key: "menu_items", label: "Itens do Menu" },
  { key: "ranking_periods", label: "Períodos do Ranking" },
  { key: "ranking_winners", label: "Vencedores do Ranking" },
  { key: "site_settings", label: "Configurações do Site" },
  { key: "site_visits", label: "Visitas ao Site" },
  { key: "totem_config", label: "Configuração do Totem" },
  { key: "reset_config", label: "Configuração de Reset" },
  { key: "notification_preferences", label: "Preferências de Notificação" },
  { key: "push_subscriptions", label: "Assinaturas Push" },
] as const;

type TableKey = (typeof ALL_TABLES)[number]["key"];

export const DatabaseExport = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedTables, setSelectedTables] = useState<Record<string, boolean>>(
    () => ALL_TABLES.reduce((acc, t) => ({ ...acc, [t.key]: true }), {} as Record<string, boolean>)
  );

  const toggleTable = (key: string) => {
    setSelectedTables(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const selectAll = () => {
    setSelectedTables(ALL_TABLES.reduce((acc, t) => ({ ...acc, [t.key]: true }), {} as Record<string, boolean>));
  };

  const deselectAll = () => {
    setSelectedTables(ALL_TABLES.reduce((acc, t) => ({ ...acc, [t.key]: false }), {} as Record<string, boolean>));
  };

  const selectedCount = Object.values(selectedTables).filter(Boolean).length;

  const fetchAllRows = async (table: string) => {
    const allRows: any[] = [];
    const pageSize = 1000;
    let from = 0;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from(table as any)
        .select("*")
        .range(from, from + pageSize - 1);

      if (error) throw new Error(`Erro na tabela ${table}: ${error.message}`);

      if (data && data.length > 0) {
        allRows.push(...data);
        from += pageSize;
        hasMore = data.length === pageSize;
      } else {
        hasMore = false;
      }
    }

    return allRows;
  };

  const handleExport = async () => {
    const tables = ALL_TABLES.filter(t => selectedTables[t.key]);

    if (tables.length === 0) {
      toast.error("Selecione pelo menos uma tabela");
      return;
    }

    setLoading(true);

    try {
      const exportData: Record<string, any> = {
        _metadata: {
          exported_at: new Date().toISOString(),
          tables_count: tables.length,
          tables: tables.map(t => t.key),
        },
      };

      for (const table of tables) {
        const data = await fetchAllRows(table.key);
        exportData[table.key] = {
          count: data.length,
          data,
        };
      }

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `backup-banco-dados-${format(new Date(), "yyyy-MM-dd-HHmm")}.json`;
      a.click();
      URL.revokeObjectURL(url);

      const totalRecords = Object.entries(exportData)
        .filter(([key]) => key !== "_metadata")
        .reduce((sum, [, val]) => sum + (val as any).count, 0);

      toast.success(`Exportado com sucesso! ${totalRecords} registros em ${tables.length} tabelas.`);
      setIsOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Erro ao exportar banco de dados");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="hover:bg-primary/10 hover:text-primary transition-[var(--transition-smooth)]"
        >
          <Database className="mr-2 h-4 w-4" />
          Exportar JSON
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Exportar Banco de Dados (JSON)</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {selectedCount} de {ALL_TABLES.length} tabelas selecionadas
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={selectAll}>
                Todas
              </Button>
              <Button variant="ghost" size="sm" onClick={deselectAll}>
                Nenhuma
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-1.5 max-h-[40vh] overflow-y-auto border rounded-md p-3">
            {ALL_TABLES.map(table => (
              <label
                key={table.key}
                className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted/50 cursor-pointer text-sm"
              >
                <Checkbox
                  checked={selectedTables[table.key]}
                  onCheckedChange={() => toggleTable(table.key)}
                />
                <span>{table.label}</span>
                <span className="text-xs text-muted-foreground ml-auto">{table.key}</span>
              </label>
            ))}
          </div>

          <Button onClick={handleExport} className="w-full" disabled={loading || selectedCount === 0}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Exportando...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Exportar {selectedCount} tabela{selectedCount !== 1 ? "s" : ""}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
