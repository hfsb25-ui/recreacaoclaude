-- Limite de tentativas no login do hóspede.
-- Depois de 3 erros no mesmo apto em 15 min, aquele apto fica bloqueado por 15 minutos.
-- Uma mesma rede (IP) também é barrada com 20 erros em 15 min (folga porque o Wi-Fi do hotel é compartilhado). Acertar o login limpa os erros daquele IP/apto.

CREATE TABLE IF NOT EXISTS public.guest_login_attempts (
  id bigserial PRIMARY KEY,
  uh text NOT NULL,
  ip text NOT NULL,
  ok boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS guest_login_attempts_ip_idx ON public.guest_login_attempts (ip, created_at);
CREATE INDEX IF NOT EXISTS guest_login_attempts_uh_idx ON public.guest_login_attempts (uh, created_at);
ALTER TABLE public.guest_login_attempts ENABLE ROW LEVEL SECURITY;
-- sem políticas: ninguém lê nem grava direto, só as funções abaixo

CREATE OR REPLACE FUNCTION public.login_ip()
RETURNS text
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  h json;
  v text;
BEGIN
  BEGIN
    h := current_setting('request.headers', true)::json;
  EXCEPTION WHEN others THEN
    h := NULL;
  END;
  v := coalesce(
    nullif(trim(coalesce(h->>'cf-connecting-ip', '')), ''),
    nullif(trim(split_part(coalesce(h->>'x-forwarded-for', ''), ',', 1)), ''),
    nullif(trim(coalesce(h->>'x-real-ip', '')), ''),
    'desconhecido'
  );
  RETURN v;
END;
$$;

CREATE OR REPLACE FUNCTION public.login_uh_norm(p_uh text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$ SELECT upper(ltrim(trim(coalesce(p_uh, '')), '0')) $$;

CREATE OR REPLACE FUNCTION public.login_bloqueado(p_uh text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ip text := public.login_ip();
  v_uh text := public.login_uh_norm(p_uh);
  n_ip integer;
  n_uh integer;
BEGIN
  n_ip := (SELECT count(*) FROM public.guest_login_attempts
           WHERE ip = v_ip AND NOT ok AND created_at > now() - interval '15 minutes');
  n_uh := (SELECT count(*) FROM public.guest_login_attempts
           WHERE uh = v_uh AND NOT ok AND created_at > now() - interval '15 minutes');
  RETURN (v_ip <> 'desconhecido' AND n_ip >= 20) OR n_uh >= 3;
END;
$$;

CREATE OR REPLACE FUNCTION public.login_registrar(p_uh text, p_ok boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ip text := public.login_ip();
  v_uh text := public.login_uh_norm(p_uh);
BEGIN
  IF p_ok THEN
    DELETE FROM public.guest_login_attempts WHERE NOT ok AND uh = v_uh AND ip = v_ip;
  ELSE
    INSERT INTO public.guest_login_attempts (uh, ip, ok) VALUES (v_uh, v_ip, false);
  END IF;
  -- faxina: guarda só o último dia
  DELETE FROM public.guest_login_attempts WHERE created_at < now() - interval '1 day';
END;
$$;

REVOKE ALL ON FUNCTION public.login_bloqueado(text) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.login_registrar(text, boolean) FROM public, anon, authenticated;

-- Login por apartamento + sobrenome, agora com limite de tentativas
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
  IF public.login_bloqueado(p_uh) THEN
    RAISE EXCEPTION 'BLOQUEADO' USING ERRCODE = 'P0001';
  END IF;

  wanted := array(
    SELECT x FROM unnest(string_to_array(public.normalize_name(p_surname), ' ')) AS x
    WHERE length(x) > 1 AND x NOT IN ('de', 'da', 'do', 'dos', 'das', 'e')
  );
  IF coalesce(array_length(wanted, 1), 0) = 0 THEN
    PERFORM public.login_registrar(p_uh, false);
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
    PERFORM public.login_registrar(p_uh, false);
    RETURN NULL;
  END IF;

  -- já existe hóspede ligado a esta reserva? (a família usa a mesma conta)
  FOR g IN
    SELECT * FROM public.guests WHERE pms_stay_key = st.reservation_code || '|' || st.uh
  LOOP
    found_guest := true;
  END LOOP;

  PERFORM public.login_registrar(p_uh, true);

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

-- Login antigo por apartamento + PIN, agora pelo servidor e com o mesmo limite
CREATE OR REPLACE FUNCTION public.guest_login_pin(p_room text, p_pin text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  g record;
  found_guest boolean := false;
BEGIN
  IF public.login_bloqueado(p_room) THEN
    RAISE EXCEPTION 'BLOQUEADO' USING ERRCODE = 'P0001';
  END IF;
  FOR g IN
    SELECT * FROM public.guests
    WHERE room_number = trim(p_room) AND pin_code = trim(p_pin)
    LIMIT 1
  LOOP
    found_guest := true;
  END LOOP;
  IF NOT found_guest THEN
    PERFORM public.login_registrar(p_room, false);
    RETURN NULL;
  END IF;
  PERFORM public.login_registrar(p_room, true);
  RETURN to_jsonb(g) - 'pin_code';
END;
$$;

REVOKE ALL ON FUNCTION public.guest_login_pms(text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.guest_login_pms(text, text) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.guest_login_pin(text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.guest_login_pin(text, text) TO anon, authenticated;
