// Emoji das faixas etárias: usa o que foi escolhido no painel;
// se estiver vazio, escolhe pelo nome da faixa.

const REGRAS: { teste: RegExp; emoji: string }[] = [
  { teste: /bab|beb[eê]|ber[cç]/i, emoji: "🐣" },
  { teste: /fam[ií]lia|todos|todas/i, emoji: "👨‍👩‍👧" },
  { teste: /teen|juven|adolesc|jovem|jovens/i, emoji: "🛹" },
  { teste: /adult|melhor idade|maior/i, emoji: "☕" },
  { teste: /kid|infant|crian[cç]|mirim|pequen/i, emoji: "🧸" },
];

export const SUGESTOES_EMOJI = ["🐣", "🧸", "🦖", "🛹", "🎮", "☕", "👨‍👩‍👧", "🎈", "⚽", "🌻", "🐴", "🎨"];

export const emojiDaFaixa = (nome: string, emoji?: string | null): string => {
  if (emoji && emoji.trim()) return emoji.trim();
  return REGRAS.find((r) => r.teste.test(nome))?.emoji ?? "🎈";
};

/** Cor clarinha a partir da cor da faixa (para o fundo do emoji e da etiqueta). */
export const corClara = (hex: string, alpha = 0.16): string => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return "rgba(31,77,58,0.12)";
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
};

// Paleta usada quando duas faixas têm a mesma cor cadastrada
const PALETA = ["#F59E0B", "#10B981", "#3B82F6", "#8B5CF6", "#EF4444", "#EC4899", "#14B8A6", "#F97316", "#6366F1", "#84CC16"];

/**
 * Garante uma cor diferente para cada faixa (na ordem do painel).
 * Mantém a cor cadastrada quando ela ainda não foi usada; se repetir, troca por uma da paleta.
 */
export const coresDistintas = <T extends { id: string; color: string }>(faixas: T[]): Record<string, string> => {
  const usadas = new Set<string>();
  const resultado: Record<string, string> = {};
  for (const f of faixas) {
    let cor = (f.color || "").trim().toUpperCase();
    if (!/^#[0-9A-F]{6}$/.test(cor) || usadas.has(cor)) {
      cor = PALETA.find((p) => !usadas.has(p)) ?? cor;
    }
    usadas.add(cor);
    resultado[f.id] = cor;
  }
  return resultado;
};
