import { useState } from "react";
import { format } from "date-fns";
import { DatabaseBackup, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ALL_TABLES, type TableKey } from "@/components/admin/database/tables-config";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

interface TableBackup {
  count: number;
  data: Json[];
}

interface BackupDocument {
  _metadata: {
    exported_at: string;
    format_version: 1;
    tables_count: number;
    tables: TableKey[];
  };
  [table: string]: TableBackup | BackupDocument["_metadata"];
}

const PAGE_SIZE = 1000;

async function fetchAllRows(table: TableKey): Promise<Json[]> {
  const rows: Json[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw new Error(`${table}: ${error.message}`);
    const page = (data ?? []) as Json[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
    from += PAGE_SIZE;
  }
}

function saveBackup(data: BackupDocument): void {
  const blob = new Blob([JSON.stringify(data)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `backup-registros-supabase-${format(new Date(), "yyyy-MM-dd-HHmm")}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function MigrationDataExport() {
  const [running, setRunning] = useState(false);
  const [completed, setCompleted] = useState(0);

  const exportRecords = async (): Promise<void> => {
    setRunning(true);
    setCompleted(0);

    try {
      const tableKeys = ALL_TABLES.map(table => table.key);
      const backup: BackupDocument = {
        _metadata: {
          exported_at: new Date().toISOString(),
          format_version: 1,
          tables_count: tableKeys.length,
          tables: tableKeys,
        },
      };
      let totalRecords = 0;

      for (const [index, table] of tableKeys.entries()) {
        const data = await fetchAllRows(table);
        backup[table] = { count: data.length, data };
        totalRecords += data.length;
        setCompleted(index + 1);
      }

      saveBackup(backup);
      toast.success(`${totalRecords.toLocaleString("pt-BR")} registros exportados em ${tableKeys.length} tabelas.`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro desconhecido";
      toast.error(`Não foi possível exportar todos os registros: ${message}`);
    } finally {
      setRunning(false);
    }
  };

  const progress = (completed / ALL_TABLES.length) * 100;

  return (
    <div className="space-y-2">
      <Button variant="secondary" onClick={exportRecords} disabled={running}>
        {running ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <DatabaseBackup className="mr-2 h-4 w-4" />}
        {running ? `Exportando ${completed}/${ALL_TABLES.length}` : "Exportar todos os registros"}
      </Button>
      {running && <Progress value={progress} aria-label={`Exportação: ${completed} de ${ALL_TABLES.length} tabelas`} />}
    </div>
  );
}