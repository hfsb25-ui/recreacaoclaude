import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useGuestAuth } from "@/hooks/useGuestAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { PetArt, PET_SPECIES, PET_STAGES, stageFromXp, type PetSpecies } from "@/components/pet/PetArt";
import { shareOrDownloadCertificate } from "@/components/pet/petCertificate";
import { PetCasa, prepararCuidados, XP_CUIDADO_MAX, type Cuidados } from "@/components/pet/PetCasa";
import { HotelLayout, HotelPageHeader } from "@/components/hotel/HotelLayout";

const VERDE = "#10B981";

interface PetData {
  id: string;
  species: PetSpecies;
  name: string;
  created_at: string;
  xp: number;
  checkins: number;
  ratings: number;
  games: number;
  cuidados?: Partial<Cuidados> | null;
  cuidados_em?: string | null;
}

const db = supabase as any;
const display = { fontFamily: "'Baloo 2', system-ui, sans-serif" };
const cartao = "rounded-[20px] bg-white p-4 shadow-[0_2px_10px_rgba(20,40,30,0.07)]";

const CARE = [
  { emoji: "✅", action: "Fazer check-in numa atividade", effect: "cresce e ganha 5 moedas", xp: "+15" },
  { emoji: "💬", action: "Avaliar uma atividade", effect: "conversa com você", xp: "+10" },
  { emoji: "🎰", action: "Jogar na Roda da Sorte ou nos jogos", effect: "brinca", xp: "+5" },
  { emoji: "💚", action: "Cuidar dele aqui todo dia", effect: "comer, banho, dormir e brincar", xp: `até +${XP_CUIDADO_MAX}` },
];

/** Cuidados salvos no celular quando o banco não respondeu (usa o mais recente). */
const cuidadosLocais = (guestId: string) => {
  try {
    const x = JSON.parse(localStorage.getItem(`pet-cuidados-${guestId}`) ?? "null");
    return x && x.c && x.em ? (x as { c: Partial<Cuidados>; em: string }) : null;
  } catch {
    return null;
  }
};

const familyOf = (name: string) => {
  const p = name.trim().split(/\s+/);
  return p.length > 1 ? p[p.length - 1] : p[0];
};

