import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useGuestAuth } from "@/hooks/useGuestAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { PetArt, PET_SPECIES, PET_STAGES, stageFromXp, type PetSpecies } from "@/components/pet/PetArt";
import { shareOrDownloadCertificate } from "@/components/pet/petCertificate";
import { InteractivePet } from "@/components/pet/InteractivePet";

interface PetData {
  id: string;
  species: PetSpecies;
  name: string;
  created_at: string;
  xp: number;
  checkins: number;
  ratings: number;
  games: number;
}

const db = supabase as any;
const display = { fontFamily: "'Baloo 2', system-ui, sans-serif" };

const CARE = [
  { emoji: "🍎", action: "Participar de uma atividade", effect: "come e cresce", xp: 15 },
  { emoji: "💬", action: "Avaliar uma atividade", effect: "conversa com você", xp: 10 },
  { emoji: "🎾", action: "Jogar na Roda da Sorte ou nos jogos", effect: "brinca", xp: 5 },
];

/** Cenário do pasto com cerca de madeira */
const Pasture = ({ children }: { children: React.ReactNode }) => (
  <div className="relative w-full overflow-hidden rounded-3xl" style={{ background: "linear-gradient(#CFEAF7 0%, #EAF6FB 58%, #9BCB5B 58%)" }}>
    <svg className="absolute inset-x-0 bottom-0 w-full" viewBox="0 0 400 60" preserveAspectRatio="none" aria-hidden>
      <path d="M0 18 Q200 -6 400 18 V60 H0 Z" fill="#9BCB5B" />
      <g fill="#A0673B">
        {Array.from({ length: 9 }, (_, i) => (
          <rect key={i} x={10 + i * 48} y={4} width={8} height={40} rx={2} />
        ))}
        <rect x={0} y={12} width={400} height={6} rx={2} />
        <rect x={0} y={26} width={400} height={6} rx={2} />
      </g>
    </svg>
    <div className="relative">{children}</div>
  </div>
);

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
        // comemora quando o bichinho mudou de fase desde a última visita
        const stage = stageFromXp(data.xp);
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
      toast.error("Não foi possível adotar agora. Tente de novo.");
      return;
    }
    try {
      localStorage.setItem(`pet-stage-${data.id}`, String(stageFromXp(data.xp)));
    } catch {
      /* ignora */
    }
    setPet(data as PetData);
    toast.success(`${data.name} agora é seu! 💚`);
  };

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
        stage: stageFromXp(pet.xp),
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
      <div className="min-h-screen flex items-center justify-center bg-[#EAF6FB]">
        <Loader2 className="h-6 w-6 animate-spin text-[#3B2A1A]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F3FAEC] text-[#3B2A1A] px-4 py-4">
      <div className="max-w-md mx-auto space-y-5">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="-ml-2">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>

        {!pet ? (
          /* ---------- ADOÇÃO ---------- */
          <>
            <div className="text-center space-y-1">
              <h1 className="text-3xl font-extrabold" style={display}>
                Adote um bichinho
              </h1>
              <p className="text-[15px] text-[#5C4630]">
                Ele vai crescer junto com vocês: cada atividade da recreação é um cuidado.
              </p>
            </div>

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
                      selected ? "bg-[#FFF3C4] ring-4 ring-[#F2C14E]" : "bg-white ring-1 ring-[#E3D7C3]"
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
              <div className="space-y-3 rounded-2xl bg-white p-4 ring-1 ring-[#E3D7C3]">
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
                  className="w-full h-12 text-lg bg-[#5E9E2E] hover:bg-[#4E8A24] text-white"
                >
                  {adopting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Adotar"}
                </Button>
              </div>
            )}
          </>
        ) : (
          /* ---------- BICHINHO ---------- */
          (() => {
            const stage = stageFromXp(pet.xp);
            const next = PET_STAGES[stage + 1];
            const current = PET_STAGES[stage];
            const progress = next ? ((pet.xp - current.minXp) / (next.minXp - current.minXp)) * 100 : 100;
            const species = PET_SPECIES.find((s) => s.id === pet.species)!;
            return (
              <>
                <InteractivePet
                  species={pet.species}
                  stage={stage}
                  name={pet.name}
                  frame={(petNode) => (
                    <Pasture>
                      <div className="flex flex-col items-center pt-5 pb-8">
                        <div className="rounded-xl bg-[#C98B57] px-5 py-1 shadow-[0_3px_0_#A0673B]">
                          <h1 className="text-3xl font-extrabold text-[#FFF8EC] leading-tight" style={display}>
                            {pet.name}
                          </h1>
                        </div>
                        {petNode}
                      </div>
                    </Pasture>
                  )}
                />
                {/* versão estática (sempre de olhos abertos) usada na certidão */}
                <div ref={artRef} className="hidden" aria-hidden>
                  <PetArt species={pet.species} stage={stage} size={240} eyes={stage === 0 ? "sleep" : "open"} />
                </div>

                <div className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <p className="text-xl font-extrabold" style={display}>
                      {species.label} {current.name.toLowerCase()}
                    </p>
                    {next && <p className="text-sm text-[#5C4630]">Próxima fase: {next.name}</p>}
                  </div>
                  <div
                    className="h-4 w-full rounded-full bg-[#E8DCC6] overflow-hidden"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(progress)}
                    aria-label={`Progresso até ${next?.name ?? "a fase final"}`}
                  >
                    <div className="h-full rounded-full bg-[#F2C14E]" style={{ width: `${Math.min(100, progress)}%` }} />
                  </div>
                  <p className="text-sm text-[#5C4630]">
                    {next
                      ? `Faltam ${next.minXp - pet.xp} de carinho para ${pet.name} virar ${next.name}.`
                      : `${pet.name} chegou à fase final. Que orgulho! 🏆`}
                  </p>
                </div>

                <div className="rounded-2xl bg-white p-4 ring-1 ring-[#E3D7C3]">
                  <h2 className="text-lg font-extrabold mb-2" style={display}>
                    Como cuidar de {pet.name}
                  </h2>
                  <ul className="space-y-2.5">
                    {CARE.map((c) => (
                      <li key={c.action} className="flex items-center gap-3">
                        <span className="text-2xl" aria-hidden>
                          {c.emoji}
                        </span>
                        <span className="flex-1 leading-snug">
                          {c.action}
                          <span className="block text-sm text-[#5C4630]">{pet.name} {c.effect}</span>
                        </span>
                        <span className="font-bold text-[#5E9E2E]">+{c.xp}</span>
                      </li>
                    ))}
                  </ul>
                  <Button onClick={() => navigate("/programacao")} className="w-full mt-4 bg-[#5E9E2E] hover:bg-[#4E8A24] text-white">
                    Ver a programação
                  </Button>
                </div>

                <p className="text-sm text-[#5C4630] text-center">
                  Os {species.plural} de verdade moram no {species.place}. Que tal fazer uma visita?
                </p>

                <Button variant="outline" onClick={downloadCertificate} disabled={saving} className="w-full h-11 border-[#A0673B] text-[#3B2A1A]">
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                  Baixar a Certidão de Adoção
                </Button>
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
    </div>
  );
};

export default Pet;
