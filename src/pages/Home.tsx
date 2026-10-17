import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CalendarDays, ChevronLeft, ChevronRight, LogIn } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useGuestAuth } from "@/hooks/useGuestAuth";
import { HotelLayout, FONTE_TITULO } from "@/components/hotel/HotelLayout";
import { MascoteCorpo } from "@/components/hotel/Mascote";
import { InstallBanner } from "@/components/InstallBanner";
import { getLocalDateString } from "@/lib/utils";
import { describeWeather, fetchForecast, type CurrentWeather } from "@/lib/weather";

interface Lider {
  id: string;
  name: string;
  total_points: number;
}

interface Agora {
  name: string;
  end_time: string;
  age_group_id: string;
  is_master: boolean;
}

const hm = (t: string | null | undefined) => (t ?? "").slice(0, 5);

const familia = (nome: string) => {
  const partes = nome.trim().split(/\s+/);
  return partes.length > 1 ? `Família ${partes[partes.length - 1]}` : nome;
};

const ATALHOS = [
  { to: "/games", emoji: "🎮", fundo: "#EDE9FE", titulo: "Jogos", texto: "Memória, quiz e roleta de prêmios" },
  { to: "/bichinho", emoji: "🐣", fundo: "#FEF3C7", titulo: "Bichinho", texto: "Cresce com cada atividade" },
  { to: "/ranking", emoji: "🏆", fundo: "#DBEAFE", titulo: "Ranking", texto: "Quem está na frente esta semana" },
  { to: "/hall-of-fame", emoji: "⭐", fundo: "#FCE7F3", titulo: "Hall da Fama", texto: "Os campeões de cada semana" },
];

