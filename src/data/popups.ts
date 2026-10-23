import { supabase } from "@/integrations/supabase/client";
import { BUCKET_FOTOS } from "@/data/regiao";

export interface Popup {
  id: string;
  titulo: string;
  mensagem: string;
  imagem: string | null;
  botao_texto: string | null;
  botao_link: string | null;
  inicio: string; // AAAA-MM-DD
  dias: number;
  publico: "todos" | "hospedes";
  ativo: boolean;
  created_at: string;
}

export const PASTA_POPUPS = "popups";

export const urlImagemPopup = (caminho: string | null) =>
  caminho ? supabase.storage.from(BUCKET_FOTOS).getPublicUrl(caminho).data.publicUrl : null;

/** Páginas do app que o botão pode abrir */
export const DESTINOS_POPUP = [
  { link: "/programacao", label: "Programação" },
  { link: "/recreacao", label: "Recreação" },
  { link: "/hotel", label: "O hotel" },
  { link: "/avisos", label: "Avisos" },
  { link: "/estadia", label: "Minha estadia" },
  { link: "/regiao", label: "Passeios na região" },
  { link: "/guest-auth", label: "Entrar com o apartamento" },
];

const ymd = (d: Date) => {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return z.toISOString().slice(0, 10);
};

export const hojeYmd = () => ymd(new Date());

/** Último dia em que o popup aparece (AAAA-MM-DD). */
export const ultimoDia = (p: Pick<Popup, "inicio" | "dias">) => {
  const [a, m, d] = p.inicio.split("-").map(Number);
  return ymd(new Date(a, m - 1, d + p.dias - 1));
};

export const situacao = (p: Pick<Popup, "inicio" | "dias" | "ativo">) => {
  const hoje = hojeYmd();
  if (!p.ativo) return "pausado" as const;
  if (hoje < p.inicio) return "agendado" as const;
  if (hoje > ultimoDia(p)) return "encerrado" as const;
  return "no_ar" as const;
};

export const dataBr = (s: string) => {
  const [a, m, d] = s.split("-");
  return `${d}/${m}/${a}`;
};

export const linkExterno = (link: string) => /^https?:\/\//i.test(link) || /^(tel|mailto):/i.test(link);
