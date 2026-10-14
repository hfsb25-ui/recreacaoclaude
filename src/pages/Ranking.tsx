import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useGuestAuth } from "@/hooks/useGuestAuth";
import { HotelLayout, HotelPageHeader, FONTE_TITULO } from "@/components/hotel/HotelLayout";
import { familia } from "@/lib/familia";

interface RankingGuest {
  id: string;
  name: string;
  total_points: number;
}

interface RankingPeriod {
  start_date: string;
  end_date: string;
}

const AZUL = "#2563EB";

const dataCurta = (d: string) => {
  const [, m, dia] = d.slice(0, 10).split("-");
  return `${dia}/${m}`;
};

const diasAte = (fim: string) => {
  const [a, m, d] = fim.slice(0, 10).split("-").map(Number);
  const alvo = new Date(a, m - 1, d);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return Math.round((alvo.getTime() - hoje.getTime()) / 86400000);
};

const PODIO = [
  { pos: 2, medalha: "🥈", fundo: "#DBEAFE", altura: "h-24" },
  { pos: 1, medalha: "🥇", fundo: "#F2B13B", altura: "h-32" },
  { pos: 3, medalha: "🥉", fundo: "#FFE4D2", altura: "h-20" },
];

const Ranking = () => {
  const navigate = useNavigate();
  const { guest } = useGuestAuth();
  const [lista, setLista] = useState<RankingGuest[]>([]);
  const [period, setPeriod] = useState<RankingPeriod | null>(null);
  const [minhaPos, setMinhaPos] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ativo = true;
    (async () => {
      try {
        const [{ data: p }, { data: g }] = await Promise.all([
          supabase.from("ranking_periods").select("start_date, end_date").eq("is_active", true).maybeSingle(),
          supabase
            .from("guests")
            .select("id, name, total_points")
            .gt("total_points", 0)
            .order("total_points", { ascending: false })
            .limit(10),
        ]);
        if (!ativo) return;
        if (p) setPeriod(p as RankingPeriod);
        setLista((g as RankingGuest[]) ?? []);
      } catch (e) {
        console.error("Erro ao carregar o ranking:", e);
      } finally {
        if (ativo) setLoading(false);
      }
    })();
    return () => {
      ativo = false;
    };
  }, []);

  useEffect(() => {
    if (!guest || guest.total_points <= 0) {
      setMinhaPos(null);
      return;
    }
    supabase
      .from("guests")
      .select("id", { count: "exact", head: true })
      .gt("total_points", guest.total_points)
      .then(({ count }) => setMinhaPos((count ?? 0) + 1));
  }, [guest]);

  const subtitulo = period
    ? (() => {
        const dias = diasAte(period.end_date);
        const fim = dias > 1 ? `termina em ${dias} dias` : dias === 1 ? "termina amanhã" : dias === 0 ? "termina hoje" : "";
        return `Semana de ${dataCurta(period.start_date)} a ${dataCurta(period.end_date)}${fim ? ` · ${fim}` : ""}`;
      })()
    : "Quem está na frente esta semana";

  const top3 = lista.slice(0, 3);
  const resto = lista.slice(3);
  const euNaLista = guest ? lista.some((g) => g.id === guest.id) : false;

  return (
    <HotelLayout>
      <HotelPageHeader title="Ranking" subtitle={subtitulo} back="/recreacao" cor={AZUL} />

      <div className="space-y-4 px-4 pt-4">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-7 w-7 animate-spin text-[#2563EB]" />
          </div>
        ) : lista.length === 0 ? (
          <section className="rounded-[20px] bg-white p-6 text-center shadow-[0_2px_10px_rgba(20,40,30,0.07)]">
            <p className="text-4xl" aria-hidden>
              🏁
            </p>
            <p className="mt-2 font-extrabold" style={FONTE_TITULO}>
              O ranking desta semana ainda está vazio
            </p>
            <p className="text-sm text-[#5B6B60]">Faça check-in numa atividade e seja o primeiro!</p>
          </section>
        ) : (
          <>
            {/* Pódio */}
            <section
              className="overflow-hidden rounded-[20px] px-3 pt-4 shadow-[0_2px_10px_rgba(20,40,30,0.07)]"
              style={{ background: "linear-gradient(180deg,#EFF6FF 0%,#FFFFFF 100%)" }}
              aria-label="Os três primeiros"
            >
              <div className="grid grid-cols-3 items-end gap-2">
                {PODIO.map(({ pos, medalha, fundo, altura }) => {
                  const g = top3[pos - 1];
                  if (!g) return <div key={pos} />;
                  const souEu = guest?.id === g.id;
                  return (
                    <div key={pos} className="flex flex-col items-center text-center">
                      <span className={pos === 1 ? "text-4xl" : "text-3xl"} aria-hidden>
                        {medalha}
                      </span>
                      <span className="mt-1 line-clamp-2 px-1 text-[13px] font-extrabold leading-tight">
                        {souEu ? "Você" : familia(g.name)}
                      </span>
                      <div
                        className={`mt-2 flex w-full flex-col items-center justify-center rounded-t-2xl ${altura}`}
                        style={{ background: fundo }}
                      >
                        <span className="text-[26px] font-extrabold leading-none" style={FONTE_TITULO}>
                          {pos}º
                        </span>
                        <span className="text-[13px] font-extrabold">{g.total_points} pts</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Lista */}
            {(resto.length > 0 || (guest && minhaPos && !euNaLista)) && (
              <section className="overflow-hidden rounded-[20px] bg-white shadow-[0_2px_10px_rgba(20,40,30,0.07)]">
                <ul className="divide-y divide-[#E1E6DE]">
                  {resto.map((g, i) => {
                    const souEu = guest?.id === g.id;
                    return (
                      <li
                        key={g.id}
                        className={`flex items-center gap-3 px-4 py-3 ${souEu ? "bg-[#FFF5E0] outline-dashed outline-2 -outline-offset-2 outline-[#F2B13B]" : ""}`}
                      >
                        <span className="w-8 font-extrabold text-[#5B6B60]">{i + 4}º</span>
                        <span className="flex-1 font-extrabold">{souEu ? `Você · ${familia(g.name)}` : familia(g.name)}</span>
                        <span className="font-extrabold">{g.total_points} pts</span>
                      </li>
                    );
                  })}
                  {guest && minhaPos && !euNaLista && (
                    <li className="flex items-center gap-3 bg-[#FFF5E0] px-4 py-3 outline-dashed outline-2 -outline-offset-2 outline-[#F2B13B]">
                      <span className="w-8 font-extrabold">{minhaPos}º</span>
                      <span className="flex-1 font-extrabold">Você · {familia(guest.name)}</span>
                      <span className="font-extrabold">{guest.total_points} pts</span>
                    </li>
                  )}
                </ul>
              </section>
            )}
          </>
        )}

        {guest ? (
          <section className="rounded-[20px] bg-white p-4 shadow-[0_2px_10px_rgba(20,40,30,0.07)]">
            <h2 className="text-lg font-extrabold" style={FONTE_TITULO}>
              Como subir no ranking
            </h2>
            <p className="text-[15px] text-[#5B6B60]">✅ Check-in nas atividades · ⭐ Avaliar · 🎮 Jogos</p>
          </section>
        ) : (
          <section className="rounded-[20px] bg-white p-4 text-center shadow-[0_2px_10px_rgba(20,40,30,0.07)]">
            <h2 className="text-lg font-extrabold" style={FONTE_TITULO}>
              Quer aparecer no ranking?
            </h2>
            <p className="text-[15px] text-[#5B6B60]">Entre com o seu apartamento e participe das atividades.</p>
            <button
              type="button"
              onClick={() => navigate("/guest-auth")}
              className="mt-3 h-12 w-full rounded-2xl bg-[#1F4D3A] font-extrabold text-white"
            >
              Entrar e ganhar 50 pontos
            </button>
          </section>
        )}

        <Link
          to="/hall-of-fame"
          className="flex h-12 items-center justify-center rounded-2xl bg-white font-extrabold shadow-[0_2px_10px_rgba(20,40,30,0.07)]"
        >
          ⭐ Ver o Hall da Fama
        </Link>
      </div>
    </HotelLayout>
  );
};

export default Ranking;
