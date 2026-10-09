import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { ArrowLeft, ZoomIn, ZoomOut, Maximize, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

const MAP_URL = "/mapa-hotel.jpg";
const MAP_RATIO = 2091 / 928;

const HotelMap = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen bg-[var(--gradient-bg)] flex flex-col">
      <div className="max-w-6xl w-full mx-auto px-4 pt-4 pb-2 flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <Button variant="outline" size="sm" asChild>
          <a href={MAP_URL} download="Mapa-Hotel-Fazenda-Santa-Barbara.jpg">
            <Download className="h-4 w-4 mr-2" />
            Baixar
          </a>
        </Button>
      </div>

      <div className="max-w-6xl w-full mx-auto px-4 pb-3 text-center">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">🗺️ Mapa do Hotel</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isMobile
            ? "Arraste para os lados para explorar e use dois dedos para aproximar"
            : "Use a rolagem do mouse para aproximar e arraste para explorar"}
        </p>
      </div>

      <div className="flex-1 max-w-6xl w-full mx-auto px-2 sm:px-4 pb-4">
        <TransformWrapper
          key={isMobile ? "m" : "d"}
          initialScale={1}
          minScale={isMobile ? 0.3 : 1}
          maxScale={isMobile ? 4 : 6}
          centerOnInit
          doubleClick={{ mode: "zoomIn", step: 1 }}
          wheel={{ step: 0.15 }}
        >
          {({ zoomIn, zoomOut, resetTransform }) => (
            <>
              <div className="flex justify-end gap-2 mb-2">
                <Button size="sm" variant="outline" onClick={() => zoomIn()} aria-label="Aproximar">
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="outline" onClick={() => zoomOut()} aria-label="Afastar">
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="outline" onClick={() => resetTransform()} aria-label="Voltar ao início">
                  <Maximize className="h-4 w-4" />
                </Button>
              </div>
              <div className="rounded-xl overflow-hidden border bg-[#1a4fa0] shadow-[var(--shadow-soft)]">
                <TransformComponent
                  wrapperStyle={
                    isMobile
                      ? { width: "100%", height: "65vh" }
                      : { width: "100%", aspectRatio: String(MAP_RATIO), maxHeight: "80vh" }
                  }
                  contentStyle={isMobile ? { height: "65vh" } : { width: "100%", height: "100%" }}
                >
                  <img
                    src={MAP_URL}
                    alt="Mapa do Hotel Fazenda Santa Bárbara com as áreas de lazer e pontos de encontro"
                    className={isMobile ? "h-full w-auto max-w-none select-none" : "w-full h-full object-contain select-none"}
                    draggable={false}
                  />
                </TransformComponent>
              </div>
            </>
          )}
        </TransformWrapper>
      </div>
    </div>
  );
};

export default HotelMap;
