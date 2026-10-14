// Modo manutenção do app da recreação.
//
// LIGADO = true  → no site publicado (produção) os hóspedes veem a página "Em manutenção".
// LIGADO = false → app normal.
//
// Os links de teste da Vercel (Preview) e o computador local nunca entram em manutenção,
// para dar para testar as mudanças.
export const MANUTENCAO_LIGADA = true;

// Estas páginas continuam funcionando mesmo em manutenção (equipe e totem).
const ROTAS_LIBERADAS = ["/admin", "/auth", "/totem"];

const CHAVE_EQUIPE = "acesso-equipe-manutencao";

const lerEquipe = () => {
  try {
    return localStorage.getItem(CHAVE_EQUIPE) === "1";
  } catch {
    return false;
  }
};

const gravarEquipe = (liberado: boolean) => {
  try {
    if (liberado) localStorage.setItem(CHAVE_EQUIPE, "1");
    else localStorage.removeItem(CHAVE_EQUIPE);
  } catch {
    // sem armazenamento: vale só para esta visita
  }
};

/**
 * Decide se mostra a página de manutenção.
 * - ?equipe=1 libera o app inteiro neste aparelho (para a equipe conferir); ?equipe=0 desfaz.
 * - ?manutencao=1 mostra a página de manutenção em qualquer lugar (para ver como ficou).
 */
export const deveMostrarManutencao = (): boolean => {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);

  if (params.get("manutencao") === "1") return true;

  if (params.get("equipe") === "1") gravarEquipe(true);
  if (params.get("equipe") === "0") gravarEquipe(false);

  if (!MANUTENCAO_LIGADA) return false;
  if (__VERCEL_ENV__ !== "production") return false;
  if (lerEquipe()) return false;

  const caminho = window.location.pathname.replace(/\/+$/, "") || "/";
  return !ROTAS_LIBERADAS.some((r) => caminho === r || caminho.startsWith(`${r}/`));
};
