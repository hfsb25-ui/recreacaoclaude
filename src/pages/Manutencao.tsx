// Página provisória mostrada aos hóspedes enquanto o app está em manutenção.
const WHATSAPP_HOTEL = "5524999680997";

const Manutencao = () => {
  return (
    <main className="relative min-h-[100dvh] w-full overflow-hidden bg-[#1F4D3A] text-white">
      <img
        src="/fundo-hotel.jpg"
        alt=""
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-[62vh] w-full object-cover object-[40%_30%]"
      />
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-[62vh] bg-[rgba(8,20,14,0.5)]" />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-[22vh] h-[42vh] bg-gradient-to-b from-transparent to-[#1F4D3A]"
      />

      <div className="relative z-10 mx-auto flex min-h-[100dvh] max-w-md flex-col items-center justify-end gap-6 px-6 pb-10 pt-16 text-center">
        <div className="flex h-32 w-32 items-center justify-center rounded-[32px] bg-white p-3 shadow-2xl">
          <img
            src="/logo-hotel.svg"
            alt="Hotel Fazenda Santa Bárbara"
            className="h-full w-full object-contain"
          />
        </div>

        <div className="flex flex-col gap-3">
          <span className="mx-auto rounded-full bg-[#F2B13B] px-4 py-1 text-sm font-extrabold uppercase tracking-wider text-[#3A2600]">
            Em manutenção
          </span>
          <h1 style={{ fontFamily: "'Baloo 2', system-ui, sans-serif" }} className="text-3xl font-extrabold leading-tight">
            Estamos preparando um app novo para você
          </h1>
          <p className="text-base leading-relaxed text-white/90">
            O app da recreação volta em breve, de cara nova. As atividades continuam acontecendo
            normalmente: fale com a equipe de recreação ou com a recepção.
          </p>
        </div>

        <div className="flex w-full flex-col gap-3">
          <a
            href={`https://wa.me/${WHATSAPP_HOTEL}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-[#25D366] px-5 text-base font-extrabold text-[#073B1C] shadow-lg"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.6-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.9s.7-2.1 1-2.4c.3-.3.6-.3.8-.3h.6c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.4 0 .6l-.4.6-.4.4c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1l.9-1.1c.2-.3.4-.2.7-.1l2 1c.3.1.5.2.5.3.1.2.1.7-.1 1.3z" />
            </svg>
            Falar no WhatsApp do hotel
          </a>
          <p className="text-sm text-white/80">
            Recepção: ramal <strong className="text-white">9</strong> · WhatsApp (24) 99968-0997
          </p>
        </div>
      </div>
    </main>
  );
};

export default Manutencao;
