import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { HotelLayout, HotelPageHeader, FONTE_TITULO } from "@/components/hotel/HotelLayout";
import { familia } from "@/lib/familia";

interface Winner {
  id: string;
  guest_name: string;
  final_position: number;
  total_points: number;
  prize_name: string | null;
  ranking_periods: {
    period_number: number;
    start_date: string;
    end_date: string;
  } | null;
}

const ROSA = "#DB2777";

const dataCurta = (d: string) => {
  const [, m, dia] = d.slice(0, 10).split("-");
  return `${dia}/${m}`;
};

const HallOfFame = () => {
  const [campeoes, setCampeoes] = useState<Winner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ativo = true;
    (async () => {
      try {
        const { data } = await supabase
          .from("ranking_winners")
          .select("id, guest_name, final_position, total_points, prize_name, ranking_periods(period_number, start_date, end_date)")
          .eq("final_position", 1);
        if (!ativo) return;
        const lista = ((data as unknown as Winner[]) ?? []).filter((w) => w.ranking_periods);
        lista.sort((a, b) => (b.ranking_periods!.start_date > a.ranking_periods!.start_date ? 1 : -1));
        setCampeoes(lista);
      } catch (e) {
        console.error("Erro ao carregar o Hall da Fama:", e);
      } finally {
        if (ativo) setLoading(false);
      }
    })();
    return () => {
      ativo = false;
    };
  }, []);

  const [ultimo, ...anteriores] = campeoes;

  return (
    <HotelLayout>
      <HotelPageHeader title="Hall da Fama" subtitle="Os campeões de cada semana na fazenda." back="/ranking" cor={ROSA} />

      <div className="space-y-4 px-4 pt-4">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-7 w-7 animate-spin text-[#DB2777]" />
          </div>
        ) : !ultimo ? (
          <section className="rounded-[20px] bg-white p-6 text-center shadow-[0_2px_10px_rgba(20,40,30,0.07)]">
            <p className="text-4xl" aria-hidden>
              👑
            </p>
            <p className="mt-2 font-extrabold" style={FONTE_TITULO}>
              Ainda não temos campeões
            </p>
            <p className="text-sm text-[#5B6B60]">A primeira família campeã aparece aqui no fim da semana.</p>
          </section>
        ) : (
          <>
            <section
              className="rounded-[20px] px-4 py-5 text-center shadow-[0_2px_10px_rgba(20,40,30,0.07)]"
              style={{ background: "linear-gradient(180deg,#FFF4E0 0%,#FFFFFF 100%)" }}
            >
              <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#9A6A00]">Campeão da semana passada</p>
              <p className="mt-1 text-6xl" aria-hidden>
                👑
              </p>
              <h2 className="mt-1 text-[28px] font-extrabold leading-tight" style={FONTE_TITULO}>
                {familia(ultimo.guest_name)}
              </h2>
              <p className="text-[15px] text-[#5B6B60]">
                {dataCurta(ultimo.ranking_periods!.start_date)} a {dataCurta(ultimo.ranking_periods!.end_date)} ·{" "}
                <b className="text-[#1D2A22]">{ultimo.total_points} pontos</b>
              </p>
              {ultimo.prize_name && <p className="mt-1 text-sm font-bold text-[#DB2777]">🎁 {ultimo.prize_name}</p>}
            </section>

            {anteriores.length > 0 && (
              <section>
                <h2 className="mb-2 text-xl font-extrabold" style={FONTE_TITULO}>
                  Campeões anteriores
                </h2>
                <ul className="space-y-3">
                  {anteriores.map((w) => (
                    <li
                      key={w.id}
                      className="flex items-center gap-3 rounded-[20px] bg-white p-3 shadow-[0_2px_10px_rgba(20,40,30,0.07)]"
                    >
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#FFF4E0] text-2xl" aria-hidden>
                        🏆
                      </span>
                      <span className="flex-1">
                        <span className="block text-[17px] font-extrabold leading-tight" style={FONTE_TITULO}>
                          {familia(w.guest_name)}
                        </span>
                        <span className="block text-sm text-[#5B6B60]">
                          Semana de {dataCurta(w.ranking_periods!.start_date)} a {dataCurta(w.ranking_periods!.end_date)}
                        </span>
                      </span>
                      <span className="font-extrabold">{w.total_points} pts</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}

        <Link
          to="/ranking"
          className="flex h-12 items-center justify-center rounded-2xl bg-[#2563EB] font-extrabold text-white"
        >
          🏆 Ver o ranking desta semana
        </Link>
      </div>
    </HotelLayout>
  );
};

export default HallOfFame;
