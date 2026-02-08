import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, Loader2, AlertTriangle, FileUp, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ALL_TABLES, TABLE_LABELS, getInsertionOrder, getDeletionOrder } from "./tables-config";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ParsedBackup {
  _metadata?: {
    exported_at: string;
    tables_count: number;
    tables: string[];
  };
  [key: string]: any;
}

interface ImportLog {
  table: string;
  status: "success" | "error" | "skipped";
  count: number;
  message?: string;
}

export const DatabaseImport = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedBackup | null>(null);
  const [fileName, setFileName] = useState("");
  const [selectedTables, setSelectedTables] = useState<Record<string, boolean>>({});
  const [clearBeforeImport, setClearBeforeImport] = useState(false);
  const [importLogs, setImportLogs] = useState<ImportLog[]>([]);
  const [showResults, setShowResults] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setParsedData(null);
    setFileName("");
    setSelectedTables({});
    setImportLogs([]);
    setShowResults(false);
    setClearBeforeImport(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".json")) {
      toast.error("Selecione um arquivo .json");
      return;
    }

    try {
      const text = await file.text();
      const data = JSON.parse(text) as ParsedBackup;

      // Detect tables in the file
      const validTableKeys = ALL_TABLES.map(t => t.key) as readonly string[];
      const foundTables = Object.keys(data).filter(
        key => key !== "_metadata" && validTableKeys.includes(key)
      );

      if (foundTables.length === 0) {
        toast.error("Nenhuma tabela reconhecida no arquivo. Verifique o formato do backup.");
        return;
      }

      const initialSelection = foundTables.reduce(
        (acc, key) => ({ ...acc, [key]: true }),
        {} as Record<string, boolean>
      );

      setParsedData(data);
      setFileName(file.name);
      setSelectedTables(initialSelection);
      setShowResults(false);
      setImportLogs([]);
    } catch {
      toast.error("Erro ao ler o arquivo JSON. Verifique se é um JSON válido.");
    }
  };

  const toggleTable = (key: string) => {
    setSelectedTables(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const getTableData = (key: string): any[] => {
    if (!parsedData || !parsedData[key]) return [];
    // Support both { data: [...] } and plain array format
    const tableEntry = parsedData[key];
    if (Array.isArray(tableEntry)) return tableEntry;
    if (tableEntry.data && Array.isArray(tableEntry.data)) return tableEntry.data;
    return [];
  };

  const selectedKeys = Object.entries(selectedTables)
    .filter(([, v]) => v)
    .map(([k]) => k);

  const totalRecords = selectedKeys.reduce((sum, key) => sum + getTableData(key).length, 0);

  const handleImportClick = () => {
    if (selectedKeys.length === 0) {
      toast.error("Selecione pelo menos uma tabela");
      return;
    }
    setConfirmOpen(true);
  };

  const handleImport = async () => {
    setConfirmOpen(false);
    setLoading(true);
    setShowResults(false);
    const logs: ImportLog[] = [];

    try {
      // If clearing, delete in reverse dependency order
      if (clearBeforeImport) {
        const deleteOrder = getDeletionOrder(selectedKeys);
        for (const tableKey of deleteOrder) {
          try {
            // Delete all rows - using a filter that matches everything
            const { error } = await supabase
              .from(tableKey as any)
              .delete()
              .neq("id", "00000000-0000-0000-0000-000000000000");

            if (error) {
              logs.push({
                table: tableKey,
                status: "error",
                count: 0,
                message: `Erro ao limpar: ${error.message}`,
              });
            }
          } catch (err: any) {
            logs.push({
              table: tableKey,
              status: "error",
              count: 0,
              message: `Erro ao limpar: ${err.message}`,
            });
          }
        }
      }

      // Insert in dependency order
      const insertOrder = getInsertionOrder(selectedKeys);

      for (const tableKey of insertOrder) {
        const rows = getTableData(tableKey);

        if (rows.length === 0) {
          logs.push({ table: tableKey, status: "skipped", count: 0, message: "Sem dados" });
          continue;
        }

        try {
          // Insert in batches of 500
          const batchSize = 500;
          let inserted = 0;

          for (let i = 0; i < rows.length; i += batchSize) {
            const batch = rows.slice(i, i + batchSize);
            const { error } = await supabase
              .from(tableKey as any)
              .upsert(batch as any, { onConflict: "id", ignoreDuplicates: false });

            if (error) {
              throw error;
            }
            inserted += batch.length;
          }

          logs.push({ table: tableKey, status: "success", count: inserted });
        } catch (err: any) {
          logs.push({
            table: tableKey,
            status: "error",
            count: 0,
            message: err.message,
          });
        }
      }

      setImportLogs(logs);
      setShowResults(true);

      const successCount = logs.filter(l => l.status === "success").length;
      const errorCount = logs.filter(l => l.status === "error").length;
      const totalInserted = logs.reduce((s, l) => s + l.count, 0);

      if (errorCount === 0) {
        toast.success(`Importação concluída! ${totalInserted} registros em ${successCount} tabelas.`);
      } else {
        toast.warning(
          `Importação parcial: ${successCount} tabelas OK, ${errorCount} com erro. Veja os detalhes.`
        );
      }
    } catch (error: any) {
      toast.error(error.message || "Erro durante a importação");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog
        open={isOpen}
        onOpenChange={open => {
          setIsOpen(open);
          if (!open) reset();
        }}
      >
        <DialogTrigger asChild>
          <Button
            variant="outline"
            className="hover:bg-primary/10 hover:text-primary transition-[var(--transition-smooth)]"
          >
            <Upload className="mr-2 h-4 w-4" />
            Importar JSON
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[540px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Importar Backup (JSON)</DialogTitle>
            <DialogDescription>
              Restaure dados a partir de um arquivo de backup exportado anteriormente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* File picker */}
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full h-20 border-dashed"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="flex flex-col items-center gap-1">
                  <FileUp className="h-6 w-6 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {fileName || "Clique para selecionar o arquivo .json"}
                  </span>
                </div>
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>

            {/* Metadata */}
            {parsedData?._metadata && (
              <div className="rounded-md bg-muted/50 p-3 text-xs space-y-1">
                <p>
                  <strong>Exportado em:</strong>{" "}
                  {new Date(parsedData._metadata.exported_at).toLocaleString("pt-BR")}
                </p>
                <p>
                  <strong>Tabelas no arquivo:</strong> {parsedData._metadata.tables_count}
                </p>
              </div>
            )}

            {/* Table selection */}
            {parsedData && !showResults && (
              <>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Tabelas encontradas no backup:</p>
                  <div className="grid grid-cols-1 gap-1.5 max-h-[30vh] overflow-y-auto border rounded-md p-3">
                    {ALL_TABLES.filter(t => parsedData[t.key]).map(table => {
                      const rows = getTableData(table.key);
                      return (
                        <label
                          key={table.key}
                          className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted/50 cursor-pointer text-sm"
                        >
                          <Checkbox
                            checked={selectedTables[table.key] ?? false}
                            onCheckedChange={() => toggleTable(table.key)}
                          />
                          <span>{table.label}</span>
                          <Badge variant="secondary" className="ml-auto text-xs">
                            {rows.length}
                          </Badge>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Clear option */}
                <div className="flex items-center gap-3 p-3 rounded-md border border-destructive/30 bg-destructive/5">
                  <Switch
                    id="clear-before"
                    checked={clearBeforeImport}
                    onCheckedChange={setClearBeforeImport}
                  />
                  <div className="space-y-0.5">
                    <Label htmlFor="clear-before" className="text-sm font-medium cursor-pointer">
                      Limpar tabelas antes de importar
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Remove todos os dados existentes nas tabelas selecionadas antes de inserir os
                      dados do backup. Sem esta opção, registros com mesmo ID serão atualizados.
                    </p>
                  </div>
                </div>

                {/* Summary */}
                <p className="text-sm text-muted-foreground">
                  {selectedKeys.length} tabela{selectedKeys.length !== 1 ? "s" : ""} selecionada
                  {selectedKeys.length !== 1 ? "s" : ""} · {totalRecords.toLocaleString("pt-BR")}{" "}
                  registro{totalRecords !== 1 ? "s" : ""}
                </p>

                <Button
                  onClick={handleImportClick}
                  className="w-full"
                  disabled={loading || selectedKeys.length === 0}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Importando...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Importar {selectedKeys.length} tabela{selectedKeys.length !== 1 ? "s" : ""}
                    </>
                  )}
                </Button>
              </>
            )}

            {/* Results */}
            {showResults && (
              <div className="space-y-3">
                <p className="text-sm font-medium">Resultado da importação:</p>
                <ScrollArea className="max-h-[35vh]">
                  <div className="space-y-1.5">
                    {importLogs.map((log, i) => (
                      <div
                        key={i}
                        className={`flex items-center gap-2 p-2 rounded text-sm ${
                          log.status === "success"
                            ? "bg-primary/10"
                            : log.status === "error"
                            ? "bg-destructive/10"
                            : "bg-muted/50"
                        }`}
                      >
                        {log.status === "success" ? (
                          <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                        ) : log.status === "error" ? (
                          <XCircle className="h-4 w-4 text-destructive shrink-0" />
                        ) : (
                          <span className="h-4 w-4 shrink-0" />
                        )}
                        <span className="font-medium">
                          {TABLE_LABELS[log.table] || log.table}
                        </span>
                        {log.status === "success" && (
                          <span className="text-muted-foreground ml-auto">
                            {log.count} registro{log.count !== 1 ? "s" : ""}
                          </span>
                        )}
                        {log.status === "error" && (
                          <span className="text-xs text-destructive ml-auto max-w-[200px] truncate">
                            {log.message}
                          </span>
                        )}
                        {log.status === "skipped" && (
                          <span className="text-xs text-muted-foreground ml-auto">
                            {log.message}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                <Button variant="outline" className="w-full" onClick={reset}>
                  Importar outro arquivo
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Confirmar importação
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">
                Você está prestes a importar{" "}
                <strong>{totalRecords.toLocaleString("pt-BR")} registros</strong> em{" "}
                <strong>
                  {selectedKeys.length} tabela{selectedKeys.length !== 1 ? "s" : ""}
                </strong>
                .
              </span>
              {clearBeforeImport && (
                <span className="block text-destructive font-medium">
                  ⚠️ Os dados atuais das tabelas selecionadas serão APAGADOS antes da importação!
                </span>
              )}
              {!clearBeforeImport && (
                <span className="block">
                  Registros com mesmo ID serão atualizados. Registros novos serão inseridos.
                </span>
              )}
              <span className="block">Deseja continuar?</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleImport}>Sim, importar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
