import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Loader2 } from "lucide-react";
import { useGuestAuth } from "@/hooks/useGuestAuth";
import { useGameSpins, type SpinResult } from "@/hooks/useGameSpins";
import { LuckyWheel } from "@/components/games/LuckyWheel";
import { GameResult } from "@/components/games/GameResult";
import { MemoryGame } from "@/components/games/MemoryGame";
import { QuizGame } from "@/components/games/QuizGame";
import { HotelLayout, HotelPageHeader, FONTE_TITULO } from "@/components/hotel/HotelLayout";
import { toast } from "sonner";

const ROXO = "#7C3AED";

const JOGOS = [
  { id: "memoria", emoji: "🧠", fundo: "#DBEAFE", titulo: "Jogo da Memória", texto: "Ache os pares e ganhe pontos" },
  { id: "quiz", emoji: "📝", fundo: "#D1FAE5", titulo: "Quiz da Recreação", texto: "Perguntas sobre a fazenda" },
] as const;

const quando = (iso: string) => {
  const d = new Date(iso);
  const hoje = new Date();
  const ontem = new Date();
  ontem.setDate(hoje.getDate() - 1);
  if (d.toDateString() === hoje.toDateString()) return "hoje";
  if (d.toDateString() === ontem.toDateString()) return "ontem";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
};

const premio = (r: SpinResult) => {
  if (r.result_type === "points") return { emoji: "⭐", texto: `+${r.points_won} pontos` };
  if (r.result_type === "minigame") return { emoji: "🎮", texto: "Jogo bônus liberado" };
  return { emoji: "🙂", texto: "Não foi dessa vez" };
};

const RodaIcone = () => (
  <svg viewBox="0 0 64 64" className="h-16 w-16 shrink-0 drop-shadow" aria-hidden>
    <circle cx="32" cy="32" r="31" fill="#fff" />
    <path d="M32 32 L32 5 A27 27 0 0 1 59 32 Z" fill="#F59E0B" />
    <path d="M32 32 L59 32 A27 27 0 0 1 32 59 Z" fill="#10B981" />
    <path d="M32 32 L32 59 A27 27 0 0 1 5 32 Z" fill="#3B82F6" />
    <path d="M32 32 L5 32 A27 27 0 0 1 32 5 Z" fill="#EF4444" />
  </svg>
);

