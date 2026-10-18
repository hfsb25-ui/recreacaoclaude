-- Leads vindos do PMS: a cada sincronização, o titular de cada reserva vira (ou atualiza) um lead,
-- com nome, telefone, apto, entrada, saída, adultos e crianças. O lead fica guardado depois da saída.
-- Os leads antigos (salvos no reset do ranking) são apagados; o reset passa a guardar só números
-- (sem nome nem telefone) para o histórico de períodos das Estatísticas.

-- 1) Novas colunas
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS origem text NOT NULL DEFAULT 'app';
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS reservation_code text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS arrival_date timestamptz;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS departure_date timestamptz;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS adults integer NOT NULL DEFAULT 0;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS children integer NOT NULL DEFAULT 0;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS leads_pms_reserva_idx
  ON public.leads (reservation_code, room_number) WHERE origem = 'pms';
CREATE INDEX IF NOT EXISTS leads_estadia_idx ON public.leads (arrival_date, departure_date);

-- 2) Só gestores veem e mexem nos leads
DROP POLICY IF EXISTS "Authenticated users can view leads" ON public.leads;
DROP POLICY IF EXISTS "Authenticated users can insert leads" ON public.leads;
DROP POLICY IF EXISTS "Authenticated users can update leads" ON public.leads;
DROP POLICY IF EXISTS "Authenticated users can delete leads" ON public.leads;
DROP POLICY IF EXISTS "Gestores gerenciam leads" ON public.leads;
CREATE POLICY "Gestores gerenciam leads" ON public.leads
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'gestor'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'gestor'::app_role));

-- 3) Números de cada período do ranking (sem dados pessoais)
CREATE TABLE IF NOT EXISTS public.ranking_participantes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  total_points integer NOT NULL DEFAULT 0,
  total_checkins integer NOT NULL DEFAULT 0,
  total_ratings integer NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS ranking_participantes_created_idx ON public.ranking_participantes (created_at);
ALTER TABLE public.ranking_participantes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Gestores leem participantes" ON public.ranking_participantes;
CREATE POLICY "Gestores leem participantes" ON public.ranking_participantes
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'gestor'::app_role));

-- Guarda os números dos leads antigos antes de apagá-los
INSERT INTO public.ranking_participantes (created_at, total_points, total_checkins, total_ratings)
SELECT created_at, coalesce(total_points, 0), coalesce(total_checkins, 0), coalesce(total_ratings, 0)
FROM public.leads WHERE origem = 'app';
DELETE FROM public.leads WHERE origem = 'app';

-- O reset do ranking continua chamando "salvar leads": vira só números, sem nome nem telefone
CREATE OR REPLACE FUNCTION public.leads_desvia_reset()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.origem = 'pms' THEN
    RETURN NEW;
  END IF;
  INSERT INTO public.ranking_participantes (total_points, total_checkins, total_ratings)
  VALUES (coalesce(NEW.total_points, 0), coalesce(NEW.total_checkins, 0), coalesce(NEW.total_ratings, 0));
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_leads_desvia_reset ON public.leads;
CREATE TRIGGER trg_leads_desvia_reset
  BEFORE INSERT ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.leads_desvia_reset();

-- Estatísticas por período passam a contar pela tabela nova
CREATE OR REPLACE FUNCTION public.admin_period_stats(p_limit int DEFAULT 5)
RETURNS TABLE (period_number int, start_date date, end_date date, participants bigint, points bigint, checkins bigint)
LANGUAGE sql STABLE SET search_path = public AS $$
  WITH p AS (
    SELECT rp.period_number, rp.start_date, rp.end_date, rp.is_active, rp.created_at AS t0,
           lead(rp.created_at) OVER (ORDER BY rp.period_number) AS t1
    FROM public.ranking_periods rp
  )
  SELECT p.period_number, p.start_date, (p.t1 AT TIME ZONE 'America/Sao_Paulo')::date,
         (SELECT count(*) FROM public.ranking_participantes l WHERE l.created_at > p.t0 AND l.created_at <= p.t1),
         (SELECT coalesce(sum(l.total_points), 0)::bigint FROM public.ranking_participantes l WHERE l.created_at > p.t0 AND l.created_at <= p.t1),
         (SELECT count(*) FROM public.all_checkins x WHERE x.checked_in_at >= p.t0 AND x.checked_in_at < p.t1)
  FROM p
  WHERE NOT coalesce(p.is_active, false) AND p.t1 IS NOT NULL
  ORDER BY p.period_number DESC
  LIMIT p_limit;
