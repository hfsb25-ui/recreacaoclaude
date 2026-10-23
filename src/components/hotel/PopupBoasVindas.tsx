import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { FONTE_TITULO } from "@/components/hotel/HotelLayout";
import { linkExterno, situacao, urlImagemPopup, type Popup } from "@/data/popups";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

const CHAVE = (id: string) => `popup-visto-${id}`;
const jaViu = (id: string) => {
  try {
    return Boolean(localStorage.getItem(CHAVE(id)));
  } catch {
    return false;
  }
};
const marcarVisto = (id: string) => {
  try {
    localStorage.setItem(CHAVE(id), String(Date.now()));
  } catch {
    // sem armazenamento: só fecha
  }
};
const logado = () => {
  try {
    return Boolean(localStorage.getItem("guest"));
  } catch {
    return false;
  }
};

// Páginas onde o popup não aparece
const FORA = ["/admin", "/auth", "/totem"];

/** Mostra uma vez por aparelho o popup que estiver no ar (cadastrado na aba Popups do admin). */
export const PopupBoasVindas = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [popup, setPopup] = useState<Popup | null>(null);
  const [aberto, setAberto] = useState(false);
  const bloqueada = FORA.some((p) => pathname.startsWith(p));

  useEffect(() => {
    if (bloqueada || popup) return;
    let cancelado = false;
    const t = setTimeout(async () => {
      // O banco só devolve os que estão no ar (o gestor logado vê todos, por isso confere de novo aqui)
      const { data } = await db.from("popups").select("*").order("created_at", { ascending: false }).limit(20);
      if (cancelado || !data) return;
      const proximo = (data as Popup[]).find(
        (p) => situacao(p) === "no_ar" && !jaViu(p.id) && (p.publico === "todos" || logado()),
      );
      if (proximo) {
        setPopup(proximo);
        setAberto(true);
      }
    }, 900);
    return () => {
      cancelado = true;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bloqueada, pathname]);

  if (!popup || !aberto || bloqueada) return null;

  const fechar = () => {
    marcarVisto(popup.id);
    setAberto(false);
  };

  const clicarBotao = () => {
    const link = popup.botao_link?.trim();
    fechar();
    if (!link) return;
    if (linkExterno(link)) window.open(link, "_blank", "noopener,noreferrer");
    else navigate(link);
  };

  const imagem = urlImagemPopup(popup.imagem);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="popup-titulo"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 p-5 animate-in fade-in"
      onClick={fechar}
    >
      <div
        className="relative w-full max-w-sm overflow-hidden rounded-[24px] bg-white text-[#1D2A22] shadow-2xl animate-in zoom-in-95"
        style={{ fontFamily: "'Nunito', system-ui, sans-serif" }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={fechar}
          aria-label="Fechar"
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-white"
        >
          <X className="h-5 w-5" />
        </button>
        {imagem && <img src={imagem} alt="" className="max-h-[45vh] w-full object-cover" />}
        <div className={`flex flex-col gap-3 p-5 ${imagem ? "" : "pt-12"}`}>
          <h2 id="popup-titulo" className={`text-[22px] font-extrabold leading-tight ${imagem ? "" : "pr-8"}`} style={FONTE_TITULO}>
            {popup.titulo}
          </h2>
          {popup.mensagem && <p className="whitespace-pre-line text-[15px] leading-relaxed text-[#3D4A41]">{popup.mensagem}</p>}
          {popup.botao_texto ? (
            <button
              type="button"
              onClick={clicarBotao}
              className="mt-1 min-h-[50px] rounded-2xl bg-[#1F4D3A] text-[16px] font-extrabold text-white"
            >
              {popup.botao_texto}
            </button>
          ) : null}
          <button type="button" onClick={fechar} className="min-h-[40px] text-sm font-bold text-[#5B6B60]">
            {popup.botao_texto ? "Agora não" : "Fechar"}
          </button>
        </div>
      </div>
    </div>
  );
};
