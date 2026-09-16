import { useState } from "react";
import { format } from "date-fns";
import { DatabaseBackup, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ALL_TABLES, type TableKey } from "@/components/admin/database/tables-config";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

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

function quoteIdentifier(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function toSqlLiteral(value: Json | undefined): string {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("O backup contém um número inválido.");
    return String(value);
  }
  const serialized = typeof value === "string" ? value : JSON.stringify(value);
  return `'${serialized.replace(/\u0000/g, "").replace(/'/g, "''")}'`;
}

function rowsToSql(table: TableKey, rows: Json[]): string {
  if (rows.length === 0) return `-- ${table}: sem registros`;
  const records = rows.filter((row): row is Record<string, Json | undefined> => (
    typeof row === "object" && row !== null && !Array.isArray(row)
  ));
  if (records.length !== rows.length) throw new Error(`${table}: formato de registro inválido.`);

  const columns = Object.keys(records[0]);
  if (columns.length === 0) return `-- ${table}: sem colunas exportáveis`;
  const columnSql = columns.map(quoteIdentifier).join(", ");
  const updates = columns
    .filter(column => column !== "id")
    .map(column => `${quoteIdentifier(column)} = EXCLUDED.${quoteIdentifier(column)}`)
    .join(", ");
  const conflictSql = columns.includes("id")
    ? updates ? ` ON CONFLICT ("id") DO UPDATE SET ${updates}` : ` ON CONFLICT ("id") DO NOTHING`
    : "";
  const statements: string[] = [];

  for (let offset = 0; offset < records.length; offset += 250) {
    const values = records.slice(offset, offset + 250).map(record => (
      `(${columns.map(column => toSqlLiteral(record[column])).join(", ")})`
    ));
    statements.push(`INSERT INTO public.${quoteIdentifier(table)} (${columnSql}) VALUES\n${values.join(",\n")}${conflictSql};`);
  }
  return statements.join("\n\n");
}

function saveBackup(sql: string): void {
  const blob = new Blob([sql], { type: "application/sql;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `backup-registros-supabase-${format(new Date(), "yyyy-MM-dd-HHmm")}.sql`;
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
      const sqlParts = [
        "-- Backup de registros para migração",
        `-- Gerado em ${new Date().toISOString()}`,
        "-- Aplique primeiro o arquivo de estrutura e políticas.",
        "BEGIN;",
        "SET LOCAL session_replication_role = replica;",
      ];
      let totalRecords = 0;

      for (const [index, table] of tableKeys.entries()) {
        const data = await fetchAllRows(table);
        sqlParts.push(`\n-- Tabela: ${table}\n${rowsToSql(table, data)}`);
        totalRecords += data.length;
        setCompleted(index + 1);
      }

      sqlParts.push("\nCOMMIT;\n");
      saveBackup(sqlParts.join("\n"));
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
        {running ? `Exportando ${completed}/${ALL_TABLES.length}` : "Exportar registros em SQL"}
      </Button>
      {running && <Progress value={progress} aria-label={`Exportação: ${completed} de ${ALL_TABLES.length} tabelas`} />}
    </div>
  );
}