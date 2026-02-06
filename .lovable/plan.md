

# Quiz da Recreacao com Perguntas Cadastradas pelo Admin

## Resumo

Criar um sistema completo de Quiz onde o administrador cadastra perguntas personalizadas sobre o hotel, e os hospedes jogam respondendo essas perguntas para ganhar pontos.

---

## O que sera desenvolvido

### 1. Painel Admin - Gerenciador de Perguntas do Quiz

Um novo componente no painel administrativo (dentro da aba "Gamificacao" ou como nova aba) onde o gestor pode:

- Cadastrar perguntas com:
  - Texto da pergunta
  - 4 opcoes de resposta (A, B, C, D)
  - Indicar qual e a resposta correta
  - Ativar/desativar perguntas
- Editar perguntas existentes
- Excluir perguntas
- Ver lista de todas as perguntas cadastradas

### 2. Jogo do Quiz para Hospedes

- O hospede clica em "Quiz da Recreacao" na pagina de jogos
- Recebe 5 perguntas aleatorias do banco de perguntas cadastradas pelo admin
- Cada pergunta tem 4 opcoes de resposta
- Timer de 15 segundos por pergunta
- Feedback visual imediato (verde para certo, vermelho para errado)
- Pontuacao:
  - +10 pontos por resposta correta
  - +20 pontos de bonus se acertar todas as 5
  - Maximo possivel: 70 pontos por partida
- Tela final com resumo de acertos e pontos ganhos

### 3. Integracao com o sistema existente

- Resultados salvos na tabela `minigame_results` (ja existente) com `game_type = 'quiz'`
- Pontos somados automaticamente ao hospede
- Botao do Quiz ativado na pagina de Jogos (removendo o "Em breve...")

---

## Detalhes Tecnicos

### Nova Tabela no Banco de Dados

**quiz_questions**

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid | Chave primaria |
| question | text | Texto da pergunta |
| option_a | text | Opcao A |
| option_b | text | Opcao B |
| option_c | text | Opcao C |
| option_d | text | Opcao D |
| correct_option | text | Letra da resposta correta (a, b, c ou d) |
| is_active | boolean | Se a pergunta esta ativa (default: true) |
| created_at | timestamptz | Data de criacao |

**Politicas RLS:**
- SELECT: qualquer pessoa pode ver perguntas ativas
- INSERT/UPDATE/DELETE: somente usuarios autenticados (gestores)

### Novos Arquivos

```text
src/components/admin/QuizQuestionsManager.tsx  - CRUD de perguntas no admin
src/components/games/QuizGame.tsx              - Componente do jogo de quiz
```

### Arquivos Modificados

```text
src/pages/Games.tsx                            - Ativar botao do Quiz e mostrar QuizGame
src/components/admin/GamificationManager.tsx   - Adicionar secao de gerenciamento do Quiz
```

### Fluxo do Jogo

1. Hospede clica no botao "Quiz da Recreacao"
2. Sistema busca perguntas ativas da tabela `quiz_questions`
3. Seleciona 5 aleatorias (ou todas se houver menos de 5)
4. Embaralha a ordem das opcoes em cada pergunta
5. Apresenta uma pergunta por vez com timer de 15s
6. Ao responder, mostra feedback e avanca para proxima
7. Se o timer acabar, conta como erro
8. Ao final, calcula pontos e salva em `minigame_results`
9. Atualiza pontos do hospede na tabela `guests`

### QuizGame - Interface

- Barra de progresso (pergunta 1/5)
- Timer circular decrescente
- Texto da pergunta centralizado
- 4 botoes com as opcoes (layout vertical para mobile)
- Animacao de acerto (verde) e erro (vermelho)
- Tela final com estrelas, total de acertos e pontos

### Admin - Interface do Gerenciador

- Lista de perguntas em cards com preview da pergunta e resposta correta
- Botao "Nova Pergunta" abre formulario
- Formulario com campos para pergunta, 4 opcoes e select da resposta correta
- Toggle para ativar/desativar cada pergunta
- Botao de excluir com confirmacao

