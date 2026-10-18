-- Visitas: em vez de uma linha por visita, um contador por hora e por página.
create table if not exists public.site_visitas_hora (
  inicio timestamptz not null,          -- começo da hora (UTC)
  pagina text not null,
  visitas integer not null default 0,
  visitantes integer not null default 0, -- sessões que entraram pela 1ª vez no dia
  primary key (inicio, pagina)
);
alter table public.site_visitas_hora enable row level security;
drop policy if exists "Gestores veem visitas" on public.site_visitas_hora;
create policy "Gestores veem visitas" on public.site_visitas_hora for select to authenticated
  using (public.has_role(auth.uid(), 'gestor'::app_role));

-- Conta uma visita (o app chama a cada página aberta)
create or replace function public.registrar_visita(p_pagina text, p_novo boolean default false)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.site_visitas_hora (inicio, pagina, visitas, visitantes)
  values (date_trunc('hour', now()), left(coalesce(nullif(p_pagina, ''), '/'), 120), 1, case when p_novo then 1 else 0 end)
  on conflict (inicio, pagina) do update
    set visitas = site_visitas_hora.visitas + 1,
        visitantes = site_visitas_hora.visitantes + excluded.visitantes;
$$;
revoke all on function public.registrar_visita(text, boolean) from public;
grant execute on function public.registrar_visita(text, boolean) to anon, authenticated;

-- Passa as visitas antigas para o contador e esvazia a tabela antiga
insert into public.site_visitas_hora (inicio, pagina, visitas, visitantes)
select date_trunc('hour', created_at), left(coalesce(nullif(page_path, ''), '/'), 120), count(*), count(distinct session_id)
from public.site_visits
group by 1, 2
on conflict (inicio, pagina) do update
  set visitas = site_visitas_hora.visitas + excluded.visitas,
      visitantes = site_visitas_hora.visitantes + excluded.visitantes;
truncate public.site_visits;

-- Estatísticas do painel passam a ler o contador
create or replace function public.admin_daily_stats(p_from date, p_to date)
returns table (day date, visits bigint, visitors bigint, checkins bigint, ratings bigint, signups bigint)
language sql stable set search_path = public as $$
  with b as (
    select (p_from::timestamp at time zone 'America/Sao_Paulo') as t0,
           ((p_to + 1)::timestamp at time zone 'America/Sao_Paulo') as t1
  ),
  d as (select generate_series(p_from, p_to, interval '1 day')::date as day),
  v as (
    select (s.inicio at time zone 'America/Sao_Paulo')::date as day,
           sum(s.visitas)::bigint as visits, sum(s.visitantes)::bigint as visitors
    from public.site_visitas_hora s, b where s.inicio >= b.t0 and s.inicio < b.t1 group by 1
  ),
  c as (
    select (x.checked_in_at at time zone 'America/Sao_Paulo')::date as day, count(*) as n
    from public.all_checkins x, b where x.checked_in_at >= b.t0 and x.checked_in_at < b.t1 group by 1
  ),
  r as (
    select (x.created_at at time zone 'America/Sao_Paulo')::date as day, count(*) as n
    from public.activity_ratings x, b where x.created_at >= b.t0 and x.created_at < b.t1 group by 1
  ),
  g as (
    select (x.created_at at time zone 'America/Sao_Paulo')::date as day, count(*) as n
    from public.all_guest_signups x, b where x.created_at >= b.t0 and x.created_at < b.t1 group by 1
  )
  select d.day, coalesce(v.visits, 0), coalesce(v.visitors, 0), coalesce(c.n, 0), coalesce(r.n, 0), coalesce(g.n, 0)
  from d
  left join v on v.day = d.day
  left join c on c.day = d.day
  left join r on r.day = d.day
  left join g on g.day = d.day
  order by d.day;
$$;

create or replace function public.admin_visit_hours(p_from timestamptz, p_to timestamptz)
returns table (dow int, hour int, visits bigint)
language sql stable set search_path = public as $$
  select extract(dow from inicio at time zone 'America/Sao_Paulo')::int,
         extract(hour from inicio at time zone 'America/Sao_Paulo')::int,
         sum(visitas)::bigint
  from public.site_visitas_hora
  where inicio >= date_trunc('hour', p_from) and inicio < p_to
  group by 1, 2;
$$;

create or replace function public.admin_visit_totals(p_from timestamptz, p_to timestamptz)
returns table (visits bigint, visitors bigint)
language sql stable set search_path = public as $$
  select coalesce(sum(visitas), 0)::bigint, coalesce(sum(visitantes), 0)::bigint
  from public.site_visitas_hora
  where inicio >= date_trunc('hour', p_from) and inicio < p_to;
$$;

create or replace function public.admin_top_pages(p_from timestamptz, p_to timestamptz, p_limit int default 6)
returns table (page_path text, visits bigint)
language sql stable set search_path = public as $$
  select pagina, sum(visitas)::bigint
  from public.site_visitas_hora
  where inicio >= date_trunc('hour', p_from) and inicio < p_to
  group by 1 order by 2 desc limit p_limit;
$$;

grant execute on function public.admin_daily_stats(date, date) to authenticated;
grant execute on function public.admin_visit_hours(timestamptz, timestamptz) to authenticated;
grant execute on function public.admin_visit_totals(timestamptz, timestamptz) to authenticated;
grant execute on function public.admin_top_pages(timestamptz, timestamptz, int) to authenticated;
