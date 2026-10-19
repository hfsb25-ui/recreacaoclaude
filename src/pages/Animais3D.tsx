import { useEffect, useRef, useState } from "react";
import "@google/model-viewer";
import { Smartphone, Hand, Lightbulb } from "lucide-react";
import { HotelLayout, HotelPageHeader, FONTE_TITULO } from "@/components/hotel/HotelLayout";

interface Animal {
  id: string;
  nome: string;
  emoji: string;
  fundo: string;
  curiosidade: string;
}

const ANIMAIS: Animal[] = [
  { id: "vaca", nome: "Vaca", emoji: "🐄", fundo: "#EAF2E5", curiosidade: "O estômago da vaca tem quatro partes. Ela engole o capim, depois traz de volta à boca para mastigar de novo: é a tal da ruminação." },
  { id: "cavalo", nome: "Cavalo", emoji: "🐴", fundo: "#F6ECE2", curiosidade: "Cavalos conseguem cochilar em pé! As pernas têm uma trava natural que segura o corpo sem fazer força." },
  { id: "lhama", nome: "Lhama", emoji: "🦙", fundo: "#F3EADF", curiosidade: "As lhamas vêm das montanhas dos Andes, na América do Sul, e conversam entre si com um zumbido baixinho." },
  { id: "porco", nome: "Porco", emoji: "🐷", fundo: "#FBE8EA", curiosidade: "Porcos quase não suam. Por isso adoram rolar na lama: é o jeito deles de se refrescar no calor." },
  { id: "galinha", nome: "Galinha", emoji: "🐔", fundo: "#FFF6DD", curiosidade: "As galinhas enxergam mais cores do que a gente, porque os olhos delas têm um tipo de célula de cor a mais." },
];

const Animais3D = () => {
  const [atual, setAtual] = useState<Animal>(ANIMAIS[0]);
  const [podeRA, setPodeRA] = useState<boolean | null>(null);
  const [carregando, setCarregando] = useState(true);
  const viewer = useRef<HTMLElement & { canActivateAR?: boolean; activateAR?: () => void }>(null);

  useEffect(() => {
    const el = viewer.current;
    if (!el) return;
    setCarregando(true);
    const aoCarregar = () => {
      setCarregando(false);
      setPodeRA(!!el.canActivateAR);
    };
    el.addEventListener("load", aoCarregar);
    return () => el.removeEventListener("load", aoCarregar);
  }, [atual.id]);

  return (
    <HotelLayout>
      <HotelPageHeader
        title="Animais em 3D"
        subtitle="Escolha um bichinho e coloque ele no seu quarto, na varanda ou no gramado!"
        back="/recreacao"
      />
      <main className="flex flex-col gap-4 p-5">
        <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1" role="tablist" aria-label="Escolher animal">
          {ANIMAIS.map((a) => (
            <button
              key={a.id}
              type="button"
              role="tab"
              aria-selected={a.id === atual.id}
              onClick={() => setAtual(a)}
              className={`flex min-h-[48px] shrink-0 items-center gap-2 rounded-full px-4 text-[15px] font-extrabold ${
                a.id === atual.id ? "bg-[#1F4D3A] text-white" : "bg-white text-[#3D4A41] shadow-[0_1px_4px_rgba(20,40,30,0.08)]"
              }`}
            >
              <span className="text-xl" aria-hidden="true">
                {a.emoji}
              </span>
              {a.nome}
            </button>
          ))}
        </div>

        <section
          className="relative overflow-hidden rounded-[24px] shadow-[0_6px_20px_rgba(20,40,30,0.10)]"
          style={{ background: `radial-gradient(circle at 50% 35%, #ffffff, ${atual.fundo})` }}
        >
          <model-viewer
            key={atual.id}
            ref={viewer}
            src={`/ar/${atual.id}.glb`}
            alt={`${atual.nome} em 3D`}
            ar=""
            ar-modes="webxr scene-viewer quick-look"
            ar-placement="floor"
            camera-controls=""
            touch-action="pan-y"
            auto-rotate=""
            auto-rotate-delay="1500"
            rotation-per-second="18deg"
            autoplay=""
            shadow-intensity="1"
            shadow-softness="0.8"
            exposure="1.05"
            camera-orbit="35deg 72deg auto"
            interaction-prompt="none"
            style={{ width: "100%", height: 340, background: "transparent" }}
          >
            <button
              slot="ar-button"
              type="button"
              className="absolute inset-x-4 bottom-4 flex min-h-[54px] items-center justify-center gap-2 rounded-2xl bg-[#F2B13B] text-[17px] font-extrabold text-[#3A2600] shadow-[0_6px_16px_rgba(0,0,0,0.18)]"
            >
              <Smartphone className="h-5 w-5" /> Ver no meu espaço
            </button>
          </model-viewer>
          {carregando && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-[15px] font-bold text-[#5B6B60]">
              Chamando {atual.nome.toLowerCase()}…
            </div>
          )}
        </section>

        {podeRA === false && (
          <p className="flex items-start gap-2 rounded-2xl bg-white p-3.5 text-sm text-[#3D4A41] shadow-[0_2px_8px_rgba(20,40,30,0.06)]">
            <Hand className="mt-0.5 h-4 w-4 shrink-0 text-[#1F4D3A]" />
            Arraste para girar o bichinho. Para colocá-lo no seu espaço, abra esta página no celular.
          </p>
        )}

        <section className="rounded-[20px] bg-[#FFF4DF] p-4">
          <h2 className="mb-1 flex items-center gap-2 font-extrabold text-[#8A5A00]">
            <Lightbulb className="h-5 w-5" /> Você sabia?
          </h2>
          <p className="text-[15px] leading-relaxed text-[#5A4210]">{atual.curiosidade}</p>
        </section>

        <section className="rounded-[20px] bg-white p-4 shadow-[0_2px_8px_rgba(20,40,30,0.06)]">
          <h2 className="mb-2 text-lg font-extrabold" style={FONTE_TITULO}>
            Como funciona
          </h2>
          <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-[15px] text-[#3D4A41]">
            <li>Toque em <b>Ver no meu espaço</b> e permita usar a câmera.</li>
            <li>Aponte o celular para o chão e mexa devagar até o bichinho aparecer.</li>
            <li>Arraste para mudar de lugar e use dois dedos para girar ou mudar o tamanho.</li>
            <li>Tire uma foto com a família e marque o hotel! 📸</li>
          </ol>
        </section>
      </main>
    </HotelLayout>
  );
};

export default Animais3D;
