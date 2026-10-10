import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { PetArt, type PetEyes, type PetSpecies } from "./PetArt";

interface Props {
  species: PetSpecies;
  stage: number;
  name: string;
  size?: number;
  /** moldura (cenário) em volta da área do bichinho; os botões ficam abaixo dela */
  frame?: (pet: ReactNode) => ReactNode;
}

const VOICE: Record<PetSpecies, string> = {
  pintinho: "Piu piu!",
  potrinho: "Hiii-rrin!",
  leitaozinho: "Oinc oinc!",
  bezerrinho: "Muuuu!",
};

const TAP_LINES = [
  "Obrigado por cuidar de mim!",
  "Vamos para a recreação?",
  "Que dia lindo na fazenda!",
  "Eu gosto muito de você!",
  "Me leva na próxima atividade?",
];

const PET_LINES = ["Hihi, faz cosquinha!", "Que carinho bom!", "Mais, mais!"];
const FOOD_LINES = ["Nham nham!", "Que delícia!", "Hmm, maçã fresquinha!"];
const PLAY_LINES = ["Eba! De novo!", "Peguei! Peguei!", "Que divertido!"];

const pick = (list: string[]) => list[Math.floor(Math.random() * list.length)];
const isNight = () => {
  const h = new Date().getHours();
  return h >= 21 || h < 7;
};

interface Heart {
  id: number;
  x: number;
  dx: number;
}