/** Página da Recreação: o "centro" da diversão (pontos, agora, programação, jogos e ranking). */
const Home = () => {
  const navigate = useNavigate();
  const { guest, currentLevel, nextLevel } = useGuestAuth();
  const [lideres, setLideres] = useState<Lider[]>([]);
  const [posicao, setPosicao] = useState<number | null>(null);
  const [giros, setGiros] = useState(0);
  const [agora, setAgora] = useState<Agora | null>(null);
  const [faixas, setFaixas] = useState<Record<string, string>>({});
  const [tempo, setTempo] = useState<CurrentWeather | null>(null);

  useEffect(() => {
    let ativo = true;
    (async () => {
      try {
        const d = new Date();
        const hhmm = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
        const [{ data: top }, { data: acts }, { data: grupos }] = await Promise.all([
          supabase
            .from("guests")
            .select("id, name, total_points")
            .gt("total_points", 0)
            .order("total_points", { ascending: false })
            .limit(3),
          supabase
            .from("activities")
            .select("name, start_time, end_time, age_group_id, is_master")
            .eq("activity_date", getLocalDateString())
            .lte("start_time", hhmm)
            .gt("end_time", hhmm)
            .order("start_time", { ascending: true })
            .limit(1),
          supabase.from("age_groups").select("id, name"),
        ]);
        if (!ativo) return;
        setLideres((top as Lider[]) ?? []);
        setAgora(((acts as Agora[]) ?? [])[0] ?? null);
        setFaixas(Object.fromEntries(((grupos as { id: string; name: string }[]) ?? []).map((g) => [g.id, g.name])));
      } catch (e) {
        console.error("Erro ao carregar a recreação:", e);
      }

      try {
        const { data: cfg } = await supabase
          .from("site_settings")
          .select("weather_latitude, weather_longitude")
          .eq("id", "00000000-0000-0000-0000-000000000001")
          .maybeSingle();
        if (cfg?.weather_latitude && cfg?.weather_longitude) {
          const f = await fetchForecast(cfg.weather_latitude, cfg.weather_longitude, 1);
          if (ativo) setTempo(f.current);
        }
      } catch {
        // sem clima
      }
    })();
    return () => {
      ativo = false;
    };
  }, []);

  useEffect(() => {
    if (!guest?.id) {
      setPosicao(null);
      setGiros(0);
      return;
    }
    (async () => {
      const [{ count: acima }, { count: g }] = await Promise.all([
        supabase.from("guests").select("id", { count: "exact", head: true }).gt("total_points", guest.total_points),
        supabase.from("guest_spins").select("*", { count: "exact", head: true }).eq("guest_id", guest.id).eq("used", false),
      ]);
      setPosicao((acima ?? 0) + 1);
      setGiros(g ?? 0);
    })();
  }, [guest?.id, guest?.total_points]);

  const clima = tempo ? describeWeather(tempo.weatherCode, tempo.isDay) : null;
  const progresso =
    guest && currentLevel && nextLevel
      ? Math.min(100, Math.max(0, ((guest.total_points - currentLevel.min_points) / (nextLevel.min_points - currentLevel.min_points)) * 100))
      : 100;
  const euNoTop = guest && lideres.some((l) => l.id === guest.id);

  return (
    <HotelLayout>
      <header className="relative flex flex-col gap-3.5 rounded-b-[28px] bg-[#F2B13B] px-5 pb-[70px] pt-5 text-[#3A2600]">
        <MascoteCorpo className="absolute bottom-[44px] right-3 h-[118px] w-auto" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate("/")}
              aria-label="Voltar ao início"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white/45"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <h1 className="text-[28px] font-extrabold" style={FONTE_TITULO}>
              Recreação
            </h1>
          </div>
          {tempo && clima && (
            <span className="flex items-center gap-1.5 rounded-full bg-white/50 px-3 py-1.5 text-sm font-extrabold">
              <clima.Icon className="h-[18px] w-[18px]" />
              {Math.round(tempo.temperature)}°
            </span>
          )}
        </div>
        <p className="max-w-[68%] text-[15px] font-bold">Diversão para todas as idades, o dia todo.</p>
      </header>

      <main className="-mt-[52px] flex flex-col gap-4 px-5 pb-6">
        {guest ? (
          <Link
            to="/guest-profile"
            className="flex flex-col gap-2.5 rounded-[22px] bg-white p-4 shadow-[0_8px_24px_rgba(20,40,30,0.10)]"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full bg-[#FFF4DF] text-[28px]">
                {currentLevel?.badge_emoji ?? "🌱"}
              </span>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-xl font-extrabold leading-tight" style={FONTE_TITULO}>
                  {familia(guest.name)}
                </span>
                <span className="text-sm font-bold text-[#5B6B60]">
                  {currentLevel ? `Nível ${currentLevel.level_number}` : "Recreação"}
                  {posicao ? ` · ${posicao}º no ranking` : ""}
                </span>
              </div>
              <span className="shrink-0 text-[22px] font-extrabold text-[#1F4D3A]" style={FONTE_TITULO}>
                {guest.total_points}
                <span className="text-[13px] font-bold text-[#5B6B60]" style={{ fontFamily: "'Nunito', sans-serif" }}>
                  {" "}
                  pts
                </span>
              </span>
            </div>
            <div
              role="progressbar"
              aria-label="Progresso até o próximo nível"
              aria-valuenow={Math.round(progresso)}
              aria-valuemin={0}
              aria-valuemax={100}
              className="h-2.5 overflow-hidden rounded-full bg-[#EEF1EA]"
            >
              <div className="h-full rounded-full bg-[#1F4D3A]" style={{ width: `${progresso}%` }} />
            </div>
            <span className="text-[13px] text-[#5B6B60]">
              {nextLevel
                ? `Faltam ${Math.max(0, nextLevel.min_points - guest.total_points)} pontos para ${nextLevel.name} ${nextLevel.badge_emoji ?? ""} · Faça check-in nas atividades!`
                : "Você chegou ao nível máximo! 🎉"}
            </span>
          </Link>
        ) : (
          <Link
            to="/guest-auth"
            className="flex items-center gap-3 rounded-[22px] bg-white p-4 shadow-[0_8px_24px_rgba(20,40,30,0.10)]"
          >
            <span className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full bg-[#FFF4DF] text-[#8A5A00]">
              <LogIn className="h-6 w-6" />
            </span>
            <span className="flex flex-1 flex-col">
              <span className="text-lg font-extrabold leading-tight" style={FONTE_TITULO}>
                Entre e ganhe 50 pontos
              </span>
              <span className="text-sm text-[#5B6B60]">Faça check-in nas atividades e dispute o ranking</span>
            </span>
            <ChevronRight className="h-5 w-5 text-[#5B6B60]" />
          </Link>
        )}

        {agora && (
          <Link to="/programacao" className="flex items-center gap-3 rounded-[20px] bg-[#1D2A22] p-4 text-white">
            <span className="relative flex h-3 w-3 shrink-0">
              <span className="absolute inset-0 animate-ping rounded-full bg-[#4ADE80] opacity-60" />
              <span className="relative h-3 w-3 rounded-full bg-[#4ADE80]" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-xs font-extrabold uppercase tracking-wider text-[#A7F3C0]">Acontecendo agora</span>
              <span className="truncate text-lg font-bold leading-tight" style={FONTE_TITULO}>
                {agora.name}
              </span>
              <span className="text-[13px] text-white/85">
                {agora.is_master ? "Todas as idades" : faixas[agora.age_group_id] ?? "Recreação"} · até {hm(agora.end_time)}
              </span>
            </span>
          </Link>
        )}

        <Link
          to="/programacao"
          className="flex min-h-[58px] items-center justify-center gap-2.5 rounded-[18px] bg-[#1F4D3A] text-[17px] font-extrabold text-white shadow-[0_6px_16px_rgba(31,77,58,0.25)]"
        >
          <CalendarDays className="h-[22px] w-[22px]" />
          Ver a programação de hoje
        </Link>

        <section aria-labelledby="diversao" className="flex flex-col gap-3">
          <h2 id="diversao" className="text-xl font-bold" style={FONTE_TITULO}>
            Diversão
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {ATALHOS.map((a) => (
              <Link
                key={a.to}
                to={a.to}
                className="relative flex flex-col gap-2 rounded-[20px] bg-white p-3.5 shadow-[0_2px_10px_rgba(20,40,30,0.07)]"
              >
                {a.to === "/games" && giros > 0 && (
                  <span className="absolute right-3 top-3 rounded-full bg-[#F2B13B] px-2 py-0.5 text-xs font-extrabold text-[#3A2600]">
                    {giros} {giros === 1 ? "giro" : "giros"}
                  </span>
                )}
                <span
                  aria-hidden="true"
                  className="flex h-12 w-12 items-center justify-center rounded-2xl text-[26px]"
                  style={{ background: a.fundo }}
                >
                  {a.emoji}
                </span>
                <span className="text-lg font-extrabold leading-tight" style={FONTE_TITULO}>
                  {a.titulo}
                </span>
                <span className="text-[13px] leading-snug text-[#5B6B60]">{a.texto}</span>
              </Link>
            ))}
          </div>
        </section>

        {lideres.length > 0 && (
          <section aria-labelledby="lideres" className="flex flex-col gap-2.5 rounded-[22px] bg-white p-4 shadow-[0_2px_10px_rgba(20,40,30,0.07)]">
            <div className="flex items-baseline justify-between">
              <h2 id="lideres" className="text-xl font-bold" style={FONTE_TITULO}>
                Ranking da semana
              </h2>
              <Link to="/ranking" className="text-sm font-extrabold text-[#1F4D3A] underline">
                Ver todos
              </Link>
            </div>
            <ol className="flex flex-col gap-1">
              {lideres.map((l, i) => {
                const eu = guest?.id === l.id;
                return (
                  <li
                    key={l.id}
                    className={`flex items-center gap-3 rounded-[14px] px-3 py-2.5 ${i === 0 ? "bg-[#FFF4DF]" : ""} ${
                      eu ? "border-2 border-dashed border-[#9DB0A2]" : ""
                    }`}
                  >
                    <span className={`w-7 text-lg font-extrabold ${i === 0 ? "" : "text-[#5B6B60]"}`} style={FONTE_TITULO}>
                      {i + 1}º
                    </span>
                    <span className={`min-w-0 flex-1 truncate ${i === 0 || eu ? "font-extrabold" : "font-bold"}`}>
                      {eu ? "Você · " : ""}
                      {familia(l.name)}
                    </span>
                    <span className="shrink-0 font-extrabold">{l.total_points} pts</span>
                  </li>
                );
              })}
              {guest && !euNoTop && posicao && (
                <li className="flex items-center gap-3 rounded-[14px] border-2 border-dashed border-[#9DB0A2] px-3 py-2.5">
                  <span className="w-7 text-lg font-extrabold" style={FONTE_TITULO}>
                    {posicao}º
                  </span>
                  <span className="min-w-0 flex-1 truncate font-extrabold">Você · {familia(guest.name)}</span>
                  <span className="shrink-0 font-extrabold">{guest.total_points} pts</span>
                </li>
              )}
            </ol>
          </section>
        )}

        <Link to="/mapa" className="flex items-center gap-3 rounded-[18px] bg-white p-4 shadow-[0_2px_8px_rgba(20,40,30,0.06)]">
          <span aria-hidden="true" className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#E7F0EA] text-[22px]">
            🗺️
          </span>
          <span className="flex flex-1 flex-col">
            <span className="font-extrabold">Mapa do hotel</span>
            <span className="text-[13px] text-[#5B6B60]">Onde fica cada atividade</span>
          </span>
          <ChevronRight className="h-5 w-5 text-[#5B6B60]" />
        </Link>
      </main>

      <InstallBanner />
    </HotelLayout>
  );
};

export default Home;
