import type { ReactNode } from "react";

export type PetSpecies = "pintinho" | "potrinho" | "leitaozinho" | "bezerrinho";

export const PET_SPECIES: { id: PetSpecies; label: string; plural: string; place: string }[] = [
  { id: "pintinho", label: "Pintinho", plural: "pintinhos", place: "galinheiro" },
  { id: "potrinho", label: "Potrinho", plural: "potrinhos", place: "estação dos cavalos" },
  { id: "leitaozinho", label: "Leitãozinho", plural: "leitõezinhos", place: "chiqueiro" },
  { id: "bezerrinho", label: "Bezerrinho", plural: "bezerrinhos", place: "curral" },
];

/** Fases do bichinho: XP mínimo para chegar em cada uma */
export const PET_STAGES = [
  { name: "Bebê", minXp: 0 },
  { name: "Filhote", minXp: 15 },
  { name: "Jovem", minXp: 45 },
  { name: "Campeão da Fazenda", minXp: 90 },
];

export const stageFromXp = (xp: number) => {
  let s = 0;
  PET_STAGES.forEach((st, i) => {
    if (xp >= st.minXp) s = i;
  });
  return s;
};

const INK = "#3B2A1A";

interface Palette {
  body: string;
  shade: string;
  muzzle?: string;
}

const PALETTES: Record<PetSpecies, Palette> = {
  pintinho: { body: "#FFD447", shade: "#F2B705" },
  potrinho: { body: "#C08552", shade: "#9A6237", muzzle: "#EBC79E" },
  leitaozinho: { body: "#F9B4C3", shade: "#EE8FA6", muzzle: "#F28AA3" },
  bezerrinho: { body: "#FFFDF7", shade: "#E9E2D3", muzzle: "#F6B5C0" },
};

const Eyes = ({ sleepy }: { sleepy: boolean }) =>
  sleepy ? (
    <g stroke={INK} strokeWidth={4} strokeLinecap="round" fill="none">
      <path d="M72 92 q10 8 20 0" />
      <path d="M108 92 q10 8 20 0" />
    </g>
  ) : (
    <g>
      <circle cx={82} cy={90} r={8} fill={INK} />
      <circle cx={118} cy={90} r={8} fill={INK} />
      <circle cx={85} cy={87} r={2.6} fill="#fff" />
      <circle cx={121} cy={87} r={2.6} fill="#fff" />
    </g>
  );

const Blush = () => (
  <g fill="#F28AA3" opacity={0.55}>
    <ellipse cx={66} cy={106} rx={9} ry={5.5} />
    <ellipse cx={134} cy={106} rx={9} ry={5.5} />
  </g>
);

