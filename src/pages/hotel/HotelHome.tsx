import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, CalendarDays, ChevronRight, Hotel, LogIn, Megaphone, Mountain, Receipt, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useGuestAuth } from "@/hooks/useGuestAuth";
import { HotelLayout, HotelLogo, FONTE_TITULO } from "@/components/hotel/HotelLayout";
import { useHotelInfo } from "@/hooks/useHotelInfo";
import { AtivarAvisos } from "@/components/hotel/AtivarAvisos";
import { BrindeCard } from "@/components/hotel/BrindeCard";
import { describeWeather, fetchForecast, type CurrentWeather } from "@/lib/weather";

interface ProximaAtividade {
  name: string;
  start_time: string;
  end_time: string;
  age_group_id: string;
}

const hojeYmd = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

const hhmm = (t: string) => t.slice(0, 5);

const saudacao = () => {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
};

const faltaQuanto = (start: string) => {
  const [h, m] = start.split(":").map(Number);
  const agora = new Date();
  const diff = h * 60 + m - (agora.getHours() * 60 + agora.getMinutes());
  if (diff <= 0) return "agora";
  if (diff < 60) return `em ${diff} min`;
  const horas = Math.floor(diff / 60);
  return `em ${horas}h${diff % 60 ? String(diff % 60).padStart(2, "0") : ""}`;
};

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const HotelHome = () => {
  const { guest } = useGuestAuth();
  const info = useHotelInfo();
  const horarios = info.horarios.filter((h) => h.visivel !== false && h.nome && h.horario);
  const [proxima, setProxima] = useState<ProximaAtividade | null>(null);
  const [faixas, setFaixas] = useState<Record<string, string>>({});
  const [tempo, setTempo] = useState<CurrentWeather | null>(null);
  const [consumo, setConsumo] = useState<{ total: number; synced_at?: string } | null>(null);
  const [qtdAvisos, setQtdAvisos] = useState(0);

  useEffect(() => {
    (async () => {
      const agora = new Date();
      const hm = `${String(agora.getHours()).padStart(2, "0")}:${String(agora.getMinutes()).padStart(2, "0")}`;
      const [{ data: acts }, { data: groups }, { count }] = await Promise.all([
        supabase
          .from("activities")
          .select("name, start_time, end_time, age_group_id")
          .eq("activity_date", hojeYmd())
          .gte("end_time", hm)
          .order("start_time", { ascending: true })
          .limit(1),
        supabase.from("age_groups").select("id, name"),
        supabase.from("announcements").select("id", { count: "exact", head: true }).eq("is_active", true),
      ]);
      if (acts?.[0]) setProxima(acts[0] as ProximaAtividade);
      if (groups) setFaixas(Object.fromEntries(groups.map((g) => [g.id, g.name])));
      setQtdAvisos(count || 0);

      const { data: cfg } = await supabase
        .from("site_settings")
        .select("weather_latitude, weather_longitude")
        .eq("id", "00000000-0000-0000-0000-000000000001")
        .maybeSingle();
      if (cfg?.weather_latitude && cfg?.weather_longitude) {
        try {
          const f = await fetchForecast(cfg.weather_latitude, cfg.weather_longitude, 1);
          setTempo(f.current);
        } catch {
          // sem clima, segue sem
        }
      }
    })();
  }, []);

  useEffect(() => {
    if (!guest?.id) {
      setConsumo(null);
      return;
    }
    (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any).rpc("guest_consumption", { p_guest_id: guest.id });
      if (data && !Array.isArray(data) && data.available) {
        setConsumo({ total: Number(data.total ?? 0), synced_at: data.synced_at });
      }
    })();
  }, [guest?.id]);

  const primeiroNome = guest?.name?.split(" ")[0];
  const clima = tempo ? describeWeather(tempo.weatherCode, tempo.isDay) : null;

  return (
    <HotelLayout>
      <header className="rounded-b-[28px] bg-[#1F4D3A] px-5 pb-16 pt-7 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <HotelLogo size={48} />
            <div className="flex flex-col leading-tight">
              <span className="text-[17px] font-bold" style={FONTE_TITULO}>
                Hotel Fazenda
              </span>
              <span className="text-[13px] text-white/85">Santa Bárbara</span>
            </div>
          </div>
          <Link
            to="/avisos"
            aria-label={qtdAvisos ? `Avisos (${qtdAvisos})` : "Avisos"}
            className="relative flex h-11 w-11 items-center justify-center rounded-full bg-white/15"
          >
            <Bell className="h-[22px] w-[22px]" />
            {qtdAvisos > 0 && <span className="absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full bg-[#F2B13B]" />}
          </Link>
        </div>
        <div className="mt-5">
          <h1 className="text-[28px] font-extrabold leading-tight" style={FONTE_TITULO}>
            {primeiroNome ? `${saudacao()}, ${primeiroNome}!` : `${saudacao()}!`}
          </h1>
          <p className="text-[15px] text-white/90">
            {guest ? `Apto ${guest.room_number} · aproveite a estadia` : "Bem-vindo ao Hotel Fazenda Santa Bárbara"}
          </p>
        </div>
      </header>

      <main className="-mt-11 flex flex-col gap-4 px-5">
        {/* Agora na recreação */}
        <section aria-label="Hoje na recreação" className="rounded-[20px] bg-white p-4 shadow-[0_6px_20px_rgba(20,40,30,0.08)]">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-extrabold uppercase tracking-wide text-[#5B6B60]">Agora na recreação</span>
            {tempo && clima && (
              <span className="flex items-center gap-1.5 text-sm font-bold text-[#3D4A41]">
                <clima.Icon className={`h-[18px] w-[18px] ${clima.color}`} />
                {Math.round(tempo.temperature)}° · {clima.label.toLowerCase()}
              </span>
            )}
          </div>
          {proxima ? (
            <div className="mt-3 flex items-center gap-3">
              <div className="flex w-16 shrink-0 flex-col items-center rounded-2xl bg-[#FFF4DF] py-2">
                <span className="text-lg font-extrabold" style={FONTE_TITULO}>
                  {hhmm(proxima.start_time)}
                </span>
                <span className="text-[11px] font-extrabold text-[#8A5A00]">{faltaQuanto(proxima.start_time)}</span>
              </div>
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-[17px] font-bold" style={FONTE_TITULO}>
                  {proxima.name}
                </span>
                <span className="text-sm text-[#5B6B60]">
                  {faixas[proxima.age_group_id] ?? "Recreação"} · até {hhmm(proxima.end_time)}
                </span>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-[15px] text-[#3D4A41]">Nenhuma atividade agora. Veja a programação dos próximos dias.</p>
          )}
          <Link
            to="/programacao"
            className="mt-3 flex min-h-[44px] items-center justify-center rounded-xl bg-[#1F4D3A] text-[15px] font-extrabold text-white"
          >
            Ver programação
          </Link>
        </section>

        {/* Consumo */}
        {consumo && (
          <Link
            to="/estadia"
            aria-label={`Meu consumo até agora: ${brl(consumo.total)}. Abrir detalhes`}
            className="flex items-center gap-3 rounded-[20px] bg-white p-4 shadow-[0_2px_8px_rgba(20,40,30,0.06)]"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#E7F0EA] text-[#1F4D3A]">
              <Receipt className="h-6 w-6" />
            </span>
            <span className="flex flex-1 flex-col">
              <span className="text-sm font-bold text-[#5B6B60]">Meu consumo até agora</span>
              <span className="text-[22px] font-extrabold" style={FONTE_TITULO}>
                {brl(consumo.total)}
              </span>
              <span className="text-xs text-[#5B6B60]">Sem diárias · conferido no check-out</span>
            </span>
            <ChevronRight className="h-5 w-5 text-[#5B6B60]" />
          </Link>
        )}

        {/* Brinde liberado (3 avaliações boas) */}
        {guest && <BrindeCard guestId={guest.id} />}

        {/* Notificações do hotel */}
        <AtivarAvisos guestId={guest?.id ?? null} />

        {/* Entrar */}
        {!guest && (
          <Link
            to="/guest-auth"
            className="flex items-center gap-3 rounded-[20px] border-2 border-dashed border-[#9DB0A2] bg-white p-4"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#FFF4DF] text-[#8A5A00]">
              <LogIn className="h-6 w-6" />
            </span>
            <span className="flex flex-1 flex-col">
              <span className="font-extrabold">Entrar com seu apartamento</span>
              <span className="text-sm text-[#5B6B60]">Para ver seus pontos e seu consumo</span>
            </span>
            <ChevronRight className="h-5 w-5 text-[#5B6B60]" />
          </Link>
        )}

        {/* Módulos */}
        <section aria-labelledby="mod-title" className="flex flex-col gap-3">
          <h2 id="mod-title" className="text-xl font-bold" style={FONTE_TITULO}>
            O que você quer fazer?
          </h2>
          <Link
            to="/recreacao"
            className="flex items-center gap-3 rounded-[20px] bg-[#F2B13B] p-4 text-[#3A2600] shadow-[0_2px_8px_rgba(20,40,30,0.08)]"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/50">
              <Sparkles className="h-6 w-6" />
            </span>
            <span className="flex flex-1 flex-col">
              <span className="text-lg font-extrabold" style={FONTE_TITULO}>
                Recreação
              </span>
              <span className="text-sm font-semibold">Programação, ranking, jogos e bichinho</span>
            </span>
            {guest && (
              <span className="rounded-full bg-white/70 px-3 py-1 text-sm font-extrabold">{guest.total_points} pts</span>
            )}
          </Link>
          <Link
            to={guest ? "/estadia" : "/guest-auth"}
            className="flex items-center gap-3 rounded-[20px] bg-white p-4 shadow-[0_2px_8px_rgba(20,40,30,0.06)]"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#E7F0EA] text-[#1F4D3A]">
              <Receipt className="h-6 w-6" />
            </span>
            <span className="flex flex-1 flex-col">
              <span className="text-lg font-extrabold" style={FONTE_TITULO}>
                Minha estadia
              </span>
              <span className="text-sm text-[#5B6B60]">
                {guest ? "Datas da reserva e consumo detalhado" : "Entre com seu apartamento para ver"}
              </span>
            </span>
            <ChevronRight className="h-5 w-5 text-[#5B6B60]" />
          </Link>
          <Link
            to="/regiao"
            className="flex items-center gap-3 rounded-[20px] bg-white p-4 shadow-[0_2px_8px_rgba(20,40,30,0.06)]"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#E6F0F8] text-[#1D5C8C]">
              <Mountain className="h-6 w-6" />
            </span>
            <span className="flex flex-1 flex-col">
              <span className="text-lg font-extrabold" style={FONTE_TITULO}>
                Passeios na região
              </span>
              <span className="text-sm text-[#5B6B60]">Cachoeiras, cidades históricas e roteiros</span>
            </span>
            <ChevronRight className="h-5 w-5 text-[#5B6B60]" />
          </Link>
          <div className="grid grid-cols-2 gap-3">
            <Link to="/hotel" className="flex flex-col gap-2 rounded-[20px] bg-white p-4 shadow-[0_2px_8px_rgba(20,40,30,0.06)]">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#E7F0EA] text-[#1F4D3A]">
                <Hotel className="h-6 w-6" />
              </span>
              <span className="font-extrabold">O hotel</span>
              <span className="text-[13px] leading-snug text-[#5B6B60]">Horários, Wi-Fi, mapa e contatos</span>
            </Link>
            <Link to="/avisos" className="flex flex-col gap-2 rounded-[20px] bg-white p-4 shadow-[0_2px_8px_rgba(20,40,30,0.06)]">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#E7F0EA] text-[#1F4D3A]">
                <Megaphone className="h-6 w-6" />
              </span>
              <span className="font-extrabold">Avisos</span>
              <span className="text-[13px] leading-snug text-[#5B6B60]">
                {qtdAvisos ? `${qtdAvisos} ${qtdAvisos === 1 ? "aviso" : "avisos"} do hotel` : "Comunicados do hotel"}
              </span>
            </Link>
          </div>
        </section>

        {/* Hoje no hotel */}
        {horarios.length > 0 && (
        <section aria-labelledby="hoje-hotel" className="flex flex-col gap-3">
          <h2 id="hoje-hotel" className="flex items-center gap-2 text-xl font-bold" style={FONTE_TITULO}>
            <CalendarDays className="h-5 w-5 text-[#1F4D3A]" /> Horários do hotel
          </h2>
          <div className="rounded-[20px] bg-white shadow-[0_2px_8px_rgba(20,40,30,0.06)]">
            {horarios.map((h, i) => (
              <div
                key={h.nome}
                className={`flex justify-between gap-3 px-4 py-3 ${i < horarios.length - 1 ? "border-b border-[#E6EAE3]" : ""}`}
              >
                <span className="font-bold">{h.nome}</span>
                <span className="font-bold text-[#3D4A41]">{h.horario}</span>
              </div>
            ))}
          </div>
        </section>
        )}
      </main>
    </HotelLayout>
  );
};

export default HotelHome;
