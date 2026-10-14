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
