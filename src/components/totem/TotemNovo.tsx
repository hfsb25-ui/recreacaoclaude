import { useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getLocalDateString } from "@/lib/utils";
import { fetchForecast, describeWeather, type Forecast } from "@/lib/weather";
import { carregarHotelInfo, HOTEL_INFO_PADRAO, type HotelInfo } from "@/hooks/useHotelInfo";
import { coresDistintas, corClara, emojiDaFaixa } from "@/lib/faixas";
import { familia } from "@/lib/familia";
import type { TotemAlert } from "@/components/totem/TotemAlertOverlay";

/* ------------------------------------------------------------------ */
/* Dados                                                               */
/* ------------------------------------------------------------------ */

export interface Faixa {
  id: string;
  name: string;
  color: string;
  emoji?: string | null;
  sort_order: number;
}

export interface Atividade {
  id: string;
  name: string;
  description: string | null;
  start_time: string;
  end_time: string;
  age_group_id: string;
  is_master: boolean;
}

interface Lider {
  id: string;
  name: string;
  total_points: number;
}

interface Anuncio {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
}

interface Periodo {
  start_date: string;
  end_date: string;
}

export interface DadosTotem {
  faixas: Faixa[];
  atividades: Atividade[];
  lideres: Lider[];
  periodo: Periodo | null;
  campeao: { guest_name: string } | null;
  anuncios: Anuncio[];
  alertas: TotemAlert[];
  tempo: Forecast | null;
  hotel: HotelInfo;
}

const db = supabase as unknown as { from: (t: string) => ReturnType<typeof supabase.from> };

/** Busca tudo o que o totem mostra e atualiza sozinho (sem precisar recarregar a TV). */
export const useDadosTotem = (): DadosTotem => {
  const [dados, setDados] = useState<DadosTotem>({
    faixas: [],
    atividades: [],
    lideres: [],
    periodo: null,
    campeao: null,
    anuncios: [],
    alertas: [],
    tempo: null,
    hotel: HOTEL_INFO_PADRAO,
  });

  // Programação, ranking e avisos: a cada minuto
  useEffect(() => {
    let ativo = true;
    const carregar = async () => {
      try {
        const [g, a, l, p, w, an, h] = await Promise.all([
          supabase.from("age_groups").select("*").eq("is_active", true).order("sort_order", { ascending: true }),
          supabase
            .from("activities")
            .select("id, name, description, start_time, end_time, age_group_id, is_master")
            .eq("activity_date", getLocalDateString())
            .order("start_time", { ascending: true }),
          supabase
            .from("guests")
            .select("id, name, total_points")
            .gt("total_points", 0)
            .order("total_points", { ascending: false })
            .limit(7),
          supabase.from("ranking_periods").select("start_date, end_date").eq("is_active", true).maybeSingle(),
          supabase
            .from("ranking_winners")
            .select("guest_name, created_at")
            .eq("final_position", 1)
            .order("created_at", { ascending: false })
            .limit(1),
          supabase.from("announcements").select("id, title, description, image_url").eq("is_active", true).order("sort_order", { ascending: true }),
          carregarHotelInfo(),
        ]);
        if (!ativo) return;
        setDados((d) => ({
          ...d,
          faixas: (g.data as Faixa[]) ?? d.faixas,
          atividades: (a.data as Atividade[]) ?? d.atividades,
          lideres: (l.data as Lider[]) ?? d.lideres,
          periodo: (p.data as Periodo) ?? null,
          campeao: ((w.data as { guest_name: string }[]) ?? [])[0] ?? null,
          anuncios: (an.data as Anuncio[]) ?? d.anuncios,
          hotel: h,
        }));
      } catch (e) {
        console.error("[Totem] Erro ao atualizar dados:", e);
      }
    };
    carregar();
    const t = setInterval(carregar, 60_000);
    return () => {
      ativo = false;
      clearInterval(t);
    };
  }, []);

  // Avisos importantes (alertas do painel): a cada 20 segundos
  useEffect(() => {
    let ativo = true;
    const carregar = async () => {
      try {
        const { data } = await db
          .from("totem_alerts")
          .select("id, title, message, alert_type, duration_seconds, play_sound, expires_at")
          .eq("is_active", true)
          .order("created_at", { ascending: false });
        if (!ativo) return;
        const agora = Date.now();
        const lista = ((data as unknown as (TotemAlert & { expires_at: string | null })[]) ?? []).filter(
          (x) => !x.expires_at || new Date(x.expires_at).getTime() > agora,
        );
        setDados((d) => ({ ...d, alertas: lista }));
      } catch {
        // sem alertas
      }
    };
    carregar();
    const t = setInterval(carregar, 20_000);
    return () => {
      ativo = false;
      clearInterval(t);
    };
  }, []);

  // Tempo: a cada 30 minutos
  useEffect(() => {
    let ativo = true;
    const carregar = async () => {
      try {
        const { data: cfg } = await supabase
          .from("site_settings")
          .select("weather_latitude, weather_longitude")
          .limit(1)
          .maybeSingle();
        if (cfg?.weather_latitude && cfg?.weather_longitude) {
          const f = await fetchForecast(Number(cfg.weather_latitude), Number(cfg.weather_longitude), 6);
          if (ativo) setDados((d) => ({ ...d, tempo: f }));
        }
      } catch {
        // sem clima
      }
    };
    carregar();
    const t = setInterval(carregar, 30 * 60_000);
    return () => {
      ativo = false;
      clearInterval(t);
    };
  }, []);

  return dados;
};

