-- Estatísticas: guarda o histórico de check-ins e cadastros que o reset do ranking apaga,
-- e calcula os números no banco (horário de Brasília, sem o limite de 1000 linhas).

-- 1) Arquivo de check-ins e de cadastros apagados pelo reset
CREATE TABLE IF NOT EXISTS public.checkins_archive (
  id uuid PRIMARY KEY,
  activity_id uuid,
  guest_id uuid,
  checked_in_at timestamptz NOT NULL,
  archived_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_checkins_archive_checked_in_at ON public.checkins_archive (checked_in_at);
ALTER TABLE public.checkins_archive ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Gestores leem arquivo de check-ins" ON public.checkins_archive;
CREATE POLICY "Gestores leem arquivo de check-ins" ON public.checkins_archive
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'gestor'::app_role));

CREATE TABLE IF NOT EXISTS public.guests_archive (
  id uuid PRIMARY KEY,
  created_at timestamptz NOT NULL,
  archived_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_guests_archive_created_at ON public.guests_archive (created_at);
ALTER TABLE public.guests_archive ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Gestores leem arquivo de cadastros" ON public.guests_archive;
CREATE POLICY "Gestores leem arquivo de cadastros" ON public.guests_archive
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'gestor'::app_role));

-- Só arquiva o que o reset automático apaga (roda como service_role).
-- Exclusões manuais feitas no painel (ex.: check-in lançado errado) não entram no histórico.
CREATE OR REPLACE FUNCTION public.archive_deleted_checkin()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF coalesce(auth.role(), '') = 'service_role' THEN
    INSERT INTO public.checkins_archive (id, activity_id, guest_id, checked_in_at)
    VALUES (OLD.id, OLD.activity_id, OLD.guest_id, OLD.checked_in_at)
    ON CONFLICT (id) DO NOTHING;
  END IF;
  RETURN OLD;
END $$;

DROP TRIGGER IF EXISTS trg_archive_deleted_checkin ON public.activity_checkins;
CREATE TRIGGER trg_archive_deleted_checkin
  BEFORE DELETE ON public.activity_checkins
  FOR EACH ROW EXECUTE FUNCTION public.archive_deleted_checkin();

CREATE OR REPLACE FUNCTION public.archive_deleted_guest()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF coalesce(auth.role(), '') = 'service_role' THEN
    INSERT INTO public.guests_archive (id, created_at)
    VALUES (OLD.id, OLD.created_at)
    ON CONFLICT (id) DO NOTHING;
  END IF;
  RETURN OLD;
END $$;

DROP TRIGGER IF EXISTS trg_archive_deleted_guest ON public.guests;
CREATE TRIGGER trg_archive_deleted_guest
  BEFORE DELETE ON public.guests
  FOR EACH ROW EXECUTE FUNCTION public.archive_deleted_guest();

-- 2) Visões com o período atual + histórico
CREATE OR REPLACE VIEW public.all_checkins WITH (security_invoker = true) AS
  SELECT id, activity_id, guest_id, checked_in_at, false AS archived FROM public.activity_checkins
  UNION ALL
  SELECT id, activity_id, guest_id, checked_in_at, true AS archived FROM public.checkins_archive;

CREATE OR REPLACE VIEW public.all_guest_signups WITH (security_invoker = true) AS
  SELECT id, created_at FROM public.guests
  UNION ALL
  SELECT id, created_at FROM public.guests_archive;

GRANT SELECT ON public.all_checkins, public.all_guest_signups TO authenticated;