$$;
GRANT EXECUTE ON FUNCTION public.admin_period_stats(int) TO authenticated;

-- 4) Telefone do titular da reserva (marcado pelo TOTVS; se não vier marcado, pelo nome)
CREATE OR REPLACE FUNCTION public.pms_telefone_titular(p_reserva text, p_uh text, p_nome text)
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  digits text;
BEGIN
  digits := (
    SELECT regexp_replace(coalesce(g.phone, ''), '\D', '', 'g')
    FROM public.pms_stay_guests g
    WHERE g.reservation_code = p_reserva AND g.uh = p_uh AND coalesce(g.phone, '') <> ''
      AND (g.is_main OR public.normalize_name(g.first_name || ' ' || g.surname) = public.normalize_name(p_nome))
    ORDER BY g.is_main DESC
    LIMIT 1
  );
  IF digits IS NULL OR length(digits) < 10 THEN
    RETURN NULL;
  END IF;
  IF length(digits) IN (10, 11) THEN
    digits := '55' || digits;
  END IF;
  RETURN digits;
END $$;
REVOKE ALL ON FUNCTION public.pms_telefone_titular(text, text, text) FROM public, anon, authenticated;

-- 5) Cada reserva sincronizada vira (ou atualiza) um lead
CREATE OR REPLACE FUNCTION public.pms_lead_da_reserva()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.leads (origem, reservation_code, room_number, guest_name, phone,
                            arrival_date, departure_date, adults, children)
  VALUES ('pms', NEW.reservation_code, NEW.uh, initcap(lower(NEW.guest_name)),
          public.pms_telefone_titular(NEW.reservation_code, NEW.uh, NEW.guest_name),
          NEW.arrival_date, NEW.departure_date, NEW.adults, NEW.children)
  ON CONFLICT (reservation_code, room_number) WHERE origem = 'pms' DO UPDATE SET
    guest_name = excluded.guest_name,
    phone = coalesce(excluded.phone, leads.phone),
    arrival_date = excluded.arrival_date,
    departure_date = excluded.departure_date,
    adults = excluded.adults,
    children = excluded.children,
    updated_at = now()
  WHERE (leads.guest_name, leads.phone, leads.arrival_date, leads.departure_date, leads.adults, leads.children)
        IS DISTINCT FROM
        (excluded.guest_name, coalesce(excluded.phone, leads.phone), excluded.arrival_date,
         excluded.departure_date, excluded.adults, excluded.children);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_pms_lead_da_reserva ON public.pms_stays;
CREATE TRIGGER trg_pms_lead_da_reserva
  AFTER INSERT OR UPDATE ON public.pms_stays
  FOR EACH ROW EXECUTE FUNCTION public.pms_lead_da_reserva();

-- A lista de pessoas do apto chega depois da reserva: completa o telefone do titular
CREATE OR REPLACE FUNCTION public.pms_lead_telefone()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  tel text;
BEGIN
  IF coalesce(NEW.phone, '') = '' THEN
    RETURN NEW;
  END IF;
  tel := (
    SELECT public.pms_telefone_titular(s.reservation_code, s.uh, s.guest_name)
    FROM public.pms_stays s
    WHERE s.reservation_code = NEW.reservation_code AND s.uh = NEW.uh
    LIMIT 1
  );
  IF tel IS NOT NULL THEN
    UPDATE public.leads SET phone = tel, updated_at = now()
    WHERE origem = 'pms' AND reservation_code = NEW.reservation_code AND room_number = NEW.uh
      AND phone IS DISTINCT FROM tel;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_pms_lead_telefone ON public.pms_stay_guests;
CREATE TRIGGER trg_pms_lead_telefone
  AFTER INSERT ON public.pms_stay_guests
  FOR EACH ROW EXECUTE FUNCTION public.pms_lead_telefone();

-- 6) Já cria os leads de quem está hospedado agora
UPDATE public.pms_stays SET status = status;
