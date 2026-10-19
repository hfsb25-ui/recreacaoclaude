import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Baby, Car, ChevronRight, Clock, CloudRain, Lightbulb, MapPin, Navigation, Route, Ticket } from "lucide-react";
import { HotelLayout, HotelPageHeader, FONTE_TITULO } from "@/components/hotel/HotelLayout";
import { useHotelInfo, linkWhatsapp } from "@/hooks/useHotelInfo";
import { useGuestAuth } from "@/hooks/useGuestAuth";
import { carregarPasseios, categoriaDe, linkMapa, listaDicas, urlFoto, type Categoria, type Passeio } from "@/data/regiao";

type Filtro = "todos" | Categoria | "criancas" | "chuva";

const FILTROS: { id: Filtro; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "natureza", label: "🌿 Natureza" },
  { id: "historia", label: "🏛️ História" },
  { id: "gastronomia", label: "🍽️ Comer bem" },
  { id: "aventura", label: "🚵 Aventura" },
  { id: "criancas", label: "👧 Com crianças" },
  { id: "chuva", label: "☔ Dia de chuva" },
];

export const CapaPasseio = ({
  passeio,
  alto = 150,
  selo = true,
}: {
  passeio: Pick<Passeio, "categoria" | "imagem" | "nome">;
  alto?: number;
  selo?: boolean;
}) => {
  const c = categoriaDe(passeio.categoria);
  const foto = urlFoto(passeio.imagem);
  return (
    <div className="relative flex items-end overflow-hidden" style={{ background: c.fundo, height: alto }}>
      {foto ? (
        <img src={foto} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <span className="absolute right-3 top-2 select-none text-[56px] opacity-30" aria-hidden="true">
          {c.emoji}
        </span>
      )}
      {selo && (
        <span className="relative m-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-extrabold" style={{ color: c.cor }}>
          {c.label}
        </span>
      )}
    </div>
  );
};

const Selos = ({ p }: { p: Passeio }) => (
  <div className="flex flex-wrap gap-1.5">
    {p.distancia && (
      <span className="flex items-center gap-1 rounded-full bg-[#F1F4EE] px-2.5 py-1 text-xs font-bold text-[#3D4A41]">
        <Car className="h-3.5 w-3.5" /> {p.distancia}
      </span>
    )}
    {p.criancas && (
      <span className="flex items-center gap-1 rounded-full bg-[#FFF4DF] px-2.5 py-1 text-xs font-bold text-[#8A5A00]">
        <Baby className="h-3.5 w-3.5" /> Crianças
      </span>
    )}
    {p.chuva && (
      <span className="flex items-center gap-1 rounded-full bg-[#E6F0F8] px-2.5 py-1 text-xs font-bold text-[#1D5C8C]">
        <CloudRain className="h-3.5 w-3.5" /> Coberto
      </span>
    )}
  </div>
);

