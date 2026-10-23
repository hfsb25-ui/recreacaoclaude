-- Brinde TripAdvisor: depois de 3 avaliações boas (4 ou 5 estrelas) no app,
-- o hóspede vê o convite para avaliar no TripAdvisor e um código para retirar o brinde na recepção.

CREATE TABLE IF NOT EXISTS public.brindes_tripadvisor (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id uuid UNIQUE REFERENCES public.guests(id) ON DELETE SET NULL,
  codigo text NOT NULL,
  guest_name text,
  room_number text,
  liberado_em timestamptz NOT NULL DEFAULT now(),
  entregue_em timestamptz,
  entregue_por uuid
);
CREATE INDEX IF NOT EXISTS brindes_tripadvisor_codigo_idx ON public.brindes_tripadvisor (codigo);
ALTER TABLE public.brindes_tripadvisor ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Gestor gerencia brindes" ON public.brindes_tripadvisor;
CREATE POLICY "Gestor gerencia brindes" ON public.brindes_tripadvisor
  FOR ALL USING (public.has_role(auth.uid(), 'gestor'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'gestor'::app_role));

-- Situação do brinde do hóspede; libera (cria o código) quando atinge a meta
CREATE OR REPLACE FUNCTION public.brinde_status(p_guest_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meta constant integer := 3;
  nota_minima constant integer := 4;
  n integer;
  b record;
  g record;
  novo text;
  tentativas integer := 0;
BEGIN
  SELECT * INTO g FROM public.guests WHERE id = p_guest_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('liberado', false, 'boas', 0, 'meta', meta);
  END IF;

  n := (SELECT count(*) FROM public.activity_ratings WHERE guest_id = p_guest_id AND rating >= nota_minima);

  SELECT * INTO b FROM public.brindes_tripadvisor WHERE guest_id = p_guest_id;
  IF NOT FOUND AND n >= meta THEN
    LOOP
      tentativas := tentativas + 1;
      novo := lpad((floor(random() * 10000))::int::text, 4, '0');
      -- código único entre os brindes ainda não entregues
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.brindes_tripadvisor WHERE codigo = novo AND entregue_em IS NULL)
        OR tentativas >= 30;
    END LOOP;
    INSERT INTO public.brindes_tripadvisor (guest_id, codigo, guest_name, room_number)
    VALUES (p_guest_id, novo, g.name, g.room_number)
    ON CONFLICT (guest_id) DO NOTHING;
    SELECT * INTO b FROM public.brindes_tripadvisor WHERE guest_id = p_guest_id;
  END IF;

  IF b.id IS NULL THEN
    RETURN jsonb_build_object('liberado', false, 'boas', n, 'meta', meta);
  END IF;
  RETURN jsonb_build_object(
    'liberado', true,
    'boas', n,
    'meta', meta,
    'codigo', b.codigo,
    'entregue', b.entregue_em IS NOT NULL
  );
END;
$$;
REVOKE ALL ON FUNCTION public.brinde_status(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.brinde_status(uuid) TO anon, authenticated;
