import { useEffect } from "react";

/** Tela de carregamento do app do hotel: foto do hotel escurecida, logo e barra de progresso. */
export const HotelSplash = ({ onFinish, duracao = 1800 }: { onFinish: () => void; duracao?: number }) => {
  useEffect(() => {
    const t = setTimeout(onFinish, duracao);
    return () => clearTimeout(t);
  }, [onFinish, duracao]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="relative flex min-h-[100dvh] w-full flex-col overflow-hidden bg-[#1F4D3A] text-white"
      style={{ fontFamily: "'Nunito', system-ui, sans-serif" }}
    >
      <style>{`
        @keyframes hs-zoom { from { transform: scale(1.12) } to { transform: scale(1) } }
        @keyframes hs-bar { from { width: 8% } to { width: 92% } }
        @keyframes hs-rise { from { transform: translateY(16px); opacity: 0 } to { transform: none; opacity: 1 } }
        @keyframes hs-dot { 0%, 80%, 100% { transform: scale(.6); opacity: .4 } 40% { transform: scale(1); opacity: 1 } }
        .hs-zoom { animation: hs-zoom 6s ease-out both }
        .hs-bar { animation: hs-bar ${duracao}ms ease-out both }
        .hs-rise { animation: hs-rise .9s .2s ease-out both }
        .hs-dot { animation: hs-dot 1.2s ease-in-out infinite }
        @media (prefers-reduced-motion: reduce) { .hs-zoom, .hs-bar, .hs-rise, .hs-dot { animation: none } }
      `}</style>
      <div className="absolute inset-x-0 top-0 h-[70vh] overflow-hidden">
        <img
          src="/fundo-hotel.jpg"
          alt=""
          aria-hidden="true"
          className="hs-zoom h-full w-full object-cover object-[40%_30%]"
        />
      </div>
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-[70vh] bg-[rgba(8,20,14,0.45)]" />
      <div aria-hidden="true" className="absolute inset-x-0 top-[26vh] h-[46vh] bg-gradient-to-b from-transparent to-[#1F4D3A]" />

      <div className="hs-rise relative z-10 mt-auto flex flex-col items-center gap-5 px-8 pb-16 text-center">
        <div className="flex h-28 w-28 items-center justify-center rounded-[30px] bg-white p-2.5 shadow-2xl">
          <img src="/logo-hotel.svg" alt="Hotel Fazenda Santa Bárbara" className="h-full w-full object-contain" />
        </div>
        <div className="flex flex-col" style={{ fontFamily: "'Baloo 2', system-ui, sans-serif" }}>
          <span className="text-[30px] font-extrabold leading-tight">Hotel Fazenda</span>
          <span className="text-[22px] font-bold leading-tight opacity-95">Santa Bárbara</span>
        </div>
        <div className="h-2 w-52 overflow-hidden rounded-full bg-white/25">
          <div className="hs-bar h-full rounded-full bg-[#F2B13B]" />
        </div>
        <div className="flex items-center gap-2 text-base font-bold">
          <span>Preparando sua estadia</span>
          <span aria-hidden="true" className="flex gap-1">
            <span className="hs-dot h-1.5 w-1.5 rounded-full bg-white" />
            <span className="hs-dot h-1.5 w-1.5 rounded-full bg-white" style={{ animationDelay: ".15s" }} />
            <span className="hs-dot h-1.5 w-1.5 rounded-full bg-white" style={{ animationDelay: ".3s" }} />
          </span>
        </div>
      </div>
    </div>
  );
};
