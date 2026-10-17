/** Mascote do hotel (lhama chocolate com a camiseta da fazenda). Só imagem, sem interação. */
export const MascoteCorpo = ({ className = "", style }: { className?: string; style?: React.CSSProperties }) => (
  <img
    src="/mascote/corpo.webp"
    alt="Mascote do Hotel Fazenda Santa Bárbara"
    className={`pointer-events-none select-none object-contain drop-shadow-[0_10px_18px_rgba(0,0,0,0.25)] ${className}`}
    style={style}
    draggable={false}
  />
);

// Posição dos olhos na imagem /mascote/corpo.webp (475 × 1043), em porcentagem
const OLHOS = [
  { x: 53.7, y: 23.2, w: 10.6, h: 5.2 },
  { x: 83.2, y: 23.0, w: 8.6, h: 4.7 },
];

/** Mascote balançando de leve, respirando e piscando (para a tela de carregamento). */
export const MascoteAnimado = ({ className = "" }: { className?: string }) => (
  <div className={`mascote-anim relative aspect-[475/1043] ${className}`}>
    <style>{`
      @keyframes masc-entra { 0% { transform: translateY(40px) scale(.9); opacity: 0 } 60% { transform: translateY(-8px) scale(1.02); opacity: 1 } 100% { transform: none; opacity: 1 } }
      @keyframes masc-balanca { 0%, 100% { transform: rotate(-3.5deg) } 50% { transform: rotate(3.5deg) } }
      @keyframes masc-respira { 0%, 100% { transform: scale(1, 1) translateY(0) } 50% { transform: scale(1.03, .97) translateY(2%) } }
      @keyframes masc-pisca { 0%, 40%, 56%, 100% { transform: scaleY(0) } 46%, 50% { transform: scaleY(1) } }
      .mascote-anim { animation: masc-entra .9s cubic-bezier(.3,1.4,.5,1) both }
      .mascote-anim .balanca { animation: masc-balanca 1.8s ease-in-out .7s infinite; transform-origin: 50% 98% }
      .mascote-anim .respira { animation: masc-respira 1.2s ease-in-out infinite; transform-origin: 50% 100% }
      .mascote-anim .palpebra { animation: masc-pisca 1.6s ease-in-out .3s infinite; transform-origin: 50% 0; transform: scaleY(0) }
      @media (prefers-reduced-motion: reduce) { .mascote-anim, .mascote-anim .balanca, .mascote-anim .respira, .mascote-anim .palpebra { animation: none } }
    `}</style>
    <div className="balanca absolute inset-0">
      <div className="respira absolute inset-0">
        <MascoteCorpo className="absolute inset-0 h-full w-full" />
        {OLHOS.map((o, i) => (
          <svg
            key={i}
            aria-hidden="true"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="palpebra absolute overflow-visible"
            style={{ left: `${o.x - o.w / 2}%`, top: `${o.y - o.h / 2}%`, width: `${o.w}%`, height: `${o.h}%` }}
          >
            <defs>
              <radialGradient id={`pal-${i}`} cx="50%" cy="35%" r="65%">
                <stop offset="0%" stopColor="#62361f" />
                <stop offset="62%" stopColor="#4c2a18" />
                <stop offset="100%" stopColor="#3f2214" stopOpacity="0" />
              </radialGradient>
            </defs>
            <ellipse cx="50" cy="50" rx="58" ry="60" fill={`url(#pal-${i})`} />
            {/* olhinho fechado */}
            <path d="M14 58 Q50 84 86 58" fill="none" stroke="#1c0d07" strokeWidth="9" strokeLinecap="round" />
            <path d="M24 70 l-6 10 M50 78 v11 M76 70 l6 10" stroke="#1c0d07" strokeWidth="5" strokeLinecap="round" />
          </svg>
        ))}
      </div>
    </div>
  </div>
);
