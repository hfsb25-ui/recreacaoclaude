import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronLeft, Clock, Eye, EyeOff, MessageCircle, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useGuestAuth } from "@/hooks/useGuestAuth";
import { HotelLayout, FONTE_TITULO } from "@/components/hotel/HotelLayout";
import { useHotelInfo, linkWhatsapp } from "@/hooks/useHotelInfo";

interface Consumo {
  available: boolean;
  total?: number;
  synced_at?: string;
  [k: string]: unknown;
}

interface Estadia {
  uh: string;
  arrival_date: string | null;
  departure_date: string | null;
}

const LINHAS = [
  { key: "restaurante", label: "Restaurante" },
  { key: "bares", label: "Bares" },
  { key: "banquete", label: "Banquete" },
  { key: "eventos", label: "Eventos" },
  { key: "lavanderia", label: "Lavanderia" },
  { key: "telefonia", label: "Telefonia" },
  { key: "diversos", label: "Diversos" },
  { key: "taxas", label: "Taxa de serviço" },
  { key: "iss", label: "ISS" },
];

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const diaMes = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
const ymd = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const atualizado = (iso: string) => {
  const d = new Date(iso);
  const hm = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return ymd(d) === ymd(new Date()) ? `hoje às ${hm}` : `${d.toLocaleDateString("pt-BR")} às ${hm}`;
};

const noites = (a: string, b: string) => {
  const ini = new Date(ymd(new Date(a)));
  const fim = new Date(ymd(new Date(b)));
  return Math.max(1, Math.round((fim.getTime() - ini.getTime()) / 86400000));
};

