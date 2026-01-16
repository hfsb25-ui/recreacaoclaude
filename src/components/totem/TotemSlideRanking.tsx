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
          .limit(10),
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
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="text-center mb-4 md:mb-6 flex-shrink-0">
        <div className="inline-flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
          <Trophy className="w-8 h-8 md:w-10 md:h-10 lg:w-12 lg:h-12 text-primary" />
          <h2 className="text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold text-foreground">
            Ranking Semanal
          </h2>
          <Trophy className="w-8 h-8 md:w-10 md:h-10 lg:w-12 lg:h-12 text-primary" />
        </div>
        <p className="text-lg md:text-xl lg:text-2xl text-muted-foreground">
          Top 10 hóspedes mais participativos
        </p>
      </div>

      {/* Podium for Top 3 */}
      {guests.length >= 3 && (
        <div className="flex justify-center items-end gap-2 md:gap-3 lg:gap-4 mb-4 md:mb-6 flex-shrink-0">
          {/* 2nd Place */}
          <div className="flex flex-col items-center">
            <div className="text-4xl md:text-5xl lg:text-6xl mb-1 md:mb-2">🥈</div>
            <div className="bg-gradient-to-br from-gray-300 to-gray-400 rounded-t-xl md:rounded-t-2xl p-3 md:p-4 lg:p-5 w-32 md:w-40 lg:w-48 h-24 md:h-28 lg:h-32 flex flex-col items-center justify-center">
              <p className="font-bold text-gray-800 text-base md:text-lg lg:text-xl truncate max-w-full">
                {guests[1].name}
              </p>
              <p className="text-gray-600 text-xs md:text-sm">Quarto {guests[1].room_number}</p>
              <p className="text-lg md:text-xl lg:text-2xl font-bold text-gray-800 mt-1 md:mt-2">
                {guests[1].total_points} pts
              </p>
            </div>
          </div>

          {/* 1st Place */}
          <div className="flex flex-col items-center">
            <div className="text-5xl md:text-6xl lg:text-7xl mb-1 md:mb-2 animate-bounce">🥇</div>
            <div className="bg-gradient-to-br from-yellow-400 to-amber-500 rounded-t-xl md:rounded-t-2xl p-3 md:p-4 lg:p-5 w-36 md:w-48 lg:w-56 h-28 md:h-32 lg:h-36 flex flex-col items-center justify-center shadow-lg shadow-yellow-400/50">
              <p className="font-bold text-amber-900 text-lg md:text-xl lg:text-2xl truncate max-w-full">
                {guests[0].name}
              </p>
              <p className="text-amber-700 text-xs md:text-sm">Quarto {guests[0].room_number}</p>
              <p className="text-xl md:text-2xl lg:text-3xl font-bold text-amber-900 mt-1 md:mt-2">
                {guests[0].total_points} pts
              </p>
            </div>
          </div>

          {/* 3rd Place */}
          <div className="flex flex-col items-center">
            <div className="text-3xl md:text-4xl lg:text-5xl mb-1 md:mb-2">🥉</div>
            <div className="bg-gradient-to-br from-amber-600 to-amber-700 rounded-t-xl md:rounded-t-2xl p-3 md:p-4 lg:p-5 w-28 md:w-36 lg:w-44 h-20 md:h-24 lg:h-28 flex flex-col items-center justify-center">
              <p className="font-bold text-amber-100 text-sm md:text-base lg:text-lg truncate max-w-full">
                {guests[2].name}
              </p>
              <p className="text-amber-200 text-xs md:text-sm">Quarto {guests[2].room_number}</p>
              <p className="text-base md:text-lg lg:text-xl font-bold text-amber-100 mt-1">
                {guests[2].total_points} pts
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Rest of ranking */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <div className="grid grid-cols-2 gap-2 md:gap-3 h-full overflow-y-auto pr-1 md:pr-2">
          {guests.slice(3).map((guest, index) => {
            const level = getLevelInfo(guest.current_level);
            const position = index + 4;

            return (
              <div
                key={guest.id}
                className="flex items-center gap-2 md:gap-3 lg:gap-4 p-2 md:p-3 lg:p-4 bg-card rounded-lg md:rounded-xl border border-border"
              >
                <div className="flex-shrink-0 w-8 h-8 md:w-10 md:h-10 lg:w-12 lg:h-12 rounded-full bg-muted flex items-center justify-center text-lg md:text-xl lg:text-2xl font-bold text-muted-foreground">
                  {position}º
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 md:gap-2">
                    {level && <span className="text-base md:text-lg lg:text-xl">{level.badge_emoji}</span>}
                    <p className="font-bold text-foreground truncate text-sm md:text-base">{guest.name}</p>
                  </div>
                  <p className="text-xs md:text-sm text-muted-foreground">
                    Quarto {guest.room_number}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg md:text-xl lg:text-2xl font-bold text-primary">
                    {guest.total_points}
                  </p>
                  <p className="text-xs text-muted-foreground">pontos</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Call to action */}
      <div className="mt-3 md:mt-4 text-center flex-shrink-0">
        <p className="text-base md:text-lg lg:text-xl text-muted-foreground">
          <Star className="inline w-4 h-4 md:w-5 md:h-5 text-primary mr-1 md:mr-2" />
          Participe das atividades e ganhe pontos!
          <Star className="inline w-4 h-4 md:w-5 md:h-5 text-primary ml-1 md:ml-2" />
        </p>
      </div>
    </div>
  );
};
