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

export const MascoteAvatar = ({ size = 64, className = "" }: { size?: number; className?: string }) => (
  <img
    src="/mascote/avatar.webp"
    alt=""
    aria-hidden="true"
    width={size}
    height={size}
    className={`shrink-0 select-none rounded-full shadow-md ring-[3px] ring-white/80 ${className}`}
    draggable={false}
  />
);
