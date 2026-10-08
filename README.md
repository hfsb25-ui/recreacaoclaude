# Recreação — Hotel Fazenda Santa Bárbara

App de programação de recreação do hotel (React + Vite + Supabase), com totem, gamificação, avaliações e painel administrativo. Não depende mais do Lovable.

## Rodar no computador

Precisa do Node.js 18 ou mais novo.

```sh
npm install
npm run dev      # abre em http://localhost:8080
npm run build    # gera a versão de produção na pasta dist/
```

## Configuração (.env)

O app lê a conexão com o banco do arquivo `.env`:

```
VITE_SUPABASE_PROJECT_ID="id-do-projeto"
VITE_SUPABASE_URL="https://id-do-projeto.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="chave anon public"
```

Os valores ficam no painel do Supabase em **Project Settings → API**. Use só a chave **anon / public**. A `service_role` nunca vai no `.env` do app.

## Migrar para o Supabase próprio

1. **Estrutura** — no projeto Supabase novo, abra o **SQL Editor**, cole o conteúdo de `supabase/setup/01_estrutura.sql` e clique em **Run**. Isso cria as tabelas, funções, permissões, os buckets e o realtime do totem.
2. **Dados** — no mesmo SQL Editor, rode o SQL de dados exportado do painel antigo (aba Migração → exportação SQL dos registros).
3. **Arquivos** — em **Storage**, envie os arquivos dos buckets `announcements`, `logos`, `pwa-icons` e `database_export_15_09_26`, mantendo as mesmas pastas.
4. **Funções** — instale o Supabase CLI e rode, nesta pasta:
   ```sh
   npx supabase login
   npx supabase link --project-ref ID_DO_PROJETO_NOVO
   npx supabase functions deploy
   ```
   Se usar o lembrete por WhatsApp, cadastre os segredos da Evolution API em **Edge Functions → Secrets**.
5. **Trocar a conexão** — atualize o `.env` (e as variáveis na hospedagem) com a URL e a chave anon do projeto novo.
6. **Usuários do painel** — as senhas não vêm na exportação; recrie os gestores/recreadores ou peça redefinição de senha.

## Publicar (Vercel)

1. Em vercel.com, **Add New → Project** e importe este repositório.
2. Em **Environment Variables**, cadastre as três variáveis do `.env`.
3. Clique em **Deploy**. O `vercel.json` já cuida das rotas do app.
