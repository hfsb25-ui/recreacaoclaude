import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useGuestAuth } from "@/hooks/useGuestAuth";
import { toast } from "sonner";

interface QuizGameProps {
  onComplete: (points: number) => void;
  onClose: () => void;
}

interface QuizQuestion {
  id: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
}

interface ShuffledQuestion {
  question: string;
  options: { label: string; value: string }[];
  correctValue: string;
}

const POINTS_PER_CORRECT = 10;
const BONUS_ALL_CORRECT = 20;
const TIME_PER_QUESTION = 15;
const NUM_QUESTIONS = 5;

function shuffleOptions(q: QuizQuestion): ShuffledQuestion {
  const options = [
    { label: q.option_a, value: "a" },
    { label: q.option_b, value: "b" },
    { label: q.option_c, value: "c" },
    { label: q.option_d, value: "d" },
  ].sort(() => Math.random() - 0.5);

  return {
    question: q.question,
    options,
    correctValue: q.correct_option,
  };
}

export const QuizGame = ({ onComplete, onClose }: QuizGameProps) => {
  const { guest, refreshGuest } = useGuestAuth();
  const [questions, setQuestions] = useState<ShuffledQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIME_PER_QUESTION);
  const [isComplete, setIsComplete] = useState(false);
  const [earnedPoints, setEarnedPoints] = useState(0);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [startTime] = useState(Date.now());

  // Fetch questions
  useEffect(() => {
    const fetchQuestions = async () => {
      const { data, error } = await supabase
        .from("quiz_questions")
        .select("*")
        .eq("is_active", true);

      if (error || !data || data.length === 0) {
        toast.error("Nenhuma pergunta disponível no momento.");
        onClose();
        return;
      }

      // Shuffle and pick N questions
      const shuffled = data
        .sort(() => Math.random() - 0.5)
        .slice(0, NUM_QUESTIONS)
        .map(shuffleOptions);

      setQuestions(shuffled);
      setLoadingQuestions(false);
    };

    fetchQuestions();
  }, [onClose]);

  // Timer
  useEffect(() => {
    if (loadingQuestions || isComplete || isAnswered) return;

    if (timeLeft <= 0) {
      handleTimeout();
      return;
    }

    const timer = setTimeout(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [timeLeft, loadingQuestions, isComplete, isAnswered]);

  const handleTimeout = useCallback(() => {
    setIsAnswered(true);
    setSelectedAnswer(null);
    // Auto advance after showing correct answer
    setTimeout(() => advanceQuestion(), 1500);
  }, [currentIndex, questions.length]);

  const handleAnswer = (value: string) => {
    if (isAnswered) return;

    setSelectedAnswer(value);
    setIsAnswered(true);

    const current = questions[currentIndex];
    if (value === current.correctValue) {
      setCorrectCount((prev) => prev + 1);
    }

    setTimeout(() => advanceQuestion(), 1500);
  };

  const advanceQuestion = () => {
    if (currentIndex + 1 >= questions.length) {
      finishGame();
    } else {
      setCurrentIndex((prev) => prev + 1);
      setSelectedAnswer(null);
      setIsAnswered(false);
      setTimeLeft(TIME_PER_QUESTION);
    }
  };

  const finishGame = async () => {
    const finalCorrect = correctCount + (selectedAnswer === questions[currentIndex]?.correctValue ? 1 : 0);
    // Recalculate since state may not have updated yet
    const actualCorrect = (() => {
      let count = correctCount;
      if (selectedAnswer === questions[currentIndex]?.correctValue) {
        count++;
      }
      return count;
    })();

    const basePoints = actualCorrect * POINTS_PER_CORRECT;
    const bonus = actualCorrect === questions.length ? BONUS_ALL_CORRECT : 0;
    const totalPoints = basePoints + bonus;

    setEarnedPoints(totalPoints);
    setCorrectCount(actualCorrect);
    setIsComplete(true);

    if (guest?.id && totalPoints > 0) {
      try {
        const completionTime = Date.now() - startTime;

        await supabase.from("minigame_results").insert({
          guest_id: guest.id,
          game_type: "quiz",
          score: actualCorrect,
          points_earned: totalPoints,
          completed_in_ms: completionTime,
        });

        await supabase
          .from("guests")
          .update({ total_points: (guest.total_points || 0) + totalPoints })
          .eq("id", guest.id);

        await refreshGuest();
        toast.success(`+${totalPoints} pontos adicionados!`);
      } catch (error) {
        console.error("Error saving quiz result:", error);
      }
    }
  };

  if (loadingQuestions) {
    return (
      <Card className="p-6 text-center">
        <p className="text-muted-foreground">Carregando perguntas...</p>
      </Card>
    );
  }

  if (isComplete) {
    return (
      <Card className="p-6 text-center space-y-6">
        <div className="text-6xl">
          {correctCount === questions.length ? "🏆" : correctCount >= questions.length / 2 ? "⭐" : "📝"}
        </div>
        <h2 className="text-2xl font-bold text-primary">Quiz Finalizado!</h2>
        <div className="space-y-2">
          <p className="text-lg">
            Acertos: <span className="font-bold">{correctCount}</span> de{" "}
            <span className="font-bold">{questions.length}</span>
          </p>
          <p className="text-lg">
            Pontos base: <span className="font-bold">{correctCount * POINTS_PER_CORRECT}</span>
          </p>
          {correctCount === questions.length && (
            <p className="text-lg text-orange-500">
              Bônus perfeito: <span className="font-bold">+{BONUS_ALL_CORRECT} pts</span>
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

  const current = questions[currentIndex];
  const progressPercent = ((currentIndex) / questions.length) * 100;
  const timerPercent = (timeLeft / TIME_PER_QUESTION) * 100;

  return (
    <Card className="p-4 sm:p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-lg font-bold">📝 Quiz da Recreação</h2>
          <p className="text-sm text-muted-foreground">
            Pergunta {currentIndex + 1} de {questions.length}
          </p>
        </div>
        <div className="text-right">
          <p className={`text-2xl font-mono font-bold ${timeLeft <= 5 ? "text-destructive animate-pulse" : "text-primary"}`}>
            {timeLeft}s
          </p>
          <p className="text-xs text-muted-foreground">
            Acertos: {correctCount}
          </p>
        </div>
      </div>

      {/* Progress */}
      <Progress value={progressPercent} className="mb-2 h-2" />
      
      {/* Timer bar */}
      <div className="w-full bg-muted rounded-full h-1.5 mb-6">
        <div
          className={`h-1.5 rounded-full transition-all duration-1000 ${
            timeLeft <= 5 ? "bg-destructive" : "bg-primary"
          }`}
          style={{ width: `${timerPercent}%` }}
        />
      </div>

      {/* Question */}
      <div className="bg-muted/50 rounded-lg p-4 mb-6">
        <p className="text-lg font-medium text-center">{current.question}</p>
      </div>

      {/* Options */}
      <div className="space-y-3 mb-4">
        {current.options.map((option, idx) => {
          const isCorrect = option.value === current.correctValue;
          const isSelected = selectedAnswer === option.value;
          const letters = ["A", "B", "C", "D"];

          let btnClass = "w-full justify-start h-auto py-3 px-4 text-left transition-all ";

          if (isAnswered) {
            if (isCorrect) {
              btnClass += "bg-green-500/20 border-green-500 text-green-700 dark:text-green-400";
            } else if (isSelected && !isCorrect) {
              btnClass += "bg-destructive/20 border-destructive text-destructive";
            } else {
              btnClass += "opacity-50";
            }
          }

          return (
            <Button
              key={option.value}
              variant="outline"
              className={btnClass}
              onClick={() => handleAnswer(option.value)}
              disabled={isAnswered}
            >
              <span className="font-bold mr-3 text-primary">{letters[idx]}</span>
              <span className="flex-1">{option.label}</span>
              {isAnswered && isCorrect && <span className="ml-2">✅</span>}
              {isAnswered && isSelected && !isCorrect && <span className="ml-2">❌</span>}
            </Button>
          );
        })}
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center">
        <p className="text-xs text-muted-foreground">
          +{POINTS_PER_CORRECT} pts/acerto • +{BONUS_ALL_CORRECT} pts bônus (se 100%)
        </p>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Sair
        </Button>
      </div>
    </Card>
  );
};
