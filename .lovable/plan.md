# Totem: Comunicação em Tempo Real

## Objetivo
Permitir que gestores e recreadores lancem avisos urgentes que aparecem imediatamente no totem do lobby, sobrepondo qualquer slide, com alerta visual opcional.

## O que será entregue

### 1. Avisos urgentes no banco
- Nova tabela `totem_alerts` com: título, mensagem, cor do alerta, ícone, duração em segundos, som opcional, status ativo/inativo, data de expiração, quem criou.
- RLS: apenas gestores e recreadores podem criar/editar; leitura aberta para o totem exibir.
- Trigger `updated_at` padrão.

### 2. Entrega instantânea no totem
- Ativar Realtime na tabela `totem_alerts`.
- No `Totem.tsx`, escutar mudanças em `totem_alerts` e, quando houver um alerta ativo, exibir um overlay em tela cheia por cima do slide atual.
- O alerta some automaticamente após a duração configurada ou ao tocar/clickar na tela.

### 3. Painel de avisos no Admin
- Nova aba "Avisos do Totem" no painel administrativo.
- Lista de avisos criados com status, expiração e botões de editar/ativar/desativar/excluir.
- Formulário para criar novo aviso com campos: título, mensagem, cor, duração, som, expiração.
- Botão "Disparar agora" que ativa um aviso imediatamente.

### 4. Configurações visuais e sonoras
- Cores pré-definidas (vermelho, amarelo, azul, verde) para diferenciar gravidade.
- Ícones por tipo de aviso (alerta, info, sucesso, perigo).
- Som opcional ao exibir (beep suave via Web Audio API, respeitando autoplay).

### 5. Histórico
- Avisos desativados/expirados permanecem no histórico por 7 dias para consulta.

## Detalhes técnicos
- Tabela: `public.totem_alerts`.
- Realtime: `ALTER PUBLICATION supabase_realtime ADD TABLE public.totem_alerts;`.
- Componentes novos: `TotemAlertOverlay.tsx`, `TotemAlertsManager.tsx`.
- Edição: `src/pages/Totem.tsx` e `src/pages/Admin.tsx`.
- Sem alterações no fluxo de slides existente — o alerta é um overlay temporário.

## Critério de pronto
- Admin consegue criar um aviso e clicar em "Disparar agora".
- Totem aberto em outra aba/janela exibe o aviso em até 2 segundos.
- O alerta some sozinho após o tempo configurado.
