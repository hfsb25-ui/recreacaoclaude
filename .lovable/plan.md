# Migrar o aplicativo para Supabase externo

## Objetivo
Transferir estrutura, 106.125 registros, usuários, arquivos e funções para o projeto Supabase externo já criado, sem interromper nem apagar o ambiente atual antes da validação.

## Etapas
1. **Backup de origem**
   - Gerar a exportação completa em **Cloud → Avançado → Exportar dados**.
   - Baixar os objetos dos buckets `announcements`, `logos`, `pwa-icons` e `database_export_15_09_26`.
   - Manter o Cloud atual conectado até o aceite final.

2. **Preparar o destino**
   - Aplicar as 35 migrations existentes na ordem, preservando tabelas, funções, gatilhos, permissões e políticas de acesso.
   - Recriar os quatro buckets com a mesma visibilidade.
   - Implantar as seis funções existentes e configurar seus segredos no destino.

3. **Transferir dados e usuários**
   - Importar os registros em ordem de dependência, preservando UUIDs e datas.
   - Migrar identidades administrativas quando o export permitir; usuários cuja senha não for transferível receberão redefinição de senha.
   - Importar os arquivos mantendo os mesmos nomes e caminhos.

4. **Validar antes da troca**
   - Conferir contagens por tabela e relações principais.
   - Testar login de gestor e recreador, isolamento de permissões, programação, avaliações, hóspedes, jogos, ranking, WhatsApp, push, totem e um fluxo completo de criação/edição/exclusão.
   - Confirmar URLs dos arquivos e execução das rotinas agendadas.

5. **Troca final**
   - Atualizar a conexão do aplicativo somente depois de o destino passar nos testes.
   - Publicar e repetir os testes essenciais.
   - Desconectar o Cloud antigo apenas após aceite explícito; essa ação é irreversível e apaga os dados hospedados nele.

## O que preciso para executar
- O arquivo de exportação enviado pelo Cloud, anexado nesta conversa.
- Os arquivos dos quatro buckets, preferencialmente em ZIP.
- A conexão segura com o projeto Supabase externo. Credenciais não devem ser coladas no chat.

## Detalhes técnicos
- O projeto contém 28 tabelas públicas, 35 migrations, 6 funções e 4 buckets.
- O banco atual soma 106.125 registros; `site_visits` (92.084), `activities` (9.493) e `activity_ratings` (2.982) concentram a maior parte.
- A migração manterá IDs para não quebrar relacionamentos, histórico ou URLs.