/** Corpo e cabeça de cada espécie (olhos e acessórios vêm por cima) */
const SpeciesBody = ({ species }: { species: PetSpecies }) => {
  const c = PALETTES[species];
  switch (species) {
    case "pintinho":
      return (
        <g>
          {/* pés */}
          <g stroke="#F08A24" strokeWidth={5} strokeLinecap="round" fill="none">
            <path d="M86 176 v10 m-7 0 h14" />
            <path d="M114 176 v10 m-7 0 h14" />
          </g>
          {/* corpo redondo */}
          <ellipse cx={100} cy={142} rx={46} ry={38} fill={c.body} />
          <ellipse cx={58} cy={140} rx={12} ry={20} fill={c.shade} transform="rotate(20 58 140)" />
          <ellipse cx={142} cy={140} rx={12} ry={20} fill={c.shade} transform="rotate(-20 142 140)" />
          {/* cabeça */}
          <circle cx={100} cy={92} r={46} fill={c.body} />
          {/* topete */}
          <g fill={c.shade}>
            <ellipse cx={94} cy={46} rx={6} ry={12} transform="rotate(-20 94 46)" />
            <ellipse cx={104} cy={44} rx={6} ry={13} transform="rotate(10 104 44)" />
          </g>
          {/* bico */}
          <path d="M90 104 L100 98 L110 104 L100 114 Z" fill="#F08A24" />
          <path d="M90 104 L110 104" stroke="#C96A12" strokeWidth={2} />
        </g>
      );
    case "leitaozinho":
      return (
        <g>
          {/* rabinho enrolado */}
          <path d="M146 140 q16 -4 12 -14 q-4 -8 -10 0 q-4 8 8 10" stroke={c.shade} strokeWidth={4} fill="none" strokeLinecap="round" />
          {/* patinhas */}
          <g fill={c.shade}>
            <rect x={74} y={168} width={16} height={18} rx={6} />
            <rect x={110} y={168} width={16} height={18} rx={6} />
          </g>
          <ellipse cx={100} cy={142} rx={50} ry={36} fill={c.body} />
          {/* orelhas */}
          <path d="M58 60 L70 34 L86 54 Z" fill={c.shade} />
          <path d="M142 60 L130 34 L114 54 Z" fill={c.shade} />
          <circle cx={100} cy={92} r={46} fill={c.body} />
          {/* focinho */}
          <ellipse cx={100} cy={110} rx={19} ry={13} fill={c.muzzle} />
          <ellipse cx={93} cy={110} rx={3.5} ry={5} fill={INK} opacity={0.75} />
          <ellipse cx={107} cy={110} rx={3.5} ry={5} fill={INK} opacity={0.75} />
        </g>
      );
    case "potrinho":
      return (
        <g>
          {/* rabo */}
          <path d="M146 136 q20 6 14 30" stroke="#6B3E26" strokeWidth={9} fill="none" strokeLinecap="round" />
          {/* pernas */}
          <g fill={c.shade}>
            <rect x={74} y={160} width={14} height={28} rx={5} />
            <rect x={112} y={160} width={14} height={28} rx={5} />
          </g>
          <g fill={INK}>
            <rect x={74} y={182} width={14} height={7} rx={3} />
            <rect x={112} y={182} width={14} height={7} rx={3} />
          </g>
          <ellipse cx={100} cy={144} rx={46} ry={32} fill={c.body} />
          {/* orelhas */}
          <path d="M64 58 L68 26 L86 50 Z" fill={c.body} stroke={c.shade} strokeWidth={3} strokeLinejoin="round" />
          <path d="M136 58 L132 26 L114 50 Z" fill={c.body} stroke={c.shade} strokeWidth={3} strokeLinejoin="round" />
          {/* cabeça */}
          <ellipse cx={100} cy={92} rx={44} ry={48} fill={c.body} />
          {/* crina */}
          <g fill="#6B3E26">
            <ellipse cx={92} cy={46} rx={10} ry={14} transform="rotate(-25 92 46)" />
            <ellipse cx={106} cy={44} rx={10} ry={15} transform="rotate(15 106 44)" />
          </g>
          {/* focinho */}
          <ellipse cx={100} cy={118} rx={26} ry={18} fill={c.muzzle} />
          <ellipse cx={91} cy={118} rx={3.5} ry={4.5} fill={INK} opacity={0.7} />
          <ellipse cx={109} cy={118} rx={3.5} ry={4.5} fill={INK} opacity={0.7} />
        </g>
      );
    case "bezerrinho":
    default:
      return (
        <g>
          {/* rabo */}
          <path d="M148 138 q14 4 12 24" stroke={INK} strokeWidth={4} fill="none" strokeLinecap="round" />
          <circle cx={160} cy={164} r={5} fill={INK} />
          {/* pernas */}
          <g fill={c.body} stroke={c.shade} strokeWidth={3}>
            <rect x={74} y={160} width={15} height={26} rx={5} />
            <rect x={111} y={160} width={15} height={26} rx={5} />
          </g>
          <g fill={INK}>
            <rect x={74} y={180} width={15} height={7} rx={3} />
            <rect x={111} y={180} width={15} height={7} rx={3} />
          </g>
          <ellipse cx={100} cy={144} rx={48} ry={32} fill={c.body} stroke={c.shade} strokeWidth={3} />
          <ellipse cx={122} cy={140} rx={14} ry={10} fill={INK} />
          <ellipse cx={80} cy={152} rx={9} ry={6} fill={INK} />
          {/* chifrinhos */}
          <g fill="#E8D3A8">
            <ellipse cx={78} cy={50} rx={6} ry={9} transform="rotate(-20 78 50)" />
            <ellipse cx={122} cy={50} rx={6} ry={9} transform="rotate(20 122 50)" />
          </g>
          {/* orelhas */}
          <ellipse cx={50} cy={78} rx={16} ry={8} fill={c.body} stroke={c.shade} strokeWidth={3} transform="rotate(-15 50 78)" />
          <ellipse cx={150} cy={78} rx={16} ry={8} fill={c.body} stroke={c.shade} strokeWidth={3} transform="rotate(15 150 78)" />
          {/* cabeça */}
          <circle cx={100} cy={92} r={46} fill={c.body} stroke={c.shade} strokeWidth={3} />
          <path d="M118 52 q22 6 24 30 q-14 4 -24 -8 Z" fill={INK} />
          {/* focinho */}
          <ellipse cx={100} cy={116} rx={26} ry={17} fill={c.muzzle} />
          <ellipse cx={91} cy={116} rx={3.5} ry={4.5} fill={INK} opacity={0.7} />
          <ellipse cx={109} cy={116} rx={3.5} ry={4.5} fill={INK} opacity={0.7} />
        </g>
      );
  }
};