const Pet = () => {
  const navigate = useNavigate();
  const { guest, loading: guestLoading } = useGuestAuth();
  const [pet, setPet] = useState<PetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [choice, setChoice] = useState<PetSpecies | null>(null);
  const [petName, setPetName] = useState("");
  const [adopting, setAdopting] = useState(false);
  const [grewTo, setGrewTo] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [cuidados, setCuidados] = useState<Cuidados | null>(null);
  const aoMudarCuidados = useCallback((c: Cuidados) => setCuidados(c), []);
  const artRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (guestLoading) return;
    if (!guest) {
      navigate("/guest-auth");
      return;
    }
    (async () => {
      const { data } = await db.rpc("get_pet", { p_guest_id: guest.id });
      if (data && !Array.isArray(data) && data.species) {
        setPet(data as PetData);
        const local = cuidadosLocais(guest.id);
        const doBanco = data.cuidados_em ? { c: data.cuidados, em: data.cuidados_em } : null;
        const usar = local && (!doBanco || local.em > doBanco.em) ? local : doBanco;
        const c = prepararCuidados(usar?.c, usar?.em, data.checkins ?? 0);
        setCuidados(c);
        // comemora quando o bichinho mudou de fase desde a última visita
        const stage = stageFromXp(data.xp + Math.min(XP_CUIDADO_MAX, c.xp));
        const key = `pet-stage-${data.id}`;
        let seen = -1;
        try {
          seen = Number(localStorage.getItem(key) ?? "-1");
          localStorage.setItem(key, String(stage));
        } catch {
          /* sem armazenamento: só não comemora */
        }
        if (seen >= 0 && stage > seen) setGrewTo(stage);
      }
      setLoading(false);
    })();
  }, [guest, guestLoading, navigate]);

  const adopt = async () => {
    if (!guest || !choice) return;
    if (!petName.trim()) {
      toast.error("Dê um nome ao seu bichinho");
      return;
    }
    setAdopting(true);
    const { data, error } = await db.rpc("adopt_pet", {
      p_guest_id: guest.id,
      p_species: choice,
      p_name: petName.trim(),
    });
    setAdopting(false);
    if (error || !data) {
      console.error("Erro ao adotar:", error);
      const motivo = error?.message ?? "";
      toast.error(
        /Hóspede não encontrado/.test(motivo)
          ? "Seu acesso expirou. Entre de novo com o apartamento e o sobrenome."
          : `Não foi possível adotar agora.${motivo ? ` (${motivo})` : ""}`,
        { duration: 10000 },
      );
      return;
    }
    try {
      localStorage.setItem(`pet-stage-${data.id}`, String(stageFromXp(data.xp)));
    } catch {
      /* ignora */
    }
    setPet(data as PetData);
    setCuidados(prepararCuidados(null, null, data.checkins ?? 0));
    toast.success(`${data.name} agora é seu! 💚`);
  };

  const xpTotal = (pet?.xp ?? 0) + Math.min(XP_CUIDADO_MAX, cuidados?.xp ?? 0);
  const faseAtual = stageFromXp(xpTotal);
  // comemora quando cresce enquanto a família está cuidando
  useEffect(() => {
    if (!pet) return;
    const key = `pet-stage-${pet.id}`;
    try {
      const visto = Number(localStorage.getItem(key) ?? "-1");
      if (visto >= 0 && faseAtual > visto) setGrewTo(faseAtual);
      localStorage.setItem(key, String(faseAtual));
    } catch {
      /* sem armazenamento */
    }
  }, [pet, faseAtual]);

  const downloadCertificate = async () => {
    if (!pet || !guest) return;
    const svgEl = artRef.current?.querySelector("svg");
    if (!svgEl) return;
    setSaving(true);
    try {
      await shareOrDownloadCertificate({
        svgMarkup: svgEl.outerHTML,
        petName: pet.name,
        species: pet.species,
        stage: stageFromXp(xpTotal),
        familyName: familyOf(guest.name),
        roomNumber: guest.room_number,
        adoptedAt: pet.created_at,
        checkins: pet.checkins,
        ratings: pet.ratings,
        games: pet.games,
      });
    } catch {
      toast.error("Não foi possível gerar a certidão");
    } finally {
      setSaving(false);
    }
  };

  if (guestLoading || loading) {
    return (
      <HotelLayout>
        <HotelPageHeader title="Meu bichinho" back="/recreacao" cor={VERDE} />
        <div className="flex justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-[#10B981]" />
        </div>
      </HotelLayout>
    );
  }

  return (
    <HotelLayout>
      <HotelPageHeader
        title={pet ? "Meu bichinho" : "Adote um bichinho"}
        subtitle={pet ? "Ele cresce com cada atividade da família." : "Ele vai crescer junto com vocês: cada atividade é um cuidado."}
        back="/recreacao"
        cor={VERDE}
      />
      <div className="space-y-4 px-4 pt-4">

        {!pet ? (
          /* ---------- ADOÇÃO ---------- */
          <>
            <p className="text-[15px] font-bold">Escolha o seu bichinho:</p>
            <div className="grid grid-cols-2 gap-3">
              {PET_SPECIES.map((s) => {
                const selected = choice === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setChoice(s.id)}
                    aria-pressed={selected}
                    className={`rounded-2xl p-2 pb-3 text-center transition-colors focus-visible:outline focus-visible:outline-4 focus-visible:outline-[#2E7BC4] ${
                      selected ? "bg-[#ECFDF5] ring-4 ring-[#10B981]" : "bg-white shadow-[0_2px_10px_rgba(20,40,30,0.07)]"
                    }`}
                  >
                    <div className="flex justify-center">
                      <PetArt species={s.id} stage={1} size={128} />
                    </div>
                    <span className="block text-lg font-extrabold leading-tight" style={display}>
                      {s.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {choice && (
              <div className={`space-y-3 ${cartao}`}>
                <label htmlFor="pet-name" className="block font-semibold">
                  Qual vai ser o nome do seu {PET_SPECIES.find((s) => s.id === choice)?.label.toLowerCase()}?
                </label>
                <Input
                  id="pet-name"
                  value={petName}
                  maxLength={20}
                  placeholder="Ex.: Pipoca"
                  onChange={(e) => setPetName(e.target.value)}
                  className="text-lg h-12"
                />
                <Button
                  onClick={adopt}
                  disabled={adopting}
                  className="w-full h-12 rounded-2xl text-lg font-extrabold bg-[#1F4D3A] hover:bg-[#173B2C] text-white"
                >
                  {adopting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Adotar"}
                </Button>
              </div>
            )}
          </>
        ) : (
          /* ---------- BICHINHO ---------- */
          (() => {
            const stage = faseAtual;
            const next = PET_STAGES[stage + 1];
            const current = PET_STAGES[stage];
            const progress = next ? ((xpTotal - current.minXp) / (next.minXp - current.minXp)) * 100 : 100;
            const species = PET_SPECIES.find((s) => s.id === pet.species)!;
            return (
              <>
                <div className="flex items-end justify-between gap-2 px-1">
                  <h2 className="text-[30px] font-extrabold leading-none" style={display}>
                    {pet.name}
                  </h2>
                  <span className="rounded-full bg-[#ECFDF5] px-3 py-1 text-sm font-extrabold text-[#1F4D3A]">
                    {species.label} · Fase {stage + 1} de {PET_STAGES.length}
                  </span>
                </div>
                {cuidados && guest && (
                  <PetCasa
                    guestId={guest.id}
                    species={pet.species}
                    stage={stage}
                    nome={pet.name}
                    checkins={pet.checkins}
                    inicial={cuidados}
                    onChange={aoMudarCuidados}
                  />
                )}
                {/* versão estática (sempre de olhos abertos) usada na certidão */}
                <div ref={artRef} className="hidden" aria-hidden>
                  <PetArt species={pet.species} stage={stage} size={240} eyes={stage === 0 ? "sleep" : "open"} />
                </div>

                <section className={cartao}>
                  <div className="flex items-baseline justify-between">
                    <h2 className="text-lg font-extrabold" style={display}>
                      {next ? "Crescendo" : "Fase final"}
                    </h2>
                    <span className="text-sm font-extrabold text-[#1F4D3A]">
                      {next ? `${Math.floor(xpTotal - current.minXp)} de ${next.minXp - current.minXp} ⭐` : "🏆"}
                    </span>
                  </div>
                  <div
                    className="mt-2 h-3 w-full overflow-hidden rounded-full bg-[#E8ECE6]"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(progress)}
                    aria-label={`Progresso até ${next?.name ?? "a fase final"}`}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${Math.min(100, progress)}%`, background: "linear-gradient(90deg,#10B981,#34D399)" }}
                    />
                  </div>
                  <p className="mt-2 text-sm text-[#5B6B60]">
                    {next ? (
                      <>
                        Faltam {Math.ceil(next.minXp - xpTotal)} estrelas para virar <b className="text-[#1D2A22]">{next.name}</b>
                        {stage + 1 === PET_STAGES.length - 1 ? " 🏆" : ""}
                      </>
                    ) : (
                      `${pet.name} chegou à fase final. Que orgulho! 🏆`
                    )}
                  </p>
                </section>

                <section className={cartao}>
                  <h2 className="text-lg font-extrabold mb-2" style={display}>
                    Como fazer {pet.name} crescer
                  </h2>
                  <ul className="space-y-2.5">
                    {CARE.map((c) => (
                      <li key={c.action} className="flex items-center gap-3">
                        <span className="text-2xl" aria-hidden>
                          {c.emoji}
                        </span>
                        <span className="flex-1 leading-snug">
                          {c.action}
                          <span className="block text-sm text-[#5B6B60]">{pet.name} {c.effect}</span>
                        </span>
                        <span className="whitespace-nowrap font-extrabold">{c.xp} ⭐</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={() => navigate("/programacao")}
                    className="mt-4 h-11 w-full rounded-2xl bg-[#ECFDF5] font-extrabold text-[#1F4D3A]"
                  >
                    Ver a programação de hoje
                  </button>
                </section>

                <p className="text-sm text-[#5B6B60] text-center">
                  Os {species.plural} de verdade moram no {species.place}. Que tal fazer uma visita?
                </p>

                <button
                  type="button"
                  onClick={downloadCertificate}
                  disabled={saving}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#1F4D3A] text-[17px] font-extrabold text-white disabled:opacity-60"
                >
                  {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <span aria-hidden>📜</span>}
                  Certidão do bichinho
                </button>
              </>
            );
          })()
        )}
      </div>

      <Dialog open={grewTo !== null} onOpenChange={(o) => !o && setGrewTo(null)}>
        <DialogContent className="max-w-sm text-center bg-[#FFFDF7]">
          {pet && grewTo !== null && (
            <>
              <div className="flex justify-center motion-safe:animate-[bounce_1s_ease-in-out_2]">
                <PetArt species={pet.species} stage={grewTo} size={200} />
              </div>
              <DialogTitle className="text-2xl font-extrabold text-[#3B2A1A]" style={display}>
                {pet.name} cresceu!
              </DialogTitle>
              <DialogDescription className="text-base text-[#5C4630]">
                Agora {pet.name} é {PET_STAGES[grewTo].name}. Obrigado por cuidar tão bem! 💚
              </DialogDescription>
              <Button onClick={() => setGrewTo(null)} className="w-full bg-[#5E9E2E] hover:bg-[#4E8A24] text-white">
                Continuar
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </HotelLayout>
  );
};

export default Pet;
