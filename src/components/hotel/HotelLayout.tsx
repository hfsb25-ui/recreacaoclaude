import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ChevronLeft, Home, Sparkles, Hotel, User, Receipt } from "lucide-react";
import { useGuestAuth } from "@/hooks/useGuestAuth";

const FONTE_TITULO = { fontFamily: "'Baloo 2', system-ui, sans-serif" };

export const HotelLogo = ({ size = 48 }: { size?: number }) => (
  <div
    className="flex shrink-0 items-center justify-center rounded-[14px] bg-white p-1 shadow-sm"
    style={{ width: size, height: size }}
  >
    <img src="/logo-hotel.svg" alt="Hotel Fazenda Santa Bárbara" className="h-full w-full object-contain" />
  </div>
);

/** Cabeçalho verde das páginas internas (com botão voltar). */
export const HotelPageHeader = ({ title, subtitle, back = "/" }: { title: string; subtitle?: string; back?: string }) => {
  const navigate = useNavigate();
  return (
    <header className="rounded-b-[28px] bg-[#1F4D3A] px-5 pb-6 pt-5 text-white">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => navigate(back)}
          aria-label="Voltar"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <h1 className="text-[26px] font-extrabold" style={FONTE_TITULO}>
          {title}
        </h1>
      </div>
      {subtitle && <p className="mt-2 text-[15px] text-white/90">{subtitle}</p>}
    </header>
  );
};

/** Estrutura das telas do hotel: fundo claro, conteúdo e barra de navegação embaixo. */
export const HotelLayout = ({ children }: { children: ReactNode }) => {
  const { pathname } = useLocation();
  const { guest } = useGuestAuth();
  const itens = guest
    ? [
        { to: "/", label: "Início", Icon: Home },
        { to: "/recreacao", label: "Recreação", Icon: Sparkles },
        { to: "/estadia", label: "Estadia", Icon: Receipt },
        { to: "/guest-profile", label: "Perfil", Icon: User },
      ]
    : [
        { to: "/", label: "Início", Icon: Home },
        { to: "/recreacao", label: "Recreação", Icon: Sparkles },
        { to: "/hotel", label: "O hotel", Icon: Hotel },
        { to: "/guest-auth", label: "Entrar", Icon: User },
      ];

  return (
    <div className="min-h-[100dvh] w-full bg-[#F4F6F0] text-[#1D2A22]" style={{ fontFamily: "'Nunito', system-ui, sans-serif" }}>
      <div className="mx-auto w-full max-w-md pb-24">{children}</div>
      <nav
        aria-label="Navegação principal"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-[#E1E6DE] bg-white pb-[env(safe-area-inset-bottom)]"
      >
        <div className="mx-auto grid h-[68px] max-w-md grid-cols-4">
          {itens.map(({ to, label, Icon }) => {
            const ativo = to === "/" ? pathname === "/" : pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                aria-current={ativo ? "page" : undefined}
                className={`flex flex-col items-center justify-center gap-0.5 text-xs ${
                  ativo ? "font-extrabold text-[#1F4D3A]" : "font-bold text-[#5B6B60]"
                }`}
              >
                <Icon className="h-6 w-6" strokeWidth={ativo ? 2.4 : 2} />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export { FONTE_TITULO };
