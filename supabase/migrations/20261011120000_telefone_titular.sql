-- Lembretes: sugerir só o telefone do hóspede principal (titular) da reserva.
ALTER TABLE public.pms_stay_guests ADD COLUMN IF NOT EXISTS is_main boolean NOT NULL DEFAULT false;

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
  has_main boolean;
  out jsonb := '[]'::jsonb;
BEGIN
  FOR st IN
    SELECT s.reservation_code, s.uh, s.guest_name
    FROM public.guests g
    JOIN public.pms_stays s ON g.pms_stay_key = s.reservation_code || '|' || s.uh
    WHERE g.id = p_guest_id
    LIMIT 1
  LOOP
    has_main := EXISTS (
      SELECT 1 FROM public.pms_stay_guests
      WHERE reservation_code = st.reservation_code AND uh = st.uh AND is_main
    );
    -- titular marcado pelo TOTVS; se não vier marcado, o nome do titular da reserva
    FOR sg IN
      SELECT id, first_name, phone FROM public.pms_stay_guests
      WHERE reservation_code = st.reservation_code AND uh = st.uh AND coalesce(phone, '') <> ''
        AND (
          (has_main AND is_main)
          OR (NOT has_main AND public.normalize_name(first_name || ' ' || surname) = public.normalize_name(st.guest_name))
        )
      LIMIT 1
    LOOP
      digits := regexp_replace(sg.phone, '\D', '', 'g');
      IF length(digits) < 10 THEN
        CONTINUE;
      END IF;
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

-- Usar o telefone: também só o do titular
CREATE OR REPLACE FUNCTION public.guest_use_pms_phone(p_guest_id uuid, p_stay_guest_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  allowed jsonb;
  sg record;
  digits text;
  done boolean := false;
BEGIN
  allowed := public.guest_pms_phones(p_guest_id);
  IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(allowed) e WHERE e->>'id' = p_stay_guest_id::text) THEN
    RETURN false;
  END IF;
  FOR sg IN SELECT phone FROM public.pms_stay_guests WHERE id = p_stay_guest_id LOOP
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
