-- Popup de boas-vindas/promoção: aparece uma vez por aparelho enquanto estiver no período cadastrado.
CREATE TABLE IF NOT EXISTS public.popups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  mensagem text NOT NULL DEFAULT '',
  imagem text,
  botao_texto text,
  botao_link text,
  inicio date NOT NULL DEFAULT ((now() AT TIME ZONE 'America/Sao_Paulo')::date),
  dias integer NOT NULL DEFAULT 7 CHECK (dias BETWEEN 1 AND 365),
  publico text NOT NULL DEFAULT 'todos' CHECK (publico IN ('todos', 'hospedes')),
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.popups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Popups no ar sao publicos" ON public.popups;
CREATE POLICY "Popups no ar sao publicos" ON public.popups
  FOR SELECT USING (
    ativo
    AND (now() AT TIME ZONE 'America/Sao_Paulo')::date >= inicio
    AND (now() AT TIME ZONE 'America/Sao_Paulo')::date < inicio + dias
  );

DROP POLICY IF EXISTS "Gestor gerencia popups" ON public.popups;
CREATE POLICY "Gestor gerencia popups" ON public.popups
  FOR ALL USING (public.has_role(auth.uid(), 'gestor'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'gestor'::app_role));

DROP TRIGGER IF EXISTS update_popups_updated_at ON public.popups;
CREATE TRIGGER update_popups_updated_at BEFORE UPDATE ON public.popups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
