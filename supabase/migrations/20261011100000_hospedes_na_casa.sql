-- Hóspedes na Casa: todos os hóspedes de cada apto (vindos do relatório do TOTVS).
-- Guarda só nome, sobrenome, idade e telefone (para sugerir nos lembretes). Sem nascimento nem e-mail.

CREATE TABLE IF NOT EXISTS public.pms_stay_guests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_code text NOT NULL,
  uh text NOT NULL,
  first_name text NOT NULL DEFAULT '',
  surname text NOT NULL DEFAULT '',
  age integer,
  phone text,
  synced_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pms_stay_guests_stay ON public.pms_stay_guests (reservation_code, uh);

ALTER TABLE public.pms_stay_guests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Gestores leem hóspedes do PMS" ON public.pms_stay_guests;
CREATE POLICY "Gestores leem hóspedes do PMS" ON public.pms_stay_guests
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'gestor'::app_role));

-- Login do hóspede: apto + sobrenome do titular OU de qualquer pessoa do apto
CREATE OR REPLACE FUNCTION public.guest_login_pms(p_uh text, p_surname text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  st record;
  g record;
  sg record;
  wanted text[];
  name_words text[];
  w text;
  ok boolean;
  found_stay boolean := false;
  found_guest boolean := false;
  short_name text;
  new_pin text;
  tries integer := 0;
BEGIN
  wanted := array(
    SELECT x FROM unnest(string_to_array(public.normalize_name(p_surname), ' ')) AS x
    WHERE length(x) > 1 AND x NOT IN ('de', 'da', 'do', 'dos', 'das', 'e')
  );
  IF coalesce(array_length(wanted, 1), 0) = 0 THEN
    RETURN NULL;
  END IF;

  FOR st IN
    SELECT * FROM public.pms_stays
    WHERE ltrim(trim(uh), '0') = ltrim(trim(p_uh), '0')
      AND (departure_date IS NULL OR departure_date > now() - interval '12 hours')
    ORDER BY arrival_date DESC
  LOOP
    -- 1) sobrenomes do titular (todas as palavras menos o primeiro nome)
    name_words := (string_to_array(public.normalize_name(st.guest_name), ' '))[2:];
    ok := true;
    FOREACH w IN ARRAY wanted LOOP
      IF NOT (w = ANY(name_words)) THEN
        ok := false;
      END IF;
    END LOOP;

    -- 2) sobrenome de qualquer outra pessoa do apto
    IF NOT ok THEN
      FOR sg IN
        SELECT surname FROM public.pms_stay_guests
        WHERE reservation_code = st.reservation_code AND uh = st.uh
      LOOP
        name_words := string_to_array(public.normalize_name(sg.surname), ' ');
        ok := true;
        FOREACH w IN ARRAY wanted LOOP
          IF NOT (w = ANY(name_words)) THEN
            ok := false;
          END IF;
        END LOOP;
        EXIT WHEN ok;
      END LOOP;
    END IF;

    IF ok THEN
      found_stay := true;
      EXIT;
    END IF;
  END LOOP;

  IF NOT found_stay THEN
    RETURN NULL;
  END IF;

  -- já existe hóspede ligado a esta reserva? (a família usa a mesma conta)
  FOR g IN
    SELECT * FROM public.guests WHERE pms_stay_key = st.reservation_code || '|' || st.uh
  LOOP
    found_guest := true;
  END LOOP;

  IF found_guest THEN
    RETURN to_jsonb(g) - 'pin_code';
  END IF;

  -- cria o hóspede: primeiro nome + último sobrenome do titular (é o que aparece no ranking)
  short_name := initcap(split_part(trim(st.guest_name), ' ', 1));
  IF array_length(string_to_array(trim(st.guest_name), ' '), 1) > 1 THEN
    short_name := short_name || ' ' || initcap(
      (string_to_array(trim(st.guest_name), ' '))[array_length(string_to_array(trim(st.guest_name), ' '), 1)]
    );
  END IF;

  LOOP
    tries := tries + 1;
    new_pin := lpad((floor(random() * 10000))::int::text, 4, '0');
    BEGIN
      FOR g IN
        INSERT INTO public.guests (name, room_number, pin_code, total_points, pms_stay_key)
        VALUES (short_name, st.uh, new_pin, 50, st.reservation_code || '|' || st.uh)
        RETURNING *
      LOOP
        found_guest := true;
      END LOOP;
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      IF tries >= 20 THEN
        RAISE;
      END IF;
    END;
  END LOOP;

  RETURN (to_jsonb(g) - 'pin_code') || jsonb_build_object('is_new', true);
