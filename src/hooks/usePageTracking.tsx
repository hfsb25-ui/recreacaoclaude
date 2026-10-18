import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

/** É a primeira visita deste navegador hoje? (para contar visitantes, não só páginas) */
const primeiraDoDia = () => {
  try {
    const hoje = new Date().toISOString().slice(0, 10);
    if (localStorage.getItem("visita-dia") === hoje) return false;
    localStorage.setItem("visita-dia", hoje);
    return true;
  } catch {
    return false;
  }
};

/** Conta a visita num contador por hora e página (não grava uma linha nova a cada visita). */
export const usePageTracking = () => {
  const location = useLocation();

  useEffect(() => {
    (async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).rpc("registrar_visita", { p_pagina: location.pathname, p_novo: primeiraDoDia() });
      } catch {
        // contar visita nunca pode atrapalhar o app
      }
    })();
  }, [location.pathname]);
};
