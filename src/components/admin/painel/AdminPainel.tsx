import { useEffect, useMemo, useState, type ReactNode } from "react";
import { BedDouble, Check, ChevronRight, Gift, MessageCircle, Megaphone, Star, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

const ymd = (d: Date) => {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return z.toISOString().slice(0, 10);
};
const inicioDoDia = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const somaDias = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const DIAS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const hhmm = (t: string) => t.slice(0, 5);
const minutosAte = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  const agora = new Date();
  return h * 60 + m - (agora.getHours() * 60 + agora.getMinutes());
};
const nota = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

interface Dados {
  aptos: number;
  adultos: number;
  criancas: number;
  sincronizado: string | null;
  checkinsHoje: number;
  checkinsMesmoDiaSemanaPassada: number;
  semana: { dia: string; atual: number; anterior: number; hoje: boolean }[];
  notaSemana: number | null;
  notaAnterior: number | null;
  avaliacoesSemana: number;
  idades: { rotulo: string; valor: number; cor: string }[];
  atividadesHoje: { id: string; name: string; start_time: string; end_time: string; faixa: string }[];
  ranking: { nome: string; media: number; total: number }[];
  pendencias: { tipo: "avaliacao" | "mensagem" | "brinde" | "chegada" | "popup"; titulo: string; detalhe: string; pagina: string }[];
}

const COR_VERDE = "#1F7A55";
const COR_OURO = "#E0A00D";
const COR_ROSA = "#C2417F";
const COR_TURQUESA = "#14907F";
const COR_AZUL = "#1565C0";

const Cartao = ({
  titulo,
  sub,
  children,
  rodape,
  onRodape,
  className = "",
}: {
  titulo: string;
  sub?: string;
  children: ReactNode;
  rodape?: string;
  onRodape?: () => void;
  className?: string;
}) => (
  <section className={`flex min-w-0 flex-col rounded-md bg-white shadow-[0_1px_2px_rgba(16,24,20,.06),0_2px_8px_rgba(16,24,20,.06)] ${className}`}>
    <header className="px-5 pt-4">
      <h3 className="text-lg font-normal text-[#1F5C45]">{titulo}</h3>
      {sub && <p className="text-xs text-[#66736C]">{sub}</p>}
    </header>
    <div className="flex-1 px-5 py-4">{children}</div>
    {rodape && (
      <footer className="border-t border-[#E1E6E3] px-5 py-3 text-right">
        <button
          type="button"
          onClick={onRodape}
          className="text-[13px] font-medium uppercase tracking-wider text-[#1F5C45] hover:underline"
        >
          {rodape} ›
        </button>
      </footer>
    )}
  </section>
);

const Kpi = ({
  rotulo,
  valor,
  sub,
  cor,
  icone,
}: {
  rotulo: string;
  valor: string;
  sub: ReactNode;
  cor: string;
  icone: ReactNode;
}) => (
  <div
    className="grid grid-cols-[1fr_auto] gap-x-3 rounded-md bg-white px-4 py-4 shadow-[0_1px_2px_rgba(16,24,20,.06),0_2px_8px_rgba(16,24,20,.06)]"
    style={{ borderLeft: `4px solid ${cor}` }}
  >
    <div className="min-w-0">
      <div className="text-[28px] font-normal leading-tight tabular-nums">{valor}</div>
      <div className="text-[13px] text-[#66736C]">{rotulo}</div>
    </div>
    <div className="flex h-12 w-12 items-center justify-center rounded-full text-white" style={{ background: cor }}>
      {icone}
    </div>
    <div className="col-span-2 mt-2 text-xs text-[#66736C]">{sub}</div>
  </div>
);

const Variacao = ({ atual, anterior, sufixo = "" }: { atual: number; anterior: number; sufixo?: string }) => {
  if (!anterior && !atual) return <span>sem dados para comparar</span>;
  if (!anterior) return <span>sem comparação</span>;
  const pct = Math.round(((atual - anterior) / anterior) * 100);
  const cor = pct >= 0 ? "text-[#2E7D32]" : "text-[#C62828]";
  return (
    <span>
      <b className={`mr-1 font-medium ${cor}`}>
        {pct >= 0 ? "▲" : "▼"} {Math.abs(pct)}%
      </b>
      {sufixo}
    </span>
  );
};

