import { supabase } from "@/integrations/supabase/client";

// Página de avaliação do hotel no TripAdvisor
export const TRIPADVISOR_REVIEW_URL =
  "https://www.tripadvisor.com.br/UserReviewEdit-g3842968-d4586015-Hotel_Fazenda_Santa_Barbara-Engenheiro_Paulo_de_Frontin_State_of_Rio_de_Janeiro.html";

export interface BrindeStatus {
  liberado: boolean;
  boas: number;
  meta: number;
  codigo?: string;
  entregue?: boolean;
}

/** Consulta (e libera, se bateu a meta) o brinde do hóspede. */
export const consultarBrinde = async (guestId: string): Promise<BrindeStatus | null> => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc("brinde_status", { p_guest_id: guestId });
  if (error || !data) return null;
  return data as BrindeStatus;
};
