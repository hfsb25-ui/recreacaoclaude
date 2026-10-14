/** Mostra só o sobrenome ("Família Souza") para não expor o nome completo dos hóspedes. */
export const familia = (nome: string) => {
  const partes = nome.trim().split(/\s+/);
  return partes.length > 1 ? `Família ${partes[partes.length - 1]}` : partes[0];
};
