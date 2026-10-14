import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, ChevronRight, Copy, Map, Wifi } from "lucide-react";
import { HotelLayout, HotelPageHeader, FONTE_TITULO } from "@/components/hotel/HotelLayout";
import { useHotelInfo, linkWhatsapp, formatarWhatsapp } from "@/hooks/useHotelInfo";
import { useGuestAuth } from "@/hooks/useGuestAuth";

const HotelInfo = () => {
  const info = useHotelInfo();
  const { guest } = useGuestAuth();
  const horarios = info.horarios.filter((h) => h.visivel !== false && h.nome && h.horario);
  const [copiado, setCopiado] = useState(false);

  const copiarSenha = async () => {
    try {
      await navigator.clipboard.writeText(info.wifi_senha);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // sem permissão de copiar: a senha continua visível na tela
    }
  };

  return (
    <HotelLayout>
      <HotelPageHeader title="O hotel" subtitle="Tudo o que você precisa saber durante a estadia." />
      <main className="flex flex-col gap-5 p-5">
        <Link to="/mapa" className="flex items-center gap-3 rounded-[18px] bg-white p-4 shadow-[0_2px_8px_rgba(20,40,30,0.06)]">
          <span className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-2xl bg-[#E7F0EA] text-[#1F4D3A]">
            <Map className="h-7 w-7" />
          </span>
          <span className="flex flex-1 flex-col">
            <span className="text-lg font-bold" style={FONTE_TITULO}>
              Mapa do hotel
            </span>
            <span className="text-sm text-[#5B6B60]">Lazer, piscinas e pontos de encontro</span>
          </span>
          <ChevronRight className="h-5 w-5 text-[#5B6B60]" />
        </Link>

        {horarios.length > 0 && (
        <section aria-labelledby="horarios" className="flex flex-col gap-2.5">
          <h2 id="horarios" className="text-xl font-bold" style={FONTE_TITULO}>
            Horários
          </h2>
          <div className="rounded-[18px] bg-white shadow-[0_2px_8px_rgba(20,40,30,0.06)]">
            {horarios.map((h, i) => (
              <div
                key={h.nome}
                className={`flex justify-between gap-3 px-4 py-3.5 ${i < horarios.length - 1 ? "border-b border-[#E6EAE3]" : ""}`}
              >
                <span className="font-bold">{h.nome}</span>
                <span className="font-bold text-[#3D4A41]">{h.horario}</span>
              </div>
            ))}
          </div>
        </section>
        )}

        {info.wifi_mostrar && info.wifi_rede && (
        <section aria-labelledby="wifi" className="flex flex-col gap-3 rounded-[18px] bg-white p-4 shadow-[0_2px_8px_rgba(20,40,30,0.06)]">
          <h2 id="wifi" className="flex items-center gap-2.5 text-xl font-bold" style={FONTE_TITULO}>
            <Wifi className="h-6 w-6 text-[#1F4D3A]" /> Wi-Fi
          </h2>
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col">
              <span className="text-[13px] text-[#5B6B60]">Rede</span>
              <span className="font-extrabold">{info.wifi_rede}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[13px] text-[#5B6B60]">Senha</span>
              <span className="font-extrabold">{info.wifi_senha}</span>
            </div>
            <button
              type="button"
              onClick={copiarSenha}
              className="flex h-11 items-center gap-1.5 rounded-xl border border-[#C9D2C6] bg-white px-3.5 text-sm font-extrabold"
            >
              {copiado ? <Check className="h-4 w-4 text-[#1E6B3E]" /> : <Copy className="h-4 w-4" />}
              {copiado ? "Copiada" : "Copiar"}
            </button>
          </div>
        </section>
        )}

        <section aria-labelledby="contatos" className="flex flex-col gap-2.5">
          <h2 id="contatos" className="text-xl font-bold" style={FONTE_TITULO}>
            Contatos úteis
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {info.ramais.map((r) => (
              <div key={r.nome} className="flex flex-col gap-1 rounded-2xl bg-white p-3.5 shadow-[0_2px_8px_rgba(20,40,30,0.06)]">
                <span className={`font-extrabold ${r.urgente ? "text-[#B42318]" : ""}`}>{r.nome}</span>
                <span className="text-sm text-[#5B6B60]">Ramal {r.ramal}</span>
              </div>
            ))}
            <a
              href={linkWhatsapp(info, guest?.room_number)}
              target="_blank"
              rel="noopener noreferrer"
              className="col-span-2 flex items-center gap-3 rounded-2xl bg-[#E7F6EC] p-4 text-[#14532D] shadow-[0_2px_8px_rgba(20,40,30,0.06)]"
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="#1E8E4E" aria-hidden="true">
                <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.6-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.9s.7-2.1 1-2.4c.3-.3.6-.3.8-.3h.6c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.4 0 .6l-.4.6-.4.4c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1l.9-1.1c.2-.3.4-.2.7-.1l2 1c.3.1.5.2.5.3.1.2.1.7-.1 1.3z" />
              </svg>
              <span className="flex flex-col">
                <span className="font-extrabold">WhatsApp do hotel</span>
                <span className="text-sm">{formatarWhatsapp(info.whatsapp)} · toque para abrir</span>
              </span>
            </a>
          </div>
        </section>
      </main>
    </HotelLayout>
  );
};

export default HotelInfo;