const Games = () => {
  const navigate = useNavigate();
  const { guest, loading: guestLoading } = useGuestAuth();
  const { availableSpins, spinCount, recentResults, loading: spinsLoading, useSpin: gastarGiro, checkDailySpin, refreshSpins } =
    useGameSpins();

  const [currentResult, setCurrentResult] = useState<SpinResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [jogo, setJogo] = useState<"memoria" | "quiz" | null>(null);
  const [rodaAberta, setRodaAberta] = useState(false);
  const [dailySpinChecked, setDailySpinChecked] = useState(false);

  useEffect(() => {
    if (!guestLoading && !guest) navigate("/guest-auth");
  }, [guest, guestLoading, navigate]);

  useEffect(() => {
    if (guest && !dailySpinChecked) {
      setDailySpinChecked(true);
      checkDailySpin().then((granted) => {
        if (granted) toast.success("🎁 Você ganhou seu giro diário!", { description: "Volte amanhã para ganhar mais!" });
      });
    }
  }, [guest, dailySpinChecked, checkDailySpin]);

  const handleSpin = async (): Promise<SpinResult | null> => {
    if (availableSpins.length === 0) {
      toast.error("Você não tem giros disponíveis!");
      return null;
    }
    const result = await gastarGiro(availableSpins[0].id);
    if (result) {
      setTimeout(() => {
        setCurrentResult(result);
        setShowResult(true);
      }, 5500);
    }
    return result;
  };

  const terminarJogo = () => {
    setJogo(null);
    refreshSpins();
  };

  if (guestLoading || spinsLoading || !guest) {
    return (
      <HotelLayout>
        <HotelPageHeader title="Jogos" back="/recreacao" cor={ROXO} />
        <div className="flex justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-[#7C3AED]" />
        </div>
      </HotelLayout>
    );
  }

  return (
    <HotelLayout>
      <HotelPageHeader title="Jogos" subtitle="Jogue, ganhe giros e concorra a prêmios." back="/recreacao" cor={ROXO} />

      <div className="space-y-5 px-4 pt-4">
        {jogo === "memoria" ? (
          <MemoryGame onComplete={terminarJogo} onClose={() => setJogo(null)} />
        ) : jogo === "quiz" ? (
          <QuizGame onComplete={terminarJogo} onClose={() => setJogo(null)} />
        ) : (
          <>
            {/* Roda da Sorte */}
            <section
              className="rounded-[20px] p-4 shadow-[0_2px_10px_rgba(20,40,30,0.07)]"
              style={{ background: "linear-gradient(135deg,#FFF4E0 0%,#FFFFFF 100%)" }}
            >
              <div className="flex items-center gap-4">
                <RodaIcone />
                <div>
                  <h2 className="text-[22px] font-extrabold leading-tight" style={FONTE_TITULO}>
                    Roda da Sorte
                  </h2>
                  <p className="text-[15px] text-[#5B6B60]">
                    {spinCount > 0 ? (
                      <>
                        Você tem <b className="text-[#1D2A22]">{spinCount} {spinCount === 1 ? "giro" : "giros"}</b> para usar
                      </>
                    ) : (
                      "Sem giros no momento"
                    )}
                  </p>
                </div>
              </div>

              {rodaAberta ? (
                <div className="mt-3 flex justify-center">
                  <LuckyWheel onSpin={handleSpin} disabled={spinCount === 0} spinCount={spinCount} />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setRodaAberta(true)}
                  className="mt-4 flex h-12 w-full items-center justify-center rounded-2xl bg-[#F2B13B] text-[17px] font-extrabold text-[#1D2A22]"
                >
                  🎰 {spinCount > 0 ? "Girar a roda" : "Ver a roda"}
                </button>
              )}
              <p className="mt-3 text-sm text-[#5B6B60]">
                Ganhe giros fazendo check-in nas atividades, avaliando e jogando. Todo dia tem um giro grátis.
              </p>
            </section>

            {/* Lista de jogos */}
            <section>
              <h2 className="mb-2 text-xl font-extrabold" style={FONTE_TITULO}>
                Jogos
              </h2>
              <div className="space-y-3">
                {JOGOS.map((j) => (
                  <button
                    key={j.id}
                    type="button"
                    onClick={() => setJogo(j.id)}
                    className="flex w-full items-center gap-3 rounded-[20px] bg-white p-3 text-left shadow-[0_2px_10px_rgba(20,40,30,0.07)]"
                  >
                    <span
                      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-3xl"
                      style={{ background: j.fundo }}
                      aria-hidden
                    >
                      {j.emoji}
                    </span>
                    <span className="flex-1">
                      <span className="block text-[18px] font-extrabold leading-tight" style={FONTE_TITULO}>
                        {j.titulo}
                      </span>
                      <span className="block text-sm text-[#5B6B60]">{j.texto}</span>
                    </span>
                    <span className="flex items-center text-sm font-extrabold text-[#1F4D3A]">
                      Jogar <ChevronRight className="h-4 w-4" />
                    </span>
                  </button>
                ))}
                <div className="flex w-full items-center gap-3 rounded-[20px] bg-white p-3 opacity-60">
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#EEF1EC] text-3xl" aria-hidden>
                    🔤
                  </span>
                  <span>
                    <span className="block text-[18px] font-extrabold leading-tight text-[#5B6B60]" style={FONTE_TITULO}>
                      Caça-Palavras
                    </span>
                    <span className="block text-sm text-[#5B6B60]">Em breve</span>
                  </span>
                </div>
              </div>
            </section>

            {/* Prêmios */}
            <section className="rounded-[20px] bg-white p-4 shadow-[0_2px_10px_rgba(20,40,30,0.07)]">
              <h2 className="text-lg font-extrabold" style={FONTE_TITULO}>
                Meus prêmios
              </h2>
              {recentResults.length === 0 ? (
                <p className="mt-1 text-sm text-[#5B6B60]">Você ainda não girou a roda. Faça o seu primeiro giro!</p>
              ) : (
                <>
                  <ul className="mt-1 divide-y divide-[#E1E6DE]">
                    {recentResults.slice(0, 5).map((r) => {
                      const p = premio(r);
                      return (
                        <li key={r.id} className="flex items-center gap-2 py-2.5">
                          <span aria-hidden>{p.emoji}</span>
                          <span className="flex-1 text-[15px]">{p.texto}</span>
                          <span className="text-xs text-[#5B6B60]">{quando(r.created_at)}</span>
                        </li>
                      );
                    })}
                  </ul>
                  <p className="mt-1 text-sm text-[#5B6B60]">Os pontos já entram no seu total.</p>
                </>
              )}
            </section>
          </>
        )}
      </div>

      <GameResult
        result={currentResult}
        open={showResult}
        onClose={() => {
          setShowResult(false);
          setCurrentResult(null);
        }}
        onPlayMiniGame={() => {
          setShowResult(false);
          setJogo("memoria");
        }}
      />
    </HotelLayout>
  );
};

export default Games;
