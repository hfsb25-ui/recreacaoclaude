-- Notificações push enviadas pelo admin (aba "Notificações").
-- O hóspede ativa no app; o gestor escreve a mensagem e escolhe para quem vai.

-- 1) Inscrições: só o gestor lê/apaga direto. O hóspede usa as funções abaixo.
DROP POLICY IF EXISTS "Users can insert their own subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Users can delete their own subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Gestor gerencia inscricoes push" ON public.push_subscriptions;
CREATE POLICY "Gestor gerencia inscricoes push" ON public.push_subscriptions
  FOR ALL USING (public.has_role(auth.uid(), 'gestor'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'gestor'::app_role));

-- 2) Histórico de envios
CREATE TABLE IF NOT EXISTS public.push_envios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  mensagem text NOT NULL,
  publico text NOT NULL,
  apto text,
  link text,
  total integer NOT NULL DEFAULT 0,
  enviados integer NOT NULL DEFAULT 0,
  falhas integer NOT NULL DEFAULT 0,
  enviado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.push_envios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Gestor ve envios push" ON public.push_envios;
CREATE POLICY "Gestor ve envios push" ON public.push_envios
  FOR SELECT USING (public.has_role(auth.uid(), 'gestor'::app_role));

-- 3) Hóspede ativa as notificações neste aparelho
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
  IF NOT EXISTS (SELECT 1 FROM public.guests WHERE id = p_guest_id) THEN
    RETURN false;
  END IF;
  -- O aparelho passa a valer só para o hóspede que está logado nele
  DELETE FROM public.push_subscriptions WHERE endpoint = p_endpoint AND guest_id <> p_guest_id;
  INSERT INTO public.push_subscriptions (guest_id, endpoint, p256dh, auth)
  VALUES (p_guest_id, p_endpoint, p_p256dh, p_auth)
  ON CONFLICT (guest_id, endpoint) DO UPDATE
    SET p256dh = excluded.p256dh, auth = excluded.auth, updated_at = now();
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.push_inscrever(uuid, text, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.push_inscrever(uuid, text, text, text) TO anon, authenticated;

-- 4) Hóspede desativa neste aparelho
CREATE OR REPLACE FUNCTION public.push_cancelar(p_endpoint text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.push_subscriptions WHERE endpoint = p_endpoint;
$$;
REVOKE ALL ON FUNCTION public.push_cancelar(text) FROM public;
GRANT EXECUTE ON FUNCTION public.push_cancelar(text) TO anon, authenticated;

-- 5) Quem recebe: hospedados agora, só quem tem criança, ou um apartamento
CREATE OR REPLACE FUNCTION public.push_alvos(p_publico text, p_apto text DEFAULT NULL)
RETURNS TABLE (id uuid, endpoint text, p256dh text, auth text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ps.id, ps.endpoint, ps.p256dh, ps.auth
  FROM public.push_subscriptions ps
  JOIN public.guests g ON g.id = ps.guest_id
  WHERE CASE
    WHEN p_publico = 'apto' THEN
      ltrim(trim(g.room_number), '0') = ltrim(trim(coalesce(p_apto, '')), '0') AND coalesce(trim(p_apto), '') <> ''
    WHEN p_publico IN ('hospedados', 'criancas') THEN EXISTS (
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

-- 6) Contagem de aparelhos para a tela do admin
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
    'hospedados', (SELECT count(*) FROM public.push_alvos('hospedados')),
    'criancas', (SELECT count(*) FROM public.push_alvos('criancas')),
    'apto', CASE WHEN coalesce(trim(p_apto), '') = '' THEN 0 ELSE (SELECT count(*) FROM public.push_alvos('apto', p_apto)) END
  );
END;
$$;
REVOKE ALL ON FUNCTION public.push_contagem(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.push_contagem(text) TO authenticated;
