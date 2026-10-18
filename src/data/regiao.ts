// Guia da região (ESBOÇO): conteúdo de exemplo. Na versão final, o hotel cadastra e confere
// tudo no painel (aba "Passeios"), com fotos, distâncias, horários e preços verdadeiros.

export type Categoria = "natureza" | "historia" | "gastronomia" | "aventura";

export interface Lugar {
  id: string;
  nome: string;
  cidade: string;
  categoria: Categoria;
  resumo: string;
  descricao: string;
  tempoCarro: string; // ex.: "40 min de carro"
  duracao: string; // tempo sugerido no lugar
  funcionamento: string;
  preco: string;
  criancas: boolean;
  chuva: boolean; // bom para dia de chuva
  dicas: string[];
  mapa: string; // busca no Google Maps
  agendarPeloHotel?: boolean;
}

export interface Roteiro {
  id: string;
  titulo: string;
  subtitulo: string;
  duracao: string;
  paraQuem: string;
  cor: string;
  paradas: { lugarId?: string; hora: string; titulo: string; texto: string }[];
}

export const CATEGORIAS: Record<Categoria, { label: string; cor: string; fundo: string; emoji: string }> = {
  natureza: { label: "Natureza", cor: "#1F6B45", fundo: "linear-gradient(135deg,#3E8E5E,#1F4D3A)", emoji: "🌿" },
  historia: { label: "História e cultura", cor: "#8A4B14", fundo: "linear-gradient(135deg,#C98A3E,#7A4517)", emoji: "🏛️" },
  gastronomia: { label: "Gastronomia", cor: "#A33A2B", fundo: "linear-gradient(135deg,#E07A4F,#A33A2B)", emoji: "🍽️" },
  aventura: { label: "Aventura", cor: "#1D5C8C", fundo: "linear-gradient(135deg,#4A9BD1,#1D5C8C)", emoji: "🚵" },
};

export const LUGARES: Lugar[] = [
  {
    id: "vassouras-centro",
    nome: "Centro Histórico de Vassouras",
    cidade: "Vassouras",
    categoria: "historia",
    resumo: "Casarões do tempo do café, praça arborizada e igreja matriz.",
    descricao:
      "Passeio a pé pelo centro de uma das cidades mais importantes do ciclo do café. A praça é ótima para um sorvete e as crianças correrem; ao redor ficam casarões, a igreja matriz e pequenos museus.",
    tempoCarro: "≈ 40 min de carro",
    duracao: "2 a 3 horas",
    funcionamento: "Todos os dias · museus com horário próprio",
    preco: "Gratuito",
    criancas: true,
    chuva: false,
    dicas: ["Vá de manhã, quando está mais fresco", "Leve calçado confortável", "Estacione perto da praça"],
    mapa: "Centro Histórico Vassouras RJ",
  },
  {
    id: "fazenda-cafe",
    nome: "Fazenda histórica do café",
    cidade: "Vassouras",
    categoria: "historia",
    resumo: "Visita guiada a uma fazenda do século XIX, com café colonial.",
    descricao:
      "Visita guiada pela sede de uma fazenda do século XIX, contando a história do café no Vale do Paraíba. Muitas fazendas da região servem café colonial no fim da visita.",
    tempoCarro: "≈ 45 min de carro",
    duracao: "2 horas",
    funcionamento: "Com agendamento",
    preco: "Pago · consulte a recepção",
    criancas: true,
    chuva: true,
    dicas: ["Precisa agendar antes", "O café colonial costuma ser à parte"],
    mapa: "fazenda histórica café Vassouras RJ",
    agendarPeloHotel: true,
  },
  {
    id: "lago-javary",
    nome: "Lago de Javary",
    cidade: "Miguel Pereira",
    categoria: "natureza",
    resumo: "Lago cercado de verde, bom para caminhar e fazer piquenique.",
    descricao:
      "Um dos cartões-postais de Miguel Pereira. Tem caminho ao redor do lago, bancos e quiosques. Combina com um almoço na cidade, que tem clima de serra.",
    tempoCarro: "≈ 35 min de carro",
    duracao: "1 a 2 horas",
    funcionamento: "Todos os dias, de dia",
    preco: "Gratuito",
    criancas: true,
    chuva: false,
    dicas: ["Leve repelente", "Fim de tarde tem a luz mais bonita"],
    mapa: "Lago de Javary Miguel Pereira RJ",
  },
  {
    id: "cachoeira",
    nome: "Cachoeira da região",
    cidade: "Eng. Paulo de Frontin",
    categoria: "natureza",
    resumo: "Banho de cachoeira com poço raso, perto do hotel.",
    descricao:
      "Exemplo de cachoeira próxima: trilha curta, poço raso e pedras para tomar sol. A recreação pode indicar a melhor época e as condições do caminho.",
    tempoCarro: "≈ 20 min de carro",
    duracao: "Meio período",
    funcionamento: "Todos os dias, de dia",
    preco: "Gratuito",
    criancas: true,
    chuva: false,
    dicas: ["Não entre na água depois de chuva forte", "Use tênis ou papete", "Leve lanche e água"],
    mapa: "cachoeira Engenheiro Paulo de Frontin RJ",
  },
  {
    id: "conservatoria",
    nome: "Conservatória",
    cidade: "Valença",
    categoria: "historia",
    resumo: "A cidade das serestas: música pelas ruas nas noites de fim de semana.",
    descricao:
      "Distrito de Valença famoso pelas serestas e serenatas que passam pelas ruas nas noites de sexta e sábado. Tem o Museu da Seresta e muitos restaurantes de comida mineira e caseira.",
    tempoCarro: "≈ 1h30 de carro",
    duracao: "Dia inteiro ou noite",
    funcionamento: "Serestas às sextas e sábados à noite",
    preco: "Gratuito",
    criancas: false,
    chuva: false,
    dicas: ["Melhor no fim de semana", "Reserve o restaurante antes"],
    mapa: "Conservatória Valença RJ",
  },
  {
    id: "restaurante",
    nome: "Restaurante parceiro",
    cidade: "Região",
    categoria: "gastronomia",
    resumo: "Comida de fazenda no fogão a lenha, com desconto para hóspedes.",
    descricao:
      "Espaço para os parceiros do hotel: restaurantes, alambiques, queijarias e lojas de produtos da roça. O hotel pode combinar um desconto para quem mostrar o app.",
    tempoCarro: "≈ 15 min de carro",
    duracao: "1h30",
    funcionamento: "Quarta a domingo, almoço",
    preco: "$$ · 10% para hóspedes",
    criancas: true,
    chuva: true,
    dicas: ["Mostre o app para ganhar o desconto"],
    mapa: "restaurante Engenheiro Paulo de Frontin RJ",
    agendarPeloHotel: true,
  },
  {
    id: "cavalgada",
    nome: "Trilha a cavalo ou de bike",
    cidade: "Arredores do hotel",
    categoria: "aventura",
    resumo: "Passeio guiado pelas estradas de terra e mirantes da região.",
    descricao:
      "Passeio com guia parceiro, saindo do hotel. Ideal para quem quer conhecer a paisagem rural do Vale do Café com calma.",
    tempoCarro: "Saída do hotel",
    duracao: "2 horas",
    funcionamento: "Com agendamento",
    preco: "Pago · consulte a recepção",
    criancas: true,
    chuva: false,
    dicas: ["Use calça comprida", "Crianças a partir da idade indicada pelo guia"],
    mapa: "Hotel Fazenda Santa Bárbara Engenheiro Paulo de Frontin",
    agendarPeloHotel: true,
  },
];