/** Tela inicial do admin: números do dia, gráficos e pendências. */
export const AdminPainel = ({ isGestor, irPara }: { isGestor: boolean; irPara: (pagina: string) => void }) => {
  const [d, setD] = useState<Dados | null>(null);

  useEffect(() => {
    let ativo = true;
    const carregar = async () => {
      const hoje = inicioDoDia(new Date());
      const ini14 = somaDias(hoje, -13);
      const ini7 = somaDias(hoje, -6);
      const hojeStr = ymd(hoje);
      const amanha = ymd(somaDias(hoje, 1));

      const [stays, sync, checkins, ratings, atividades, faixas, pessoas] = await Promise.all([
        db.from("pms_stays").select("adults, children, arrival_date, uh"),
        db.from("pms_sync_log").select("synced_at").order("synced_at", { ascending: false }).limit(1),
        db.from("activity_checkins").select("checked_in_at").gte("checked_in_at", ini14.toISOString()).limit(10000),
        db
          .from("activity_ratings")
          .select("rating, created_at, room_number, comment, activity_id, activities(name)")
          .gte("created_at", ini14.toISOString())
          .limit(5000),
        db.from("activities").select("id, name, start_time, end_time, age_group_id").eq("activity_date", hojeStr).order("start_time"),
        db.from("age_groups").select("id, name"),
        isGestor ? db.from("pms_stay_guests").select("age") : Promise.resolve({ data: null }),
      ]);

      // Ocupação
      const listaStays = (stays.data ?? []) as { adults: number; children: number; arrival_date: string | null; uh: string }[];
      const adultos = listaStays.reduce((t, s) => t + (s.adults || 0), 0);
      const criancas = listaStays.reduce((t, s) => t + (s.children || 0), 0);
      const chegamHoje = listaStays.filter((s) => s.arrival_date && ymd(new Date(s.arrival_date)) === hojeStr);

      // Check-ins por dia
      const porDia = new Map<string, number>();
      for (const c of (checkins.data ?? []) as { checked_in_at: string }[]) {
        const k = ymd(new Date(c.checked_in_at));
        porDia.set(k, (porDia.get(k) ?? 0) + 1);
      }
      const semana = Array.from({ length: 7 }, (_, i) => {
        const dia = somaDias(ini7, i);
        return {
          dia: DIAS[dia.getDay()],
          atual: porDia.get(ymd(dia)) ?? 0,
          anterior: porDia.get(ymd(somaDias(dia, -7))) ?? 0,
          hoje: i === 6,
        };
      });

      // Avaliações
      type Av = { rating: number; created_at: string; room_number: string | null; comment: string | null; activities: { name: string } | null };
      const avs = (ratings.data ?? []) as Av[];
      const daSemana = avs.filter((a) => new Date(a.created_at) >= ini7);
      const anteriores = avs.filter((a) => new Date(a.created_at) < ini7);
      const media = (l: Av[]) => (l.length ? l.reduce((t, a) => t + a.rating, 0) / l.length : null);
      const porAtividade = new Map<string, { soma: number; total: number }>();
      for (const a of daSemana) {
        const nome = a.activities?.name ?? "Atividade";
        const atual = porAtividade.get(nome) ?? { soma: 0, total: 0 };
        porAtividade.set(nome, { soma: atual.soma + a.rating, total: atual.total + 1 });
      }
      const ranking = [...porAtividade.entries()]
        .map(([nome, v]) => ({ nome, media: v.soma / v.total, total: v.total }))
        .sort((a, b) => b.media - a.media || b.total - a.total)
        .slice(0, 5);

      // Idades
      let idades: Dados["idades"];
      const comIdade = ((pessoas as { data: { age: number | null }[] | null }).data ?? []).filter((p) => typeof p.age === "number");
      if (comIdade.length >= 3) {
        const ate5 = comIdade.filter((p) => (p.age as number) <= 5).length;
        const de6a12 = comIdade.filter((p) => (p.age as number) >= 6 && (p.age as number) <= 12).length;
        const de13a17 = comIdade.filter((p) => (p.age as number) >= 13 && (p.age as number) <= 17).length;
        const adult = comIdade.length - ate5 - de6a12 - de13a17;
        idades = [
          { rotulo: "Adultos", valor: adult, cor: COR_VERDE },
          { rotulo: "13 a 17 anos", valor: de13a17, cor: COR_AZUL },
          { rotulo: "6 a 12 anos", valor: de6a12, cor: COR_OURO },
          { rotulo: "Até 5 anos", valor: ate5, cor: COR_ROSA },
        ].filter((x) => x.valor > 0);
      } else {
        idades = [
          { rotulo: "Adultos", valor: adultos, cor: COR_VERDE },
          { rotulo: "Crianças", valor: criancas, cor: COR_OURO },
        ].filter((x) => x.valor > 0);
      }

      // Pendências
      const pendencias: Dados["pendencias"] = [];
      if (isGestor) {
        const recentes = avs.filter((a) => a.rating <= 2 && new Date(a.created_at) >= somaDias(hoje, -2));
        for (const a of recentes.slice(0, 3)) {
          pendencias.push({
            tipo: "avaliacao",
            titulo: `Avaliação ${a.rating}★${a.room_number ? ` · Apto ${a.room_number}` : ""}`,
            detalhe: a.comment ? `${a.activities?.name ?? ""}: “${a.comment.slice(0, 60)}”` : a.activities?.name ?? "",
            pagina: "avaliacoes",
          });
        }
        const [brindes, msgs, pops] = await Promise.all([
          db.from("brindes_tripadvisor").select("room_number").is("entregue_em", null).limit(50),
          db
            .from("whatsapp_mensagens")
            .select("uh, guest_name, texto")
            .eq("direcao", "entrada")
            .gte("created_at", hoje.toISOString())
            .order("created_at", { ascending: false })
            .limit(20),
          db.from("popups").select("titulo, inicio, dias, ativo").eq("ativo", true),
        ]);
        const lm = (msgs.data ?? []) as { uh: string | null; guest_name: string | null; texto: string }[];
        if (lm.length) {
          pendencias.push({
            tipo: "mensagem",
            titulo: lm.length === 1 ? `Mensagem${lm[0].uh ? ` · Apto ${lm[0].uh}` : ""}` : `${lm.length} mensagens hoje`,
            detalhe: lm.length === 1 ? lm[0].texto.slice(0, 60) : "Respostas pelo WhatsApp do app",
            pagina: "atendimento",
          });
        }
        const lb = (brindes.data ?? []) as { room_number: string | null }[];
        if (lb.length) {
          pendencias.push({
            tipo: "brinde",
            titulo: `${lb.length} ${lb.length === 1 ? "brinde a entregar" : "brindes a entregar"}`,
            detalhe: lb
              .map((b) => b.room_number)
              .filter(Boolean)
              .slice(0, 5)
              .join(", "),
            pagina: "brindes",
          });
        }
        for (const p of (pops.data ?? []) as { titulo: string; inicio: string; dias: number }[]) {
          const [a, m, dd] = p.inicio.split("-").map(Number);
          const fim = ymd(new Date(a, m - 1, dd + p.dias - 1));
          if (fim === hojeStr || fim === amanha) {
            pendencias.push({
              tipo: "popup",
              titulo: fim === hojeStr ? "Popup sai do ar hoje" : "Popup sai do ar amanhã",
              detalhe: p.titulo,
              pagina: "popups",
            });
          }
        }
      }
      if (chegamHoje.length) {
        pendencias.push({
          tipo: "chegada",
          titulo: `${chegamHoje.length} ${chegamHoje.length === 1 ? "apto chega" : "aptos chegam"} hoje`,
          detalhe: chegamHoje
            .map((s) => s.uh)
            .slice(0, 6)
            .join(", "),
          pagina: "hospedes",
        });
      }

      const nomesFaixa = Object.fromEntries(((faixas.data ?? []) as { id: string; name: string }[]).map((f) => [f.id, f.name]));
      const mesmoDia = somaDias(hoje, -7);

      if (!ativo) return;
      setD({
        aptos: listaStays.length,
        adultos,
        criancas,
        sincronizado: sync.data?.[0]?.synced_at ?? null,
        checkinsHoje: porDia.get(hojeStr) ?? 0,
        checkinsMesmoDiaSemanaPassada: porDia.get(ymd(mesmoDia)) ?? 0,
        semana,
        notaSemana: media(daSemana),
        notaAnterior: media(anteriores),
        avaliacoesSemana: daSemana.length,
        idades,
        atividadesHoje: ((atividades.data ?? []) as Dados["atividadesHoje"] & { age_group_id: string }[]).map(
          (a: { id: string; name: string; start_time: string; end_time: string; age_group_id?: string }) => ({
            id: a.id,
            name: a.name,
            start_time: a.start_time,
            end_time: a.end_time,
            faixa: (a.age_group_id && nomesFaixa[a.age_group_id]) || "",
          }),
        ),
        ranking,
        pendencias,
      });
    };
    carregar();
    const t = setInterval(carregar, 5 * 60 * 1000);
    return () => {
      ativo = false;
      clearInterval(t);
    };
  }, [isGestor]);

  const totalSemana = useMemo(() => (d ? d.semana.reduce((t, x) => t + x.atual, 0) : 0), [d]);
  const totalAnterior = useMemo(() => (d ? d.semana.reduce((t, x) => t + x.anterior, 0) : 0), [d]);

  if (!d) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-[118px] animate-pulse rounded-md bg-white/70" />
        ))}
      </div>
    );
  }

  const escala = Math.max(10, ...d.semana.map((x) => Math.max(x.atual, x.anterior)));
  const topo = Math.ceil(escala / 10) * 10;
  const totalIdades = d.idades.reduce((t, x) => t + x.valor, 0);

  // fatias da pizza
  let angulo = -Math.PI / 2;
  const fatias = d.idades.map((x) => {
    const a0 = angulo;
    const a1 = angulo + (totalIdades ? (x.valor / totalIdades) * Math.PI * 2 : 0);
    angulo = a1;
    const p = (a: number) => `${100 + 90 * Math.cos(a)} ${100 + 90 * Math.sin(a)}`;
    const grande = a1 - a0 > Math.PI ? 1 : 0;
    return { ...x, d: a1 - a0 >= Math.PI * 2 - 0.0001 ? null : `M100 100 L${p(a0)} A90 90 0 ${grande} 1 ${p(a1)} Z` };
  });

  const iconePend = (t: Dados["pendencias"][number]["tipo"]) => {
    const base = "flex h-9 w-9 shrink-0 items-center justify-center rounded-full";
    if (t === "avaliacao") return <span className={`${base} bg-[#FDE7E7] text-[#C62828]`}><Star className="h-4 w-4" /></span>;
    if (t === "mensagem") return <span className={`${base} bg-[#FFF1DD] text-[#C77700]`}><MessageCircle className="h-4 w-4" /></span>;
    if (t === "brinde") return <span className={`${base} bg-[#FFF1DD] text-[#C77700]`}><Gift className="h-4 w-4" /></span>;
    if (t === "popup") return <span className={`${base} bg-[#E5EEFA] text-[#1565C0]`}><Megaphone className="h-4 w-4" /></span>;
    return <span className={`${base} bg-[#E5EEFA] text-[#1565C0]`}><BedDouble className="h-4 w-4" /></span>;
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          rotulo="Aptos ocupados"
          valor={String(d.aptos)}
          cor={COR_VERDE}
          icone={<BedDouble className="h-5 w-5" />}
          sub={
            d.sincronizado
              ? `TOTVS: ${new Date(d.sincronizado).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}`
              : "Ainda sem sincronização do TOTVS"
          }
        />
        <Kpi
          rotulo="Hóspedes na casa"
          valor={String(d.adultos + d.criancas)}
          cor={COR_OURO}
          icone={<Users className="h-5 w-5" />}
          sub={`${d.adultos} adultos · ${d.criancas} crianças`}
        />
        <Kpi
          rotulo="Check-ins na recreação hoje"
          valor={String(d.checkinsHoje)}
          cor={COR_ROSA}
          icone={<Check className="h-5 w-5" />}
          sub={<Variacao atual={d.checkinsHoje} anterior={d.checkinsMesmoDiaSemanaPassada} sufixo="que no mesmo dia da semana passada" />}
        />
        <Kpi
          rotulo="Nota média (7 dias)"
          valor={d.notaSemana != null ? nota(d.notaSemana) : "–"}
          cor={COR_TURQUESA}
          icone={<Star className="h-5 w-5" />}
          sub={
            <span>
              {d.notaSemana != null && d.notaAnterior != null && (
                <b className={`mr-1 font-medium ${d.notaSemana >= d.notaAnterior ? "text-[#2E7D32]" : "text-[#C62828]"}`}>
                  {d.notaSemana >= d.notaAnterior ? "▲" : "▼"} {nota(Math.abs(d.notaSemana - d.notaAnterior))}
                </b>
              )}
              {d.avaliacoesSemana} {d.avaliacoesSemana === 1 ? "avaliação" : "avaliações"}
            </span>
          }
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.7fr_1fr]">
        <Cartao
          titulo="Check-ins na recreação"
          sub="Últimos 7 dias, comparado com a semana anterior"
          rodape={isGestor ? "Abrir relatório" : undefined}
          onRodape={() => irPara("estatisticas")}
        >
          <div className="grid gap-4 sm:grid-cols-[140px_1fr] sm:items-center">
            <div className="flex gap-6 sm:flex-col sm:gap-4">
              <div>
                <div className="text-xs text-[#66736C]">Últimos 7 dias</div>
                <div className="text-2xl tabular-nums">{totalSemana}</div>
              </div>
              <div>
                <div className="text-xs text-[#66736C]">7 dias antes</div>
                <div className="text-2xl tabular-nums">{totalAnterior}</div>
              </div>
              <div>
                <div className="text-xs text-[#66736C]">Variação</div>
                <div className={`text-2xl tabular-nums ${totalSemana >= totalAnterior ? "text-[#2E7D32]" : "text-[#C62828]"}`}>
                  {totalAnterior ? `${totalSemana >= totalAnterior ? "+" : ""}${Math.round(((totalSemana - totalAnterior) / totalAnterior) * 100)}%` : "–"}
                </div>
              </div>
            </div>
            <div>
              <div className="mb-2 flex justify-end gap-4 text-xs text-[#66736C]">
                <span className="flex items-center gap-1.5"><i className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: COR_VERDE }} />Últimos 7 dias</span>
                <span className="flex items-center gap-1.5"><i className="inline-block h-2.5 w-2.5 rounded-sm bg-[#A9D3C0]" />Semana anterior</span>
              </div>
              <svg viewBox="0 0 560 260" className="h-auto w-full" role="img" aria-label={`Check-ins por dia: ${d.semana.map((x) => `${x.dia} ${x.atual}`).join(", ")}`}>
                {[1, 2 / 3, 1 / 3].map((f) => (
                  <g key={f}>
                    <line x1="40" x2="560" y1={230 - f * 200} y2={230 - f * 200} stroke="#EDF1EF" />
                    <text x="32" y={234 - f * 200} textAnchor="end" fontSize="12" fill="#66736C">
                      {Math.round(topo * f)}
                    </text>
                  </g>
                ))}
                <line x1="40" x2="560" y1="230" y2="230" stroke="#D5DCD8" />
                <text x="32" y="234" textAnchor="end" fontSize="12" fill="#66736C">0</text>
                {d.semana.map((x, i) => {
                  const bx = 44 + i * 74;
                  const ha = (x.atual / topo) * 200;
                  const hb = (x.anterior / topo) * 200;
                  return (
                    <g key={i}>
                      <rect x={bx + 14} y={230 - hb} width="22" height={hb} rx="2" fill="#A9D3C0" />
                      <rect x={bx + 38} y={230 - ha} width="22" height={ha} rx="2" fill={x.hoje ? COR_OURO : COR_VERDE} />
                      <text x={bx + 37} y="250" textAnchor="middle" fontSize="12" fill="#66736C">
                        {x.hoje ? "hoje" : x.dia}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        </Cartao>

        <Cartao titulo="Hóspedes por idade" sub="Quem está no hotel agora" rodape="Ver hóspedes" onRodape={() => irPara("hospedes")}>
          {totalIdades === 0 ? (
            <p className="text-sm text-[#66736C]">Sem hóspedes sincronizados do TOTVS.</p>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div className="flex flex-wrap justify-center gap-2">
                {d.idades.map((x) => (
                  <span key={x.rotulo} className="inline-flex items-center gap-1.5 rounded bg-[#F3F5F4] px-2 py-1 text-xs">
                    <i className="inline-block h-2 w-3.5 rounded-sm" style={{ background: x.cor }} />
                    {x.rotulo} {x.valor}
                  </span>
                ))}
              </div>
              <svg viewBox="0 0 200 200" className="h-52 w-52" role="img" aria-label={d.idades.map((x) => `${x.rotulo} ${x.valor}`).join(", ")}>
                {fatias.map((f) => (f.d ? <path key={f.rotulo} d={f.d} fill={f.cor} /> : <circle key={f.rotulo} cx="100" cy="100" r="90" fill={f.cor} />))}
              </svg>
            </div>
          )}
        </Cartao>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Cartao
          titulo="Hoje na recreação"
          sub={`${d.atividadesHoje.length} ${d.atividadesHoje.length === 1 ? "atividade" : "atividades"}`}
          rodape="Ver programação"
          onRodape={() => irPara("atividades")}
        >
          {d.atividadesHoje.length === 0 ? (
            <p className="text-sm text-[#66736C]">Nenhuma atividade cadastrada para hoje.</p>
          ) : (
            <ul className="divide-y divide-[#E1E6E3]">
              {d.atividadesHoje.slice(0, 6).map((a) => {
                const ini = minutosAte(a.start_time);
                const fim = minutosAte(a.end_time);
                const chip =
                  ini <= 0 && fim > 0 ? (
                    <span className="rounded-lg bg-[#E6F2E7] px-2.5 py-0.5 text-xs font-medium text-[#2E7D32]">Agora</span>
                  ) : ini > 0 && ini <= 120 ? (
                    <span className="rounded-lg bg-[#E5EEFA] px-2.5 py-0.5 text-xs font-medium text-[#1565C0]">
                      {ini < 60 ? `${ini} min` : `${Math.floor(ini / 60)}h${String(ini % 60).padStart(2, "0")}`}
                    </span>
                  ) : fim <= 0 ? (
                    <span className="text-xs text-[#9AA59F]">Encerrada</span>
                  ) : null;
                return (
                  <li key={a.id} className={`flex items-center gap-3 py-2.5 ${fim <= 0 ? "opacity-60" : ""}`}>
                    <span className="w-12 font-medium tabular-nums text-[#1F5C45]">{hhmm(a.start_time)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{a.name}</span>
                      {a.faixa && <span className="text-[13px] text-[#66736C]">{a.faixa}</span>}
                    </span>
                    {chip}
                  </li>
                );
              })}
            </ul>
          )}
        </Cartao>

        <Cartao titulo="Precisa de você" sub={d.pendencias.length ? `${d.pendencias.length} ${d.pendencias.length === 1 ? "pendência" : "pendências"}` : "Tudo em dia"}>
          {d.pendencias.length === 0 ? (
            <p className="text-sm text-[#66736C]">Nenhuma pendência agora. 🎉</p>
          ) : (
            <ul className="divide-y divide-[#E1E6E3]">
              {d.pendencias.map((p, i) => (
                <li key={i}>
                  <button type="button" onClick={() => irPara(p.pagina)} className="flex w-full items-center gap-3 py-2.5 text-left hover:bg-[#F7F8F7]">
                    {iconePend(p.tipo)}
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">{p.titulo}</span>
                      {p.detalhe && <span className="block truncate text-[13px] text-[#66736C]">{p.detalhe}</span>}
                    </span>
                    <ChevronRight className="h-4 w-4 text-[#9AA59F]" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Cartao>

        <Cartao
          titulo="Mais bem avaliadas"
          sub="Nota média dos últimos 7 dias"
          rodape={isGestor ? "Abrir avaliações" : undefined}
          onRodape={() => irPara("avaliacoes")}
        >
          {d.ranking.length === 0 ? (
            <p className="text-sm text-[#66736C]">Ainda sem avaliações nesta semana.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {d.ranking.map((r) => (
                <div key={r.nome} className="grid grid-cols-[minmax(0,1fr)_90px_32px] items-center gap-3 text-[13px]">
                  <span className="truncate" title={`${r.total} avaliações`}>{r.nome}</span>
                  <span className="relative block h-2 overflow-hidden rounded bg-[#E3EFE9]">
                    <i className="absolute inset-y-0 left-0 rounded" style={{ width: `${(r.media / 5) * 100}%`, background: r.media < 4 ? "#C77700" : "#1F5C45" }} />
                  </span>
                  <b className="text-right font-medium tabular-nums">{nota(r.media)}</b>
                </div>
              ))}
            </div>
          )}
        </Cartao>
      </div>
    </div>
  );
};
