import { ALL_TABLES } from "@/components/admin/database/tables-config";

const migrationModules = import.meta.glob("/supabase/migrations/*.sql", {
  eager: true,
  import: "default",
  query: "?raw",
}) as Record<string, string>;

export interface MigrationTableArtifact {
  key: string;
  label: string;
  dependencies: readonly string[];
  structureSql: string;
  securitySql: string;
}

export interface MigrationBucket {
  name: string;
  visibility: "Público" | "Privado";
  fileCount: number;
}

export const MIGRATION_BUCKETS: readonly MigrationBucket[] = [
  { name: "announcements", visibility: "Público", fileCount: 10 },
  { name: "logos", visibility: "Público", fileCount: 1 },
  { name: "pwa-icons", visibility: "Público", fileCount: 1 },
  { name: "database_export_15_09_26", visibility: "Privado", fileCount: 1 },
];

export const MIGRATION_FUNCTIONS = [
  "auto-reset-ranking",
  "create-user",
  "delete-user",
  "list-users",
  "send-push-notification",
  "send-whatsapp-reminder",
] as const;

const orderedMigrations = Object.entries(migrationModules).sort(([a], [b]) => a.localeCompare(b));

export const FULL_MIGRATION_SQL = orderedMigrations
  .map(([path, sql]) => `-- ${path.split("/").pop()}\n${sql.trim()}`)
  .join("\n\n");

function splitSqlStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = "";
  let dollarTag: string | null = null;
  let singleQuoted = false;
  let doubleQuoted = false;
  let lineComment = false;
  let blockComment = false;

  for (let index = 0; index < sql.length; index += 1) {
    const char = sql[index];
    const next = sql[index + 1];
    current += char;

    if (lineComment) {
      if (char === "\n") lineComment = false;
      continue;
    }
    if (blockComment) {
      if (char === "*" && next === "/") {
        current += next;
        index += 1;
        blockComment = false;
      }
      continue;
    }
    if (!singleQuoted && !doubleQuoted && !dollarTag && char === "-" && next === "-") {
      current += next;
      index += 1;
      lineComment = true;
      continue;
    }
    if (!singleQuoted && !doubleQuoted && !dollarTag && char === "/" && next === "*") {
      current += next;
      index += 1;
      blockComment = true;
      continue;
    }
    if (!doubleQuoted && !dollarTag && char === "'" && sql[index - 1] !== "\\") {
      if (singleQuoted && next === "'") {
        current += next;
        index += 1;
      } else {
        singleQuoted = !singleQuoted;
      }
      continue;
    }
    if (!singleQuoted && !dollarTag && char === '"') {
      doubleQuoted = !doubleQuoted;
      continue;
    }
    if (!singleQuoted && !doubleQuoted && char === "$") {
      const match = sql.slice(index).match(/^\$[A-Za-z0-9_]*\$/);
      if (match) {
        const tag = match[0];
        if (!dollarTag || dollarTag === tag) {
          current += tag.slice(1);
          index += tag.length - 1;
          dollarTag = dollarTag ? null : tag;
          continue;
        }
      }
    }
    if (char === ";" && !singleQuoted && !doubleQuoted && !dollarTag) {
      if (current.trim()) statements.push(current.trim());
      current = "";
    }
  }

  if (current.trim()) statements.push(current.trim());
  return statements;
}

const allStatements = orderedMigrations.flatMap(([path, sql]) =>
  splitSqlStatements(sql).map(statement => ({ path, statement })),
);

function referencesTable(statement: string, table: string): boolean {
  const escaped = table.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:public\\.)?"?${escaped}"?(?![A-Za-z0-9_])`, "i").test(statement);
}

function isSecurityStatement(statement: string): boolean {
  return /^(?:ALTER TABLE[\s\S]+ENABLE ROW LEVEL SECURITY|CREATE POLICY|DROP POLICY|GRANT\s)/i.test(
    statement.replace(/^(?:\s|--[^\n]*\n|\/\*[\s\S]*?\*\/)+/, ""),
  );
}

function formatStatements(items: Array<{ path: string; statement: string }>): string {
  return items
    .map(({ path, statement }) => `-- ${path.split("/").pop()}\n${statement}`)
    .join("\n\n");
}

export const MIGRATION_TABLES: readonly MigrationTableArtifact[] = ALL_TABLES.map(table => {
  const related = allStatements.filter(({ statement }) => referencesTable(statement, table.key));
  return {
    key: table.key,
    label: table.label,
    dependencies: table.deps,
    structureSql: formatStatements(related.filter(({ statement }) => !isSecurityStatement(statement))),
    securitySql: formatStatements(related.filter(({ statement }) => isSecurityStatement(statement))),
  };
});

export const FULL_SECURITY_SQL = formatStatements(
  allStatements.filter(({ statement }) => isSecurityStatement(statement)),
);