/** Bichinho que respira, pisca e reage a toque, carinho, comida e brincadeira. */
export const InteractivePet = ({ species, stage, name, size = 240, frame = (pet) => pet }: Props) => {
  const [anim, setAnim] = useState("pet-breathe");
  const [eyes, setEyes] = useState<PetEyes | undefined>(undefined);
  const [bubble, setBubble] = useState<{ id: number; text: string } | null>(null);
  const [hearts, setHearts] = useState<Heart[]>([]);
  const [prop, setProp] = useState<{ id: number; kind: "apple" | "ball" } | null>(null);
  const [night, setNight] = useState(isNight());
  const [awakeUntil, setAwakeUntil] = useState(0);
  const [, setTick] = useState(0);

  const idRef = useRef(0);
  const animTimer = useRef<number>();
  const eyesTimer = useRef<number>();
  const press = useRef<{ x: number; y: number; moved: number; lastHeart: number } | null>(null);

  const sleepingByDefault = stage === 0 || night;
  const isAwake = Date.now() < awakeUntil;
  const baseEyes: PetEyes = sleepingByDefault && !isAwake ? "sleep" : "open";
  const shownEyes = eyes ?? baseEyes;

  // volta a dormir quando acaba o tempo acordado
  useEffect(() => {
    const ms = awakeUntil - Date.now();
    if (ms <= 0) return;
    const t = window.setTimeout(() => setTick((n) => n + 1), ms + 50);
    return () => window.clearTimeout(t);
  }, [awakeUntil]);

  // relógio: atualiza dia/noite a cada minuto
  useEffect(() => {
    const t = window.setInterval(() => setNight(isNight()), 60_000);
    return () => window.clearInterval(t);
  }, []);

  // piscar de vez em quando quando está acordado e tranquilo
  useEffect(() => {
    if (baseEyes !== "open") return;
    let alive = true;
    let t: number;
    const loop = () => {
      t = window.setTimeout(() => {
        if (!alive) return;
        setEyes((cur) => (cur === undefined ? "blink" : cur));
        window.setTimeout(() => alive && setEyes((cur) => (cur === "blink" ? undefined : cur)), 150);
        loop();
      }, 2500 + Math.random() * 3500);
    };
    loop();
    return () => {
      alive = false;
      window.clearTimeout(t);
    };
  }, [baseEyes]);

  const play = useCallback((cls: string, ms: number) => {
    window.clearTimeout(animTimer.current);
    setAnim("");
    // novo frame para reiniciar a animação mesmo se for a mesma
    requestAnimationFrame(() => setAnim(cls));
    animTimer.current = window.setTimeout(() => setAnim("pet-breathe"), ms);
  }, []);

  const showEyes = useCallback((mode: PetEyes, ms: number) => {
    window.clearTimeout(eyesTimer.current);
    setEyes(mode);
    eyesTimer.current = window.setTimeout(() => setEyes(undefined), ms);
  }, []);

  const say = useCallback((text: string) => {
    idRef.current += 1;
    setBubble({ id: idRef.current, text });
  }, []);

  const addHearts = useCallback((n: number, x?: number) => {
    const fresh: Heart[] = Array.from({ length: n }, () => {
      idRef.current += 1;
      return { id: idRef.current, x: x ?? 35 + Math.random() * 30, dx: Math.round(Math.random() * 60 - 30) };
    });
    setHearts((h) => [...h.slice(-14), ...fresh]);
  }, []);

  const tap = () => {
    if (sleepingByDefault && !isAwake) {
      setAwakeUntil(Date.now() + 4000);
      play("pet-wiggle", 1000);
      say(night ? "Shhh… estou com soninho 😴" : `${VOICE[species]} *bocejo*`);
      return;
    }
    play("pet-hop", 620);
    addHearts(2);
    say(Math.random() < 0.4 ? VOICE[species] : pick(TAP_LINES));
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    press.current = { x: e.clientX, y: e.clientY, moved: 0, lastHeart: 0 };
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const p = press.current;
    if (!p) return;
    const d = Math.hypot(e.clientX - p.x, e.clientY - p.y);
    p.x = e.clientX;
    p.y = e.clientY;
    p.moved += d;
    if (p.moved - p.lastHeart > 45) {
      p.lastHeart = p.moved;
      const rect = e.currentTarget.getBoundingClientRect();
      addHearts(1, ((e.clientX - rect.left) / rect.width) * 100);
      if (p.lastHeart < 90) {
        say(pick(PET_LINES));
        play("pet-wiggle", 1000);
      }
      setAwakeUntil(Date.now() + 3000);
      showEyes("happy", 900);
    }
  };

  const onPointerUp = () => {
    const p = press.current;
    press.current = null;
    if (p && p.moved < 12) tap();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      tap();
    }
  };

  const feed = () => {
    idRef.current += 1;
    setProp({ id: idRef.current, kind: "apple" });
    setAwakeUntil(Date.now() + 4000);
    window.setTimeout(() => {
      play("pet-chomp", 1450);
      showEyes("happy", 1450);
      say(pick(FOOD_LINES));
    }, 950);
  };

  const ball = () => {
    idRef.current += 1;
    setProp({ id: idRef.current, kind: "ball" });
    setAwakeUntil(Date.now() + 4000);
    window.setTimeout(() => {
      play("pet-hop-twice", 1250);
      addHearts(2);
      say(pick(PLAY_LINES));
    }, 450);
  };

  useEffect(
    () => () => {
      window.clearTimeout(animTimer.current);
      window.clearTimeout(eyesTimer.current);
    },
    []
  );

  const sleepingNow = night && !isAwake;

  return (
    <div className="flex flex-col items-center w-full">
      {frame(
      <div className="relative" style={{ width: size, height: size }}>
        {bubble && (
          <div
            key={bubble.id}
            className="pet-bubble pointer-events-none absolute left-1/2 top-0 z-10 max-w-[220px] whitespace-nowrap rounded-2xl bg-white px-3 py-1.5 text-[15px] font-semibold text-[#3B2A1A] shadow-[0_2px_0_#E3D7C3]"
            onAnimationEnd={() => setBubble((b) => (b?.id === bubble.id ? null : b))}
            role="status"
          >
            {bubble.text}
            <span className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 bg-white" aria-hidden />
          </div>
        )}

        {hearts.map((h) => (
          <span
            key={h.id}
            className="pet-heart pointer-events-none absolute z-10 text-2xl"
            style={{ left: `${h.x}%`, top: "38%", ["--dx" as string]: `${h.dx}px` }}
            onAnimationEnd={() => setHearts((list) => list.filter((x) => x.id !== h.id))}
            aria-hidden
          >
            💗
          </span>
        ))}

        {prop && (
          <span
            key={prop.id}
            className={`pointer-events-none absolute z-10 text-3xl ${prop.kind === "apple" ? "pet-drop" : "pet-ball"}`}
            style={prop.kind === "apple" ? { left: "58%", top: "62%" } : { left: "45%", top: "72%" }}
            onAnimationEnd={() => setProp((p) => (p?.id === prop.id ? null : p))}
            aria-hidden
          >
            {prop.kind === "apple" ? "🍎" : "🎾"}
          </span>
        )}

        <div
          role="button"
          tabIndex={0}
          aria-label={`Fazer carinho em ${name}`}
          className="h-full w-full cursor-pointer touch-none select-none rounded-full focus-visible:outline focus-visible:outline-4 focus-visible:outline-[#2E7BC4]"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={() => (press.current = null)}
          onKeyDown={onKeyDown}
        >
          <PetArt species={species} stage={stage} size={size} eyes={shownEyes} bodyClassName={anim} />
        </div>
      </div>
      )}

      <p className="mt-1 text-sm text-[#5C4630]">
        {sleepingNow ? `${name} está dormindo. Volte amanhã cedo!` : `Toque em ${name} ou faça carinho com o dedo`}
      </p>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={feed}
          disabled={sleepingNow || prop !== null}
          className="rounded-full bg-white px-4 py-2 font-semibold text-[#3B2A1A] ring-1 ring-[#E3D7C3] disabled:opacity-50 focus-visible:outline focus-visible:outline-4 focus-visible:outline-[#2E7BC4]"
        >
          🍎 Dar comida
        </button>
        <button
          type="button"
          onClick={ball}
          disabled={sleepingNow || prop !== null}
          className="rounded-full bg-white px-4 py-2 font-semibold text-[#3B2A1A] ring-1 ring-[#E3D7C3] disabled:opacity-50 focus-visible:outline focus-visible:outline-4 focus-visible:outline-[#2E7BC4]"
        >
          🎾 Brincar
        </button>
      </div>
    </div>
  );
};
