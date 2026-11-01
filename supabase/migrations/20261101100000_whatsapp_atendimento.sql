-- Atendimento pelo WhatsApp do app:
-- 1) a equipe manda mensagem para um apartamento pelo admin (sai pelo número do app);
-- 2) quando alguém responde o número do app, o sistema identifica o hóspede
--    e encaminha a mensagem para os números de atendimento cadastrados.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Chave secreta do endereço que a Evolution chama quando chega mensagem
ALTER TABLE public.whatsapp_config
  ADD COLUMN IF NOT EXISTS webhook_token text NOT NULL DEFAULT encode(gen_random_bytes(18), 'hex'),
  ADD COLUMN IF NOT EXISTS encaminhar_respostas boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS encaminhar_desconhecidos boolean NOT NULL DEFAULT true;

-- Números que recebem as respostas dos hóspedes (dá para trocar quando quiser no admin)
CREATE TABLE IF NOT EXISTS public.atendimento_numeros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  telefone text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.atendimento_numeros ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Gestor gerencia numeros de atendimento" ON public.atendimento_numeros;
CREATE POLICY "Gestor gerencia numeros de atendimento" ON public.atendimento_numeros
  FOR ALL USING (public.has_role(auth.uid(), 'gestor'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'gestor'::app_role));

-- Histórico das mensagens (enviadas pela equipe e recebidas dos hóspedes)
CREATE TABLE IF NOT EXISTS public.whatsapp_mensagens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  direcao text NOT NULL CHECK (direcao IN ('saida', 'entrada')),
  telefone text NOT NULL,
  uh text,
  reservation_code text,
  guest_name text,
  texto text NOT NULL,
  wa_id text UNIQUE,
  encaminhada boolean NOT NULL DEFAULT false,
  enviado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS whatsapp_mensagens_created_idx ON public.whatsapp_mensagens (created_at DESC);
ALTER TABLE public.whatsapp_mensagens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Equipe ve mensagens whatsapp" ON public.whatsapp_mensagens;
CREATE POLICY "Equipe ve mensagens whatsapp" ON public.whatsapp_mensagens
  FOR SELECT USING (
    public.has_role(auth.uid(), 'gestor'::app_role) OR public.has_role(auth.uid(), 'recreador'::app_role)
  );

-- Telefone em formato comparável: DDD + últimos 8 dígitos
-- (no WhatsApp alguns celulares brasileiros aparecem sem o 9 da frente)
CREATE OR REPLACE FUNCTION public.tel_chave(p_tel text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  WITH d AS (SELECT regexp_replace(coalesce(p_tel, ''), '[^0-9]', '', 'g') AS n),
  s AS (SELECT CASE WHEN n LIKE '55%' AND length(n) >= 12 THEN substr(n, 3) ELSE n END AS n FROM d)
  SELECT CASE WHEN length(n) >= 10 THEN left(n, 2) || right(n, 8) ELSE n END FROM s
$$;

-- Telefone do titular de um apartamento hospedado (para a equipe mandar mensagem)
CREATE OR REPLACE FUNCTION public.whatsapp_telefone_quarto(p_reserva text, p_uh text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s record;
  tel text;
BEGIN
  SELECT * INTO s FROM public.pms_stays WHERE reservation_code = p_reserva AND uh = p_uh LIMIT 1;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  -- 1) titular (ou quem tiver telefone) na lista de pessoas do TOTVS
  tel := (
    SELECT regexp_replace(g.phone, '[^0-9]', '', 'g')
    FROM public.pms_stay_guests g
    WHERE g.reservation_code = s.reservation_code AND g.uh = s.uh
      AND length(regexp_replace(coalesce(g.phone, ''), '[^0-9]', '', 'g')) >= 10
    ORDER BY g.is_main DESC
    LIMIT 1
  );
  -- 2) telefone que o hóspede cadastrou no app (lembretes)
  IF tel IS NULL THEN
    tel := (
      SELECT regexp_replace(gu.phone, '[^0-9]', '', 'g')
      FROM public.guests gu
      WHERE gu.pms_stay_key = s.reservation_code || '|' || s.uh
        AND length(regexp_replace(coalesce(gu.phone, ''), '[^0-9]', '', 'g')) >= 10
      LIMIT 1
    );
  END IF;
  IF tel IS NOT NULL AND length(tel) IN (10, 11) THEN
    tel := '55' || tel;
  END IF;
  RETURN jsonb_build_object(
    'telefone', tel,
    'uh', s.uh,
    'reservation_code', s.reservation_code,
    'guest_name', initcap(lower(s.guest_name))
  );
END;
$$;
REVOKE ALL ON FUNCTION public.whatsapp_telefone_quarto(text, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.whatsapp_telefone_quarto(text, text) TO service_role;

-- Quem é o dono deste telefone? Primeiro quem está hospedado, depois ex-hóspedes (leads)
CREATE OR REPLACE FUNCTION public.whatsapp_identificar(p_tel text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  k text := public.tel_chave(p_tel);
  r jsonb;
BEGIN
  IF length(k) < 10 THEN
    RETURN NULL;
  END IF;

  -- Hospedado agora (ou saiu há pouco): pessoas do apto no TOTVS
  SELECT jsonb_build_object(
      'situacao', 'hospedado',
      'uh', s.uh, 'reservation_code', s.reservation_code,
      'guest_name', initcap(lower(s.guest_name)),
      'pessoa', initcap(lower(trim(g.first_name || ' ' || g.surname))),
      'arrival_date', s.arrival_date, 'departure_date', s.departure_date,
      'adults', s.adults, 'children', s.children)
  INTO r
  FROM public.pms_stay_guests g
  JOIN public.pms_stays s ON s.reservation_code = g.reservation_code AND s.uh = g.uh
  WHERE public.tel_chave(g.phone) = k
    AND (s.departure_date IS NULL OR s.departure_date > now() - interval '2 days')
  ORDER BY s.arrival_date DESC NULLS LAST
  LIMIT 1;
  IF r IS NOT NULL THEN
    RETURN r;
  END IF;

  -- Telefone cadastrado no app pelo hóspede
  SELECT jsonb_build_object(
      'situacao', 'hospedado',
      'uh', s.uh, 'reservation_code', s.reservation_code,
      'guest_name', initcap(lower(s.guest_name)), 'pessoa', gu.name,
      'arrival_date', s.arrival_date, 'departure_date', s.departure_date,
      'adults', s.adults, 'children', s.children)
  INTO r
  FROM public.guests gu
  JOIN public.pms_stays s ON s.reservation_code || '|' || s.uh = gu.pms_stay_key
  WHERE public.tel_chave(gu.phone) = k
  LIMIT 1;
  IF r IS NOT NULL THEN
    RETURN r;
  END IF;

  -- Ex-hóspede (contatos guardados)
  SELECT jsonb_build_object(
      'situacao', 'ex_hospede',
      'uh', l.room_number, 'reservation_code', l.reservation_code,
      'guest_name', l.guest_name,
      'arrival_date', l.arrival_date, 'departure_date', l.departure_date,
      'adults', l.adults, 'children', l.children)
  INTO r
  FROM public.leads l
  WHERE public.tel_chave(l.phone) = k
  ORDER BY l.arrival_date DESC NULLS LAST
  LIMIT 1;
  RETURN r;
END;
$$;
REVOKE ALL ON FUNCTION public.whatsapp_identificar(text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.whatsapp_identificar(text) TO service_role;
