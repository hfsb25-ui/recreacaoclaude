
# Melhorias no Dashboard de KPIs

## Objetivo
Aprimorar o dashboard de KPIs com visualizações mais ricas, métricas adicionais, filtros de período, e melhor usabilidade para gestores.

---

## 1. Novos KPIs e Métricas

### 1.1 KPIs Adicionais nos Cards
Adicionar métricas que complementam as existentes:

| Novo KPI | Descrição | Cálculo |
|----------|-----------|---------|
| **NPS Estimado** | Net Promoter Score baseado em avaliações | (5 estrelas - 1-2 estrelas) / total × 100 |
| **Taxa de Conversão** | Visitantes que viraram hóspedes ativos | Hóspedes com check-in / Total visitas site |
| **Crescimento Semanal** | Variação de participação vs semana anterior | (Atual - Anterior) / Anterior × 100 |
| **Tempo Médio Sessão** | Média de páginas por sessão | Total páginas / Sessões únicas |

### 1.2 Indicadores de Tendência
- Adicionar setas de tendência (↑↓) em todos os cards
- Mostrar variação percentual vs período anterior
- Cores verde/vermelho para indicar desempenho

---

## 2. Filtros de Período

### 2.1 Seletor de Período Global
Adicionar no topo do dashboard:
- **Presets**: Hoje, Últimos 7 dias, Últimos 30 dias, Este mês, Este período de ranking
- **Período personalizado**: Data inicial e final com DatePicker
- Todos os dados e gráficos respeitam o filtro selecionado

### 2.2 Filtro por Faixa Etária
- Dropdown para filtrar métricas por faixa etária
- Opção "Todas" como padrão
- Afeta heatmap, análise de atividades e funil

---

## 3. Visualizações Aprimoradas

### 3.1 Gráfico de Tendência Temporal
Novo componente `TrendChart.tsx`:
- Gráfico de linha mostrando evolução diária
- Métricas: check-ins, avaliações, visitas, cadastros
- Toggle para alternar entre métricas
- Zoom interativo para períodos específicos

### 3.2 Mapa de Atividades
Melhorar `ActivityAnalysis.tsx`:
- Adicionar gráfico de bolhas (Bubble Chart)
- Eixo X: Total de check-ins
- Eixo Y: Média de avaliação
- Tamanho da bolha: Número de avaliações
- Cor: Faixa etária

### 3.3 Comparativo Visual de Períodos
Melhorar `PeriodComparison.tsx`:
- Adicionar gráfico de radar comparando métricas
- Overlay de períodos para comparação direta
- Destaque para recordes históricos

---

## 4. Insights Automatizados

### 4.1 Painel de Insights Inteligentes
Novo componente `SmartInsights.tsx`:
- Geração automática de insights baseados nos dados
- Exemplos de insights:
  - "Atividade X teve 40% mais participação às 10h do que às 15h"
  - "Hóspedes de nível 3+ fazem 2x mais check-ins"
  - "Sábados têm 30% mais acessos que dias de semana"
  - "A faixa Kids+ representa 45% dos check-ins"

### 4.2 Alertas Aprimorados
Melhorar `KPIAlerts.tsx`:
- Adicionar priorização de alertas (crítico, atenção, info)
- Sugestões de ação para cada alerta
- Histórico de alertas resolvidos
- Badge com contador de alertas não lidos

---

## 5. Métricas por Faixa Etária

### 5.1 Novo Componente `AgeGroupMetrics.tsx`
- Cards comparando performance entre faixas
- Ranking de faixas mais engajadas
- Gráfico de pizza com distribuição
- Evolução temporal por faixa

---

## 6. Exportação de Relatórios

### 6.1 Botão Exportar PDF
- Relatório visual com todos os KPIs
- Gráficos como imagens
- Logotipo do hotel
- Período e data de geração

### 6.2 Exportar CSV
- Dados brutos das tabelas
- Opção de selecionar quais dados exportar
- Download automático

---

## 7. Otimização de Performance

### 7.1 Cache e Refresh
- Botão "Atualizar Dados" manual
- Indicador de última atualização
- Cache local com React Query
- Auto-refresh a cada 5 minutos (configurável)

### 7.2 Loading por Seção
- Skeleton loading individual por componente
- Carregamento progressivo
- Priorização de KPIs principais

---

## 8. Melhorias de UX

### 8.1 Cards Clicáveis
- Clicar em um KPI abre detalhamento
- Modal com gráfico de evolução histórica
- Drill-down para dados específicos

### 8.2 Tooltips Informativos
- Explicação de cada métrica ao passar o mouse
- Fórmula de cálculo visível
- Benchmark/meta quando aplicável

### 8.3 Modo Fullscreen
- Botão para expandir gráficos em tela cheia
- Ideal para apresentações
- Atalho de teclado (F)

---

## 9. Implementação Técnica

### 9.1 Novos Arquivos

```text
src/components/admin/kpi/
├── KPICards.tsx           (editar - adicionar NPS, conversão)
├── ActivityHeatmap.tsx    (editar - manter como está)
├── PeriodComparison.tsx   (editar - adicionar radar chart)
├── ActivityAnalysis.tsx   (editar - adicionar bubble chart)
├── EngagementFunnel.tsx   (manter)
├── KPIAlerts.tsx          (editar - priorização e sugestões)
├── TrendChart.tsx         (novo - gráfico de tendência)
├── SmartInsights.tsx      (novo - insights automáticos)
├── AgeGroupMetrics.tsx    (novo - métricas por faixa)
├── KPIFilters.tsx         (novo - filtros de período)
└── KPIExport.tsx          (novo - exportação)
```

### 9.2 Modificações no KPIDashboard.tsx
- Adicionar estado para período selecionado
- Adicionar estado para faixa etária selecionada
- Passar filtros para todos os componentes filhos
- Implementar refetch quando filtros mudam

### 9.3 Queries Otimizadas
- Filtrar dados por período nas queries SQL
- Usar `.gte()` e `.lte()` para ranges de data
- Manter Promise.all para paralelização

---

## Resultado Esperado

Um dashboard executivo completo com:
1. **Visão Estratégica**: KPIs principais com tendências claras
2. **Análise Temporal**: Filtros e gráficos de evolução
3. **Insights Acionáveis**: Alertas e sugestões automáticas
4. **Segmentação**: Dados por faixa etária e período
5. **Exportação**: Relatórios para reuniões e apresentações
6. **UX Premium**: Interface responsiva e interativa