/** Lenço vermelho de fazenda (fase Jovem em diante) */
const Bandana = () => (
  <g>
    <path d="M66 128 Q100 146 134 128 L128 138 Q100 154 72 138 Z" fill="#D9412B" />
    <path d="M92 140 L100 162 L108 140 Z" fill="#B8321F" />
    <g fill="#fff" opacity={0.8}>
      <circle cx={82} cy={136} r={2} />
      <circle cx={100} cy={142} r={2} />
      <circle cx={118} cy={136} r={2} />
    </g>
  </g>
);

/** Chapéu de palha (fase Campeão) */
const StrawHat = () => (
  <g>
    <ellipse cx={100} cy={52} rx={58} ry={12} fill="#E9B949" />
    <path d="M70 52 Q72 18 100 16 Q128 18 130 52 Z" fill="#F2C14E" />
    <path d="M71 44 Q100 50 129 44 L130 52 Q100 58 70 52 Z" fill="#D9412B" />
    <g stroke="#C9962E" strokeWidth={1.5} opacity={0.7}>
      <path d="M84 24 L80 48" />
      <path d="M100 18 L100 46" />
      <path d="M116 24 L120 48" />
    </g>
  </g>
);

/** Medalha de campeão */
const Medal = () => (
  <g>
    <path d="M92 150 L100 168 L108 150" stroke="#2E7BC4" strokeWidth={6} fill="none" />
    <circle cx={100} cy={172} r={11} fill="#F5C518" stroke="#C99A06" strokeWidth={2.5} />
    <path d="M100 166 l2 4 4.5 .5 -3.3 3 1 4.5 -4.2 -2.3 -4.2 2.3 1 -4.5 -3.3 -3 4.5 -.5 Z" fill="#fff" />
  </g>
);

const Sparkles = () => (
  <g fill="#F5C518">
    <path d="M30 60 l3 8 8 3 -8 3 -3 8 -3 -8 -8 -3 8 -3 Z" />
    <path d="M168 40 l2.4 6 6 2.4 -6 2.4 -2.4 6 -2.4 -6 -6 -2.4 6 -2.4 Z" />
    <path d="M172 118 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2 Z" />
  </g>
);

const Zzz = () => (
  <g fill={INK} opacity={0.55} fontFamily="'Baloo 2', system-ui, sans-serif" fontWeight={800}>
    <text x={146} y={58} fontSize={20}>z</text>
    <text x={160} y={40} fontSize={15}>z</text>
  </g>
);

interface PetArtProps {
  species: PetSpecies;
  stage: number;
  size?: number;
  title?: string;
}

/** Desenho do bichinho. As fases mudam tamanho, expressão e acessórios. */
export const PetArt = ({ species, stage, size = 220, title }: PetArtProps) => {
  const scale = [0.68, 0.8, 0.9, 1][Math.max(0, Math.min(3, stage))];
  const sleepy = stage === 0;
  const extras: ReactNode[] = [];
  if (stage >= 2) extras.push(<Bandana key="bandana" />);
  if (stage >= 3) extras.push(<StrawHat key="hat" />, <Medal key="medal" />);

  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      role="img"
      aria-label={title ?? `${PET_SPECIES.find((s) => s.id === species)?.label} na fase ${PET_STAGES[stage]?.name}`}
    >
      {/* sombra no chão */}
      <ellipse cx={100} cy={190} rx={52 * scale} ry={7 * scale} fill="#2F5D1E" opacity={0.18} />
      <g transform={`translate(100 190) scale(${scale}) translate(-100 -190)`}>
        <SpeciesBody species={species} />
        <Eyes sleepy={sleepy} />
        {!sleepy && <Blush />}
        {extras}
      </g>
      {sleepy && <Zzz />}
      {stage >= 3 && <Sparkles />}
    </svg>
  );
};
