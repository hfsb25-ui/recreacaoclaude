import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PetArt, type PetEyes, type PetSpecies } from "@/components/pet/PetArt";

/** Cuidados do bichinho (tudo de 0 a 100, menos moedas e vistos). */
export interface Cuidados {
  fome: number;
  energia: number;
  diversao: number;
  limpeza: number;
  gordura: number; // 0 magrinho · 40 no ponto · 100 gordinho
  moedas: number; // moedinhas para comprar comida
  xp: number; // crescimento que vem dos cuidados (limitado)
  vistos: number; // check-ins já transformados em presente
  dormindo: boolean;
}

export const XP_CUIDADO_MAX = 45;

const db = supabase as unknown as {
  rpc: (fn: string, args: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
};
const TITULO = { fontFamily: "'Baloo 2', system-ui, sans-serif" };
const lim = (v: number) => Math.max(0, Math.min(100, v));

// quanto cada necessidade cai por minuto (de cheio a vazio em ~5 a 12 horas)
const QUEDA = { fome: 0.3, energia: 0.18, diversao: 0.25, limpeza: 0.14 } as const;
type Necessidade = keyof typeof QUEDA;

const COMIDAS = [
  { e: "🌾", n: "Capim", fome: 12, custo: 0, peso: 1 },
  { e: "🌽", n: "Milho", fome: 20, custo: 2, peso: 3 },
  { e: "🍎", n: "Maçã", fome: 16, diversao: 4, custo: 3, peso: 1 },
  { e: "🍰", n: "Bolo de milho", fome: 18, diversao: 8, custo: 4, peso: 9 },
  { e: "🥛", n: "Leite", fome: 25, energia: 6, custo: 5, peso: 4 },
] as const;

type Comodo = "cozinha" | "banho" | "quarto" | "pasto";
const COMODOS: { id: Comodo; e: string; n: string }[] = [
  { id: "cozinha", e: "🍽️", n: "Cozinha" },
  { id: "banho", e: "🛁", n: "Banho" },
  { id: "quarto", e: "🛏️", n: "Quarto" },
  { id: "pasto", e: "🌳", n: "Pasto" },
];

const FUNDO: Record<Comodo, string> = {
  cozinha: "linear-gradient(#FFF6E3 0 62%, #F4D9A8 62%)",
  banho: "linear-gradient(#DDF1F8 0 62%, #B9DFEA 62%)",
  quarto: "linear-gradient(#E9E2F7 0 62%, #C9B79A 62%)",
  pasto: "linear-gradient(#CFEAF7 0 55%, #9DDFB6 55%)",
};

export const cuidadosIniciais = (checkins: number): Cuidados => ({
  fome: 70, energia: 80, diversao: 60, limpeza: 75, gordura: 40, moedas: 10, xp: 0, vistos: checkins, dormindo: false,
});

/** Junta o que veio do banco com os valores padrão e desconta o tempo que passou. */
export const prepararCuidados = (bruto: Partial<Cuidados> | null | undefined, em: string | null | undefined, checkins: number) => {
  const base = cuidadosIniciais(checkins);
  const c: Cuidados = { ...base, ...(bruto && typeof bruto === "object" ? bruto : {}) };
  if (typeof (bruto as Partial<Cuidados> | undefined)?.vistos !== "number") c.vistos = checkins;
  const ms = em ? Math.min(Date.now() - new Date(em).getTime(), 3 * 864e5) : 0;
  return passarTempo(c, Math.max(0, ms));
};

const passarTempo = (c: Cuidados, ms: number): Cuidados => {
  const min = ms / 60000;
  if (min <= 0) return c;
  const n = { ...c };
  if (n.dormindo) {
    n.energia = lim(n.energia + min * 4);
    n.fome = lim(n.fome - min * QUEDA.fome * 0.4);
    n.diversao = lim(n.diversao - min * QUEDA.diversao * 0.2);
    if (n.energia >= 100) n.dormindo = false;
  } else {
    (Object.keys(QUEDA) as Necessidade[]).forEach((k) => {
      n[k] = lim(n[k] - min * QUEDA[k] * (k === "energia" && n.gordura > 75 ? 1.4 : 1));
    });
  }
  if (n.fome < 15) n.gordura = lim(n.gordura - min * 0.1);
  else n.gordura = lim(n.gordura + (n.gordura > 45 ? -0.05 : 0.02) * min);
  return n;
};

export const formaDoBichinho = (g: number) => (g < 15 ? "magrinho" : g < 60 ? "no ponto" : g < 82 ? "fofinho" : "gordinho");

const corBarra = (v: number) => (v < 20 ? "#D9483B" : v < 45 ? "#F2B13B" : "#10B981");

interface Props {
  guestId: string;
  species: PetSpecies;
  stage: number;
  nome: string;
  checkins: number;
  inicial: Cuidados;
  onChange: (c: Cuidados) => void;
}

interface Efeito {
  id: number;
  x: number;
  y: number;
  e: string;
  tipo: "flutua" | "bolha";
}

/** A casinha do bichinho: necessidades, cômodos e o mini jogo do pasto. */
export const PetCasa = ({ guestId, species, stage, nome, checkins, inicial, onChange }: Props) => {
  const [c, setC] = useState<Cuidados>(inicial);
  const [comodo, setComodo] = useState<Comodo>("pasto");
  const [fala, setFala] = useState<string | null>(null);
  const [anim, setAnim] = useState("pet-breathe");
  const [efeitos, setEfeitos] = useState<Efeito[]>([]);
  const [jogo, setJogo] = useState<null | { pts: number; resta: number; fim: boolean }>(null);
  const cena = useRef<HTMLDivElement>(null);
  const palco = useRef<HTMLDivElement>(null);
  const cRef = useRef(c);
  cRef.current = c;

  // ---------- salvar (no máximo a cada 30s, e ao sair da página) ----------
  const sujo = useRef(false);
  const salvar = useCallback(async () => {
    if (!sujo.current) return;
    sujo.current = false;
    try {
      const { error } = await db.rpc("pet_salvar_cuidados", { p_guest_id: guestId, p_cuidados: cRef.current });
      if (error) throw error;
    } catch {
      // sem a função no banco ou sem internet: guarda no celular para não perder
      try {
        localStorage.setItem(`pet-cuidados-${guestId}`, JSON.stringify({ c: cRef.current, em: new Date().toISOString() }));
      } catch {
        /* sem armazenamento */
      }
    }
  }, [guestId]);

  useEffect(() => {
    const t = setInterval(salvar, 30_000);
    const sair = () => {
      if (document.visibilityState === "hidden") salvar();
    };
    document.addEventListener("visibilitychange", sair);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", sair);
      salvar();
    };
  }, [salvar]);

  const mudar = useCallback(
    (fn: (x: Cuidados) => Cuidados) => {
      setC((atual) => {
        const n = fn(atual);
        sujo.current = true;
        return n;
      });
    },
    [],
  );

  useEffect(() => onChange(c), [c, onChange]);

  // ---------- relógio: as necessidades vão caindo ----------
  useEffect(() => {
    let ultimo = Date.now();
    const t = setInterval(() => {
      const agora = Date.now();
      const ms = agora - ultimo;
      ultimo = agora;
      setC((atual) => {
        const n = passarTempo(atual, ms);
        if (atual.dormindo && !n.dormindo) setTimeout(() => falar("Acordei! ☀️"), 0);
        return n;
      });
    }, 5000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- presente por cada check-in novo na recreação ----------
  useEffect(() => {
    const novos = checkins - cRef.current.vistos;
    if (novos > 0) {
      mudar((x) => ({ ...x, vistos: checkins, moedas: x.moedas + novos * 5, fome: lim(x.fome + 10), diversao: lim(x.diversao + 15) }));
      setTimeout(() => falar(`Obrigado por ir na recreação! Ganhei ${novos * 5} 🪙`), 700);
    } else if (novos < 0) {
      mudar((x) => ({ ...x, vistos: checkins }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkins]);

  // ---------- efeitos ----------
  const falaT = useRef<ReturnType<typeof setTimeout>>();
  const falar = (t: string) => {
    setFala(t);
    clearTimeout(falaT.current);
    falaT.current = setTimeout(() => setFala(null), 2400);
  };
  const efeitoId = useRef(0);
  const efeito = (e: string, cx: number, cy: number, tipo: Efeito["tipo"] = "flutua") => {
    const r = cena.current?.getBoundingClientRect();
    if (!r) return;
    const id = ++efeitoId.current;
    setEfeitos((l) => [...l.slice(-25), { id, e, x: cx - r.left, y: cy - r.top, tipo }]);
    setTimeout(() => setEfeitos((l) => l.filter((x) => x.id !== id)), 1400);
  };
  const centro = () => {
    const r = palco.current?.getBoundingClientRect();
    return r ? [r.left + r.width / 2, r.top + r.height * 0.45] : [0, 0];
  };
  const animar = (a: string, ms = 700) => {
    setAnim(a);
    setTimeout(() => setAnim("pet-breathe"), ms);
  };
  const ganharXp = (n: number) => mudar((x) => ({ ...x, xp: Math.min(XP_CUIDADO_MAX, x.xp + n) }));

  // ---------- humor ----------
  const menor = Math.min(c.fome, c.energia, c.diversao, c.limpeza);
  const humor = c.dormindo ? "dorme" : menor < 20 ? "triste" : c.energia < 30 ? "sono" : (c.fome + c.energia + c.diversao + c.limpeza) / 4 > 65 ? "feliz" : "ok";
  const olhos: PetEyes = humor === "dorme" ? "sleep" : humor === "feliz" ? "happy" : humor === "sono" ? "blink" : "open";

  const pedido = () => {
    const x = cRef.current;
    if (x.fome < 30) return "Tô com fome! 🌽";
    if (x.limpeza < 30) return "Tô todo sujo de lama…";
    if (x.energia < 25) return "Tô morrendo de sono…";
    if (x.diversao < 30) return "Que tédio… vamos brincar?";
    if (x.gordura > 80) return "Tô pesadinho… vamos correr no pasto?";
    if (x.gordura < 15) return "Tô magrinho… me dá um milho?";
    const l = humor === "feliz" ? ["Te adoro! 💚", "Que dia lindo na fazenda!", "Me leva na recreação?"] : ["Oi! 👋", "Vamos brincar?", "Bora pra recreação?"];
    return l[Math.floor(Math.random() * l.length)];
  };

  // ---------- carinho e banho ----------
  const ultimoCarinho = useRef(0);
  const esfregando = useRef(false);
  const toque = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (comodo === "banho") {
      esfregando.current = true;
      e.currentTarget.setPointerCapture(e.pointerId);
      esfregar(e.clientX, e.clientY);
      return;
    }
    if (c.dormindo) return falar("Zzz… (shhh, tá dormindo)");
    efeito("💗", e.clientX, e.clientY);
    animar("pet-hop", 650);
    if (Date.now() - ultimoCarinho.current > 1200) {
      ultimoCarinho.current = Date.now();
      mudar((x) => ({ ...x, diversao: lim(x.diversao + 3) }));
      ganharXp(0.5);
    }
    falar(pedido());
  };
  const esfregar = (x: number, y: number) => {
    if (cRef.current.dormindo) return;
    if (Math.random() < 0.5) efeito("", x, y, "bolha");
    const antes = cRef.current.limpeza;
    mudar((v) => ({ ...v, limpeza: lim(v.limpeza + 0.8) }));
    if (antes < 100 && antes + 0.8 >= 100) {
      falar("Cheiroso! ✨");
      ganharXp(2);
    }
  };
  const soltar = () => {
    if (esfregando.current) {
      esfregando.current = false;
      if (cRef.current.limpeza > 60 && cRef.current.limpeza < 100) falar("Tá ficando limpinho!");
    }
  };

  // ---------- ações dos cômodos ----------
  const comer = (comida: (typeof COMIDAS)[number], el: HTMLElement) => {
    if (c.dormindo) return falar("Tá dormindo… acorde ele no quarto");
    if (c.fome >= 100 && c.gordura >= 100) return falar("Não cabe mais nada! 🫃");
    if (c.moedas < comida.custo) return falar(`Preciso de ${comida.custo} 🪙 pra isso`);
    const cheio = c.fome > 85;
    mudar((x) => ({
      ...x,
      moedas: x.moedas - comida.custo,
      gordura: lim(x.gordura + comida.peso * (cheio ? 2.5 : 1)),
      fome: lim(x.fome + comida.fome),
      diversao: lim(x.diversao + ("diversao" in comida ? comida.diversao : 0)),
      energia: lim(x.energia + ("energia" in comida ? comida.energia : 0)),
      limpeza: lim(x.limpeza - 2),
    }));
    ganharXp(1);
    const r = el.getBoundingClientRect();
    efeito(comida.e, r.left + r.width / 2, r.top);
    animar("pet-chomp", 1400);
    const g = c.gordura;
    setTimeout(() => falar(cheio ? (g > 75 ? "Ufa… tô ficando redondinho! 🫃" : "Comi demais… 😅") : ["Hmm, delícia!", "Nham nham!", "Mais! 😋"][Math.floor(Math.random() * 3)]), 900);
  };

  const chuveiro = () => {
    if (c.dormindo) return;
    const [x, y] = centro();
    for (let i = 0; i < 8; i++) setTimeout(() => efeito("💧", x + (Math.random() - 0.5) * 120, y - 60 + Math.random() * 40), i * 70);
    if (c.limpeza < 95) ganharXp(1);
    mudar((v) => ({ ...v, limpeza: lim(v.limpeza + 25) }));
    falar("Splash! 🚿");
  };

  const pesoKg = Math.round([35, 90, 180, 320][Math.max(0, Math.min(3, stage))] * (0.8 + (c.gordura / 100) * 0.6));

  const luz = () => {
    const dorme = !c.dormindo;
    mudar((x) => ({ ...x, dormindo: dorme }));
    falar(dorme ? "Boa noite… 💤" : c.energia > 80 ? "Que soneca boa!" : "Ainda tô com sono…");
  };

  // ---------- mini jogo: pega-maçã ----------
  const [macas, setMacas] = useState<{ id: number; x: number; boa: boolean; dur: number }[]>([]);
  const jogoRef = useRef(jogo);
  jogoRef.current = jogo;
  const iniciarJogo = () => {
    if (c.dormindo) return;
    if (c.energia < 15) return falar("Tô cansado demais pra brincar…");
    setJogo({ pts: 0, resta: 20, fim: false });
  };
  useEffect(() => {
    if (!jogo || jogo.fim) return;
    const relogio = setInterval(() => {
      setJogo((j) => (j && !j.fim ? { ...j, resta: j.resta - 1 } : j));
    }, 1000);
    let id = 0;
    let vivo = true;
    const cair = () => {
      if (!vivo) return;
      const w = cena.current?.clientWidth ?? 300;
      const m = { id: ++id, x: 10 + Math.random() * (w - 60), boa: Math.random() > 0.15, dur: 2200 + Math.random() * 1400 };
      setMacas((l) => [...l, m]);
      setTimeout(() => setMacas((l) => l.filter((x) => x.id !== m.id)), m.dur);
      setTimeout(cair, 380 + Math.random() * 420);
    };
    cair();
    return () => {
      vivo = false;
      clearInterval(relogio);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jogo?.fim, jogo === null]);
  useEffect(() => {
    if (jogo && !jogo.fim && jogo.resta <= 0) {
      const pts = jogo.pts;
      setJogo({ ...jogo, fim: true });
      setMacas([]);
      mudar((x) => ({
        ...x,
        moedas: x.moedas + Math.ceil(pts / 2),
        diversao: lim(x.diversao + 10 + pts),
        energia: lim(x.energia - 8),
        fome: lim(x.fome - 4),
        limpeza: lim(x.limpeza - 6),
        gordura: lim(x.gordura - 4 - pts * 0.4),
      }));
      ganharXp(2 + Math.min(4, pts / 4));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jogo?.resta]);
  const pegar = (m: { id: number; boa: boolean }, e: ReactPointerEvent) => {
    e.stopPropagation();
    efeito(m.boa ? "+1" : "💥", e.clientX, e.clientY);
    setMacas((l) => l.filter((x) => x.id !== m.id));
    setJogo((j) => (j ? { ...j, pts: m.boa ? j.pts + 1 : Math.max(0, j.pts - 2) } : j));
  };

  // ---------- desenho ----------
  const g = c.gordura / 100;
  const largura = 0.86 + g * 0.36;
  const sujeira = (100 - c.limpeza) / 100;
  const escuro = comodo === "quarto" && c.dormindo;
  const dica =
    comodo === "cozinha" ? "Escolha a comida" : comodo === "banho" ? `Esfregue o ${nome} com o dedo 🧽` : comodo === "quarto" ? (c.dormindo ? "Dormindo… a energia está voltando" : "Apague a luz para ele dormir") : `Toque no ${nome} para fazer carinho`;

  const barras: { k: Necessidade; e: string; n: string }[] = [
    { k: "fome", e: "🍎", n: "Fome" },
    { k: "energia", e: "⚡", n: "Energia" },
    { k: "diversao", e: "🎾", n: "Diversão" },
    { k: "limpeza", e: "🫧", n: "Limpeza" },
  ];

  return (
    <div className="overflow-hidden rounded-[24px] bg-white shadow-[0_2px_10px_rgba(20,40,30,0.07)]">
      {/* necessidades */}
      <div className="flex items-center gap-2 px-4 pt-3">
        <span className="text-sm font-extrabold text-[#5B6B60]">{formaDoBichinho(c.gordura)}</span>
        <span className="ml-auto flex items-center gap-1 rounded-full bg-[#FFF4E0] px-3 py-1 text-sm font-extrabold tabular-nums" title="Moedas">
          🪙 {c.moedas}
        </span>
      </div>
      <div className="grid grid-cols-4 gap-2 px-3 pb-3 pt-2">
        {barras.map(({ k, e, n }) => (
          <div key={k} className="flex flex-col items-center gap-0.5" title={`${n}: ${Math.round(c[k])}%`}>
            <div
              className={`grid h-12 w-12 place-items-center rounded-full ${c[k] < 20 ? "animate-pulse" : ""}`}
              style={{ background: `conic-gradient(${corBarra(c[k])} ${Math.round(c[k])}%, #E8ECE6 0)` }}
              role="meter"
              aria-label={n}
              aria-valuenow={Math.round(c[k])}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <span className="grid h-[38px] w-[38px] place-items-center rounded-full bg-white text-xl">{e}</span>
            </div>
            <span className="text-[11px] font-extrabold text-[#5B6B60]">{n}</span>
          </div>
        ))}
      </div>

      {/* cômodo */}
      <div
        ref={cena}
        className="relative h-[380px] select-none overflow-hidden transition-[background] duration-500"
        style={{ background: escuro ? "linear-gradient(#1E2340 0 62%, #3A3226 62%)" : FUNDO[comodo] }}
      >
        <div className="absolute right-4 top-3 grid h-14 w-16 place-items-center rounded-lg border-4 border-white text-2xl shadow-sm" style={{ background: escuro ? "#0E1430" : "#BFE3F5" }} aria-hidden>
          {escuro ? "🌙" : "☀️"}
        </div>
        {comodo === "pasto" && (
          <svg className="absolute inset-x-0 top-[47%] h-11 w-full" viewBox="0 0 400 46" preserveAspectRatio="none" aria-hidden>
            <g fill="#A0673B">
              <rect x="0" y="12" width="400" height="7" rx="2" />
              <rect x="0" y="27" width="400" height="7" rx="2" />
              {[14, 74, 134, 194, 254, 314, 374].map((x) => (
                <rect key={x} x={x} y="2" width="9" height="44" rx="2" />
              ))}
            </g>
          </svg>
        )}
        <span className={`absolute left-3 top-3 max-w-[calc(100%-110px)] rounded-full px-3 py-1 text-xs font-extrabold ${escuro ? "bg-black/30 text-[#E9E2F7]" : "bg-white/75 text-[#5B6B60]"}`}>
          {dica}
        </span>
        {fala && (
          <div className="absolute left-1/2 top-12 z-10 max-w-[90%] -translate-x-1/2 truncate rounded-2xl bg-white px-3 py-1.5 text-sm font-extrabold shadow" role="status">
            {fala}
          </div>
        )}

        {/* bichinho */}
        <div
          ref={palco}
          role="button"
          tabIndex={0}
          aria-label={comodo === "banho" ? `Dar banho no ${nome}` : `Fazer carinho no ${nome}`}
          onPointerDown={toque}
          onPointerMove={(e) => esfregando.current && esfregar(e.clientX, e.clientY)}
          onPointerUp={soltar}
          onPointerCancel={soltar}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              if (comodo === "banho") mudar((x) => ({ ...x, limpeza: lim(x.limpeza + 10) }));
              else {
                animar("pet-hop", 650);
                falar(pedido());
              }
            }
          }}
          className="absolute bottom-[58px] left-1/2 w-[230px] -translate-x-1/2 cursor-pointer touch-none focus-visible:outline focus-visible:outline-4 focus-visible:outline-[#F2B13B]"
        >
          <div style={{ transform: `scaleX(${largura.toFixed(3)})`, transformOrigin: "50% 95%", transition: "transform .6s" }}>
            <PetArt species={species} stage={stage} size={230} eyes={olhos} bodyClassName={anim} />
          </div>
          {sujeira > 0.25 && (
            <svg className="pointer-events-none absolute inset-0" viewBox="0 0 200 200" aria-hidden>
              <g fill="#7B5A3A" opacity={Math.min(0.8, (sujeira - 0.2) * 1.3)}>
                <circle cx="70" cy="160" r="9" />
                <circle cx="82" cy="168" r="5" />
                <circle cx="132" cy="150" r="8" />
                <circle cx="120" cy="96" r="5" />
                <circle cx="80" cy="118" r="4" />
              </g>
              {sujeira > 0.7 && <text x="150" y="70" fontSize="16">🪰</text>}
            </svg>
          )}
        </div>

        {/* efeitos */}
        {efeitos.map((f) =>
          f.tipo === "bolha" ? (
            <span
              key={f.id}
              className="pointer-events-none absolute z-10 h-5 w-5 rounded-full border border-white"
              style={{ left: f.x - 10, top: f.y - 10, background: "radial-gradient(circle at 35% 35%, #fff, rgba(255,255,255,.4) 60%, rgba(160,210,235,.5))", animation: "casa-bolha 1.4s ease-out forwards" }}
            />
          ) : (
            <span key={f.id} className="pointer-events-none absolute z-10 text-2xl font-extrabold" style={{ left: f.x - 13, top: f.y - 13, animation: "casa-sobe 1.1s ease-out forwards" }}>
              {f.e}
            </span>
          ),
        )}

        {/* ações */}
        {!jogo && (
          <div className="absolute inset-x-0 bottom-2.5 z-[5] flex flex-wrap justify-center gap-2 px-3">
            {comodo === "cozinha" &&
              COMIDAS.map((f) => (
                <button
                  key={f.n}
                  type="button"
                  onClick={(e) => comer(f, e.currentTarget)}
                  aria-label={`${f.n}, ${f.custo ? `${f.custo} moedas` : "grátis"}`}
                  className="flex h-[54px] w-[54px] flex-col items-center justify-center rounded-2xl bg-white text-[26px] leading-none shadow-[0_3px_0_rgba(0,0,0,.08)] active:translate-y-0.5"
                >
                  {f.e}
                  <span className="mt-0.5 text-[10px] font-extrabold text-[#5B6B60]">{f.custo ? `${f.custo} 🪙` : "grátis"}</span>
                </button>
              ))}
            {comodo === "banho" && (
              <>
                <BotaoCasa onClick={chuveiro}>🚿 Chuveiro</BotaoCasa>
                <BotaoCasa onClick={() => falar(`Peso: ${pesoKg} kg · ${formaDoBichinho(c.gordura)}`)}>⚖️ Balança</BotaoCasa>
              </>
            )}
            {comodo === "quarto" && (
              <BotaoCasa onClick={luz} principal>
                {c.dormindo ? "💡 Acender a luz" : "🌙 Apagar a luz"}
              </BotaoCasa>
            )}
            {comodo === "pasto" && (
              <BotaoCasa onClick={iniciarJogo} principal disabled={c.dormindo}>
                🍎 Pega-maçã
              </BotaoCasa>
            )}
          </div>
        )}

        {/* mini jogo */}
        {jogo && (
          <div className="absolute inset-0 z-20">
            <div className="flex justify-between bg-white px-4 py-2 text-xl font-extrabold shadow-sm" style={TITULO}>
              <span>🍎 {jogo.pts}</span>
              <span>{Math.max(0, jogo.resta)}s</span>
            </div>
            {macas.map((m) => (
              <span
                key={m.id}
                onPointerDown={(e) => pegar(m, e)}
                className="absolute top-[-40px] cursor-pointer text-[38px]"
                style={{ left: m.x, animation: `casa-cai ${m.dur}ms linear forwards` }}
              >
                {m.boa ? "🍎" : "🪨"}
              </span>
            ))}
            {jogo.fim && (
              <div className="absolute inset-0 grid place-items-center bg-[#F4F6F0]/85">
                <div className="flex max-w-[260px] flex-col items-center gap-2 rounded-[22px] bg-white px-6 py-5 text-center shadow-lg">
                  <span className="text-5xl">{jogo.pts >= 15 ? "🏆" : jogo.pts >= 8 ? "🎉" : "🙂"}</span>
                  <span className="text-2xl font-extrabold" style={TITULO}>
                    {jogo.pts} maçãs!
                  </span>
                  <span className="font-extrabold text-[#5B6B60]">Você ganhou {Math.ceil(jogo.pts / 2)} 🪙</span>
                  <BotaoCasa
                    principal
                    onClick={() => {
                      setJogo(null);
                      falar(jogo.pts >= 8 ? "Foi muito divertido!" : "Vamos de novo?");
                    }}
                  >
                    Voltar pro pasto
                  </BotaoCasa>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* cômodos */}
      <nav className="grid grid-cols-4 border-t border-[#E1E6DE]" aria-label="Cômodos do bichinho">
        {COMODOS.map((x) => (
          <button
            key={x.id}
            type="button"
            disabled={Boolean(jogo && !jogo.fim)}
            onClick={() => setComodo(x.id)}
            aria-current={comodo === x.id ? "page" : undefined}
            className={`flex flex-col items-center gap-0.5 py-2 text-xs font-extrabold ${comodo === x.id ? "text-[#1F4D3A]" : "text-[#5B6B60]"}`}
          >
            <span className={`text-2xl leading-tight ${comodo === x.id ? "scale-110" : "opacity-60 grayscale-[.6]"}`}>{x.e}</span>
            {x.n}
          </button>
        ))}
      </nav>
    </div>
  );
};

const BotaoCasa = ({ children, onClick, principal, disabled }: { children: React.ReactNode; onClick: () => void; principal?: boolean; disabled?: boolean }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`inline-flex items-center gap-1.5 rounded-2xl px-4 py-2.5 text-[15px] font-extrabold shadow-[0_3px_0_rgba(0,0,0,.08)] active:translate-y-0.5 disabled:opacity-50 ${
      principal ? "bg-[#1F4D3A] text-white" : "bg-white text-[#1D2A22]"
    }`}
  >
    {children}
  </button>
);
