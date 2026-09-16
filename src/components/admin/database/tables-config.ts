export const ALL_TABLES = [
  { key: "age_groups", label: "Faixas Etárias", deps: [] },
  { key: "levels", label: "Níveis", deps: [] },
  { key: "guests", label: "Hóspedes", deps: [] },
  { key: "activity_templates", label: "Catálogo de Atividades", deps: [] },
  { key: "activities", label: "Atividades", deps: ["age_groups"] },
  { key: "activity_checkins", label: "Check-ins", deps: ["activities", "guests"] },
  { key: "activity_ratings", label: "Avaliações", deps: ["activities", "guests"] },
  { key: "age_group_recreadores", label: "Recreadores por Faixa", deps: ["age_groups"] },
  { key: "announcements", label: "Anúncios", deps: [] },
  { key: "guest_spins", label: "Giros dos Hóspedes", deps: ["guests"] },
  { key: "spin_results", label: "Resultados dos Giros", deps: ["guests", "guest_spins"] },
  { key: "minigame_results", label: "Resultados dos Minigames", deps: ["guests"] },
  { key: "quiz_questions", label: "Perguntas do Quiz", deps: [] },
  { key: "menu_items", label: "Itens do Menu", deps: [] },
  { key: "ranking_periods", label: "Períodos do Ranking", deps: [] },
  { key: "ranking_winners", label: "Vencedores do Ranking", deps: ["ranking_periods", "guests"] },
  { key: "site_settings", label: "Configurações do Site", deps: [] },
  { key: "site_visits", label: "Visitas ao Site", deps: ["guests"] },
  { key: "admin_login_history", label: "Histórico de Logins", deps: [] },
  { key: "totem_config", label: "Configuração do Totem", deps: [] },
  { key: "totem_alerts", label: "Avisos do Totem", deps: [] },
  { key: "reset_config", label: "Configuração de Reset", deps: [] },
  { key: "notification_preferences", label: "Preferências de Notificação", deps: ["guests"] },
  { key: "push_subscriptions", label: "Assinaturas Push", deps: ["guests"] },
  { key: "whatsapp_config", label: "Configuração WhatsApp", deps: [] },
  { key: "whatsapp_reminders", label: "Lembretes WhatsApp", deps: ["guests", "activities"] },
] as const;

export type TableKey = (typeof ALL_TABLES)[number]["key"];

export const TABLE_LABELS: Record<string, string> = ALL_TABLES.reduce(
  (acc, t) => ({ ...acc, [t.key]: t.label }),
  {} as Record<string, string>
);

/** Returns tables in dependency-safe insertion order */
export function getInsertionOrder(selectedKeys: string[]): string[] {
  const selected = new Set(selectedKeys);
  const ordered: string[] = [];
  const visited = new Set<string>();

  const visit = (key: string) => {
    if (visited.has(key)) return;
    visited.add(key);
    const table = ALL_TABLES.find(t => t.key === key);
    if (table) {
      for (const dep of table.deps) {
        if (selected.has(dep)) visit(dep);
      }
    }
    if (selected.has(key)) ordered.push(key);
  };

  for (const key of selectedKeys) visit(key);
  return ordered;
}

/** Returns tables in reverse dependency order for safe deletion */
export function getDeletionOrder(selectedKeys: string[]): string[] {
  return getInsertionOrder(selectedKeys).reverse();
}
