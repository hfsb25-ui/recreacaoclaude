import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const CHAVE = "nome-do-site";

const aplicar = (nome: string) => {
  document.title = nome;
  document.querySelector('meta[name="apple-mobile-web-app-title"]')?.setAttribute("content", nome);
};

/** Usa o "Nome do site" do painel como título da aba (e do atalho no iPhone). */
export const useSiteName = () => {
  useEffect(() => {
    try {
      const salvo = localStorage.getItem(CHAVE);
      if (salvo) aplicar(salvo);
    } catch {
      // sem armazenamento: segue com o título padrão
    }
    supabase
      .from("site_settings")
      .select("site_name")
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        const nome = data?.site_name?.trim();
        if (!nome) return;
        aplicar(nome);
        try {
          localStorage.setItem(CHAVE, nome);
        } catch {
          // ignora
        }
      });
  }, []);
};
