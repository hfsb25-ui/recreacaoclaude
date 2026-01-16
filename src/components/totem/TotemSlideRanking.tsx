import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Medal, Star } from "lucide-react";

interface RankingGuest {
  id: string;
  name: string;
  room_number: string;
  total_points: number;
  current_level: number;
}

interface Level {
  level_number: number;
  name: string;
  badge_emoji: string;
}

interface TotemSlideRankingProps {
  isActive: boolean;
}

export const TotemSlideRanking = ({ isActive }: TotemSlideRankingProps) => {
  const [guests, setGuests] = useState<RankingGuest[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const [guestsRes, levelsRes] = await Promise.all([
        supabase
          .from("guests")
          .select("*")
          .order("total_points", { ascending: false })
          .limit(2),
        supabase.from("levels").select("*"),
      ]);

      if (guestsRes.data) setGuests(guestsRes.data);
      if (levelsRes.data) setLevels(levelsRes.data);
      setLoading(false);
    };

    fetchData();
    const interval = setInterval(fetchData, 300000);
    return () => clearInterval(interval);
  }, []);

  const getLevelInfo = (levelNumber: number) => {
    return levels.find((l) => l.level_number === levelNumber);
  };

  const getMedalStyle = (position: number) => {
    switch (position) {
      case 1:
        return {
          bg: "bg-gradient-to-br from-yellow-400 to-amber-500",
          text: "text-amber-900",
          glow: "shadow-lg shadow-yellow-400/50",
          size: "text-6xl",
          emoji: "🥇",
        };
      case 2:
        return {
          bg: "bg-gradient-to-br from-gray-300 to-gray-400",
          text: "text-gray-800",
          glow: "shadow-lg shadow-gray-400/50",
          size: "text-5xl",
          emoji: "🥈",
        };
      case 3:
        return {
          bg: "bg-gradient-to-br from-amber-600 to-amber-700",
          text: "text-amber-100",
          glow: "shadow-lg shadow-amber-600/50",
          size: "text-4xl",
          emoji: "🥉",
        };
      default:
        return {
          bg: "bg-muted",
          text: "text-muted-foreground",
          glow: "",
          size: "text-3xl",
          emoji: "",
        };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse text-2xl text-muted-foreground">
          Carregando ranking...
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden items-center justify-center">
      {/* Header */}
      <div className="text-center mb-6 md:mb-8 lg:mb-10 flex-shrink-0">
        <div className="inline-flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
          <Trophy className="w-10 h-10 md:w-12 md:h-12 lg:w-16 lg:h-16 text-primary" />
          <h2 className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-foreground">
            Ranking Semanal
          </h2>
          <Trophy className="w-10 h-10 md:w-12 md:h-12 lg:w-16 lg:h-16 text-primary" />
        </div>
        <p className="text-xl md:text-2xl lg:text-3xl text-muted-foreground">
          Top 2 hóspedes mais participativos
        </p>
      </div>

      {/* Podium for Top 2 */}
      {guests.length >= 2 && (
        <div className="flex justify-center items-end gap-6 md:gap-8 lg:gap-12 flex-shrink-0">
          {/* 2nd Place */}
          <div className="flex flex-col items-center">
            <div className="text-5xl md:text-6xl lg:text-7xl mb-2 md:mb-3">🥈</div>
            <div className="bg-gradient-to-br from-gray-300 to-gray-400 rounded-t-2xl p-4 md:p-6 lg:p-8 w-40 md:w-52 lg:w-64 h-32 md:h-40 lg:h-48 flex flex-col items-center justify-center shadow-lg">
              <p className="font-bold text-gray-800 text-xl md:text-2xl lg:text-3xl truncate max-w-full">
                {guests[1].name}
              </p>
              <p className="text-gray-600 text-sm md:text-base lg:text-lg">Quarto {guests[1].room_number}</p>
              <p className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-800 mt-2 md:mt-3">
                {guests[1].total_points} pts
              </p>
            </div>
          </div>

          {/* 1st Place */}
          <div className="flex flex-col items-center">
            <div className="text-6xl md:text-7xl lg:text-8xl mb-2 md:mb-3 animate-bounce">🥇</div>
            <div className="bg-gradient-to-br from-yellow-400 to-amber-500 rounded-t-2xl p-4 md:p-6 lg:p-8 w-48 md:w-64 lg:w-80 h-40 md:h-48 lg:h-56 flex flex-col items-center justify-center shadow-xl shadow-yellow-400/50">
              <p className="font-bold text-amber-900 text-2xl md:text-3xl lg:text-4xl truncate max-w-full">
                {guests[0].name}
              </p>
              <p className="text-amber-700 text-sm md:text-base lg:text-lg">Quarto {guests[0].room_number}</p>
              <p className="text-3xl md:text-4xl lg:text-5xl font-bold text-amber-900 mt-2 md:mt-3">
                {guests[0].total_points} pts
              </p>
            </div>
          </div>
        </div>
      )}

      {guests.length === 1 && (
        <div className="flex justify-center items-end">
          <div className="flex flex-col items-center">
            <div className="text-6xl md:text-7xl lg:text-8xl mb-2 md:mb-3 animate-bounce">🥇</div>
            <div className="bg-gradient-to-br from-yellow-400 to-amber-500 rounded-t-2xl p-4 md:p-6 lg:p-8 w-48 md:w-64 lg:w-80 h-40 md:h-48 lg:h-56 flex flex-col items-center justify-center shadow-xl shadow-yellow-400/50">
              <p className="font-bold text-amber-900 text-2xl md:text-3xl lg:text-4xl truncate max-w-full">
                {guests[0].name}
              </p>
              <p className="text-amber-700 text-sm md:text-base lg:text-lg">Quarto {guests[0].room_number}</p>
              <p className="text-3xl md:text-4xl lg:text-5xl font-bold text-amber-900 mt-2 md:mt-3">
                {guests[0].total_points} pts
              </p>
            </div>
          </div>
        </div>
      )}

      {guests.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xl md:text-2xl lg:text-3xl text-muted-foreground">
            Nenhum participante ainda
          </p>
        </div>
      )}

      {/* Call to action */}
      <div className="mt-6 md:mt-8 lg:mt-10 text-center flex-shrink-0">
        <p className="text-lg md:text-xl lg:text-2xl text-muted-foreground">
          <Star className="inline w-5 h-5 md:w-6 md:h-6 text-primary mr-2" />
          Participe das atividades e ganhe pontos!
          <Star className="inline w-5 h-5 md:w-6 md:h-6 text-primary ml-2" />
        </p>
      </div>
    </div>
  );
};
