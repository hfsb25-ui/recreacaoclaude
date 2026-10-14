import { useRef, useState, useEffect } from "react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { Download, Maximize2, Minimize2, Minus, Plus, RotateCcw } from "lucide-react";
import { HotelLayout, HotelPageHeader } from "@/components/hotel/HotelLayout";

const MAP_URL = "/mapa-hotel.jpg";

const botao =
  "flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[#1D2A22] shadow-[0_2px_8px_rgba(0,0,0,0.18)]";

const HotelMap = () => {
  const caixa = useRef<HTMLDivElement>(null);
  const [cheia, setCheia] = useState(false);

  useEffect(() => {
    const aoMudar = () => setCheia(document.fullscreenElement === caixa.current);
    document.addEventListener("fullscreenchange", aoMudar);
    return () => document.removeEventListener("fullscreenchange", aoMudar);
  }, []);

  const alternarTelaCheia = async () => {
    const el = caixa.current;
    if (!el) return;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (el.requestFullscreen) await el.requestFullscreen();
      else window.open(MAP_URL, "_blank");
    } catch {
      // iPhone não deixa tela cheia em elementos: abre a imagem sozinha
      window.open(MAP_URL, "_blank");
    }
  };

  return (
    <HotelLayout>
      <HotelPageHeader
        title="Mapa do hotel"
        subtitle="Toque e arraste para explorar. Use dois dedos para aproximar."
        back="/recreacao"
      />

      <div className="space-y-4 px-4 pt-4">
        <div
          ref={caixa}
          className={`relative overflow-hidden bg-[#1a4fa0] shadow-[0_2px_10px_rgba(20,40,30,0.12)] ${
            cheia ? "h-full w-full" : "h-[62vh] max-h-[560px] rounded-[20px]"
          }`}
        >
          <TransformWrapper initialScale={1} minScale={0.5} maxScale={5} centerOnInit doubleClick={{ mode: "zoomIn", step: 1 }} wheel={{ step: 0.15 }}>
            {({ zoomIn, zoomOut, resetTransform }) => (
              <>
                <TransformComponent wrapperStyle={{ width: "100%", height: "100%" }} contentStyle={{ height: "100%" }}>
                  <img
                    src={MAP_URL}
                    alt="Mapa do Hotel Fazenda Santa Bárbara com as áreas de lazer e pontos de encontro"
                    className="h-full w-auto max-w-none select-none"
                    draggable={false}
                  />
                </TransformComponent>

                <div className="absolute right-3 top-3 flex flex-col gap-2">
                  <button type="button" className={botao} onClick={() => zoomIn()} aria-label="Aproximar">
                    <Plus className="h-5 w-5" strokeWidth={2.6} />
                  </button>
                  <button type="button" className={botao} onClick={() => zoomOut()} aria-label="Afastar">
                    <Minus className="h-5 w-5" strokeWidth={2.6} />
                  </button>
                  <button type="button" className={botao} onClick={() => resetTransform()} aria-label="Voltar ao início">
                    <RotateCcw className="h-5 w-5" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={alternarTelaCheia}
                  className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-xl bg-black/60 px-3 py-2 text-sm font-extrabold text-white"
                >
                  {cheia ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                  {cheia ? "Sair da tela cheia" : "Tela cheia"}
                </button>
              </>
            )}
          </TransformWrapper>
        </div>

        <a
          href={MAP_URL}
          download="Mapa-Hotel-Fazenda-Santa-Barbara.jpg"
          className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-white font-extrabold text-[#1D2A22] shadow-[0_2px_10px_rgba(20,40,30,0.07)]"
        >
          <Download className="h-5 w-5" />
          Baixar o mapa
        </a>
      </div>
    </HotelLayout>
  );
};

export default HotelMap;
