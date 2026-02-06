import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useGuestAuth } from "@/hooks/useGuestAuth";
import { toast } from "sonner";

interface MemoryGameProps {
  onComplete: (points: number) => void;
  onClose: () => void;
}

const EMOJIS = ["🏖️", "☀️", "🌊", "🏊", "🎉", "🌴", "🍹", "⛱️"];
const BONUS_TIME_MS = 60000; // 60 seconds for bonus
const POINTS_PER_PAIR = 5;
const BONUS_POINTS = 20;

interface CardItem {
  id: number;
  emoji: string;
  isFlipped: boolean;
  isMatched: boolean;
}

export const MemoryGame = ({ onComplete, onClose }: MemoryGameProps) => {
  const { guest, refreshGuest } = useGuestAuth();
  const [cards, setCards] = useState<CardItem[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [matchedPairs, setMatchedPairs] = useState(0);
  const [startTime] = useState(Date.now());
  const [isComplete, setIsComplete] = useState(false);
  const [earnedPoints, setEarnedPoints] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Initialize game
  useEffect(() => {
    const shuffledEmojis = [...EMOJIS, ...EMOJIS]
      .sort(() => Math.random() - 0.5)
      .map((emoji, index) => ({
        id: index,
        emoji,
        isFlipped: false,
        isMatched: false,
      }));
    setCards(shuffledEmojis);
  }, []);

  // Timer
  useEffect(() => {
    if (isComplete) return;
    const interval = setInterval(() => {
      setElapsedTime(Date.now() - startTime);
    }, 100);
    return () => clearInterval(interval);
  }, [startTime, isComplete]);

  const handleCardClick = (cardId: number) => {
    if (flippedCards.length >= 2 || isComplete) return;

    const card = cards.find((c) => c.id === cardId);
    if (!card || card.isFlipped || card.isMatched) return;

    const newCards = cards.map((c) =>
      c.id === cardId ? { ...c, isFlipped: true } : c
    );
    setCards(newCards);

    const newFlipped = [...flippedCards, cardId];
    setFlippedCards(newFlipped);

    if (newFlipped.length === 2) {
      const [first, second] = newFlipped;
      const firstCard = newCards.find((c) => c.id === first);
      const secondCard = newCards.find((c) => c.id === second);

      if (firstCard?.emoji === secondCard?.emoji) {
        // Match found
        setTimeout(() => {
          setCards((prev) =>
            prev.map((c) =>
              c.id === first || c.id === second ? { ...c, isMatched: true } : c
            )
          );
          setMatchedPairs((prev) => prev + 1);
          setFlippedCards([]);
        }, 500);
      } else {
        // No match - flip back
        setTimeout(() => {
          setCards((prev) =>
            prev.map((c) =>
              c.id === first || c.id === second ? { ...c, isFlipped: false } : c
            )
          );
          setFlippedCards([]);
        }, 1000);
      }
    }
  };

  // Check for game completion
  useEffect(() => {
    if (matchedPairs === EMOJIS.length && !isComplete) {
      completeGame();
    }
  }, [matchedPairs]);

  const completeGame = async () => {
    setIsComplete(true);
    const completionTime = Date.now() - startTime;
    const basePoints = EMOJIS.length * POINTS_PER_PAIR;
    const bonusPoints = completionTime < BONUS_TIME_MS ? BONUS_POINTS : 0;
    const totalPoints = basePoints + bonusPoints;
    setEarnedPoints(totalPoints);

    if (guest?.id) {
      try {
        // Save result
        await supabase.from("minigame_results").insert({
          guest_id: guest.id,
          game_type: "memory",
          score: matchedPairs,
          points_earned: totalPoints,
          completed_in_ms: completionTime,
        });

        // Update guest points
        await supabase
          .from("guests")
          .update({ total_points: (guest.total_points || 0) + totalPoints })
          .eq("id", guest.id);

        await refreshGuest();
        toast.success(`+${totalPoints} pontos adicionados!`);
      } catch (error) {
        console.error("Error saving game result:", error);
      }
    }
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  if (isComplete) {
    return (
      <Card className="p-6 text-center space-y-6">
        <div className="text-6xl">🎉</div>
        <h2 className="text-2xl font-bold text-green-500">Parabéns!</h2>
        <p className="text-muted-foreground">
          Você completou o jogo em {formatTime(elapsedTime)}!
        </p>
        <div className="space-y-2">
          <p className="text-lg">
            Pares encontrados: <span className="font-bold">{matchedPairs}</span> × {POINTS_PER_PAIR} pts
          </p>
          {elapsedTime < BONUS_TIME_MS && (
            <p className="text-lg text-orange-500">
              Bônus de velocidade: <span className="font-bold">+{BONUS_POINTS} pts</span>
            </p>
          )}
          <p className="text-2xl font-bold text-green-500">
            Total: +{earnedPoints} pontos!
          </p>
        </div>
        <Button onClick={() => onComplete(earnedPoints)} size="lg">
          Continuar
        </Button>
      </Card>
    );
  }

  return (
    <Card className="p-4 sm:p-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-lg font-bold">Jogo da Memória</h2>
          <p className="text-sm text-muted-foreground">
            Pares: {matchedPairs}/{EMOJIS.length}
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-mono">{formatTime(elapsedTime)}</p>
          <p className="text-xs text-muted-foreground">
            Bônus: {elapsedTime < BONUS_TIME_MS ? "Ativo!" : "Expirado"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 sm:gap-3 mb-4">
        {cards.map((card) => (
          <button
            key={card.id}
            onClick={() => handleCardClick(card.id)}
            disabled={card.isFlipped || card.isMatched}
            className={`
              aspect-square rounded-lg text-2xl sm:text-3xl font-bold
              transition-all duration-300 transform
              ${
                card.isFlipped || card.isMatched
                  ? "bg-white shadow-inner"
                  : "bg-gradient-to-br from-primary to-secondary hover:scale-105"
              }
              ${card.isMatched ? "opacity-50" : ""}
            `}
          >
            {card.isFlipped || card.isMatched ? card.emoji : "?"}
          </button>
        ))}
      </div>

      <div className="flex justify-between items-center">
        <p className="text-xs text-muted-foreground">
          +{POINTS_PER_PAIR} pts/par • +{BONUS_POINTS} pts bônus (se &lt; 60s)
        </p>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Sair
        </Button>
      </div>
    </Card>
  );
};
