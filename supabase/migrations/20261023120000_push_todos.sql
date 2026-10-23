-- Notificações para "todos que têm o app com avisos ativos", incluindo ex-hóspedes.
-- Antes, a inscrição era apagada junto com o cadastro do hóspede (fechamento da semana).
-- Agora ela fica guardada sem o vínculo, e quem nunca entrou com o apto também pode ativar.

ALTER TABLE public.push_subscriptions DROP CONSTRAINT IF EXISTS push_subscriptions_guest_id_fkey;
ALTER TABLE public.push_subscriptions
  ADD CONSTRAINT push_subscriptions_guest_id_fkey
  FOREIGN KEY (guest_id) REFERENCES public.guests(id) ON DELETE SET NULL;

-- Um registro por aparelho
DELETE FROM public.push_subscriptions a
USING public.push_subscriptions b
WHERE a.endpoint = b.endpoint
  AND (a.updated_at < b.updated_at OR (a.updated_at = b.updated_at AND a.ctid < b.ctid));
CREATE UNIQUE INDEX IF NOT EXISTS push_subscriptions_endpoint_key ON public.push_subscriptions (endpoint);

-- Ativar neste aparelho (com ou sem hóspede logado)
CREATE OR REPLACE FUNCTION public.push_inscrever(p_guest_id uuid, p_endpoint text, p_p256dh text, p_auth text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_endpoint IS NULL OR p_endpoint !~ '^https://' OR coalesce(p_p256dh, '') = '' OR coalesce(p_auth, '') = '' THEN
    RETURN false;
  END IF;
  IF p_guest_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.guests WHERE id = p_guest_id) THEN
    RETURN false;
  END IF;
  INSERT INTO public.push_subscriptions (guest_id, endpoint, p256dh, auth)
  VALUES (p_guest_id, p_endpoint, p_p256dh, p_auth)
  ON CONFLICT (endpoint) DO UPDATE
    SET guest_id = coalesce(excluded.guest_id, public.push_subscriptions.guest_id),
        p256dh = excluded.p256dh,
        auth = excluded.auth,
        updated_at = now();
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.push_inscrever(uuid, text, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.push_inscrever(uuid, text, text, text) TO anon, authenticated;

-- Quem recebe: + "todos"
CREATE OR REPLACE FUNCTION public.push_alvos(p_publico text, p_apto text DEFAULT NULL)
RETURNS TABLE (id uuid, endpoint text, p256dh text, auth text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ps.id, ps.endpoint, ps.p256dh, ps.auth
  FROM public.push_subscriptions ps
  LEFT JOIN public.guests g ON g.id = ps.guest_id
  WHERE CASE
    WHEN p_publico = 'todos' THEN true
    WHEN p_publico = 'apto' THEN
      g.id IS NOT NULL AND public.normalizar_uh(g.room_number) = public.normalizar_uh(p_apto) AND public.normalizar_uh(p_apto) <> ''
    WHEN p_publico IN ('hospedados', 'criancas') THEN g.id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.pms_stays s
      WHERE s.reservation_code || '|' || s.uh = g.pms_stay_key
        AND (s.departure_date IS NULL OR s.departure_date > now() - interval '12 hours')
        AND (s.arrival_date IS NULL OR s.arrival_date < now() + interval '1 day')
        AND (p_publico = 'hospedados' OR s.children > 0)
    )
    ELSE false
  END;
$$;
REVOKE ALL ON FUNCTION public.push_alvos(text, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.push_alvos(text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.push_contagem(p_apto text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'gestor'::app_role) THEN
    RAISE EXCEPTION 'Apenas gestores';
  END IF;
  RETURN jsonb_build_object(
    'todos', (SELECT count(*) FROM public.push_subscriptions),
    'hospedados', (SELECT count(*) FROM public.push_alvos('hospedados')),
    'criancas', (SELECT count(*) FROM public.push_alvos('criancas')),
    'apto', CASE WHEN coalesce(trim(p_apto), '') = '' THEN 0 ELSE (SELECT count(*) FROM public.push_alvos('apto', p_apto)) END
  );
END;
$$;
REVOKE ALL ON FUNCTION public.push_contagem(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.push_contagem(text) TO authenticated;