/* ------------------------------------------------------------------ */
/* Ajudantes                                                           */
/* ------------------------------------------------------------------ */

const TITULO = { fontFamily: "'Baloo 2', system-ui, sans-serif" };
const CARD = "rounded-[22px] bg-white shadow-[0_3px_14px_rgba(20,40,30,0.08)]";
const VERDE = "#1F4D3A";
const CINZA = "#5B6B60";

const hm = (t: string) => (t ?? "").slice(0, 5);
const minutos = (t: string) => {
  const [h, m] = (t ?? "0:0").split(":").map(Number);
  return h * 60 + (m || 0);
};

const useAgora = () => {
  const [agora, setAgora] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setAgora(new Date()), 15_000);
    return () => clearInterval(t);
  }, []);
  return agora;
};

/** "Kids (4 a 8 anos)" → { nome: "Kids", idade: "4 a 8 anos" } */
const partesFaixa = (nome: string) => {
  const m = /^(.*?)\s*\((.*)\)\s*$/.exec(nome);
  return m ? { nome: m[1], idade: m[2] } : { nome, idade: "" };
};

/** Emoji grande do tempo a partir do código do Open-Meteo */
export const emojiTempo = (code: number, isDay = true) => {
  if (code === 0) return isDay ? "☀️" : "🌙";
  if (code === 1 || code === 2) return isDay ? "⛅" : "☁️";
  if (code === 3) return "☁️";
  if (code === 45 || code === 48) return "🌫️";
  if (code >= 51 && code <= 57) return "🌦️";
  if (code >= 61 && code <= 67) return "🌧️";
  if (code >= 80 && code <= 82) return "🌧️";
  if (code >= 95) return "⛈️";
  if (code >= 71 && code <= 86) return "❄️";
  return "☁️";
};

const imagemAnuncio = (path: string | null) => {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  return supabase.storage.from("announcements").getPublicUrl(path).data.publicUrl;
};

/** Faixas com cor distinta e emoji, prontas para desenhar. */
const useFaixas = (faixas: Faixa[]) =>
  useMemo(() => {
    const cores = coresDistintas(faixas);
    return faixas.map((f) => ({ ...f, color: cores[f.id] ?? f.color, emojiFinal: emojiDaFaixa(f.name, f.emoji), ...partesFaixa(f.name) }));
  }, [faixas]);

const TituloSlide = ({ titulo, sub }: { titulo: string; sub?: string }) => (
  <div className="flex items-baseline gap-3.5">
    <h1 className="m-0 text-[40px] font-extrabold leading-none" style={TITULO}>
      {titulo}
    </h1>
    {sub && <span className="text-lg font-bold" style={{ color: CINZA }}>{sub}</span>}
  </div>
);

const Vazio = ({ emoji, texto }: { emoji: string; texto: string }) => (
  <div className={`${CARD} flex flex-1 flex-col items-center justify-center gap-3 text-center`}>
    <span className="text-7xl">{emoji}</span>
    <span className="text-3xl font-extrabold" style={TITULO}>
      {texto}
    </span>
  </div>
);

