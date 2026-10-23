-- Pontos dos jogos somados no banco (antes o app gravava "pontos que eu tinha + ganhos",
-- usando um valor antigo guardado no celular; com outro celular da família ou uma avaliação no meio,
-- isso apagava pontos já ganhos).
CREATE OR REPLACE FUNCTION public.somar_pontos(p_guest_id uuid, p_pontos integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  novo integer;
BEGIN
  IF p_pontos IS NULL OR p_pontos <= 0 OR p_pontos > 100 THEN
    RAISE EXCEPTION 'Pontos inválidos';
  END IF;
  UPDATE public.guests
  SET total_points = coalesce(total_points, 0) + p_pontos
  WHERE id = p_guest_id
  RETURNING total_points INTO novo;
  RETURN novo;
END;
$$;
REVOKE ALL ON FUNCTION public.somar_pontos(uuid, integer) FROM public;
GRANT EXECUTE ON FUNCTION public.somar_pontos(uuid, integer) TO anon, authenticated;
