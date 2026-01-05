import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trophy, Star, Sparkles, Gift } from "lucide-react";

interface CelebrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  guestName: string;
  points: number;
}

export const CelebrationModal = ({
  isOpen,
  onClose,
  guestName,
  points,
}: CelebrationModalProps) => {
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md border-0 bg-gradient-to-br from-yellow-400 via-orange-500 to-pink-500 text-white overflow-hidden">
        {/* Animated confetti particles */}
        {showConfetti && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="absolute animate-confetti"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `-10%`,
                  animationDelay: `${Math.random() * 0.5}s`,
                  animationDuration: `${1 + Math.random() * 1}s`,
                }}
              >
                {["🎉", "⭐", "🏆", "✨", "🎊", "💫"][Math.floor(Math.random() * 6)]}
              </div>
            ))}
          </div>
        )}

        <div className="relative z-10 text-center py-6">
          {/* Trophy animation */}
          <div className="relative mx-auto w-24 h-24 mb-6">
            <div className="absolute inset-0 bg-yellow-300/30 rounded-full animate-ping" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Trophy className="w-16 h-16 text-yellow-200 animate-bounce" />
            </div>
            <Sparkles className="absolute -top-2 -right-2 w-8 h-8 text-yellow-200 animate-pulse" />
            <Star className="absolute -bottom-1 -left-2 w-6 h-6 text-yellow-200 animate-pulse" style={{ animationDelay: "0.5s" }} />
          </div>

          {/* Title */}
          <h2 className="text-3xl font-bold mb-2 animate-scale-in">
            🎉 Parabéns!
          </h2>

          {/* Guest name */}
          <p className="text-xl font-semibold mb-4 opacity-90">
            Bem-vindo(a), {guestName}!
          </p>

          {/* Points earned */}
          <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 mb-6 animate-fade-in" style={{ animationDelay: "0.3s" }}>
            <div className="flex items-center justify-center gap-2 mb-2">
              <Gift className="w-6 h-6" />
              <span className="text-lg font-medium">Bônus de Boas-Vindas</span>
            </div>
            <div className="text-5xl font-black">
              +{points}
              <span className="text-2xl ml-2">pontos!</span>
            </div>
          </div>

          {/* Message */}
          <p className="text-sm opacity-80 mb-6">
            Participe das atividades e ganhe ainda mais pontos!
          </p>

          {/* Button */}
          <Button
            onClick={onClose}
            className="bg-white text-orange-600 hover:bg-white/90 font-bold px-8 py-3 text-lg"
          >
            Começar a Jogar! 🚀
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
