
# Roda da Sorte e Mini-Games

## Objetivo
Criar um sistema de jogos interativos onde os hospedes podem girar uma roleta ou jogar mini-games para ganhar pontos bonus, incentivando ainda mais a participacao nas atividades.

---

## 1. Conceito Geral

### 1.1 Quando o Hospede Pode Jogar?
- **Apos Check-in**: Ao fazer check-in em uma atividade, o hospede ganha 1 "giro" na roda
- **Apos Avaliacao**: Ao avaliar uma atividade, ganha 1 giro bonus
- **Bonus Diario**: 1 giro gratis por dia ao acessar o app (incentiva retorno)

### 1.2 Premios Disponiveis na Roda
| Setor | Cor | Premio | Chance |
|-------|-----|--------|--------|
| +5 pts | Verde | 5 pontos bonus | 25% |
| +10 pts | Azul | 10 pontos bonus | 20% |
| +20 pts | Roxo | 20 pontos bonus | 10% |
| +50 pts | Dourado | 50 pontos (raro!) | 5% |
| Tente Novamente | Cinza | Sem premio | 20% |
| Mini-Game | Laranja | Acesso a mini-game | 20% |

---

## 2. Mini-Games Disponiveis

### 2.1 Jogo da Memoria
- Grade 4x4 com 8 pares de cartas
- Cartas com emojis tematicos (praia, sol, piscina, etc.)
- Premio: +5 pts por par encontrado
- Bonus: +20 pts extra se completar em menos de 60 segundos

### 2.2 Quiz da Recreacao
- 5 perguntas aleatorias sobre o hotel/atividades
- Perguntas como: "Qual atividade acontece as 15h?" ou "Quantas faixas etarias existem?"
- Premio: +10 pts por resposta correta

### 2.3 Caca-Palavras Rapido
- Encontrar 5 palavras em 30 segundos
- Palavras tematicas: PISCINA, PRAIA, SOL, FESTA, RECREACAO
- Premio: +5 pts por palavra encontrada

---

## 3. Estrutura do Banco de Dados

### 3.1 Tabela `guest_spins` (Giros do Hospede)
```text
+------------------+------------------------+---------------------+
| Coluna           | Tipo                   | Descricao          |
+------------------+------------------------+---------------------+
| id               | uuid                   | Identificador      |
| guest_id         | uuid (FK guests)       | Hospede            |
| source           | text                   | checkin/rating/    |
|                  |                        | daily              |
| used             | boolean                | Se ja foi usado    |
| created_at       | timestamp              | Data de ganho      |
| used_at          | timestamp              | Data de uso        |
+------------------+------------------------+---------------------+
```

### 3.2 Tabela `spin_results` (Resultados)
```text
+------------------+------------------------+---------------------+
| Coluna           | Tipo                   | Descricao          |
+------------------+------------------------+---------------------+
| id               | uuid                   | Identificador      |
| guest_id         | uuid (FK guests)       | Hospede            |
| spin_id          | uuid (FK guest_spins)  | Giro utilizado     |
| result_type      | text                   | points/minigame/   |
|                  |                        | nothing            |
| points_won       | integer                | Pontos ganhos      |
| minigame_type    | text                   | Tipo do mini-game  |
| created_at       | timestamp              | Data do resultado  |
+------------------+------------------------+---------------------+
```

### 3.3 Tabela `minigame_results` (Resultados Mini-Games)
```text
+------------------+------------------------+---------------------+
| Coluna           | Tipo                   | Descricao          |
+------------------+------------------------+---------------------+
| id               | uuid                   | Identificador      |
| guest_id         | uuid (FK guests)       | Hospede            |
| game_type        | text                   | memory/quiz/words  |
| score            | integer                | Pontuacao          |
| points_earned    | integer                | Pontos ganhos      |
| completed_in_ms  | integer                | Tempo em ms        |
| created_at       | timestamp              | Data              |
+------------------+------------------------+---------------------+
```

---

## 4. Interface do Hospede

### 4.1 Nova Pagina `/games` (Central de Jogos)
- Header com saldo de giros disponiveis
- Botao grande "GIRAR A RODA" (se tiver giros)
- Secao de mini-games desbloqueados
- Historico de premios recentes

### 4.2 Componente da Roda da Sorte
- Roda colorida com 8 setores
- Animacao de rotacao suave (3-5 segundos)
- Efeito sonoro ao girar (opcional)
- Celebracao animada ao ganhar

### 4.3 Fluxo de Uso
```text
Hospede clica "Girar"
      |
      v
Animacao da roda (3-5s)
      |
      v
Roda para em setor aleatorio
      |
      +--> Pontos: Adiciona ao total + celebracao
      |
      +--> Mini-Game: Modal abre com o jogo
      |
      +--> Tente Novamente: Mensagem de incentivo
```

