// Informações fixas do hotel (provisório).
// Na etapa do painel, estes dados passam a vir do banco e ficam editáveis em "Informações do hotel".

export const HOTEL = {
  nome: "Hotel Fazenda Santa Bárbara",
  whatsapp: "5524999680997",
  whatsappLabel: "(24) 99968-0997",
  horarios: [
    { nome: "Café da manhã", horario: "7h30 às 10h" },
    { nome: "Almoço", horario: "12h às 14h30" },
    { nome: "Lanche da tarde", horario: "16h às 17h" },
    { nome: "Jantar", horario: "19h às 21h30" },
    { nome: "Piscinas", horario: "10h às 18h45" },
  ],
  wifi: { rede: "Hóspedes", senha: "hfsb2024" },
  ramais: [
    { nome: "Recepção", ramal: "9", urgente: false },
    { nome: "Emergência", ramal: "402", urgente: true },
  ],
};

export const whatsappLink = (texto?: string) =>
  `https://wa.me/${HOTEL.whatsapp}${texto ? `?text=${encodeURIComponent(texto)}` : ""}`;

// Cores do app do hotel
export const COR = {
  verde: "#1F4D3A",
  sol: "#F2B13B",
  fundo: "#F4F6F0",
};
