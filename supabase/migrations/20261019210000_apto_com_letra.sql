-- Apartamentos com letra (ex.: C02): o login aceita maiúscula/minúscula, espaço, hífen e zero à esquerda.
-- "c02", "C-02", "C 2" e "C002" encontram o "C02" do TOTVS.
CREATE OR REPLACE FUNCTION public.normalizar_uh(p_uh text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT regexp_replace(upper(regexp_replace(coalesce(p_uh, ''), '[^0-9A-Za-z]', '', 'g')), '^([A-Z]*)0+([0-9])', '\1\2')
$$;

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

  -- Acesso de demonstração (análise da Play Store): apto 9999, sobrenome Demonstracao
  IF public.normalizar_uh(p_uh) = '9999' AND public.normalize_name(p_surname) = 'demonstracao' THEN
    FOR g IN SELECT * FROM public.guests WHERE pms_stay_key = 'DEMO|9999' LIMIT 1 LOOP
      found_guest := true;
    END LOOP;
    IF found_guest THEN
      RETURN to_jsonb(g) - 'pin_code';
    END IF;
    LOOP
      tries := tries + 1;
      new_pin := lpad((floor(random() * 10000))::int::text, 4, '0');
      BEGIN
        FOR g IN
          INSERT INTO public.guests (name, room_number, pin_code, total_points, pms_stay_key)
          VALUES ('Hóspede Demonstração', '9999', new_pin, 0, 'DEMO|9999')
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
    WHERE public.normalizar_uh(uh) = public.normalizar_uh(p_uh)
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
REVOKE ALL ON FUNCTION public.guest_login_pms(text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.guest_login_pms(text, text) TO anon, authenticated;

-- Notificações para um apartamento: mesma regra
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
      public.normalizar_uh(g.room_number) = public.normalizar_uh(p_apto) AND public.normalizar_uh(p_apto) <> ''
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
