import { useEffect, useState } from "react";
import { ExternalLink, Gift } from "lucide-react";
import { FONTE_TITULO } from "@/components/hotel/HotelLayout";
import { TRIPADVISOR_REVIEW_URL, consultarBrinde, type BrindeStatus } from "@/lib/brinde";

/** Na tela inicial: lembra o hóspede do brinde liberado e do convite do TripAdvisor. */
export const BrindeCard = ({ guestId }: { guestId: string }) => {
  const [brinde, setBrinde] = useState<BrindeStatus | null>(null);

  useEffect(() => {
    let ativo = true;
    consultarBrinde(guestId).then((b) => {
      if (ativo) setBrinde(b);
    });
    return () => {
      ativo = false;
    };
  }, [guestId]);

  if (!brinde?.liberado || brinde.entregue || !brinde.codigo) return null;

  return (
    <section
      aria-label="Seu brinde"
      className="flex flex-col gap-3 rounded-[20px] bg-[#FFF4DF] p-4 shadow-[0_2px_8px_rgba(20,40,30,0.06)]"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-[#8A5A00]">
          <Gift className="h-6 w-6" />
        </span>
        <div className="flex flex-1 flex-col">
          <span className="font-extrabold" style={FONTE_TITULO}>
            Seu brinde está esperando!
          </span>
          <span className="text-sm text-[#5A4210]">
            Avalie o hotel no TripAdvisor e mostre o código na recepção para retirar.
          </span>
        </div>
        <span className="rounded-xl bg-white px-3 py-1.5 text-xl font-extrabold tracking-[0.2em] text-[#1F4D3A]">
          {brinde.codigo}
        </span>
      </div>
      <a
        href={TRIPADVISOR_REVIEW_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#34E0A1] text-[15px] font-extrabold text-black"
      >
        Avaliar no TripAdvisor <ExternalLink className="h-4 w-4" />
      </a>
    </section>
  );
};
