import { useMemo, useState } from "react";
import { AlertTriangle, Check, Copy, Database, Download, FolderOpen, FunctionSquare, Search, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FULL_MIGRATION_SQL,
  FULL_SECURITY_SQL,
  MIGRATION_BUCKETS,
  MIGRATION_FUNCTIONS,
  MIGRATION_TABLES,
} from "./migration/migration-artifacts";
import { MigrationDataExport } from "./migration/MigrationDataExport";

type CopyKey = "full" | "security" | `structure:${string}` | `policy:${string}`;

function downloadSql(contents: string): void {
  const url = URL.createObjectURL(new Blob([contents], { type: "application/sql;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "migracao-completa.sql";
  anchor.click();
  URL.revokeObjectURL(url);
}

export function MigrationManager() {
  const [search, setSearch] = useState("");
  const [copied, setCopied] = useState<CopyKey | null>(null);
  const filteredTables = useMemo(() => {
    const normalized = search.trim().toLocaleLowerCase("pt-BR");
    return MIGRATION_TABLES.filter(table =>
      !normalized || `${table.label} ${table.key}`.toLocaleLowerCase("pt-BR").includes(normalized),
    );
  }, [search]);

  const copySql = async (key: CopyKey, sql: string): Promise<void> => {
    if (!sql.trim()) {
      toast.info("Não há um bloco separado para este item.");
      return;
    }
    try {
      await navigator.clipboard.writeText(sql);
      setCopied(key);
      toast.success("SQL copiado.");
      window.setTimeout(() => setCopied(current => current === key ? null : current), 1800);
    } catch {
      toast.error("Não foi possível copiar o SQL neste navegador.");
    }
  };

  const copyIcon = (key: CopyKey) => copied === key
    ? <Check className="h-4 w-4" aria-hidden="true" />
    : <Copy className="h-4 w-4" aria-hidden="true" />;

  return (
    <section className="space-y-6" aria-labelledby="migration-title">
      <div>
        <h2 id="migration-title" className="text-2xl font-bold text-foreground">Migração para Supabase</h2>
        <p className="mt-1 text-sm text-muted-foreground">Inventário, SQL e exportação dos registros do Cloud atual, sem credenciais sensíveis.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="flex items-center gap-3 p-4"><Database className="h-5 w-5 text-primary" /><div><strong className="text-xl">28</strong><p className="text-xs text-muted-foreground">tabelas</p></div></Card>
        <Card className="flex items-center gap-3 p-4"><FolderOpen className="h-5 w-5 text-primary" /><div><strong className="text-xl">4</strong><p className="text-xs text-muted-foreground">áreas de arquivos</p></div></Card>
        <Card className="flex items-center gap-3 p-4"><FunctionSquare className="h-5 w-5 text-primary" /><div><strong className="text-xl">6</strong><p className="text-xs text-muted-foreground">funções</p></div></Card>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button onClick={() => copySql("full", FULL_MIGRATION_SQL)}>{copyIcon("full")}<span className="ml-2">Copiar SQL completo</span></Button>
        <Button variant="outline" onClick={() => copySql("security", FULL_SECURITY_SQL)}>{copyIcon("security")}<span className="ml-2">Copiar todas as políticas</span></Button>
        <Button variant="outline" onClick={() => downloadSql(FULL_MIGRATION_SQL)}><Download className="mr-2 h-4 w-4" />Baixar SQL</Button>
        <MigrationDataExport />
      </div>

      <div className="flex gap-3 rounded-md border border-warning/40 bg-warning/10 p-4 text-sm text-foreground">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
        <p>O SQL de registros preserva os dados das tabelas, mas não inclui usuários de login nem arquivos. Aplique primeiro o SQL de estrutura e não desconecte o Cloud antes de testar tudo.</p>
      </div>

      <Tabs defaultValue="tables">
        <TabsList className="grid h-auto w-full grid-cols-3">
          <TabsTrigger value="tables">Tabelas</TabsTrigger>
          <TabsTrigger value="files">Arquivos</TabsTrigger>
          <TabsTrigger value="functions">Funções</TabsTrigger>
        </TabsList>
        <TabsContent value="tables" className="mt-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <Input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar tabela" className="pl-9" aria-label="Buscar tabela" />
          </div>
          <Accordion type="multiple" className="rounded-md border px-4">
            {filteredTables.map(table => (
              <AccordionItem key={table.key} value={table.key}>
                <AccordionTrigger className="gap-3 text-left hover:no-underline">
                  <span className="min-w-0"><span className="block font-semibold">{table.label}</span><code className="text-xs text-muted-foreground">{table.key}</code></span>
                </AccordionTrigger>
                <AccordionContent className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {table.dependencies.length > 0 ? table.dependencies.map(dep => <Badge key={dep} variant="outline">depende de {dep}</Badge>) : <Badge variant="secondary">sem dependências</Badge>}
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button size="sm" variant="outline" onClick={() => copySql(`structure:${table.key}`, table.structureSql)}>{copyIcon(`structure:${table.key}`)}<span className="ml-2">Copiar estrutura</span></Button>
                    <Button size="sm" variant="outline" onClick={() => copySql(`policy:${table.key}`, table.securitySql)}><ShieldCheck className="mr-2 h-4 w-4" />Copiar políticas</Button>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          {filteredTables.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma tabela encontrada.</p>}
        </TabsContent>
        <TabsContent value="files" className="mt-4 grid gap-3 sm:grid-cols-2">
          {MIGRATION_BUCKETS.map(bucket => <Card key={bucket.name} className="p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold">{bucket.name}</h3><p className="text-sm text-muted-foreground">{bucket.fileCount} arquivo{bucket.fileCount !== 1 ? "s" : ""}</p></div><Badge variant="outline">{bucket.visibility}</Badge></div></Card>)}
        </TabsContent>
        <TabsContent value="functions" className="mt-4 grid gap-3 sm:grid-cols-2">
          {MIGRATION_FUNCTIONS.map(name => <Card key={name} className="flex items-center gap-3 p-4"><FunctionSquare className="h-5 w-5 text-primary" /><div><h3 className="font-semibold">{name}</h3><p className="text-xs text-muted-foreground">Implantar no projeto de destino</p></div></Card>)}
        </TabsContent>
      </Tabs>
    </section>
  );
}