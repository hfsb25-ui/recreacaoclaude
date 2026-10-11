-- Consumo do hóspede (relatório "Saldo das Contas" do TOTVS, enviado pelo script do Tampermonkey).
-- Só valores de consumo por apartamento; sem nomes. O hóspede vê apenas o da própria reserva.

CREATE TABLE IF NOT EXISTS public.pms_consumption (
  reservation_code text NOT NULL,
  uh text NOT NULL,
  account_type text,
  status text,
  arrival_date date,
  departure_date date,
  diaria numeric(12,2) NOT NULL DEFAULT 0,
  restaurante numeric(12,2) NOT NULL DEFAULT 0,
  bares numeric(12,2) NOT NULL DEFAULT 0,
  banquete numeric(12,2) NOT NULL DEFAULT 0,
  eventos numeric(12,2) NOT NULL DEFAULT 0,
  lavanderia numeric(12,2) NOT NULL DEFAULT 0,
  telefonia numeric(12,2) NOT NULL DEFAULT 0,
  diversos numeric(12,2) NOT NULL DEFAULT 0,
  taxas numeric(12,2) NOT NULL DEFAULT 0,
  iss numeric(12,2) NOT NULL DEFAULT 0,
  creditos numeric(12,2) NOT NULL DEFAULT 0,
  saldo numeric(12,2) NOT NULL DEFAULT 0,
  report_date date NOT NULL,
  synced_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (reservation_code, uh)
);

ALTER TABLE public.pms_consumption ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Gestores leem consumo" ON public.pms_consumption;
CREATE POLICY "Gestores leem consumo" ON public.pms_consumption
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'gestor'::app_role));

-- Consumo do hóspede logado (sem diária, créditos ou saldo).
-- No relatório os débitos vêm negativos; mostramos o valor positivo (estorno maior que o consumo vira 0).
-- Liga pela reserva + apto; o código do relatório pode vir com sufixo (ex.: ABC123-00001).
CREATE OR REPLACE FUNCTION public.guest_consumption(p_guest_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  st record;
  c record;
  found_stay boolean := false;
  found_c boolean := false;
  n_accounts integer;
BEGIN
  FOR st IN
    SELECT s.reservation_code, s.uh
    FROM public.guests g
    JOIN public.pms_stays s ON g.pms_stay_key = s.reservation_code || '|' || s.uh
    WHERE g.id = p_guest_id
    LIMIT 1
  LOOP
    found_stay := true;
  END LOOP;
  IF NOT found_stay THEN
    RETURN NULL;
  END IF;

  FOR c IN
    SELECT * FROM public.pms_consumption x
    WHERE ltrim(trim(x.uh), '0') = ltrim(trim(st.uh), '0')
      AND coalesce(x.account_type, 'Hóspede') ILIKE 'h%spede'
      AND (
        upper(split_part(x.reservation_code, '-', 1)) = upper(split_part(st.reservation_code, '-', 1))
        OR upper(x.reservation_code) LIKE upper(st.reservation_code) || '%'
        OR upper(st.reservation_code) LIKE upper(x.reservation_code) || '%'
      )
    ORDER BY x.synced_at DESC
    LIMIT 1
  LOOP
    found_c := true;
  END LOOP;

  -- Se o código não bater, usa a conta do apto quando houver só uma conta de hóspede nele
  IF NOT found_c THEN
    n_accounts := (
      SELECT count(*) FROM public.pms_consumption x
      WHERE ltrim(trim(x.uh), '0') = ltrim(trim(st.uh), '0')
        AND coalesce(x.account_type, 'Hóspede') ILIKE 'h%spede'
    );
    IF n_accounts = 1 THEN
      FOR c IN
        SELECT * FROM public.pms_consumption x
        WHERE ltrim(trim(x.uh), '0') = ltrim(trim(st.uh), '0')
          AND coalesce(x.account_type, 'Hóspede') ILIKE 'h%spede'
      LOOP
        found_c := true;
      END LOOP;
    END IF;
  END IF;

  IF NOT found_c THEN
    RETURN jsonb_build_object('available', false);
  END IF;

  RETURN jsonb_build_object(
    'available', true,
    'restaurante', greatest(-c.restaurante, 0),
    'bares', greatest(-c.bares, 0),
    'banquete', greatest(-c.banquete, 0),
    'eventos', greatest(-c.eventos, 0),
    'lavanderia', greatest(-c.lavanderia, 0),
    'telefonia', greatest(-c.telefonia, 0),
    'diversos', greatest(-c.diversos, 0),
    'taxas', greatest(-c.taxas, 0),
    'iss', greatest(-c.iss, 0),
    'total', greatest(-c.restaurante, 0) + greatest(-c.bares, 0) + greatest(-c.banquete, 0) + greatest(-c.eventos, 0) + greatest(-c.lavanderia, 0)
             + greatest(-c.telefonia, 0) + greatest(-c.diversos, 0) + greatest(-c.taxas, 0) + greatest(-c.iss, 0),
    'synced_at', c.synced_at
  );
END $$;

REVOKE ALL ON FUNCTION public.guest_consumption(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.guest_consumption(uuid) TO anon, authenticated;