/** Minha estadia: datas da reserva e consumo detalhado (vindos do TOTVS). */
const HotelEstadia = () => {
  const navigate = useNavigate();
  const { guest, loading } = useGuestAuth();
  const info = useHotelInfo();
  const [estadia, setEstadia] = useState<Estadia | null>(null);
  const [consumo, setConsumo] = useState<Consumo | null>(null);
  const [carregou, setCarregou] = useState(false);
  const [mostrar, setMostrar] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!guest) {
      navigate("/guest-auth");
      return;
    }
    (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rpc = supabase as any;
      const [{ data: e }, { data: c }] = await Promise.all([
        rpc.rpc("guest_stay_info", { p_guest_id: guest.id }),
        rpc.rpc("guest_consumption", { p_guest_id: guest.id }),
      ]);
      if (e && !Array.isArray(e) && e.uh) setEstadia(e as Estadia);
      if (c && !Array.isArray(c)) setConsumo(c as Consumo);
      setCarregou(true);
    })();
  }, [guest, loading, navigate]);

  if (!guest) return null;

  const total = estadia?.arrival_date && estadia?.departure_date ? noites(estadia.arrival_date, estadia.departure_date) : null;
  const atual =
    total && estadia?.arrival_date
      ? Math.min(total, Math.max(1, Math.round((new Date(ymd(new Date())).getTime() - new Date(ymd(new Date(estadia.arrival_date))).getTime()) / 86400000) + 1))
      : null;
  const ultimoDia = estadia?.departure_date ? ymd(new Date(estadia.departure_date)) === ymd(new Date()) : false;
  const linhas = consumo?.available ? LINHAS.filter((l) => Number(consumo[l.key] ?? 0) > 0) : [];
  const valor = (v: number) => (mostrar ? brl(v) : "R$ •••");

  return (
    <HotelLayout>
      <header className="flex flex-col gap-4 rounded-b-[28px] bg-[#1F4D3A] px-5 pb-7 pt-5 text-white">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate("/")}
            aria-label="Voltar"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <h1 className="text-[26px] font-extrabold" style={FONTE_TITULO}>
            Minha estadia
          </h1>
        </div>
        <div className="flex items-end justify-between">
          <div className="flex flex-col">
            <span className="text-sm text-white/85">Apartamento</span>
            <span className="text-[34px] font-extrabold leading-none" style={FONTE_TITULO}>
              {estadia?.uh ?? guest.room_number}
            </span>
          </div>
          {estadia?.arrival_date && estadia?.departure_date && (
            <div className="flex flex-col text-right">
              <span className="text-sm text-white/85">
                {diaMes(estadia.arrival_date)} a {diaMes(estadia.departure_date)}
              </span>
              {total && atual && (
                <span className="text-base font-extrabold">
                  {atual}ª de {total} {total === 1 ? "noite" : "noites"}
                </span>
              )}
            </div>
          )}
        </div>
        {total && atual && total <= 14 && (
          <div
            role="progressbar"
            aria-label="Dias de estadia"
            aria-valuenow={atual}
            aria-valuemin={0}
            aria-valuemax={total}
            className="grid gap-1.5"
            style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: total }).map((_, i) => (
              <span key={i} className={`h-2 rounded-full ${i < atual ? "bg-[#F2B13B]" : "bg-white/25"}`} />
            ))}
          </div>
        )}
      </header>

      <main className="flex flex-col gap-4 p-5">
        {ultimoDia && (
          <section className="flex items-center gap-3 rounded-[18px] bg-[#FFF4DF] p-4">
            <Clock className="h-7 w-7 shrink-0 text-[#8A5A00]" />
            <div className="flex flex-col">
              <span className="font-extrabold">Hoje é seu último dia</span>
              <span className="text-sm text-[#5B4A2A]">Ainda dá para aproveitar a programação!</span>
            </div>
          </section>
        )}

        <section aria-labelledby="consumo" className="flex flex-col gap-3 rounded-[20px] bg-white p-5 shadow-[0_2px_8px_rgba(20,40,30,0.06)]">
          <div className="flex items-center justify-between">
            <h2 id="consumo" className="text-xl font-bold" style={FONTE_TITULO}>
              Meu consumo
            </h2>
            {consumo?.available && (
              <button
                type="button"
                onClick={() => setMostrar((m) => !m)}
                aria-label={mostrar ? "Esconder valores" : "Mostrar valores"}
                className="flex h-11 items-center gap-1.5 rounded-full bg-[#EEF1EA] px-3.5 text-sm font-bold text-[#3D4A41]"
              >
                {mostrar ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                {mostrar ? "Esconder" : "Mostrar"}
              </button>
            )}
          </div>

          {!carregou ? (
            <p className="text-sm text-[#5B6B60]">Carregando…</p>
          ) : !consumo?.available ? (
            <p className="text-[15px] text-[#3D4A41]">
              O consumo aparece aqui quando a sua conta estiver no sistema do hotel. Se tiver dúvidas, fale com a recepção.
            </p>
          ) : (
            <>
              <dl className="flex flex-col">
                {linhas.length === 0 && <p className="py-2 text-sm text-[#5B6B60]">Nenhum consumo lançado até agora.</p>}
                {linhas.map((l) => (
                  <div key={l.key} className="flex justify-between border-b border-[#E6EAE3] py-2.5 text-[15px]">
                    <dt>{l.label}</dt>
                    <dd className="font-bold tabular-nums">{valor(Number(consumo[l.key]))}</dd>
                  </div>
                ))}
                <div className="flex justify-between pb-1 pt-3 text-[19px] font-extrabold" style={FONTE_TITULO}>
                  <dt>Total</dt>
                  <dd className="tabular-nums">{valor(Number(consumo.total ?? 0))}</dd>
                </div>
              </dl>
              <p className="text-[13px] leading-relaxed text-[#5B6B60]">
                {consumo.synced_at && <>Atualizado {atualizado(consumo.synced_at)}. </>}
                Lançamentos recentes podem levar até 30 minutos. Diárias não incluídas; os valores finais são conferidos na
                recepção, no check-out.
              </p>
            </>
          )}
        </section>

        <section aria-labelledby="ajuda" className="flex flex-col gap-2.5">
          <h2 id="ajuda" className="text-xl font-bold" style={FONTE_TITULO}>
            Precisa de algo?
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <a
              href={linkWhatsapp(info, estadia?.uh ?? guest.room_number)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-[64px] items-center gap-2.5 rounded-2xl bg-white p-3.5 text-[15px] font-extrabold shadow-[0_2px_8px_rgba(20,40,30,0.06)]"
            >
              <MessageCircle className="h-[22px] w-[22px] text-[#1E8E4E]" />
              Falar com a recepção
            </a>
            <Link
              to="/programacao"
              className="flex min-h-[64px] items-center gap-2.5 rounded-2xl bg-white p-3.5 text-[15px] font-extrabold shadow-[0_2px_8px_rgba(20,40,30,0.06)]"
            >
              <Star className="h-[22px] w-[22px] text-[#1F4D3A]" />
              Avaliar atividades
            </Link>
          </div>
        </section>
      </main>
    </HotelLayout>
  );
};

export default HotelEstadia;
