import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PetArt, PET_STAGES, stageFromXp, type PetSpecies } from "./PetArt";

interface Props {
  guestId: string;
}

/** Atalho para o bichinho na Área do Hóspede */
export const PetMiniCard = ({ guestId }: Props) => {
  const navigate = useNavigate();
  const [pet, setPet] = useState<{ name: string; species: PetSpecies; xp: number } | null | undefined>(undefined);

  useEffect(() => {
    (supabase as any).rpc("get_pet", { p_guest_id: guestId }).then(({ data }: { data: any }) => {
      setPet(data && !Array.isArray(data) && data.species ? data : null);
    });
  }, [guestId]);

  if (pet === undefined) return null;

  const stage = pet ? stageFromXp(pet.xp) : 1;

  return (
    <button
      type="button"
      onClick={() => navigate("/bichinho")}
      className="w-full flex items-center gap-3 rounded-2xl p-3 text-left text-[#3B2A1A] ring-1 ring-[#CFE3B5] focus-visible:outline focus-visible:outline-4 focus-visible:outline-[#2E7BC4]"
      style={{ background: "linear-gradient(#EAF6FB 0%, #EAF6FB 62%, #CDE6A8 62%)" }}
    >
      <PetArt species={pet?.species ?? "pintinho"} stage={stage} size={84} />
      <span className="flex-1 min-w-0">
        <span className="block text-xl font-extrabold leading-tight" style={{ fontFamily: "'Baloo 2', system-ui, sans-serif" }}>
          {pet ? pet.name : "Adote um bichinho"}
        </span>
        <span className="block text-sm text-[#5C4630]">
          {pet ? `${PET_STAGES[stage].name} · veja como ele está` : "Ele cresce com cada atividade que vocês fizerem"}
        </span>
      </span>
      <ChevronRight className="h-5 w-5 shrink-0" />
    </button>
  );
};