const Lista = ({ passeios, carregando }: { passeios: Passeio[]; carregando: boolean }) => {
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const filtrados = useMemo(
    () =>
      passeios.filter((p) =>
        filtro === "todos" ? true : filtro === "criancas" ? p.criancas : filtro === "chuva" ? p.chuva : p.categoria === filtro,
      ),
    [passeios, filtro],
  );
  // Só mostra os filtros que têm algum passeio
  const filtrosVisiveis = FILTROS.filter(
    (f) =>
      f.id === "todos" ||
      passeios.some((p) => (f.id === "criancas" ? p.criancas : f.id === "chuva" ? p.chuva : p.categoria === f.id)),
  );

  return (
    <>
      <HotelPageHeader title="Passeios na região" subtitle="Cachoeiras, cidades históricas e lugares perto do hotel." />
      <main className="flex flex-col gap-3 p-5">
        {carregando ? (
          <p className="py-8 text-center text-[15px] text-[#5B6B60]">Carregando passeios…</p>
        ) : passeios.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-[20px] bg-white p-6 text-center shadow-[0_2px_8px_rgba(20,40,30,0.06)]">
            <MapPin className="h-8 w-8 text-[#1F4D3A]" />
            <span className="text-lg font-extrabold" style={FONTE_TITULO}>
              Em breve
            </span>
            <span className="text-[15px] text-[#5B6B60]">Estamos preparando as dicas de passeios. Enquanto isso, fale com a recepção.</span>
          </div>
        ) : (
          <>
            {filtrosVisiveis.length > 2 && (
              <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1" role="tablist" aria-label="Filtrar passeios">
                {filtrosVisiveis.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    role="tab"
                    aria-selected={filtro === f.id}
                    onClick={() => setFiltro(f.id)}
                    className={`min-h-[40px] shrink-0 rounded-full px-4 text-sm font-extrabold ${
                      filtro === f.id ? "bg-[#1F4D3A] text-white" : "bg-white text-[#3D4A41] shadow-[0_1px_4px_rgba(20,40,30,0.08)]"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            )}
            {filtrados.map((p) => (
              <Link
                key={p.id}
                to={`/regiao/${p.id}`}
                className="overflow-hidden rounded-[20px] bg-white shadow-[0_2px_8px_rgba(20,40,30,0.06)]"
              >
                <CapaPasseio passeio={p} alto={150} />
                <div className="flex flex-col gap-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-col">
                      <span className="text-lg font-extrabold leading-tight" style={FONTE_TITULO}>
                        {p.nome}
                      </span>
                      {p.cidade && <span className="text-[13px] font-bold text-[#5B6B60]">{p.cidade}</span>}
                    </div>
                    <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-[#5B6B60]" />
                  </div>
                  {p.resumo && <p className="text-sm text-[#3D4A41]">{p.resumo}</p>}
                  <Selos p={p} />
                </div>
              </Link>
            ))}
            {filtrados.length === 0 && <p className="text-[15px] text-[#5B6B60]">Nenhum passeio neste filtro.</p>}
          </>
        )}
      </main>
    </>
  );
};

const Info = ({ Icon, titulo, texto }: { Icon: typeof Clock; titulo: string; texto: string }) =>
  texto ? (
    <div className="flex items-start gap-3 py-3">
      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-[#1F4D3A]" />
      <div className="flex flex-col">
        <span className="text-[13px] text-[#5B6B60]">{titulo}</span>
        <span className="font-bold">{texto}</span>
      </div>
    </div>
  ) : null;

const Detalhe = ({ p }: { p: Passeio }) => {
  const info = useHotelInfo();
  const { guest } = useGuestAuth();
  const dicas = listaDicas(p.dicas);
  const temInfo = p.distancia || p.funcionamento || p.duracao || p.preco;
  return (
    <>
      <div className="relative">
        <CapaPasseio passeio={p} alto={230} selo={false} />
        <div className="absolute inset-x-0 top-0">
          <HotelPageHeader title="" back="/regiao" cor="transparent" />
        </div>
      </div>
      <main className="-mt-6 flex flex-col gap-4 px-5">
        <section className="relative flex flex-col gap-2 rounded-[22px] bg-white p-5 shadow-[0_6px_20px_rgba(20,40,30,0.08)]">
          <span className="text-xs font-extrabold uppercase tracking-wide" style={{ color: categoriaDe(p.categoria).cor }}>
            {categoriaDe(p.categoria).label}
          </span>
          <h1 className="text-[26px] font-extrabold leading-tight" style={FONTE_TITULO}>
            {p.nome}
          </h1>
          {p.cidade && (
            <span className="flex items-center gap-1 text-sm font-bold text-[#5B6B60]">
              <MapPin className="h-4 w-4" /> {p.cidade}
            </span>
          )}
          {p.descricao && <p className="whitespace-pre-line text-[15px] leading-relaxed text-[#3D4A41]">{p.descricao}</p>}
          <Selos p={p} />
        </section>

        {temInfo && (
          <section className="divide-y divide-[#E6EAE3] rounded-[20px] bg-white px-4 shadow-[0_2px_8px_rgba(20,40,30,0.06)]">
            <Info Icon={Car} titulo="Distância do hotel" texto={p.distancia} />
            <Info Icon={Clock} titulo="Funcionamento" texto={p.funcionamento} />
            <Info Icon={Route} titulo="Tempo sugerido" texto={p.duracao} />
            <Info Icon={Ticket} titulo="Entrada" texto={p.preco} />
          </section>
        )}

        {dicas.length > 0 && (
          <section className="rounded-[20px] bg-[#FFF4DF] p-4">
            <h2 className="mb-2 flex items-center gap-2 font-extrabold text-[#8A5A00]">
              <Lightbulb className="h-5 w-5" /> Dicas
            </h2>
            <ul className="flex list-disc flex-col gap-1 pl-5 text-[15px] text-[#5A4210]">
              {dicas.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          </section>
        )}

        <div className="flex flex-col gap-2.5 pb-2">
          {p.mapa && (
            <a
              href={linkMapa(p.mapa)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-[#1F4D3A] text-[16px] font-extrabold text-white"
            >
              <Navigation className="h-5 w-5" /> Como chegar
            </a>
          )}
          {p.agendar && (
            <a
              href={linkWhatsapp(info, guest?.room_number)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-[52px] items-center justify-center gap-2 rounded-2xl border-2 border-[#1E8E4E] bg-white text-[16px] font-extrabold text-[#1E8E4E]"
            >
              Agendar com a recepção
            </a>
          )}
        </div>
      </main>
    </>
  );
};

const HotelRegiao = () => {
  const { id } = useParams();
  const [passeios, setPasseios] = useState<Passeio[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    carregarPasseios()
      .then(setPasseios)
      .catch(() => setPasseios([]))
      .finally(() => setCarregando(false));
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  const atual = id ? passeios.find((p) => p.id === id) : undefined;
  return <HotelLayout>{atual ? <Detalhe p={atual} /> : <Lista passeios={passeios} carregando={carregando} />}</HotelLayout>;
};

export default HotelRegiao;
