# Evolução do app: recursos de última geração

Melhorias de alto impacto aproveitando a base existente (gamificação, ranking, roda da sorte, quiz, PWA, WhatsApp, totem).

## Fase 1 — Engajamento diário do hóspede

**Desafios diários e semanais**
Missões automáticas como "Participe de 2 atividades hoje" ou "Complete 3 atividades aquáticas nesta semana". Ao concluir, o hóspede ganha pontos bônus e um giro extra na Roda da Sorte. Card de missões na Home e na Área do Hóspede, com barra de progresso.

**Passaporte digital de conquistas**
Página visual estilo passaporte, onde cada atividade concluída vira um selo carimbado. Selos bloqueados aparecem em silhueta, incentivando completar a coleção.

## Fase 2 — Concierge com IA

Chat inteligente na Home que responde sobre programação, horários e faixas etárias, e recomenda atividades com base no histórico de check-ins do hóspede. Usa a IA já disponível na plataforma, sem chave externa.

## Fase 3 — Notificações contextuais

Substituir avisos genéricos por push inteligente:
- "Faltam X pontos para o próximo nível"
- "Sua atividade favorita começa em 30 min"
- "Você ainda não experimentou [atividade]"
- Alerta de clima integrado ao widget existente

## Fase 4 — Painel do gestor

**Insights com IA**: resumo diário automático no dashboard destacando atividades em alta/baixa e sugestões de ajuste de horário.

**NPS pós-estadia**: envio automático via WhatsApp usando a integração já configurada, com cálculo de NPS e comentários no admin.

## Detalhes técnicos

- Novas tabelas: `challenges`, `guest_challenges`, `passport_stamps`, `nps_responses` — todas com RLS e grants adequados.
- Progresso de desafios atualizado por trigger em `activity_checkins`, no padrão de `add_points_on_checkin`.
- Concierge: edge function nova consumindo o gateway de IA da plataforma, com contexto de `activities`, `age_groups` e histórico do hóspede.
- Notificações reutilizam `send-push-notification` e `push_subscriptions`.
- NPS reutiliza `send-whatsapp-reminder` e `whatsapp_config`.
- Novas abas do admin seguem a regra atual de acesso por papel.

## Ordem sugerida

Fase 1 primeiro (maior impacto imediato, sem dependência de IA), depois 3, 2 e 4.