/* ------------------------------------------------------------------ */
/* Telas                                                               */
/* ------------------------------------------------------------------ */

/** Atividade acontecendo agora para a faixa (a da própria faixa primeiro, depois a "para todos"). */
const atividadeAgora = (dados: DadosTotem, faixaId: string, m: number) =>
  dados.atividades.find((a) => a.age_group_id === faixaId && !a.is_master && minutos(a.start_time) <= m && minutos(a.end_time) > m) ??
  dados.atividades.find((a) => a.is_master && minutos(a.start_time) <= m && minutos(a.end_time) > m);

/** Tem alguma atividade acontecendo neste momento? (sem nenhuma, a tela "Acontecendo agora" é pulada) */
export const temAtividadeAgora = (dados: DadosTotem, quando = new Date()) => {
  const m = quando.getHours() * 60 + quando.getMinutes();
  return dados.atividades.some((a) => minutos(a.start_time) <= m && minutos(a.end_time) > m);
};

const SlideAgora = ({ dados }: { dados: DadosTotem }) => {
  const agora = useAgora();
  const faixas = useFaixas(dados.faixas);
  const m = agora.getHours() * 60 + agora.getMinutes();

  // Só as faixas que têm atividade neste momento
  const cartoes = faixas
    .map((f) => ({ f, a: atividadeAgora(dados, f.id, m) }))
    .filter((x): x is { f: (typeof faixas)[number]; a: Atividade } => Boolean(x.a))
    .slice(0, 4);
  return (
    <>
      <TituloSlide titulo="Acontecendo agora" sub="Venha participar!" />
      {cartoes.length === 0 ? (
        <Vazio emoji="🌿" texto="Nenhuma atividade neste momento" />
      ) : (
        <div className="flex min-h-0 flex-1 gap-4">
          {cartoes.map(({ f, a }) => (
            <div key={f.id} className={`${CARD} flex min-w-0 flex-1 flex-col overflow-hidden`}>
              <div className="flex items-center gap-3 px-[18px] py-4" style={{ background: corClara(f.color, 0.18) }}>
                <span className="text-[44px] leading-none">{f.emojiFinal}</span>
                <span className="flex min-w-0 flex-col leading-tight">
                  <span className="truncate text-[26px] font-extrabold" style={{ ...TITULO, color: f.color }}>
                    {f.nome}
                  </span>
                  {f.idade && <span className="text-sm font-bold" style={{ color: CINZA }}>{f.idade}</span>}
                </span>
              </div>
              <div className="flex flex-1 flex-col gap-2 px-[18px] py-4">
                <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-[#1E6B3E] px-3 py-1 text-sm font-extrabold text-white">
                  ● AGORA · até {hm(a.end_time)}
                </span>
                <span className="text-[30px] font-extrabold leading-[1.05]" style={TITULO}>
                  {a.name}
                </span>
                {a.description && (
                  <span className="line-clamp-3 text-[17px] font-bold" style={{ color: CINZA }}>
                    📍 {a.description}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      <div className={`${CARD} flex items-center gap-3.5 bg-[#FFF4E0] px-5 py-3.5`}>
        <span className="text-3xl">⭐</span>
        <span className="text-[19px] font-extrabold">Faça check-in pelo app em cada atividade e ganhe pontos para o ranking da semana!</span>
      </div>
    </>
  );
};

const SlideProgramacao = ({ dados }: { dados: DadosTotem }) => {
  const agora = useAgora();
  const faixas = useFaixas(dados.faixas);
  const m = agora.getHours() * 60 + agora.getMinutes();
  const rolando = (x: Atividade) => minutos(x.start_time) <= m && minutos(x.end_time) > m;
  // Só as faixas com atividade acontecendo agora, e só essas atividades
  const colunas = faixas
    .map((f) => ({ f, lista: dados.atividades.filter((x) => (x.age_group_id === f.id || x.is_master) && rolando(x)) }))
    .filter((c) => c.lista.length > 0)
    .slice(0, 4);
  return (
    <>
      <TituloSlide titulo="Acontecendo agora" sub="por faixa etária" />
      {colunas.length === 0 ? (
        <Vazio emoji="🌿" texto="Nenhuma atividade neste momento" />
      ) : (
        <div className="flex min-h-0 flex-1 gap-4">
          {colunas.map(({ f, lista }) => (
            <div key={f.id} className={`${CARD} flex min-w-0 flex-1 flex-col overflow-hidden`}>
              <div className="flex items-center gap-2.5 px-4 py-3" style={{ background: corClara(f.color, 0.18) }}>
                <span className="text-3xl">{f.emojiFinal}</span>
                <span className="truncate text-2xl font-extrabold" style={{ ...TITULO, color: f.color }}>
                  {f.nome}
                </span>
              </div>
              <div className="flex flex-col gap-2 p-2">
                {lista.map((x) => (
                  <div key={x.id} className="flex flex-col gap-1 rounded-[14px] bg-[#1E6B3E] px-4 py-3 text-white">
                    <span className="self-start rounded-full bg-white px-2.5 py-0.5 text-xs font-extrabold text-[#1E6B3E]">
                      AGORA · {hm(x.start_time)} às {hm(x.end_time)}
                    </span>
                    <span className="text-[22px] font-extrabold leading-tight" style={TITULO}>
                      {x.name}
                    </span>
                    {x.description && <span className="line-clamp-2 text-[15px] font-bold text-white/85">📍 {x.description}</span>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
};

const SlideTempo = ({ dados }: { dados: DadosTotem }) => {
  const f = dados.tempo;
  if (!f) {
    return (
      <>
        <TituloSlide titulo="Tempo na fazenda" />
        <Vazio emoji="⛅" texto="Buscando a previsão do tempo…" />
      </>
    );
  }
  const c = f.current;
  const look = describeWeather(c.weatherCode, c.isDay);
  const temps = [c.temperature, ...f.nextHours.map((h) => h.temperature)];
  return (
    <>
      <TituloSlide titulo="Tempo na fazenda" sub="próximas horas" />
      <div className="flex gap-4">
        <div className={`${CARD} flex flex-1 items-center gap-6 px-7 py-5`} style={{ background: "linear-gradient(135deg,#FFF4E0,#FFFFFF)" }}>
          <span className="text-[110px] leading-none">{emojiTempo(c.weatherCode, c.isDay)}</span>
          <div className="flex flex-col gap-0.5">
            <span className="text-[86px] font-extrabold leading-[0.9]" style={TITULO}>
              {c.temperature}°
            </span>
            <span className="text-2xl font-extrabold">{look.label}</span>
            <span className="text-[17px] font-bold" style={{ color: CINZA }}>
              Sensação {c.feelsLike}° · Máx {Math.max(...temps)}° · Mín {Math.min(...temps)}°
            </span>
          </div>
        </div>
        <div className={`${CARD} flex w-[250px] flex-col justify-center gap-2 p-[18px]`} style={{ background: f.rainAlert ? "#EFF6FF" : "#ECFDF5" }}>
          <span className="text-[40px]">{f.rainAlert ? "🌧️" : "🏊"}</span>
          <span className="text-2xl font-extrabold leading-[1.05]" style={TITULO}>
            {f.rainAlert ? `Chuva a partir das ${f.rainAlert.hour}h` : "Sem chuva nas próximas horas"}
          </span>
          <span className="text-[15px] font-bold" style={{ color: CINZA }}>
            {f.rainAlert ? "Aproveite a área externa antes!" : "Ótimo para a piscina e as atividades ao ar livre."}
          </span>
        </div>
      </div>
      <div className={`${CARD} flex min-h-0 flex-1 items-stretch gap-2 p-2.5`}>
        <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-2xl bg-[#FFF4E0] py-3">
          <span className="text-lg font-extrabold" style={{ color: CINZA }}>
            Agora
          </span>
          <span className="text-[52px] leading-[1.1]">{emojiTempo(c.weatherCode, c.isDay)}</span>
          <span className="text-[26px] font-extrabold leading-none" style={TITULO}>
            {c.temperature}°
          </span>
          <span className="text-sm font-extrabold text-[#2563EB]">💧 {c.rainChance ?? 0}%</span>
        </div>
        {f.nextHours.map((h) => (
          <div key={h.hour} className="flex flex-1 flex-col items-center justify-center gap-2 py-3">
            <span className="text-lg font-extrabold" style={{ color: CINZA }}>
              {h.hour}h
            </span>
            <span className="text-[52px] leading-[1.1]">{emojiTempo(h.weatherCode, h.isDay)}</span>
            <span className="text-[26px] font-extrabold leading-none" style={TITULO}>
              {h.temperature}°
            </span>
            <span className="text-sm font-extrabold text-[#2563EB]">💧 {h.rainChance}%</span>
          </div>
        ))}
      </div>
    </>
  );
};

const SlideDestaques = ({ dados, duracao }: { dados: DadosTotem; duracao: number }) => {
  const lista = dados.anuncios;
  const [i, setI] = useState(0);
  // Vários destaques dividem o tempo da tela
  useEffect(() => {
    if (lista.length <= 1) return;
    const passo = Math.max(5000, (duracao * 1000) / lista.length);
    const t = setInterval(() => setI((x) => (x + 1) % lista.length), passo);
    return () => clearInterval(t);
  }, [lista.length, duracao]);
  const a = lista[i % Math.max(1, lista.length)];
  if (!a) {
    return (
      <>
        <TituloSlide titulo="Destaques" sub="novidades do hotel" />
        <Vazio emoji="📣" texto="Nenhum destaque no momento" />
      </>
    );
  }
  const img = imagemAnuncio(a.image_url);
  return (
    <>
      <TituloSlide titulo="Destaques" sub="novidades do hotel" />
      {img ? (
        /* Banner inteiro, sem cortar (o fundo desfocado preenche as sobras), com título e legenda embaixo */
        <div className={`${CARD} flex min-h-0 flex-1 flex-col overflow-hidden`}>
          <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-[#1D2A22]">
            <img src={img} alt="" aria-hidden className="absolute inset-0 h-full w-full scale-110 object-cover opacity-60 blur-2xl" />
            <img src={img} alt={a.title} className="relative h-full w-full object-contain" />
          </div>
          <div className="flex shrink-0 items-center gap-5 px-7 py-4">
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="truncate text-[34px] font-extrabold leading-tight" style={TITULO}>
                {a.title}
              </span>
              {a.description && (
                <span className="line-clamp-2 text-[19px] font-bold leading-snug" style={{ color: CINZA }}>
                  {a.description}
                </span>
              )}
            </div>
            {lista.length > 1 && (
              <div className="flex shrink-0 gap-2">
                {lista.map((x, k) => (
                  <span
                    key={x.id}
                    className="h-2.5 rounded-full"
                    style={{ width: k === i ? 30 : 10, background: k === i ? VERDE : "#C9D2C6" }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
      <div className={`${CARD} flex min-h-0 flex-1 overflow-hidden`}>
        <div className="flex flex-1 flex-col justify-center gap-3.5 px-8 py-7">
          <span className="text-[56px] font-extrabold leading-none" style={TITULO}>
            {a.title}
          </span>
          {a.description && (
            <span className="line-clamp-6 text-[26px] font-bold leading-[1.35]" style={{ color: CINZA }}>
              {a.description}
            </span>
          )}
          {lista.length > 1 && (
            <div className="mt-1.5 flex gap-2">
              {lista.map((x, k) => (
                <span
                  key={x.id}
                  className="h-2.5 rounded-full"
                  style={{ width: k === i ? 30 : 10, background: k === i ? VERDE : "#C9D2C6" }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      )}
    </>
  );
};

const dataCurta = (d: string) => {
  const [, m, dia] = d.slice(0, 10).split("-");
  return `${dia}/${m}`;
};

const SlideRanking = ({ dados }: { dados: DadosTotem }) => {
  const [p1, p2, p3] = dados.lideres;
  const resto = dados.lideres.slice(3, 7);
  const podio = [
    { g: p2, pos: 2, medalha: "🥈", fundo: "#DBEAFE", altura: 150 },
    { g: p1, pos: 1, medalha: "🥇", fundo: "#F2B13B", altura: 210 },
    { g: p3, pos: 3, medalha: "🥉", fundo: "#FFE4D2", altura: 110 },
  ];
  const sub = dados.periodo ? `${dataCurta(dados.periodo.start_date)} a ${dataCurta(dados.periodo.end_date)}` : undefined;
  return (
    <>
      <TituloSlide titulo="Ranking da semana" sub={sub} />
      {!p1 ? (
        <Vazio emoji="🏁" texto="Faça check-in nas atividades e seja o primeiro!" />
      ) : (
        <div className="flex min-h-0 flex-1 gap-4">
          <div className={`${CARD} flex flex-[1.4] gap-3.5 px-[22px] pt-[18px]`} style={{ background: "linear-gradient(180deg,#EFF6FF,#FFFFFF)" }}>
            {podio.map(({ g, pos, medalha, fundo, altura }) => (
              <div key={pos} className="flex flex-1 flex-col items-center justify-end gap-1.5">
                {g && (
                  <>
                    <span className={pos === 1 ? "text-[54px] leading-none" : "text-[44px] leading-none"}>{medalha}</span>
                    <span className="max-w-full truncate text-[21px] font-extrabold" style={TITULO}>
                      {familia(g.name)}
                    </span>
                    <div className="flex w-full flex-col items-center justify-center rounded-t-[18px]" style={{ height: altura, background: fundo }}>
                      <span className="text-[46px] font-extrabold leading-none" style={TITULO}>
                        {pos}º
                      </span>
                      <span className="text-xl font-extrabold">{g.total_points} pts</span>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
          <div className={`${CARD} flex flex-1 flex-col px-5 py-3.5`}>
            {resto.map((g, k) => (
              <div key={g.id} className={`flex items-center gap-3 py-2.5 ${k < resto.length - 1 ? "border-b border-[#E6EAE3]" : ""}`}>
                <span className="w-[34px] text-lg font-extrabold" style={{ color: CINZA }}>
                  {k + 4}º
                </span>
                <span className="flex-1 truncate text-lg font-extrabold">{familia(g.name)}</span>
                <span className="text-lg font-extrabold">{g.total_points} pts</span>
              </div>
            ))}
            <div className="flex-1" />
            {dados.campeao && (
              <div className="rounded-[14px] bg-[#FCE7F3] px-3.5 py-2.5 text-base font-extrabold">
                👑 Campeão da semana passada: {familia(dados.campeao.guest_name)}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

const ESTILO_ALERTA: Record<TotemAlert["alert_type"], { fundo: string; emoji: string; etiqueta: string }> = {
  info: { fundo: "linear-gradient(135deg,#1D4ED8,#2563EB)", emoji: "📢", etiqueta: "AVISO" },
  warning: { fundo: "linear-gradient(135deg,#1F4D3A,#2E6B50)", emoji: "⚠️", etiqueta: "AVISO IMPORTANTE" },
  success: { fundo: "linear-gradient(135deg,#047857,#10B981)", emoji: "🎉", etiqueta: "NOVIDADE" },
  danger: { fundo: "linear-gradient(135deg,#991B1B,#DC2626)", emoji: "🚨", etiqueta: "ATENÇÃO" },
};

const tocarBip = () => {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    [0, 0.35].forEach((atraso) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.25, ctx.currentTime + atraso);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + atraso + 0.3);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + atraso);
      o.stop(ctx.currentTime + atraso + 0.3);
    });
    setTimeout(() => ctx.close().catch(() => {}), 1500);
  } catch {
    // sem som
  }
};

const SlideAlerta = ({ alerta }: { alerta: TotemAlert }) => {
  const e = ESTILO_ALERTA[alerta.alert_type] ?? ESTILO_ALERTA.warning;
  useEffect(() => {
    if (alerta.play_sound) tocarBip();
  }, [alerta.id, alerta.play_sound]);
  return (
    <div className="flex min-h-0 flex-1 items-center gap-9 rounded-[26px] px-11 py-9 text-white shadow-[0_3px_14px_rgba(20,40,30,0.15)]" style={{ background: e.fundo }}>
      <span className="text-[150px] leading-none">{e.emoji}</span>
      <div className="flex flex-col gap-3.5">
        <span className="self-start rounded-full bg-[#F2B13B] px-4 py-1.5 text-[17px] font-extrabold text-[#3A2600]">{e.etiqueta}</span>
        <span className="text-[54px] font-extrabold leading-none" style={TITULO}>
          {alerta.title}
        </span>
        {alerta.message && <span className="text-[23px] font-bold opacity-90">{alerta.message}</span>}
      </div>
    </div>
  );
};

const SlideQr = ({ qrUrl }: { qrUrl: string }) => (
  <>
    <TituloSlide titulo="Baixe o app da recreação" sub="é grátis e rapidinho" />
    <div className={`${CARD} flex min-h-0 flex-1 items-center gap-10 px-12`}>
      <span className="rounded-3xl border-4 p-4" style={{ borderColor: VERDE }}>
        <img src={qrImagem(qrUrl, 400)} alt="QR code do app" className="h-[300px] w-[300px]" />
      </span>
      <div className="flex flex-col gap-4 text-[26px] font-extrabold">
        <span>📷 Aponte a câmera do celular</span>
        <span>🏨 Entre com o apartamento e o sobrenome</span>
        <span>⭐ Ganhe 50 pontos na hora</span>
        <span>📅 Veja a programação e faça check-in</span>
      </div>
    </div>
  </>
);

/* ------------------------------------------------------------------ */
/* Moldura                                                             */
/* ------------------------------------------------------------------ */

export const qrImagem = (url: string, tam = 300) =>
  `https://api.qrserver.com/v1/create-qr-code/?size=${tam}x${tam}&margin=0&data=${encodeURIComponent(url)}`;

const DIAS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

const Cabecalho = ({ dados }: { dados: DadosTotem }) => {
  const agora = useAgora();
  const t = dados.tempo?.current;
  return (
    <header className="flex h-[84px] shrink-0 items-center gap-4 px-7 text-white" style={{ background: VERDE }}>
      <span className="flex h-14 w-14 rounded-2xl bg-white p-1">
        <img src="/logo-hotel.svg" alt="Hotel Fazenda Santa Bárbara" className="h-full w-full object-contain" />
      </span>
      <div className="flex flex-col leading-tight">
        <span className="text-[26px] font-extrabold" style={TITULO}>
          Recreação
        </span>
        <span className="text-[15px] font-bold opacity-85">Hotel Fazenda Santa Bárbara</span>
      </div>
      <div className="flex-1" />
      {t && (
        <>
          <span className="flex items-center gap-2 text-[22px] font-extrabold">
            {emojiTempo(t.weatherCode, t.isDay)} {t.temperature}°
          </span>
          <span className="h-10 w-px bg-white/25" />
        </>
      )}
      <div className="flex flex-col items-end leading-[1.05]">
        <span className="text-4xl font-extrabold" style={TITULO}>
          {String(agora.getHours()).padStart(2, "0")}:{String(agora.getMinutes()).padStart(2, "0")}
        </span>
        <span className="text-sm font-bold opacity-85">
          {DIAS[agora.getDay()]}, {agora.getDate()} de {MESES[agora.getMonth()]}
        </span>
      </div>
    </header>
  );
};

const Lateral = ({ dados, qrUrl }: { dados: DadosTotem; qrUrl: string }) => {
  const agora = useAgora();
  const faixas = useFaixas(dados.faixas);
  const m = agora.getHours() * 60 + agora.getMinutes();
  const porId = Object.fromEntries(faixas.map((f) => [f.id, f]));
  const proximas = dados.atividades.filter((a) => minutos(a.start_time) > m).slice(0, 3);
  return (
    <aside className="flex w-[330px] shrink-0 flex-col gap-4">
      <section className={`${CARD} min-h-0 flex-1 px-[18px] py-4`}>
        <span className="text-[22px] font-extrabold" style={TITULO}>
          A seguir
        </span>
        {proximas.length === 0 ? (
          <p className="mt-2 text-base font-bold" style={{ color: CINZA }}>
            Por hoje é só! Amanhã tem mais 🌙
          </p>
        ) : (
          proximas.map((a, k) => {
            const f = porId[a.age_group_id];
            return (
              <div key={a.id} className={`flex items-center gap-3 py-2.5 ${k < proximas.length - 1 ? "border-b border-[#E6EAE3]" : ""}`}>
                <span className="w-16 text-[22px] font-extrabold" style={TITULO}>
                  {hm(a.start_time)}
                </span>
                <span className="flex min-w-0 flex-1 flex-col leading-tight">
                  <span className="truncate text-[17px] font-extrabold">{a.name}</span>
                  <span className="text-[13px] font-bold" style={{ color: a.is_master ? VERDE : f?.color ?? CINZA }}>
                    {a.is_master ? "👨‍👩‍👧 Todos" : `${f?.emojiFinal ?? "🎈"} ${f?.nome ?? "Recreação"}`}
                  </span>
                </span>
              </div>
            );
          })
        )}
      </section>
      <section className={`${CARD} flex flex-col items-center gap-2.5 p-[18px] text-center`}>
        <span className="text-[22px] font-extrabold leading-tight" style={TITULO}>
          Abra o app no celular
        </span>
        <span className="flex rounded-2xl border-[3px] p-2.5" style={{ borderColor: VERDE }}>
          <img src={qrImagem(qrUrl, 300)} alt="QR code do app" className="h-[150px] w-[150px]" />
        </span>
        <span className="text-[15px] font-bold" style={{ color: CINZA }}>
          Aponte a câmera · entre com o apto
          <br />e <b style={{ color: VERDE }}>ganhe 50 pontos</b>
        </span>
      </section>
    </aside>
  );
};

const Rodape = ({ hotel }: { hotel: HotelInfo }) => {
  const itens: ReactNode[] = [];
  hotel.horarios
    .filter((h) => h.visivel !== false && h.nome && h.horario)
    .forEach((h) => itens.push(`${h.nome} ${h.horario}`));
  if (hotel.wifi_mostrar && hotel.wifi_rede) itens.push(`📶 Wi-Fi: ${hotel.wifi_rede} · senha ${hotel.wifi_senha}`);
  return (
    <footer className="flex h-14 shrink-0 items-center gap-4 overflow-hidden whitespace-nowrap bg-[#F2B13B] px-7 text-[19px] font-extrabold text-[#3A2600]">
      <span className="rounded-full bg-[#3A2600] px-3 py-1 text-sm text-[#F2B13B]">HOTEL</span>
      {itens.map((t, k) => (
        <span key={k} className="flex items-center gap-4">
          {k > 0 && <span className="opacity-50">•</span>}
          {t}
        </span>
      ))}
    </footer>
  );
};

export type SlideNovo =
  | { tipo: "nextactivity" | "schedule" | "weather" | "announcements" | "ranking" | "qrcode"; duracao: number }
  | { tipo: "alerta"; duracao: number; alerta: TotemAlert };

/** Tela completa do totem (1280×720, ampliada para o tamanho da TV). */
export const TelaTotem = ({
  dados,
  slide,
  qrUrl,
  saindo,
}: {
  dados: DadosTotem;
  slide: SlideNovo | null;
  qrUrl: string;
  saindo: boolean;
}) => {
  let conteudo: ReactNode = null;
  if (slide) {
    switch (slide.tipo) {
      case "nextactivity":
        conteudo = <SlideAgora dados={dados} />;
        break;
      case "schedule":
        conteudo = <SlideProgramacao dados={dados} />;
        break;
      case "weather":
        conteudo = <SlideTempo dados={dados} />;
        break;
      case "announcements":
        conteudo = <SlideDestaques dados={dados} duracao={slide.duracao} />;
        break;
      case "ranking":
        conteudo = <SlideRanking dados={dados} />;
        break;
      case "qrcode":
        conteudo = <SlideQr qrUrl={qrUrl} />;
        break;
      case "alerta":
        conteudo = <SlideAlerta alerta={slide.alerta} />;
        break;
    }
  }
  return (
    <div
      className="flex h-[720px] w-[1280px] flex-col overflow-hidden bg-[#F4F6F0] text-[#1D2A22]"
      style={{ fontFamily: "'Nunito', system-ui, sans-serif" }}
    >
      <Cabecalho dados={dados} />
      <div className="flex min-h-0 flex-1 gap-[22px] px-7 pb-3.5 pt-[22px]">
        <main
          className="flex min-w-0 flex-1 flex-col gap-4 transition-all duration-500"
          style={{ opacity: saindo ? 0 : 1, transform: saindo ? "scale(0.98)" : "none" }}
        >
          {conteudo}
        </main>
        <Lateral dados={dados} qrUrl={qrUrl} />
      </div>
      <Rodape hotel={dados.hotel} />
    </div>
  );
};
