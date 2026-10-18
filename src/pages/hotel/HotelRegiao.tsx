import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Baby, Car, ChevronRight, Clock, CloudRain, MapPin, Navigation, Route, Ticket, Lightbulb } from "lucide-react";
import { HotelLayout, HotelPageHeader, FONTE_TITULO } from "@/components/hotel/HotelLayout";
import { useHotelInfo, linkWhatsapp } from "@/hooks/useHotelInfo";
import { useGuestAuth } from "@/hooks/useGuestAuth";
import { CATEGORIAS, LUGARES, ROTEIROS, lugarPorId, roteiroPorId, linkMapa, type Categoria, type Lugar } from "@/data/regiao";

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

const Capa = ({ lugar, alto = 120 }: { lugar: Lugar; alto?: number }) => {
  const c = CATEGORIAS[lugar.categoria];
  return (
    <div className="relative flex items-end overflow-hidden" style={{ background: c.fundo, height: alto }}>
      <span className="absolute right-3 top-2 select-none text-[56px] opacity-30" aria-hidden="true">
        {c.emoji}
      </span>
      <span className="m-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-extrabold" style={{ color: c.cor }}>
        {c.label}
      </span>
    </div>
  );
};

const Selos = ({ lugar }: { lugar: Lugar }) => (
  <div className="flex flex-wrap gap-1.5">
    <span className="flex items-center gap-1 rounded-full bg-[#F1F4EE] px-2.5 py-1 text-xs font-bold text-[#3D4A41]">
      <Car className="h-3.5 w-3.5" /> {lugar.tempoCarro}
    </span>
    {lugar.criancas && (
      <span className="flex items-center gap-1 rounded-full bg-[#FFF4DF] px-2.5 py-1 text-xs font-bold text-[#8A5A00]">
        <Baby className="h-3.5 w-3.5" /> Crianças
      </span>
    )}
    {lugar.chuva && (
      <span className="flex items-center gap-1 rounded-full bg-[#E6F0F8] px-2.5 py-1 text-xs font-bold text-[#1D5C8C]">
        <CloudRain className="h-3.5 w-3.5" /> Coberto
      </span>
    )}
  </div>
);

const AvisoEsboco = () => (
  <p className="rounded-2xl border border-dashed border-[#C9B37A] bg-[#FFF9EC] px-4 py-3 text-[13px] text-[#6B5320]">
    <b>Esboço:</b> lugares, distâncias e preços de exemplo. Na versão final, o hotel cadastra e confere tudo no painel.
  </p>
);