END;
$$;

REVOKE ALL ON FUNCTION public.guest_login_pms(text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.guest_login_pms(text, text) TO anon, authenticated;

-- Telefones da reserva para sugerir nos lembretes, sempre mascarados: "Bruno · (21) •••••-3514"
CREATE OR REPLACE FUNCTION public.guest_pms_phones(p_guest_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  st record;
  sg record;
  digits text;
  local_digits text;
  out jsonb := '[]'::jsonb;
  seen text[] := '{}';
BEGIN
  FOR st IN
    SELECT s.reservation_code, s.uh
    FROM public.guests g
    JOIN public.pms_stays s ON g.pms_stay_key = s.reservation_code || '|' || s.uh
    WHERE g.id = p_guest_id
    LIMIT 1
  LOOP
    FOR sg IN
      SELECT id, first_name, phone, age FROM public.pms_stay_guests
      WHERE reservation_code = st.reservation_code AND uh = st.uh AND coalesce(phone, '') <> ''
      ORDER BY coalesce(age, 99) DESC
    LOOP
      digits := regexp_replace(sg.phone, '\D', '', 'g');
      IF length(digits) < 10 OR digits = ANY(seen) THEN
        CONTINUE;
      END IF;
      seen := seen || digits;
      local_digits := CASE WHEN length(digits) >= 12 AND left(digits, 2) = '55' THEN substr(digits, 3) ELSE digits END;
      out := out || jsonb_build_object(
        'id', sg.id,
        'label', initcap(split_part(sg.first_name, ' ', 1)) || ' · (' || left(local_digits, 2) || ') •••••-' || right(local_digits, 4)
      );
    END LOOP;
  END LOOP;
  RETURN out;
END;
$$;

REVOKE ALL ON FUNCTION public.guest_pms_phones(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.guest_pms_phones(uuid) TO anon, authenticated;

-- O hóspede escolhe um dos telefones sugeridos; o número completo nunca vai para o navegador
CREATE OR REPLACE FUNCTION public.guest_use_pms_phone(p_guest_id uuid, p_stay_guest_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sg record;
  digits text;
  done boolean := false;
BEGIN
  FOR sg IN
    SELECT p.phone
    FROM public.guests g
    JOIN public.pms_stay_guests p ON g.pms_stay_key = p.reservation_code || '|' || p.uh
    WHERE g.id = p_guest_id AND p.id = p_stay_guest_id
    LIMIT 1
  LOOP
    digits := regexp_replace(coalesce(sg.phone, ''), '\D', '', 'g');
    IF length(digits) IN (10, 11) THEN
      digits := '55' || digits;
    END IF;
    IF length(digits) >= 12 THEN
      UPDATE public.guests SET phone = digits WHERE id = p_guest_id;
      done := true;
    END IF;
  END LOOP;
  RETURN done;
END;
$$;

REVOKE ALL ON FUNCTION public.guest_use_pms_phone(uuid, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.guest_use_pms_phone(uuid, uuid) TO anon, authenticated;

-- Religa hóspedes já cadastrados quando o código da reserva muda de formato
-- (ex.: "ABC123" no método antigo e "ABC123-00001" no Hóspedes na Casa), sem perder pontos.
CREATE OR REPLACE FUNCTION public.pms_relink_guests()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n integer;
BEGIN
  UPDATE public.guests g
  SET pms_stay_key = s.reservation_code || '|' || s.uh
  FROM public.pms_stays s
  WHERE g.pms_stay_key IS NOT NULL
    AND g.pms_stay_key <> s.reservation_code || '|' || s.uh
    AND ltrim(split_part(g.pms_stay_key, '|', 2), '0') = ltrim(s.uh, '0')
    AND upper(split_part(split_part(g.pms_stay_key, '|', 1), '-', 1)) = upper(split_part(s.reservation_code, '-', 1))
    AND NOT EXISTS (SELECT 1 FROM public.guests g2 WHERE g2.pms_stay_key = s.reservation_code || '|' || s.uh);
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

REVOKE ALL ON FUNCTION public.pms_relink_guests() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pms_relink_guests() TO service_role;
