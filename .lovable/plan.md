# Página de migração para Supabase

## Objetivo
Adicionar ao painel administrativo uma página exclusiva para gestores, reunindo o inventário do Cloud e os materiais necessários para migrar com segurança para um projeto Supabase externo.

## O que será construído
- Nova aba **Migração** no painel, visível somente para gestores.
- Resumo com as 28 tabelas, 4 buckets de arquivos e 6 funções existentes.
- Lista pesquisável de tabelas, com dependências e ações para copiar:
  - SQL de estrutura;
  - políticas de segurança e permissões.
- Lista dos buckets e dos arquivos que precisam ser transferidos.
- Lista das funções, indicando que o código deve ser implantado no destino.
- Botões para copiar blocos individuais e baixar/copiar o pacote SQL completo na ordem correta.
- Avisos claros de que a cópia não executa a migração e que o Cloud só deve ser desconectado após restauração e validação.

## Implementação técnica
- Gerar artefatos SQL estáticos a partir das 35 migrations já versionadas, preservando a ordem original.
- Separar o pacote completo e o bloco de segurança sem inventar uma segunda versão do esquema.
- Manter credenciais, chaves e dados sensíveis fora da página e dos arquivos gerados.
- Integrar a página ao controle atual de papel `gestor` no Admin.
- Usar os componentes e tokens visuais existentes, com estados de cópia, busca e expansão acessíveis.

## Verificação
- Confirmar que a aba não aparece para recreadores.
- Confirmar inventário de 28 tabelas, 4 buckets e 6 funções.
- Testar cópia dos blocos SQL e políticas no navegador.
- Conferir que nenhum segredo está presente no conteúdo copiável.
- Validar compilação e navegação do painel em desktop e celular.
