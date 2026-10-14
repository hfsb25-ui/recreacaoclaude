import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, List } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { HotelLayout, FONTE_TITULO } from "@/components/hotel/HotelLayout";
import { getLocalDateString } from "@/lib/utils";
import { corClara, emojiDaFaixa } from "@/lib/faixas";
import { describeWeather, fetchForecast, type CurrentWeather } from "@/lib/weather";

interface AgeGroup {
  id: string;
  name: string;
  color: string;
  sort_order: number;
  emoji?: string | null;
}

interface Atividade {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  age_group_id: string;
  is_master: boolean;
}

const hm = (t: string) => t.slice(0, 5);
const minutos = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};
const agoraMin = () => {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
};

const DIAS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

/** Programação do dia: faixas etárias cadastradas, com a próxima atividade de cada uma. */
const Schedule = () => {
  const navigate = useNavigate();
  const [faixas, setFaixas] = useState<AgeGroup[]>([]);
  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [tempo, setTempo] = useState<CurrentWeather | null>(null);
  const [verTudo, setVerTudo] = useState(false);
  const [agora, setAgora] = useState(agoraMin());

  useEffect(() => {
    const t = setInterval(() => setAgora(agoraMin()), 60000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    (async () => {
      const [{ data: g }, { data: a }] = await Promise.all([
        supabase.from("age_groups").select("*").eq("is_active", true).order("sort_order", { ascending: true }),
        supabase
          .from("activities")
          .select("id, name, start_time, end_time, age_group_id, is_master")
          .eq("activity_date", getLocalDateString())
          .order("start_time", { ascending: true }),
      ]);
      setFaixas((g as AgeGroup[]) ?? []);
      setAtividades((a as Atividade[]) ?? []);
      setCarregando(false);

      const { data: cfg } = await supabase
        .from("site_settings")
        .select("weather_latitude, weather_longitude")
        .eq("id", "00000000-0000-0000-0000-000000000001")
        .maybeSingle();
      if (cfg?.weather_latitude && cfg?.weather_longitude) {
        try {
          setTempo((await fetchForecast(cfg.weather_latitude, cfg.weather_longitude, 1)).current);
        } catch {
          // sem clima
        }
      }
    })();
  }, []);

  const faixaPorId = useMemo(() => Object.fromEntries(faixas.map((f) => [f.id, f])), [faixas]);

  const daFaixa = (id: string) => atividades.filter((a) => a.age_group_id === id || a.is_master);

  const agoraAcontecendo = atividades.find((a) => minutos(a.start_time) <= agora && agora < minutos(a.end_time));

  const hoje = new Date();
  const dataLabel = `${DIAS[hoje.getDay()]}, ${hoje.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}`;
  const clima = tempo ? describeWeather(tempo.weatherCode, tempo.isDay) : null;

  const faixaDoAgora = agoraAcontecendo
    ? agoraAcontecendo.is_master
      ? null
      : faixaPorId[agoraAcontecendo.age_group_id]
    : null;

  return (
    <HotelLayout>
      <header className="flex items-center justify-between rounded-b-[28px] bg-[#1F4D3A] px-5 pb-5 pt-5 text-white">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate("/recreacao")}
            aria-label="Voltar"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <div className="flex flex-col">
            <h1 className="text-[26px] font-extrabold leading-none" style={FONTE_TITULO}>
              Programação
            </h1>
            <span className="text-sm text-white/90">Hoje · {dataLabel}</span>
          </div>
        </div>
        {tempo && clima && (
          <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-sm font-extrabold">
            <clima.Icon className="h-[18px] w-[18px] text-[#F2B13B]" />
            {Math.round(tempo.temperature)}°
          </span>
        )}
      </header>

      <main className="flex flex-col gap-4 px-5 pb-6 pt-[18px]">
        {agoraAcontecendo && (
          <Link
            to={`/activities/${agoraAcontecendo.is_master ? faixas[0]?.id ?? "" : agoraAcontecendo.age_group_id}`}
            className="flex items-center gap-3 rounded-[20px] bg-[#1D2A22] p-4 text-white"
          >
            <span className="relative flex h-3 w-3 shrink-0">
              <span className="absolute inset-0 animate-ping rounded-full bg-[#4ADE80] opacity-60" />
              <span className="relative h-3 w-3 rounded-full bg-[#4ADE80]" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-xs font-extrabold uppercase tracking-wider text-[#A7F3C0]">Acontecendo agora</span>
              <span className="truncate text-lg font-bold leading-tight" style={FONTE_TITULO}>
                {agoraAcontecendo.name}
              </span>
              <span className="text-[13px] text-white/85">
                {faixaDoAgora ? faixaDoAgora.name : "Todas as idades"} · até {hm(agoraAcontecendo.end_time)}
              </span>
            </span>
            <span className="shrink-0 rounded-xl bg-[#F2B13B] px-3 py-2 text-sm font-extrabold text-[#3A2600]">Check-in</span>
          </Link>
        )}

        <section aria-labelledby="quem" className="flex flex-col gap-3">
          <h2 id="quem" className="text-xl font-bold" style={FONTE_TITULO}>
            Para quem é?
          </h2>

          {carregando && <p className="py-6 text-center text-[#5B6B60]">Carregando…</p>}
          {!carregando && faixas.length === 0 && (
            <p className="rounded-[20px] bg-white p-6 text-center text-[#5B6B60]">Nenhuma faixa etária cadastrada.</p>
          )}

          {faixas.map((f) => {
            const lista = daFaixa(f.id);
            // Mostra primeiro a próxima atividade da própria faixa; as "para todas as idades" já aparecem no destaque
            const proxima =
              lista.find((a) => !a.is_master && minutos(a.end_time) > agora) ??
              lista.find((a) => minutos(a.end_time) > agora);
            const emAndamento = proxima && minutos(proxima.start_time) <= agora;
            const falta = proxima ? minutos(proxima.start_time) - agora : null;
            const logo = falta !== null && falta > 0 && falta <= 30;
            return (
              <Link
                key={f.id}
                to={`/activities/${f.id}`}
                className="relative flex flex-col gap-2.5 overflow-hidden rounded-[22px] bg-white p-4 pl-5 shadow-[0_2px_10px_rgba(20,40,30,0.07)]"
              >
                <span aria-hidden="true" className="absolute inset-y-0 left-0 w-2" style={{ background: f.color }} />
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] text-[30px]"
                    style={{ background: corClara(f.color) }}
                  >
                    {emojiDaFaixa(f.name, f.emoji)}
                  </span>
                  <span className="flex-1 text-[21px] font-extrabold leading-tight" style={FONTE_TITULO}>
                    {f.name}
                  </span>
                  <span
                    className="shrink-0 rounded-full px-2.5 py-1 text-[13px] font-extrabold text-[#1D2A22]"
                    style={{ background: corClara(f.color, 0.22) }}
                  >
                    {lista.length} hoje
                  </span>
                </div>
                {proxima ? (
                  <div
                    className={`flex items-center gap-2.5 rounded-[14px] px-3 py-2.5 text-sm ${
                      emAndamento ? "bg-[#E3F2E8]" : logo ? "bg-[#FFF4DF]" : "bg-[#F4F6F0]"
                    }`}
                  >
                    <span
                      className={`font-extrabold ${emAndamento ? "text-[#1E6B3E]" : logo ? "text-[#8A5A00]" : "text-[#5B6B60]"}`}
                    >
                      {emAndamento ? "Agora" : logo ? `Em ${falta} min` : "Próxima"}
                    </span>
                    <b className="text-[17px]" style={FONTE_TITULO}>
                      {hm(proxima.start_time)}
                    </b>
                    <span className="min-w-0 flex-1 truncate">{proxima.name}</span>
                  </div>
                ) : (
                  <div className="rounded-[14px] bg-[#F4F6F0] px-3 py-2.5 text-sm text-[#5B6B60]">
                    {lista.length ? "As atividades de hoje já terminaram" : "Sem atividades hoje"}
                  </div>
                )}
              </Link>
            );
          })}
        </section>

        {atividades.length > 0 && (
          <section className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => setVerTudo((v) => !v)}
              aria-expanded={verTudo}
              className="flex items-center justify-between rounded-[18px] bg-white p-4 font-extrabold shadow-[0_2px_8px_rgba(20,40,30,0.06)]"
            >
              <span className="flex items-center gap-2.5">
                <List className="h-[22px] w-[22px] text-[#1F4D3A]" />
                {verTudo ? "Esconder a lista" : "Ver toda a programação de hoje"}
              </span>
              <ChevronRight className={`h-5 w-5 text-[#5B6B60] transition-transform ${verTudo ? "rotate-90" : ""}`} />
            </button>

            {verTudo && (
              <ol className="flex flex-col rounded-[18px] bg-white shadow-[0_2px_8px_rgba(20,40,30,0.06)]">
                {atividades.map((a, i) => {
                  const f = faixaPorId[a.age_group_id];
                  const passou = minutos(a.end_time) <= agora;
                  return (
                    <li
                      key={a.id}
                      className={`flex items-center gap-3 px-4 py-3 ${i < atividades.length - 1 ? "border-b border-[#E6EAE3]" : ""} ${
                        passou ? "opacity-50" : ""
                      }`}
                    >
                      <span className="w-12 shrink-0 text-[17px] font-extrabold" style={FONTE_TITULO}>
                        {hm(a.start_time)}
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate font-bold">{a.name}</span>
                        <span className="flex items-center gap-1.5 text-[13px] text-[#5B6B60]">
                          <span
                            aria-hidden="true"
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ background: a.is_master ? "#1F4D3A" : f?.color ?? "#9DB0A2" }}
                          />
                          {a.is_master ? "Todas as idades" : f?.name ?? "Recreação"} · até {hm(a.end_time)}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        )}
      </main>
    </HotelLayout>
  );
};

export default Schedule;