export const ROTEIROS: Roteiro[] = [
  {
    id: "vale-do-cafe",
    titulo: "Um dia no Vale do Café",
    subtitulo: "História, fazenda e café colonial",
    duracao: "Dia inteiro",
    paraQuem: "Famílias e casais",
    cor: "#7A4517",
    paradas: [
      { hora: "9h", titulo: "Saída do hotel", texto: "Café da manhã até 9h e pé na estrada." },
      { lugarId: "vassouras-centro", hora: "10h", titulo: "Centro Histórico de Vassouras", texto: "Caminhada pela praça e casarões." },
      { hora: "12h30", titulo: "Almoço em Vassouras", texto: "Peça indicação na recepção." },
      { lugarId: "fazenda-cafe", hora: "14h30", titulo: "Fazenda histórica do café", texto: "Visita guiada e café colonial." },
      { hora: "17h30", titulo: "Volta para o hotel", texto: "A tempo do jantar e da recreação da noite." },
    ],
  },
  {
    id: "natureza",
    titulo: "Manhã de natureza",
    subtitulo: "Cachoeira e lago, voltando para o almoço",
    duracao: "Meio período",
    paraQuem: "Com crianças",
    cor: "#1F4D3A",
    paradas: [
      { lugarId: "cachoeira", hora: "8h30", titulo: "Cachoeira", texto: "Banho com poço raso, enquanto o sol ainda é suave." },
      { lugarId: "lago-javary", hora: "11h", titulo: "Lago de Javary", texto: "Volta no lago e sorvete." },
      { hora: "12h30", titulo: "Almoço no hotel", texto: "O restaurante do hotel serve até 14h30." },
    ],
  },
  {
    id: "chuva",
    titulo: "Se chover",
    subtitulo: "Programas cobertos perto do hotel",
    duracao: "Meio período",
    paraQuem: "Todos",
    cor: "#1D5C8C",
    paradas: [
      { lugarId: "fazenda-cafe", hora: "10h", titulo: "Fazenda histórica do café", texto: "A visita é dentro da sede." },
      { lugarId: "restaurante", hora: "12h30", titulo: "Almoço no fogão a lenha", texto: "Restaurante parceiro, com desconto." },
      { hora: "15h", titulo: "Recreação coberta no hotel", texto: "Veja a programação do dia no app." },
    ],
  },
];

export const lugarPorId = (id?: string) => LUGARES.find((l) => l.id === id);
export const roteiroPorId = (id?: string) => ROTEIROS.find((r) => r.id === id);
export const linkMapa = (busca: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(busca)}`;
