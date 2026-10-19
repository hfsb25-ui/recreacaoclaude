import { supabase } from "@/integrations/supabase/client";

// Passeios na região: cadastrados pelo hotel no painel (aba "Passeios").

export type Categoria = "natureza" | "historia" | "gastronomia" | "aventura";

export interface Passeio {
  id: string;
  nome: string;
  cidade: string;
  categoria: Categoria;
  resumo: string;
  descricao: string;
  distancia: string;
  duracao: string;
  funcionamento: string;
  preco: string;
  dicas: string; // uma dica por linha
  mapa: string; // link do Google Maps ou texto para buscar
  criancas: boolean;
  chuva: boolean;
  agendar: boolean;
  imagem: string | null; // caminho no armazenamento
  ativo: boolean;
  ordem: number;
}

export const CATEGORIAS: Record<Categoria, { label: string; cor: string; fundo: string; emoji: string }> = {
  natureza: { label: "Natureza", cor: "#1F6B45", fundo: "linear-gradient(135deg,#3E8E5E,#1F4D3A)", emoji: "🌿" },
  historia: { label: "História e cultura", cor: "#8A4B14", fundo: "linear-gradient(135deg,#C98A3E,#7A4517)", emoji: "🏛️" },
  gastronomia: { label: "Gastronomia", cor: "#A33A2B", fundo: "linear-gradient(135deg,#E07A4F,#A33A2B)", emoji: "🍽️" },
  aventura: { label: "Aventura", cor: "#1D5C8C", fundo: "linear-gradient(135deg,#4A9BD1,#1D5C8C)", emoji: "🚵" },
};

export const categoriaDe = (c: string) => CATEGORIAS[(c as Categoria) in CATEGORIAS ? (c as Categoria) : "natureza"];

export const PASTA_FOTOS = "passeios";
export const BUCKET_FOTOS = "announcements";

export const urlFoto = (caminho: string | null) =>
  caminho ? supabase.storage.from(BUCKET_FOTOS).getPublicUrl(caminho).data.publicUrl : null;

export const linkMapa = (mapa: string) =>
  /^https?:\/\//i.test(mapa.trim())
    ? mapa.trim()
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapa)}`;

export const listaDicas = (dicas: string) =>
  dicas
    .split("\n")
    .map((d) => d.trim())
    .filter(Boolean);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export const carregarPasseios = async (todos = false): Promise<Passeio[]> => {
  let q = db.from("passeios").select("*").order("ordem", { ascending: true }).order("nome");
  if (!todos) q = q.eq("ativo", true);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Passeio[];
};

/** Diminui a foto antes de enviar (até 1400 px, WebP), para carregar rápido no celular. */
export const prepararFoto = (arquivo: File): Promise<Blob> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(arquivo);
    img.onload = () => {
      const max = 1400;
      const escala = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * escala);
      c.height = Math.round(img.height * escala);
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      c.toBlob((b) => (b ? resolve(b) : reject(new Error("Não foi possível ler a foto"))), "image/webp", 0.82);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Arquivo de imagem inválido"));
    };
    img.src = url;
  });
