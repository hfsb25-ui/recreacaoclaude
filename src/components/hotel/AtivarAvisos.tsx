import { useState } from "react";
import { Link } from "react-router-dom";
import { BellRing, X } from "lucide-react";
import { toast } from "sonner";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { FONTE_TITULO } from "@/components/hotel/HotelLayout";

const CHAVE_DISPENSA = "avisos-push-dispensado";

const lerDispensa = () => {
  try {
    const v = Number(localStorage.getItem(CHAVE_DISPENSA) || 0);
    return Date.now() - v < 3 * 24 * 60 * 60 * 1000; // volta a aparecer depois de 3 dias
  } catch {
    return false;
  }
};

/** Cartão na tela inicial para o hóspede ligar as notificações do hotel. */
export const AtivarAvisos = ({ guestId }: { guestId?: string | null }) => {
  const { isSupported, precisaInstalar, permission, ativo, carregando, ativar } = usePushNotifications(guestId);
  const [dispensado, setDispensado] = useState(lerDispensa);

  if (dispensado || ativo) return null;
  if (!isSupported && !precisaInstalar) return null;
  if (permission === "denied") return null;

  const dispensar = () => {
    try {
      localStorage.setItem(CHAVE_DISPENSA, String(Date.now()));
    } catch {
      // sem armazenamento: só esconde agora
    }
    setDispensado(true);
  };

  const onAtivar = async () => {
    const ok = await ativar();
    if (ok) toast.success("Pronto! Você vai receber os avisos do hotel.");
    else if (Notification.permission === "denied")
      toast.error("As notificações foram bloqueadas. Dá para liberar nas configurações do celular.");
    else toast.error("Não foi possível ativar agora. Tente de novo.");
  };

  return (
    <section
      aria-label="Avisos do hotel no celular"
      className="relative flex items-start gap-3 rounded-[20px] bg-[#E7F0EA] p-4 pr-10"
    >
      <button
        type="button"
        onClick={dispensar}
        aria-label="Agora não"
        className="absolute right-1.5 top-1.5 flex h-9 w-9 items-center justify-center rounded-full text-[#5B6B60]"
      >
        <X className="h-4 w-4" />
      </button>
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-[#1F4D3A]">
        <BellRing className="h-6 w-6" />
      </span>
      <div className="flex flex-1 flex-col gap-2">
        <div className="flex flex-col">
          <span className="font-extrabold" style={FONTE_TITULO}>
            Receber avisos do hotel
          </span>
          <span className="text-sm text-[#3D4A41]">
            {precisaInstalar
              ? "No iPhone, adicione o app à Tela de Início para receber os avisos da recreação e do hotel."
              : "Atividades começando, mudanças por causa da chuva e promoções do hotel."}
          </span>
        </div>
        {precisaInstalar ? (
          <Link
            to="/instalar"
            className="flex min-h-[44px] items-center justify-center rounded-xl bg-[#1F4D3A] text-[15px] font-extrabold text-white"
          >
            Como adicionar
          </Link>
        ) : (
          <button
            type="button"
            onClick={onAtivar}
            disabled={carregando}
            className="min-h-[44px] rounded-xl bg-[#1F4D3A] text-[15px] font-extrabold text-white disabled:opacity-60"
          >
            {carregando ? "Ativando…" : "Ativar avisos"}
          </button>
        )}
      </div>
    </section>
  );
};