const Lista = () => {
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const lugares = useMemo(
    () =>
      LUGARES.filter((l) =>
        filtro === "todos" ? true : filtro === "criancas" ? l.criancas : filtro === "chuva" ? l.chuva : l.categoria === filtro,
      ),
    [filtro],
  );

  return (
    <>
      <HotelPageHeader title="Passeios na região" subtitle="Cachoeiras, cidades históricas e roteiros perto do hotel." />
      <main className="flex flex-col gap-5 p-5">
        <AvisoEsboco />

        <section aria-labelledby="roteiros" className="flex flex-col gap-3">
          <h2 id="roteiros" className="flex items-center gap-2 text-xl font-bold" style={FONTE_TITULO}>
            <Route className="h-5 w-5 text-[#1F4D3A]" /> Roteiros prontos
          </h2>
          <div className="-mx-5 flex snap-x gap-3 overflow-x-auto px-5 pb-1">
            {ROTEIROS.map((r) => (
              <Link
                key={r.id}
                to={`/regiao/roteiro/${r.id}`}
                className="flex w-[230px] shrink-0 snap-start flex-col gap-1 rounded-[20px] p-4 text-white shadow-[0_4px_14px_rgba(20,40,30,0.15)]"
                style={{ background: r.cor }}
              >
                <span className="text-xs font-extrabold uppercase tracking-wide text-white/80">{r.duracao}</span>
                <span className="text-lg font-extrabold leading-tight" style={FONTE_TITULO}>
                  {r.titulo}
                </span>
                <span className="text-sm text-white/90">{r.subtitulo}</span>
                <span className="mt-2 text-xs font-bold text-white/80">
                  {r.paradas.length} paradas · {r.paraQuem}
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section aria-labelledby="lugares" className="flex flex-col gap-3">
          <h2 id="lugares" className="flex items-center gap-2 text-xl font-bold" style={FONTE_TITULO}>
            <MapPin className="h-5 w-5 text-[#1F4D3A]" /> Lugares para conhecer
          </h2>
          <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1" role="tablist" aria-label="Filtrar lugares">
            {FILTROS.map((f) => (
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
          {lugares.map((l) => (
            <Link
              key={l.id}
              to={`/regiao/lugar/${l.id}`}
              className="overflow-hidden rounded-[20px] bg-white shadow-[0_2px_8px_rgba(20,40,30,0.06)]"
            >
              <Capa lugar={l} alto={96} />
              <div className="flex flex-col gap-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col">
                    <span className="text-lg font-extrabold leading-tight" style={FONTE_TITULO}>
                      {l.nome}
                    </span>
                    <span className="text-[13px] font-bold text-[#5B6B60]">{l.cidade}</span>
                  </div>
                  <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-[#5B6B60]" />
                </div>
                <p className="text-sm text-[#3D4A41]">{l.resumo}</p>
                <Selos lugar={l} />
              </div>
            </Link>
          ))}
          {lugares.length === 0 && <p className="text-[15px] text-[#5B6B60]">Nenhum lugar neste filtro ainda.</p>}
        </section>
      </main>
    </>
  );
};

const Info = ({ Icon, titulo, texto }: { Icon: typeof Clock; titulo: string; texto: string }) => (
  <div className="flex items-start gap-3 py-3">
    <Icon className="mt-0.5 h-5 w-5 shrink-0 text-[#1F4D3A]" />
    <div className="flex flex-col">
      <span className="text-[13px] text-[#5B6B60]">{titulo}</span>
      <span className="font-bold">{texto}</span>
    </div>
  </div>
);

const DetalheLugar = ({ lugar }: { lugar: Lugar }) => {
  const info = useHotelInfo();
  const { guest } = useGuestAuth();
  const zap = `${linkWhatsapp(info, guest?.room_number)}`;
  return (
    <>
      <div className="relative">
        <Capa lugar={lugar} alto={190} />
        <div className="absolute inset-x-0 top-0">
          <HotelPageHeader title="" back="/regiao" cor="transparent" />
        </div>
      </div>
      <main className="-mt-6 flex flex-col gap-4 px-5">
        <section className="flex flex-col gap-2 rounded-[22px] bg-white p-5 shadow-[0_6px_20px_rgba(20,40,30,0.08)]">
          <h1 className="text-[26px] font-extrabold leading-tight" style={FONTE_TITULO}>
            {lugar.nome}
          </h1>
          <span className="flex items-center gap-1 text-sm font-bold text-[#5B6B60]">
            <MapPin className="h-4 w-4" /> {lugar.cidade}
          </span>
          <p className="text-[15px] leading-relaxed text-[#3D4A41]">{lugar.descricao}</p>
          <Selos lugar={lugar} />
        </section>

        <section className="divide-y divide-[#E6EAE3] rounded-[20px] bg-white px-4 shadow-[0_2px_8px_rgba(20,40,30,0.06)]">
          <Info Icon={Car} titulo="Distância do hotel" texto={lugar.tempoCarro} />
          <Info Icon={Clock} titulo="Funcionamento" texto={lugar.funcionamento} />
          <Info Icon={Route} titulo="Tempo sugerido" texto={lugar.duracao} />
          <Info Icon={Ticket} titulo="Entrada" texto={lugar.preco} />
        </section>

        {lugar.dicas.length > 0 && (
          <section className="rounded-[20px] bg-[#FFF4DF] p-4">
            <h2 className="mb-2 flex items-center gap-2 font-extrabold text-[#8A5A00]">
              <Lightbulb className="h-5 w-5" /> Dicas da recreação
            </h2>
            <ul className="flex list-disc flex-col gap-1 pl-5 text-[15px] text-[#5A4210]">
              {lugar.dicas.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          </section>
        )}

        <div className="flex flex-col gap-2.5">
          <a
            href={linkMapa(lugar.mapa)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-[#1F4D3A] text-[16px] font-extrabold text-white"
          >
            <Navigation className="h-5 w-5" /> Como chegar
          </a>
          {lugar.agendarPeloHotel && (
            <a
              href={zap}
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

const DetalheRoteiro = ({ id }: { id: string }) => {
  const r = roteiroPorId(id);
  if (!r) return <Lista />;
  return (
    <>
      <HotelPageHeader title={r.titulo} subtitle={`${r.duracao} · ${r.paraQuem}`} back="/regiao" cor={r.cor} />
      <main className="flex flex-col gap-4 p-5">
        <p className="text-[15px] text-[#3D4A41]">{r.subtitulo}.</p>
        <ol className="relative flex flex-col gap-0">
          {r.paradas.map((p, i) => {
            const lugar = lugarPorId(p.lugarId);
            const conteudo = (
              <div className="flex flex-1 flex-col rounded-[18px] bg-white p-4 shadow-[0_2px_8px_rgba(20,40,30,0.06)]">
                <span className="flex items-center justify-between gap-2">
                  <span className="font-extrabold" style={FONTE_TITULO}>
                    {p.titulo}
                  </span>
                  {lugar && <ChevronRight className="h-5 w-5 shrink-0 text-[#5B6B60]" />}
                </span>
                <span className="text-sm text-[#5B6B60]">{p.texto}</span>
                {lugar && <span className="mt-1 text-xs font-bold text-[#1F4D3A]">{lugar.tempoCarro}</span>}
              </div>
            );
            return (
              <li key={i} className="flex gap-3 pb-3">
                <div className="flex w-14 shrink-0 flex-col items-center">
                  <span className="rounded-full px-2 py-1 text-sm font-extrabold text-white" style={{ background: r.cor }}>
                    {p.hora}
                  </span>
                  {i < r.paradas.length - 1 && <span className="mt-1 w-0.5 flex-1 bg-[#D5DDD2]" />}
                </div>
                {lugar ? (
                  <Link to={`/regiao/lugar/${lugar.id}`} className="flex flex-1">
                    {conteudo}
                  </Link>
                ) : (
                  conteudo
                )}
              </li>
            );
          })}
        </ol>
        <AvisoEsboco />
      </main>
    </>
  );
};

const HotelRegiao = () => {
  const { tipo, id } = useParams();
  const lugar = tipo === "lugar" ? lugarPorId(id) : undefined;
  return (
    <HotelLayout>
      {lugar ? <DetalheLugar lugar={lugar} /> : tipo === "roteiro" && id ? <DetalheRoteiro id={id} /> : <Lista />}
    </HotelLayout>
  );
};

export default HotelRegiao;