-- 3) Números por dia (horário de Brasília)
CREATE OR REPLACE FUNCTION public.admin_daily_stats(p_from date, p_to date)
RETURNS TABLE (day date, visits bigint, visitors bigint, checkins bigint, ratings bigint, signups bigint)
LANGUAGE sql STABLE SET search_path = public AS $$
  WITH b AS (
    SELECT (p_from::timestamp AT TIME ZONE 'America/Sao_Paulo') AS t0,
           ((p_to + 1)::timestamp AT TIME ZONE 'America/Sao_Paulo') AS t1
  ),
  d AS (SELECT generate_series(p_from, p_to, interval '1 day')::date AS day),
  v AS (
    SELECT (s.created_at AT TIME ZONE 'America/Sao_Paulo')::date AS day,
           count(*) AS visits, count(DISTINCT s.session_id) AS visitors
    FROM public.site_visits s, b WHERE s.created_at >= b.t0 AND s.created_at < b.t1 GROUP BY 1
  ),
  c AS (
    SELECT (x.checked_in_at AT TIME ZONE 'America/Sao_Paulo')::date AS day, count(*) AS n
    FROM public.all_checkins x, b WHERE x.checked_in_at >= b.t0 AND x.checked_in_at < b.t1 GROUP BY 1
  ),
  r AS (
    SELECT (x.created_at AT TIME ZONE 'America/Sao_Paulo')::date AS day, count(*) AS n
    FROM public.activity_ratings x, b WHERE x.created_at >= b.t0 AND x.created_at < b.t1 GROUP BY 1
  ),
  g AS (
    SELECT (x.created_at AT TIME ZONE 'America/Sao_Paulo')::date AS day, count(*) AS n
    FROM public.all_guest_signups x, b WHERE x.created_at >= b.t0 AND x.created_at < b.t1 GROUP BY 1
  )
  SELECT d.day,
         coalesce(v.visits, 0), coalesce(v.visitors, 0),
         coalesce(c.n, 0), coalesce(r.n, 0), coalesce(g.n, 0)
  FROM d
  LEFT JOIN v ON v.day = d.day
  LEFT JOIN c ON c.day = d.day
  LEFT JOIN r ON r.day = d.day
  LEFT JOIN g ON g.day = d.day
  ORDER BY d.day;
$$;

-- Visitas por dia da semana e hora (horário de Brasília)
CREATE OR REPLACE FUNCTION public.admin_visit_hours(p_from timestamptz, p_to timestamptz)
RETURNS TABLE (dow int, hour int, visits bigint)
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT extract(dow FROM created_at AT TIME ZONE 'America/Sao_Paulo')::int,
         extract(hour FROM created_at AT TIME ZONE 'America/Sao_Paulo')::int,
         count(*)
  FROM public.site_visits
  WHERE created_at >= p_from AND created_at < p_to
  GROUP BY 1, 2;
$$;

-- Total de visitas e visitantes únicos num intervalo
CREATE OR REPLACE FUNCTION public.admin_visit_totals(p_from timestamptz, p_to timestamptz)
RETURNS TABLE (visits bigint, visitors bigint)
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT count(*), count(DISTINCT session_id)
  FROM public.site_visits
  WHERE created_at >= p_from AND created_at < p_to;
$$;

