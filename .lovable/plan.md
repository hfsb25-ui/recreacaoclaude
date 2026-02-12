
# Lembrete de Atividades via WhatsApp (Evolution API)

## Resumo

Implementar um sistema onde hospedes cadastrados podem optar por receber lembretes de atividades via WhatsApp, 10 minutos antes do inicio. A integracao sera feita com a Evolution API, configurada pelo administrador.

---

## O que sera desenvolvido

### 1. Alteracoes no Banco de Dados

**Adicionar coluna `phone` na tabela `guests`:**
- Campo de telefone (texto, nullable) para armazenar o numero do hospede com DDI

**Nova tabela `whatsapp_config`:**
- Armazena as configuracoes da Evolution API (URL da instancia, API key, nome da instancia)
- Apenas gestores podem gerenciar

**Nova tabela `whatsapp_reminders`:**
- Registra os lembretes solicitados pelos hospedes
- Colunas: guest_id, activity_id, status (pending/sent/failed), sent_at
- Evita envio duplicado

### 2. Cadastro do Hospede - Campo Telefone

- Adicionar campo "Telefone (WhatsApp)" no formulario de cadastro (`GuestAuth.tsx`)
- Formato com DDI: ex. 5511999998888
- Campo opcional no cadastro, mas obrigatorio para ativar lembretes
- Tambem adicionar no perfil do hospede para atualizar depois

### 3. Botao "Lembrar no WhatsApp" nas Atividades

- Na pagina de atividades (`Activities.tsx`), ao lado de cada atividade futura, exibir um botao "Lembrar no WhatsApp"
- Somente visivel para hospedes logados que possuem telefone cadastrado
- Ao clicar, registra o lembrete na tabela `whatsapp_reminders`
- Feedback visual: botao muda para "Lembrete ativado" apos clicar

### 4. Painel Admin - Configuracao da Evolution API

- Novo componente `WhatsAppManager.tsx` dentro da aba Configuracoes do admin
- Campos:
  - URL da Evolution API (ex: https://api.evolution.com.br)
  - API Key da instancia
  - Nome da instancia
- Botao para testar conexao
- Status da integracao (conectado/desconectado)

### 5. Edge Function - Envio de Lembretes

- Nova edge function `send-whatsapp-reminder` que:
  1. Busca lembretes pendentes cujas atividades comecam em ~10 minutos
  2. Envia mensagem via Evolution API para cada hospede
  3. Atualiza status do lembrete para "sent" ou "failed"
- Sera chamada via cron job a cada minuto

### 6. Cron Job

- Agendar execucao da edge function a cada minuto usando pg_cron + pg_net
- A funcao verifica se ha lembretes pendentes para atividades que comecam nos proximos 10-11 minutos

---

## Detalhes Tecnicos

### Novas Tabelas

**whatsapp_config**

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid | Chave primaria |
| instance_url | text | URL base da Evolution API |
| api_key | text | API Key da instancia |
| instance_name | text | Nome da instancia |
| is_active | boolean | Se a integracao esta ativa |
| created_at | timestamptz | Data de criacao |
| updated_at | timestamptz | Data de atualizacao |

**whatsapp_reminders**

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid | Chave primaria |
| guest_id | uuid | FK para guests |
| activity_id | uuid | FK para activities |
| status | text | pending, sent, failed |
| sent_at | timestamptz | Quando foi enviado |
| created_at | timestamptz | Data de criacao |

### Alteracao na tabela `guests`

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| phone | text (nullable) | Numero WhatsApp com DDI |

### Politicas RLS

- `whatsapp_config`: SELECT para todos, ALL para gestores autenticados
- `whatsapp_reminders`: INSERT/SELECT para todos (hospedes nao autenticados via Supabase Auth), DELETE para autenticados

### Edge Function: `send-whatsapp-reminder`

```text
1. Buscar configuracao ativa da whatsapp_config
2. Buscar lembretes com status = 'pending'
3. Para cada lembrete:
   a. Buscar dados da atividade (nome, horario)
   b. Buscar telefone do hospede
   c. Enviar via Evolution API: POST {instance_url}/message/sendText/{instance_name}
   d. Atualizar status do lembrete
```

### Mensagem enviada ao hospede

```text
Oi, {nome}! Lembrete: a atividade "{nome_atividade}" comeca em 10 minutos (as {horario}). Nos vemos la!
```

### Novos Arquivos

```text
src/components/admin/WhatsAppManager.tsx       - Config da Evolution API no admin
src/components/WhatsAppReminderButton.tsx       - Botao de lembrete nas atividades
supabase/functions/send-whatsapp-reminder/index.ts - Edge function de envio
```

### Arquivos Modificados

```text
src/pages/GuestAuth.tsx        - Campo de telefone no cadastro
src/pages/GuestProfile.tsx     - Exibir/editar telefone no perfil
src/pages/Activities.tsx       - Botao de lembrete WhatsApp
src/pages/Admin.tsx            - Aba de configuracao WhatsApp
src/hooks/useGuestAuth.tsx     - Incluir phone no tipo Guest
```

### Fluxo Completo

```text
1. Admin configura Evolution API nas Configuracoes
2. Hospede se cadastra com telefone (ou atualiza no perfil)
3. Hospede abre programacao e clica "Lembrar no WhatsApp" em uma atividade
4. Sistema salva lembrete com status "pending"
5. Cron job roda a cada minuto
6. Edge function verifica lembretes pendentes para atividades que comecam em ~10 min
7. Envia mensagem via Evolution API
8. Atualiza status para "sent"
```