---

## 5. Integracao com Sistema Existente

### 5.1 Apos Check-in (CheckInButton.tsx)
- Adicionar giro automatico apos check-in bem-sucedido
- Toast: "Check-in realizado! Voce ganhou 1 giro na Roda da Sorte!"

### 5.2 Apos Avaliacao (ActivityRating.tsx)
- Adicionar giro automatico apos avaliacao
- Toast: "Avaliacao enviada! +1 giro na Roda da Sorte!"

### 5.3 Bonus Diario
- Verificar ultimo acesso ao abrir /games
- Se passou mais de 24h: conceder 1 giro gratis
- Banner: "Voce ganhou seu giro diario!"

---

## 6. Navegacao e Acesso

### 6.1 Botao na Home
- Card destacado "Roda da Sorte" abaixo do ranking
- Mostra quantidade de giros disponiveis
- Icone de roleta animado

### 6.2 Botao no Perfil do Hospede
- Novo botao "Mini-Games" junto aos outros atalhos
- Badge com numero de giros disponiveis

### 6.3 Protecao de Rota
- Apenas hospedes logados podem acessar /games
- Redirecionamento para login se nao autenticado

---

## 7. Arquivos a Criar

### Novos Arquivos:
```text
src/pages/Games.tsx                    - Pagina principal dos jogos
src/components/games/
  LuckyWheel.tsx                       - Componente da roda da sorte
  WheelAnimation.tsx                   - Animacao CSS da roda
  MemoryGame.tsx                       - Jogo da memoria
  QuizGame.tsx                         - Quiz da recreacao
  WordSearchGame.tsx                   - Caca-palavras
  GameResult.tsx                       - Modal de resultado
  SpinCounter.tsx                      - Contador de giros
  RecentPrizes.tsx                     - Historico de premios
src/hooks/useGameSpins.tsx             - Hook para gerenciar giros
```

### Arquivos a Modificar:
```text
src/App.tsx                            - Adicionar rota /games
src/pages/Home.tsx                     - Adicionar card de acesso
src/pages/GuestProfile.tsx             - Adicionar botao de acesso
src/components/CheckInButton.tsx       - Conceder giro apos check-in
src/components/ActivityRating.tsx      - Conceder giro apos avaliacao
src/index.css                          - Adicionar animacoes da roda
```

---

## 8. Animacoes e Visual

### 8.1 Animacao da Roda
- Rotacao com easing "ease-out" (desacelera no final)
- Duracao: 4-6 segundos aleatorios
- Rotacoes: 5-8 voltas completas + angulo final

### 8.2 Celebracao de Premio
- Confetes caindo (reutilizar animacao existente)
- Numero de pontos subindo animado
- Som de vitoria (opcional)

### 8.3 Cores dos Setores
```text
+5 pts    -> Verde (#22C55E)
+10 pts   -> Azul (#3B82F6)
+20 pts   -> Roxo (#A855F7)
+50 pts   -> Dourado (#EAB308)
Nada      -> Cinza (#9CA3AF)
Mini-Game -> Laranja (#F97316)
```

---

## 9. Politicas de Seguranca (RLS)

### Tabela `guest_spins`:
- SELECT: Hospede ve apenas seus giros
- INSERT: Sistema pode inserir (via trigger)
- UPDATE: Hospede pode marcar como usado

### Tabela `spin_results`:
- SELECT: Hospede ve apenas seus resultados
- INSERT: Sistema pode inserir

### Tabela `minigame_results`:
- SELECT: Hospede ve apenas seus resultados
- INSERT: Hospede pode inserir seus resultados

---

## 10. Logica de Sorteio

### Probabilidades Ponderadas:
```text
Total de pesos: 100
- +5 pts: peso 25
- +10 pts: peso 20
- +20 pts: peso 10
- +50 pts: peso 5
- Nada: peso 20
- Mini-Game: peso 20
```

### Prevencao de Fraude:
- Sorteio calculado no backend (edge function) para resultados valiosos
- Validacao de que hospede possui giro disponivel antes de sortear
- Rate limiting: maximo 10 giros por hora por hospede

---

## 11. Admin (Futuro)

### Painel de Configuracao:
- Ajustar probabilidades dos premios
- Ver estatisticas de premios distribuidos
- Ativar/desativar tipos de premio
- Adicionar premios especiais temporarios

---

## Resultado Esperado

Um sistema de mini-games divertido que:
1. Aumenta o engajamento dos hospedes
2. Incentiva check-ins e avaliacoes
3. Cria momentos de surpresa e celebracao
4. Adiciona elemento de sorte ao sistema de pontos
5. Traz hospedes de volta diariamente (giro gratis)