-- Páginas mais visitadas num intervalo
CREATE OR REPLACE FUNCTION public.admin_top_pages(p_from timestamptz, p_to timestamptz, p_limit int DEFAULT 6)
RETURNS TABLE (page_path text, visits bigint)
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT page_path, count(*)
  FROM public.site_visits
  WHERE created_at >= p_from AND created_at < p_to
  GROUP BY 1 ORDER BY 2 DESC LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION public.admin_daily_stats(date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_visit_hours(timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_visit_totals(timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_top_pages(timestamptz, timestamptz, int) TO authenticated;

-- Check-ins e avaliações por atividade (agrupa as repetições da mesma atividade pelo nome)
CREATE OR REPLACE FUNCTION public.admin_activity_stats(p_from timestamptz DEFAULT NULL, p_to timestamptz DEFAULT NULL)
RETURNS TABLE (name text, age_group_id uuid, checkins bigint, ratings bigint, rating_sum bigint, fives bigint, lows bigint)
LANGUAGE sql STABLE SET search_path = public AS $$
  WITH c AS (
    SELECT a.name, a.age_group_id, count(*) AS n
    FROM public.all_checkins x JOIN public.activities a ON a.id = x.activity_id
    WHERE (p_from IS NULL OR x.checked_in_at >= p_from) AND (p_to IS NULL OR x.checked_in_at < p_to)
    GROUP BY 1, 2
  ),
  r AS (
    SELECT a.name, a.age_group_id, count(*) AS n, sum(x.rating)::bigint AS s,
           count(*) FILTER (WHERE x.rating = 5) AS fives,
           count(*) FILTER (WHERE x.rating <= 2) AS lows
    FROM public.activity_ratings x JOIN public.activities a ON a.id = x.activity_id
    WHERE (p_from IS NULL OR x.created_at >= p_from) AND (p_to IS NULL OR x.created_at < p_to)
    GROUP BY 1, 2
  )
  SELECT coalesce(c.name, r.name), coalesce(c.age_group_id, r.age_group_id),
         coalesce(c.n, 0), coalesce(r.n, 0), coalesce(r.s, 0), coalesce(r.fives, 0), coalesce(r.lows, 0)
  FROM c FULL JOIN r ON r.name = c.name AND r.age_group_id = c.age_group_id;
$$;

-- Por faixa etária: check-ins, hóspedes únicos e avaliações
CREATE OR REPLACE FUNCTION public.admin_age_group_stats(p_from timestamptz DEFAULT NULL, p_to timestamptz DEFAULT NULL)
RETURNS TABLE (age_group_id uuid, checkins bigint, guests bigint, ratings bigint, rating_sum bigint)
LANGUAGE sql STABLE SET search_path = public AS $$
  WITH c AS (
    SELECT a.age_group_id, count(*) AS n, count(DISTINCT x.guest_id) AS g
    FROM public.all_checkins x JOIN public.activities a ON a.id = x.activity_id
    WHERE (p_from IS NULL OR x.checked_in_at >= p_from) AND (p_to IS NULL OR x.checked_in_at < p_to)
    GROUP BY 1
  ),
  r AS (
    SELECT a.age_group_id, count(*) AS n, sum(x.rating)::bigint AS s
    FROM public.activity_ratings x JOIN public.activities a ON a.id = x.activity_id
    WHERE (p_from IS NULL OR x.created_at >= p_from) AND (p_to IS NULL OR x.created_at < p_to)
    GROUP BY 1
  )
  SELECT g.id, coalesce(c.n, 0), coalesce(c.g, 0), coalesce(r.n, 0), coalesce(r.s, 0)
  FROM public.age_groups g
  LEFT JOIN c ON c.age_group_id = g.id
  LEFT JOIN r ON r.age_group_id = g.id;
$$;

-- Períodos do ranking já encerrados: cadastros (leads salvos no reset), pontos e check-ins
CREATE OR REPLACE FUNCTION public.admin_period_stats(p_limit int DEFAULT 5)
RETURNS TABLE (period_number int, start_date date, end_date date, participants bigint, points bigint, checkins bigint)
LANGUAGE sql STABLE SET search_path = public AS $$
  WITH p AS (
    SELECT rp.period_number, rp.start_date, rp.end_date, rp.is_active, rp.created_at AS t0,
           lead(rp.created_at) OVER (ORDER BY rp.period_number) AS t1
    FROM public.ranking_periods rp
  )
  SELECT p.period_number, p.start_date, (p.t1 AT TIME ZONE 'America/Sao_Paulo')::date,
         (SELECT count(*) FROM public.leads l WHERE l.created_at > p.t0 AND l.created_at <= p.t1),
         (SELECT coalesce(sum(l.total_points), 0)::bigint FROM public.leads l WHERE l.created_at > p.t0 AND l.created_at <= p.t1),
         (SELECT count(*) FROM public.all_checkins x WHERE x.checked_in_at >= p.t0 AND x.checked_in_at < p.t1)
  FROM p
  WHERE NOT coalesce(p.is_active, false) AND p.t1 IS NOT NULL
  ORDER BY p.period_number DESC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION public.admin_activity_stats(timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_age_group_stats(timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_period_stats(int) TO authenticated;
