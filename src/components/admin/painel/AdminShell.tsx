import { useEffect, useMemo, useRef, useState, type ComponentType, type ReactNode } from "react";
import { Download, LogOut, Menu, MoreHorizontal, Search, X } from "lucide-react";

export interface PaginaAdmin {
  id: string;
  rotulo: string;
  grupo: string | null;
  icone: ComponentType<{ className?: string }>;
  titulo?: string;
  sub?: string;
  badge?: number;
  /** Nome curto para a barra de baixo do celular. */
  curto?: string;
  render: () => ReactNode;
}

const lerHash = () => (typeof window === "undefined" ? "" : decodeURIComponent(window.location.hash.replace(/^#/, "")));

/** Moldura do admin: barra escura no topo, menu lateral agrupado e barra de baixo no celular. */
export const AdminShell = ({
  paginas,
  atalhosCelular,
  usuario,
  onExportarPdf,
  onSair,
}: {
  paginas: PaginaAdmin[];
  atalhosCelular: string[];
  usuario: { email: string; papel: string };
  onExportarPdf: () => void;
  onSair: () => void;
}) => {
  const ids = useMemo(() => new Set(paginas.map((p) => p.id)), [paginas]);
  const [atual, setAtual] = useState(() => (ids.has(lerHash()) ? lerHash() : "painel"));
  const [gaveta, setGaveta] = useState(false);
  const [busca, setBusca] = useState("");
  const [buscaAberta, setBuscaAberta] = useState(false);
  const [menuUsuario, setMenuUsuario] = useState(false);
  const conteudo = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const aoMudar = () => {
      const h = lerHash();
      if (ids.has(h)) setAtual(h);
    };
    window.addEventListener("hashchange", aoMudar);
    return () => window.removeEventListener("hashchange", aoMudar);
  }, [ids]);

  const irPara = (id: string) => {
    if (!ids.has(id)) return;
    setAtual(id);
    setGaveta(false);
    setBusca("");
    setBuscaAberta(false);
    if (lerHash() !== id) window.history.replaceState(null, "", `#${id}`);
    window.scrollTo({ top: 0 });
  };

  const pagina = paginas.find((p) => p.id === atual) ?? paginas[0];
  const grupos = useMemo(() => {
    const m: { nome: string | null; itens: PaginaAdmin[] }[] = [];
    for (const p of paginas) {
      const g = m.find((x) => x.nome === p.grupo);
      if (g) g.itens.push(p);
      else m.push({ nome: p.grupo, itens: [p] });
    }
    return m;
  }, [paginas]);

  const semAcento = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const resultados = busca.trim()
    ? paginas.filter((p) => semAcento(`${p.rotulo} ${p.grupo ?? ""} ${p.titulo ?? ""}`).includes(semAcento(busca.trim()))).slice(0, 8)
    : [];

  const iniciais = usuario.email.slice(0, 2).toUpperCase();

  const menuLateral = (
    <nav aria-label="Menu do admin" className="flex flex-col gap-0.5 pb-6">
      {grupos.map((g) => (
        <div key={g.nome ?? "inicio"}>
          {g.nome && (
            <div className="px-4 pb-1.5 pt-5 text-[11px] font-medium uppercase tracking-[0.08em] text-[#66736C]">{g.nome}</div>
          )}
          {g.itens.map((p) => {
            const Icone = p.icone;
            const ativo = p.id === atual;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => irPara(p.id)}
                aria-current={ativo ? "page" : undefined}
                className={`flex w-full items-center gap-3 rounded-r-full py-2 pl-4 pr-3 text-left text-sm transition-colors ${
                  ativo ? "bg-[#E3EAE6] font-medium text-[#1F5C45]" : "text-[#3B4540] hover:bg-[#ECEFED]"
                }`}
              >
                <Icone className={`h-[18px] w-[18px] shrink-0 ${ativo ? "text-[#1F5C45]" : "text-[#7B8781]"}`} />
                <span className="flex-1 truncate">{p.rotulo}</span>
                {!!p.badge && (
                  <span className="min-w-[20px] rounded-full bg-[#C2417F] px-1.5 py-px text-center text-[11px] font-medium text-white">
                    {p.badge > 99 ? "99+" : p.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      ))}
    </nav>
  );

  return (
    <div className="admin-novo min-h-screen bg-[#FAFBFA] font-[Roboto,system-ui,sans-serif] text-[#1F2421]">
      {/* Barra do topo */}
      <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center gap-2 bg-[#1F2421] px-2 text-white shadow-md sm:gap-3 sm:px-4">
        <button
          type="button"
          onClick={() => setGaveta(true)}
          className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/10 lg:hidden"
          aria-label="Abrir menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <button type="button" onClick={() => irPara("painel")} className="truncate text-left text-[13px] font-medium uppercase tracking-[0.12em] sm:text-sm lg:w-auto lg:shrink-0 lg:pr-6">
          Meu Santa Bárbara <span className="text-white/50">· Admin</span>
        </button>

        <div className="relative ml-auto hidden max-w-md flex-1 md:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/60" />
          <input
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value);
              setBuscaAberta(true);
            }}
            onFocus={() => setBuscaAberta(true)}
            onBlur={() => setTimeout(() => setBuscaAberta(false), 150)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && resultados[0]) irPara(resultados[0].id);
              if (e.key === "Escape") setBusca("");
            }}
            placeholder="Buscar no admin (ex.: popups, brindes)"
            className="h-9 w-full rounded bg-white/10 pl-9 pr-3 text-sm text-white placeholder:text-white/55 focus:bg-white focus:text-[#1F2421] focus:placeholder:text-[#66736C] focus:outline-none"
            aria-label="Buscar no admin"
          />
          {buscaAberta && resultados.length > 0 && (
            <ul className="absolute left-0 right-0 top-11 overflow-hidden rounded-md bg-white py-1 text-[#1F2421] shadow-lg">
              {resultados.map((r) => {
                const Icone = r.icone;
                return (
                  <li key={r.id}>
                    <button type="button" onMouseDown={() => irPara(r.id)} className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-[#F3F5F4]">
                      <Icone className="h-4 w-4 text-[#7B8781]" />
                      <span className="flex-1">{r.rotulo}</span>
                      {r.grupo && <span className="text-xs text-[#66736C]">{r.grupo}</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="ml-auto flex items-center gap-1 md:ml-2">
          <button
            type="button"
            onClick={onExportarPdf}
            className="flex h-9 items-center gap-2 rounded px-2.5 text-sm hover:bg-white/10"
            title="Exportar a programação em PDF"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Exportar PDF</span>
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuUsuario((v) => !v)}
              onBlur={() => setTimeout(() => setMenuUsuario(false), 150)}
              className="ml-1 flex h-9 w-9 items-center justify-center rounded-full bg-[#E0A00D] text-[13px] font-medium text-[#1F2421]"
              aria-label="Menu do usuário"
            >
              {iniciais}
            </button>
            {menuUsuario && (
              <div className="absolute right-0 top-11 w-60 overflow-hidden rounded-md bg-white text-[#1F2421] shadow-lg">
                <div className="border-b border-[#E1E6E3] px-4 py-3">
                  <div className="truncate text-sm font-medium">{usuario.email}</div>
                  <div className="text-xs capitalize text-[#66736C]">{usuario.papel}</div>
                </div>
                <button type="button" onMouseDown={onSair} className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-[#F3F5F4]">
                  <LogOut className="h-4 w-4" /> Sair
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Menu lateral (computador) */}
      <aside className="fixed bottom-0 left-0 top-14 z-30 hidden w-64 overflow-y-auto border-r border-[#E1E6E3] bg-[#F7F8F7] pr-3 lg:block">
        {menuLateral}
      </aside>

      {/* Gaveta (celular) */}
      {gaveta && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" className="absolute inset-0 bg-black/40" onClick={() => setGaveta(false)} aria-label="Fechar menu" />
          <aside className="absolute bottom-0 left-0 top-0 w-[80%] max-w-xs overflow-y-auto bg-[#F7F8F7] pr-3 shadow-xl">
            <div className="flex h-14 items-center justify-between bg-[#1F2421] px-4 text-white">
              <span className="text-[13px] font-medium uppercase tracking-[0.12em]">Menu</span>
              <button type="button" onClick={() => setGaveta(false)} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/10" aria-label="Fechar">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-3 pt-3 md:hidden">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7B8781]" />
                <input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar"
                  className="h-9 w-full rounded border border-[#D5DCD8] bg-white pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1F5C45]/30"
                  aria-label="Buscar no admin"
                />
              </div>
            </div>
            {busca.trim() ? (
              <div className="py-2">
                {resultados.length === 0 && <p className="px-4 py-2 text-sm text-[#66736C]">Nada encontrado.</p>}
                {resultados.map((r) => {
                  const Icone = r.icone;
                  return (
                    <button key={r.id} type="button" onClick={() => irPara(r.id)} className="flex w-full items-center gap-3 rounded-r-full py-2 pl-4 text-left text-sm hover:bg-[#ECEFED]">
                      <Icone className="h-[18px] w-[18px] text-[#7B8781]" /> {r.rotulo}
                    </button>
                  );
                })}
              </div>
            ) : (
              menuLateral
            )}
          </aside>
        </div>
      )}

      {/* Conteúdo */}
      <main ref={conteudo} className="pb-24 pt-14 lg:pb-10 lg:pl-64">
        <div className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
          <div className="mb-5">
            {pagina.grupo && <div className="text-xs font-medium uppercase tracking-[0.08em] text-[#66736C]">{pagina.grupo}</div>}
            <h1 className="text-[26px] font-normal leading-tight text-[#1F5C45] sm:text-[30px]">{pagina.titulo ?? pagina.rotulo}</h1>
            {pagina.sub && <p className="mt-1 text-sm text-[#66736C]">{pagina.sub}</p>}
          </div>
          <div key={pagina.id} className="admin-novo-conteudo min-w-0">
            {pagina.render()}
          </div>
        </div>
      </main>

      {/* Barra de baixo (celular) */}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid h-16 border-t border-[#E1E6E3] bg-white lg:hidden" style={{ gridTemplateColumns: `repeat(${atalhosCelular.length + 1}, 1fr)` }} aria-label="Atalhos">
        {atalhosCelular
          .map((id) => paginas.find((p) => p.id === id))
          .filter((p): p is PaginaAdmin => !!p)
          .map((p) => {
            const Icone = p.icone;
            const ativo = p.id === atual;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => irPara(p.id)}
                className={`relative flex flex-col items-center justify-center gap-0.5 text-[11px] ${ativo ? "font-medium text-[#1F5C45]" : "text-[#66736C]"}`}
              >
                <span className={`flex h-7 w-14 items-center justify-center rounded-full ${ativo ? "bg-[#E3EAE6]" : ""}`}>
                  <Icone className="h-5 w-5" />
                </span>
                {p.curto ?? p.rotulo}
                {!!p.badge && <span className="absolute right-[calc(50%-22px)] top-1.5 h-2 w-2 rounded-full bg-[#C2417F]" />}
              </button>
            );
          })}
        <button type="button" onClick={() => setGaveta(true)} className="flex flex-col items-center justify-center gap-0.5 text-[11px] text-[#66736C]">
          <span className="flex h-7 w-14 items-center justify-center rounded-full">
            <MoreHorizontal className="h-5 w-5" />
          </span>
          Mais
        </button>
      </nav>
    </div>
  );
};
