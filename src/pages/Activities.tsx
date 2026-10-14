import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Star, WifiOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ActivityRating } from "@/components/ActivityRating";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import CheckInButton from "@/components/CheckInButton";
import WhatsAppReminderButton from "@/components/WhatsAppReminderButton";
import { useGuestAuth } from "@/hooks/useGuestAuth";
import { HotelLayout, FONTE_TITULO } from "@/components/hotel/HotelLayout";
import { getLocalDateString } from "@/lib/utils";
import { coresDistintas, emojiDaFaixa } from "@/lib/faixas";

interface Activity {
  id: string;
  name: string;
  description: string | null;
  activity_date: string;
  start_time: string;
  end_time: string;
  is_master: boolean;
}

interface AgeGroup {
  id: string;
  name: string;
  color: string;
  emoji?: string | null;
}

const DIAS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
const hm = (t: string | null | undefined) => (t ?? "").slice(0, 5);
const minutos = (t: string | null | undefined) => {
  if (!t) return 0;
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};
const agoraMin = () => {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
};
const falta = (min: number) => {
  if (min < 60) return `Em ${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `Em ${h}h${m ? String(m).padStart(2, "0") : ""}`;
};
const nota = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** Atividades de hoje de uma faixa etária, em linha do tempo. */
const Activities = () => {
  const { ageGroupId } = useParams();
  const navigate = useNavigate();
  const { guest } = useGuestAuth();
  const [online, setOnline] = useState(navigator.onLine);
  const [atividades, setAtividades] = useState<Activity[]>([]);
  const [faixa, setFaixa] = useState<AgeGroup | null>(null);
  const [cor, setCor] = useState("#1F4D3A");
  const [carregando, setCarregando] = useState(true);
  const [notas, setNotas] = useState<Record<string, { media: number; total: number }>>({});
  const [avaliadas, setAvaliadas] = useState<Set<string>>(new Set());
  const [avaliar, setAvaliar] = useState<Activity | null>(null);
  const [agora, setAgora] = useState(agoraMin());
  const atualRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    const t = setInterval(() => setAgora(agoraMin()), 60000);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
      clearInterval(t);
    };
  }, []);

  const carregarNotas = async (ids: string[]) => {
    if (!ids.length) return;
    const { data } = await supabase.from("activity_ratings").select("activity_id, rating, guest_id").in("activity_id", ids);
    if (!data) return;
    const mapa: Record<string, { media: number; total: number }> = {};
    const minhas = new Set<string>();
    data.forEach((r: { activity_id: string; rating: number; guest_id: string | null }) => {
      mapa[r.activity_id] = mapa[r.activity_id] ?? { media: 0, total: 0 };
      mapa[r.activity_id].media += r.rating;
      mapa[r.activity_id].total++;
      if (guest?.id && r.guest_id === guest.id) minhas.add(r.activity_id);
    });
    Object.values(mapa).forEach((v) => (v.media = v.media / v.total));
    setNotas(mapa);
    setAvaliadas(minhas);
  };

  useEffect(() => {
    let ativo = true;
    const limite = setTimeout(() => ativo && setCarregando(false), 8000);
    (async () => {
      try {
        const [{ data: grupos }, { data: acts }] = await Promise.all([
          supabase.from("age_groups").select("*").eq("is_active", true).order("sort_order", { ascending: true }),
          supabase
            .from("activities")
            .select("*")
            .eq("activity_date", getLocalDateString())
            .or(`age_group_id.eq.${ageGroupId},is_master.eq.true`)
            .order("start_time", { ascending: true }),
        ]);
        if (!ativo) return;
        const lista = (grupos as AgeGroup[]) ?? [];
        const esta = lista.find((g) => g.id === ageGroupId) ?? null;
        if (!esta && ageGroupId) {
          const { data: g } = await supabase.from("age_groups").select("*").eq("id", ageGroupId).maybeSingle();
          if (ativo) setFaixa((g as AgeGroup) ?? null);
        } else {
          setFaixa(esta);
        }
        const cores = coresDistintas(lista);
        if (ageGroupId && cores[ageGroupId]) setCor(cores[ageGroupId]);
        else if (esta?.color) setCor(esta.color);
        setAtividades((acts as Activity[]) ?? []);
        carregarNotas(((acts as Activity[]) ?? []).map((a) => a.id));
      } catch (e) {
        console.error("Erro ao carregar atividades:", e);
      } finally {
        if (ativo) setCarregando(false);
      }
    })();
    return () => {
      ativo = false;
      clearTimeout(limite);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ageGroupId, guest?.id]);

  // Rola até a atividade de agora
  useEffect(() => {
    if (!carregando && atualRef.current) {
      setTimeout(() => atualRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 150);
    }
  }, [carregando]);

  const encerradas = atividades.filter((a) => minutos(a.end_time) <= agora).length;
  const acontecendo = atividades.filter((a) => minutos(a.start_time) <= agora && agora < minutos(a.end_time)).length;
  const faltam = atividades.length - encerradas - acontecendo;
  const hoje = new Date();
  let primeiraAgora = true;

  return (
    <HotelLayout>
      <header className="flex flex-col gap-4 rounded-b-[28px] px-5 pb-6 pt-5 text-white" style={{ background: cor }}>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate("/programacao")}
            aria-label="Voltar à programação"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white/25"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <span className="text-sm font-bold" style={{ textShadow: "0 1px 2px rgba(0,0,0,0.15)" }}>
            Programação · hoje, {DIAS[hoje.getDay()]} {hoje.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
          </span>
        </div>
        <div className="flex items-center gap-3.5">
          <span aria-hidden="true" className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[20px] bg-white/90 text-[36px]">
            {faixa ? emojiDaFaixa(faixa.name, faixa.emoji) : "🎈"}
          </span>
          <div className="flex min-w-0 flex-col" style={{ textShadow: "0 1px 2px rgba(0,0,0,0.15)" }}>
            <h1 className="text-[28px] font-extrabold leading-tight" style={FONTE_TITULO}>
              {faixa?.name ?? "Recreação"}
            </h1>
            <span className="text-[15px] font-semibold">
              {atividades.length} {atividades.length === 1 ? "atividade" : "atividades"} hoje
            </span>
          </div>
        </div>
        {atividades.length > 0 && atividades.length <= 16 && (
          <div
            role="progressbar"
            aria-label="Andamento do dia"
            aria-valuenow={encerradas}
            aria-valuemin={0}
            aria-valuemax={atividades.length}
            className="flex flex-col gap-1.5"
          >
            <div className="grid gap-[5px]" style={{ gridTemplateColumns: `repeat(${atividades.length}, minmax(0,1fr))` }}>
              {atividades.map((a) => {
                const fim = minutos(a.end_time) <= agora;
                const ag = minutos(a.start_time) <= agora && !fim;
                return (
                  <span
                    key={a.id}
                    className={`h-[7px] rounded-full ${fim ? "bg-white" : ag ? "bg-[#FFF4DF] ring-2 ring-white/60" : "bg-white/30"}`}
                  />
                );
              })}
            </div>
            <span className="text-[13px] font-bold" style={{ textShadow: "0 1px 2px rgba(0,0,0,0.15)" }}>
              {encerradas} {encerradas === 1 ? "encerrada" : "encerradas"} · {acontecendo} agora · {faltam} ainda hoje
            </span>
          </div>
        )}
      </header>

      <main className="flex flex-col gap-3.5 py-[18px] pl-4 pr-5">
        {!online && (
          <div className="flex items-center gap-2 rounded-2xl bg-[#FFF4DF] p-3 text-sm font-bold text-[#6B4A0F]">
            <WifiOff className="h-5 w-5" /> Você está sem internet.
          </div>
        )}
        {carregando && <p className="py-8 text-center text-[#5B6B60]">Carregando…</p>}
        {!carregando && atividades.length === 0 && (
          <p className="rounded-[20px] bg-white p-6 text-center text-[#5B6B60]">Nenhuma atividade programada para hoje.</p>
        )}

        {atividades.map((a) => {
          const fim = minutos(a.end_time) <= agora;
          const ag = !fim && minutos(a.start_time) <= agora;
          const n = notas[a.id];
          const jaAvaliou = avaliadas.has(a.id);
          const ref = ag && primeiraAgora ? atualRef : undefined;
          if (ag) primeiraAgora = false;

          return (
            <div key={a.id} ref={ref} className={`grid grid-cols-[60px_1fr] gap-3 ${fim ? "opacity-70" : ""}`}>
              <div className="flex flex-col items-end pt-3.5">
                <b className={`text-lg leading-none ${ag ? "text-[#1E6B3E]" : ""}`} style={FONTE_TITULO}>
                  {hm(a.start_time)}
                </b>
                <span className="whitespace-nowrap text-xs text-[#5B6B60]">até {hm(a.end_time)}</span>
              </div>

              {fim ? (
                <div className="flex items-center justify-between gap-2 rounded-[20px] bg-white px-3.5 py-3 shadow-[0_2px_10px_rgba(20,40,30,0.07)]">
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate text-base font-bold" style={FONTE_TITULO}>
                      {a.name}
                    </span>
                    <span className="flex items-center gap-1 text-[13px] font-bold text-[#5B6B60]">
                      Encerrada
                      {a.is_master && " · Todas as idades"}
                      {n && (
                        <>
                          {" · "}
                          <span className="text-[#F2B13B]">★</span> {nota(n.media)} ({n.total})
                        </>
                      )}
                    </span>
                  </div>
                  {jaAvaliou ? (
                    <span className="shrink-0 text-[13px] font-extrabold text-[#1E6B3E]">✓ Avaliada</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setAvaliar(a)}
                      className="flex h-10 shrink-0 items-center gap-1 rounded-xl bg-[#FFF4DF] px-3 text-sm font-extrabold text-[#6B4A0F]"
                    >
                      ★ Avaliar
                    </button>
                  )}
                </div>
              ) : (
                <div
                  className={`flex flex-col gap-2 rounded-[20px] bg-white shadow-[0_2px_10px_rgba(20,40,30,0.07)] ${
                    ag ? "border-2 border-[#1E8E4E] p-4 shadow-[0_8px_24px_rgba(30,142,78,0.18)]" : "px-4 py-3.5"
                  }`}
                >
                  <div className="flex flex-wrap gap-1.5">
                    {ag ? (
                      <span className="flex items-center gap-1.5 rounded-full bg-[#1E8E4E] px-2.5 py-0.5 text-xs font-extrabold text-white">
                        <span className="relative flex h-2 w-2">
                          <span className="absolute inset-0 animate-ping rounded-full bg-white opacity-70" />
                          <span className="relative h-2 w-2 rounded-full bg-white" />
                        </span>
                        ACONTECENDO AGORA
                      </span>
                    ) : (
                      minutos(a.start_time) - agora <= 180 && (
                        <span className="rounded-full bg-[#FFF4DF] px-2.5 py-0.5 text-xs font-extrabold text-[#8A5A00]">
                          {falta(minutos(a.start_time) - agora)}
                        </span>
                      )
                    )}
                    {a.is_master && (
                      <span className="rounded-full bg-[#E7F0EA] px-2.5 py-0.5 text-xs font-extrabold text-[#1F4D3A]">Todas as idades</span>
                    )}
                  </div>
                  <span className={`font-bold leading-tight ${ag ? "text-[22px] font-extrabold" : "text-[19px]"}`} style={FONTE_TITULO}>
                    {a.name}
                  </span>
                  {a.description && (
                    <span className={`whitespace-pre-line leading-relaxed text-[#3D4A41] ${ag ? "text-[15px]" : "text-sm"}`}>{a.description}</span>
                  )}
                  {n && (
                    <span className="flex items-center gap-1 text-[13px] font-bold text-[#5B6B60]">
                      <span className="text-[#F2B13B]">★</span> {nota(n.media)} · {n.total} {n.total === 1 ? "avaliação" : "avaliações"}
                    </span>
                  )}
                  {ag ? (
                    <div className="mt-1 flex flex-col gap-2">
                      {guest ? (
                        <CheckInButton
                          activityId={a.id}
                          activityStartTime={a.start_time}
                          activityEndTime={a.end_time}
                          activityDate={a.activity_date}
                          estilo="hotel"
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => navigate("/guest-auth")}
                          className="flex h-[50px] items-center justify-center rounded-xl bg-[#1E8E4E] text-base font-extrabold text-white"
                        >
                          Entre para fazer check-in (+10 pts)
                        </button>
                      )}
                      {jaAvaliou ? (
                        <span className="text-center text-sm font-extrabold text-[#1E6B3E]">✓ Você já avaliou</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setAvaliar(a)}
                          className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-[#F4F6F0] text-sm font-extrabold"
                        >
                          <Star className="h-4 w-4" /> Avaliar atividade
                        </button>
                      )}
                    </div>
                  ) : (
                    <WhatsAppReminderButton
                      activityId={a.id}
                      activityStartTime={a.start_time}
                      activityDate={a.activity_date}
                      estilo="hotel"
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}

        {atividades.length > 0 && (
          <p className="ml-[72px] mt-1.5 text-[13px] leading-relaxed text-[#5B6B60]">
            Faça check-in nas atividades para ganhar pontos e subir no ranking. Avaliar também vale pontos!
          </p>
        )}
      </main>

      <Dialog
        open={!!avaliar}
        onOpenChange={(aberto) => {
          if (!aberto) {
            setAvaliar(null);
            carregarNotas(atividades.map((x) => x.id));
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Avaliar: {avaliar?.name}</DialogTitle>
          </DialogHeader>
          {avaliar && <ActivityRating activityId={avaliar.id} activityName={avaliar.name} />}
        </DialogContent>
      </Dialog>
    </HotelLayout>
  );
};

export default Activities;
