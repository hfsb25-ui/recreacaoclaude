import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { SpinResult } from "@/hooks/useGameSpins";

interface GameResultProps {
  result: SpinResult | null;
  open: boolean;
  onClose: () => void;
  onPlayMiniGame?: () => void;
}

export const GameResult = ({ result, open, onClose, onPlayMiniGame }: GameResultProps) => {
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (open && result?.result_type === "points") {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [open, result]);

  if (!result) return null;

  const getContent = () => {
    switch (result.result_type) {
      case "points":
        return {
          emoji: "🎉",
          title: "Parabéns!",
          description: `Você ganhou ${result.points_won} pontos!`,
          color: "text-green-500",
          buttonText: "Fechar",
          action: onClose,
        };
      case "minigame":
        return {
          emoji: "🎮",
          title: "Mini-Game Desbloqueado!",
          description: "Você ganhou acesso a um mini-game! Jogue e ganhe ainda mais pontos!",
          color: "text-orange-500",
          buttonText: "Jogar Agora",
          action: onPlayMiniGame || onClose,
        };
      default:
        return {
          emoji: "😅",
          title: "Quase!",
          description: "Não foi dessa vez, mas continue tentando!",
          color: "text-gray-500",
          buttonText: "Fechar",
          action: onClose,
        };
    }
  };

  const content = getContent();

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          {showConfetti && (
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {[...Array(20)].map((_, i) => (
                <span
                  key={i}
                  className="absolute animate-confetti"
                  style={{
                    left: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 0.5}s`,
                    fontSize: `${Math.random() * 1 + 0.5}rem`,
                  }}
                >
                  {["🎉", "✨", "⭐", "🌟", "💫"][Math.floor(Math.random() * 5)]}
                </span>
              ))}
            </div>
          )}
          <div className="text-6xl mb-4">{content.emoji}</div>
          <DialogTitle className={`text-2xl ${content.color}`}>{content.title}</DialogTitle>
          <DialogDescription className="text-base mt-2">{content.description}</DialogDescription>
        </DialogHeader>

        {result.result_type === "points" && (
          <div className="flex justify-center my-4">
            <div className="text-4xl font-bold text-green-500 animate-pulse">
              +{result.points_won} pts
            </div>
          </div>
        )}

        <div className="flex justify-center mt-4">
          <Button onClick={content.action} size="lg">
            {content.buttonText}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
