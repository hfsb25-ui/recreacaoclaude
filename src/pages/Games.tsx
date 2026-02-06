import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Gamepad2, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useGuestAuth } from "@/hooks/useGuestAuth";
import { useGameSpins, type SpinResult } from "@/hooks/useGameSpins";
import { LuckyWheel } from "@/components/games/LuckyWheel";
import { SpinCounter } from "@/components/games/SpinCounter";
import { RecentPrizes } from "@/components/games/RecentPrizes";
import { GameResult } from "@/components/games/GameResult";
import { MemoryGame } from "@/components/games/MemoryGame";
import { toast } from "sonner";

const Games = () => {
  const navigate = useNavigate();
  const { guest, loading: guestLoading } = useGuestAuth();
  const {
    availableSpins,
    spinCount,
    recentResults,
    loading: spinsLoading,
    useSpin,
    checkDailySpin,
    refreshSpins,
  } = useGameSpins();

  const [currentResult, setCurrentResult] = useState<SpinResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [showMiniGame, setShowMiniGame] = useState(false);
  const [dailySpinChecked, setDailySpinChecked] = useState(false);

  // Redirect if not logged in
  useEffect(() => {
    if (!guestLoading && !guest) {
      navigate("/guest-auth");
    }
  }, [guest, guestLoading, navigate]);

  // Check for daily spin
  useEffect(() => {
    const checkDaily = async () => {
      if (guest && !dailySpinChecked) {
        setDailySpinChecked(true);
        const granted = await checkDailySpin();
        if (granted) {
          toast.success("🎁 Você ganhou seu giro diário!", {
            description: "Volte amanhã para ganhar mais!",
          });
        }
      }
    };
    checkDaily();
  }, [guest, dailySpinChecked, checkDailySpin]);

  const handleSpin = async (): Promise<SpinResult | null> => {
    if (availableSpins.length === 0) {
      toast.error("Você não tem giros disponíveis!");
      return null;
    }

    const spinToUse = availableSpins[0];
    const result = await useSpin(spinToUse.id);

    if (result) {
      // Wait for wheel animation before showing result
      setTimeout(() => {
        setCurrentResult(result);
        setShowResult(true);
      }, 5500);
    }

    return result;
  };

  const handleResultClose = () => {
    setShowResult(false);
    setCurrentResult(null);
  };

  const handlePlayMiniGame = () => {
    setShowResult(false);
    setShowMiniGame(true);
  };

  const handleMiniGameComplete = (points: number) => {
    setShowMiniGame(false);
    refreshSpins();
  };

  if (guestLoading || spinsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--gradient-bg)]">
        <p className="text-foreground text-lg">Carregando jogos...</p>
      </div>
    );
  }

  if (!guest) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[var(--gradient-bg)] p-4 sm:p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div className="flex items-center gap-2 text-primary font-semibold">
            <Gift className="h-5 w-5" />
            <span>{guest.total_points} pts</span>
          </div>
        </div>

        {/* Title */}
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">🎰 Roda da Sorte</h1>
          <p className="text-muted-foreground">Gire a roda e ganhe prêmios!</p>
        </div>

        {/* Spin Counter */}
        <SpinCounter count={spinCount} />

        {/* Mini-game mode */}
        {showMiniGame ? (
          <MemoryGame
            onComplete={handleMiniGameComplete}
            onClose={() => setShowMiniGame(false)}
          />
        ) : (
          <>
            {/* Lucky Wheel */}
            <Card className="p-6 flex justify-center">
              <LuckyWheel
                onSpin={handleSpin}
                disabled={spinCount === 0}
                spinCount={spinCount}
              />
            </Card>

            {/* Mini-Games Section */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Gamepad2 className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Mini-Games</h2>
              </div>
              <div className="grid gap-3">
                <Button
                  variant="outline"
                  className="w-full justify-start h-auto py-4"
                  onClick={() => setShowMiniGame(true)}
                >
                  <span className="text-2xl mr-3">🧠</span>
                  <div className="text-left">
                    <p className="font-medium">Jogo da Memória</p>
                    <p className="text-xs text-muted-foreground">
                      Encontre os pares e ganhe pontos
                    </p>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start h-auto py-4 opacity-50"
                  disabled
                >
                  <span className="text-2xl mr-3">📝</span>
                  <div className="text-left">
                    <p className="font-medium">Quiz da Recreação</p>
                    <p className="text-xs text-muted-foreground">Em breve...</p>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start h-auto py-4 opacity-50"
                  disabled
                >
                  <span className="text-2xl mr-3">🔤</span>
                  <div className="text-left">
                    <p className="font-medium">Caça-Palavras</p>
                    <p className="text-xs text-muted-foreground">Em breve...</p>
                  </div>
                </Button>
              </div>
            </Card>

            {/* Recent Prizes */}
            <RecentPrizes results={recentResults} />
          </>
        )}

        {/* Result Modal */}
        <GameResult
          result={currentResult}
          open={showResult}
          onClose={handleResultClose}
          onPlayMiniGame={handlePlayMiniGame}
        />
      </div>
    </div>
  );
};

export default Games;
