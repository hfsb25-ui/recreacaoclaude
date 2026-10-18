-- Previsão do dia vinda do relatório "Ocupação Detalhada" do PMS (chegadas, saídas, adultos e crianças)
create table if not exists public.pms_previsao (
  dia date primary key,
  ocupados integer not null default 0,
  in_house integer not null default 0,
  chegadas integer not null default 0,
  saidas integer not null default 0,
  adultos integer not null default 0,
  criancas integer not null default 0,
  pax integer not null default 0,
  atualizado_em timestamptz not null default now()
);
alter table public.pms_previsao enable row level security;
drop policy if exists "Gestores veem a previsão" on public.pms_previsao;
create policy "Gestores veem a previsão" on public.pms_previsao for select
  using (public.has_role(auth.uid(), 'gestor'::app_role));

-- Chave do script do PMS (guardada só o "resumo" sha256, nunca a chave)
create table if not exists public.pms_chave (id integer primary key default 1 check (id = 1), hash text not null);
alter table public.pms_chave enable row level security;
insert into public.pms_chave (id, hash) values (1, 'bcca276d0f5d72cd74bbafc3d7aa28198e7c0d3756ff989c9f29be631d9eac29')
  on conflict (id) do update set hash = excluded.hash;

create or replace function public.pms_salvar_previsao(p_chave text, p_dias jsonb)
returns integer
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  d jsonb;
  n integer := 0;
begin
  if not exists (select 1 from public.pms_chave where hash = encode(extensions.digest(coalesce(p_chave, ''), 'sha256'), 'hex')) then
    raise exception 'Chave inválida';
  end if;
  for d in select * from jsonb_array_elements(coalesce(p_dias, '[]'::jsonb)) loop
    insert into public.pms_previsao (dia, ocupados, in_house, chegadas, saidas, adultos, criancas, pax, atualizado_em)
    values ((d ->> 'dia')::date,
            coalesce((d ->> 'ocupados')::int, 0), coalesce((d ->> 'in_house')::int, 0),
            coalesce((d ->> 'chegadas')::int, 0), coalesce((d ->> 'saidas')::int, 0),
            coalesce((d ->> 'adultos')::int, 0), coalesce((d ->> 'criancas')::int, 0),
            coalesce((d ->> 'pax')::int, 0), now())
    on conflict (dia) do update set
      ocupados = excluded.ocupados, in_house = excluded.in_house, chegadas = excluded.chegadas,
      saidas = excluded.saidas, adultos = excluded.adultos, criancas = excluded.criancas,
      pax = excluded.pax, atualizado_em = now();
    n := n + 1;
  end loop;
  delete from public.pms_previsao where dia < current_date - 60;
  return n;
end;
$$;
revoke all on function public.pms_salvar_previsao(text, jsonb) from public;
grant execute on function public.pms_salvar_previsao(text, jsonb) to anon, authenticated;

create or replace function public.build_recreation_report()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  today date := (now() at time zone 'America/Sao_Paulo')::date;
  since timestamptz;
  since_label text;
  dias text[] := array['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
  v_rooms integer;
  v_adults integer;
  v_children integer;
  v_kids_rooms integer;
  v_arrivals integer;
  v_prev_ad integer;
  v_prev_cr integer;
  v_prev_pax integer;
  v_departures integer;
  v_app_rooms integer;
  v_ratings integer;
  v_avg numeric;
  v_threshold integer;
  v_today_acts integer;
  v_first_act time;
  r record;
  low_lines text := '';
  low_count integer := 0;
  best text;
  most text;
  leader text;
  msg text;
begin
  since := coalesce(
    (select max(report_last_sent_at) from public.whatsapp_config),
    now() - interval '2 days'
  );
  since_label := 'desde ' || dias[extract(dow from (since at time zone 'America/Sao_Paulo'))::int + 1];
  v_threshold := coalesce((select max(rating_alert_threshold) from public.whatsapp_config where is_active), 2);

  v_rooms := (select count(*) from public.pms_stays);
  v_adults := (select coalesce(sum(adults), 0) from public.pms_stays);
  v_children := (select coalesce(sum(children), 0) from public.pms_stays);
  v_kids_rooms := (select count(*) from public.pms_stays where children > 0);
  v_arrivals := (select chegadas from public.pms_previsao where dia = today);
  v_prev_ad := (select adultos from public.pms_previsao where dia = today);
  v_prev_cr := (select criancas from public.pms_previsao where dia = today);
  v_prev_pax := (select pax from public.pms_previsao where dia = today);
  v_departures := (select count(*) from public.pms_stays
                   where (departure_date at time zone 'America/Sao_Paulo')::date = today);
  v_app_rooms := (select count(*) from public.pms_stays s
                  where exists (select 1 from public.guests g
                                where g.pms_stay_key = s.reservation_code || '|' || s.uh));

  v_ratings := (select count(*) from public.activity_ratings where created_at >= since);
  v_avg := (select round(avg(rating)::numeric, 1) from public.activity_ratings where created_at >= since);

  low_count := (select count(*) from public.activity_ratings
                 where created_at >= since and rating <= v_threshold);
  for r in
    select a.name, a.activity_date, a.start_time, count(*) as qtd
    from public.activity_ratings ar
    join public.activities a on a.id = ar.activity_id
    where ar.created_at >= since and ar.rating <= v_threshold
    group by a.name, a.activity_date, a.start_time
    order by count(*) desc, a.activity_date, a.start_time
    limit 3
  loop
    low_lines := low_lines || case when low_lines = '' then '' else ', ' end
      || r.name || ' ' || dias[extract(dow from r.activity_date)::int + 1]
      || ' ' || to_char(r.start_time, 'FMHH24"h"MI')
      || case when r.qtd > 1 then ' (' || r.qtd || 'x)' else '' end;
  end loop;
  low_lines := replace(low_lines, 'h00', 'h');

  best := (select a.name || ' (⭐ ' || replace(round(avg(ar.rating)::numeric, 1)::text, '.', ',') || ')'
           from public.activity_ratings ar join public.activities a on a.id = ar.activity_id
           where ar.created_at >= since
           group by a.name having count(*) >= 2
           order by avg(ar.rating) desc, count(*) desc limit 1);

  most := (select a.name || ' (' || count(*) || ')'
           from public.activity_ratings ar join public.activities a on a.id = ar.activity_id
           where ar.created_at >= since
           group by a.name order by count(*) desc limit 1);

  leader := (select split_part(trim(name), ' ', 1)
                    || case when position(' ' in trim(name)) > 0
                            then ' ' || left(split_part(trim(name), ' ', array_length(string_to_array(trim(name), ' '), 1)), 1) || '.'
                            else '' end
                    || ', apto ' || room_number || ' (' || coalesce(total_points, 0) || ' pts)'
             from public.guests
             order by total_points desc nulls last, updated_at desc limit 1);

  v_today_acts := (select count(*) from public.activities where activity_date = today);
  v_first_act := (select min(start_time) from public.activities where activity_date = today);

  msg := '📊 *Relatório da Recreação — ' || dias[extract(dow from today)::int + 1]
      || ', ' || to_char(today, 'DD/MM') || '*' || E'\n\n'
      || '🏨 *Hotel agora*' || E'\n'
      || '• ' || v_rooms || ' aptos ocupados' || E'\n'
      || '• ' || v_adults || ' adultos · ' || v_children || ' crianças' || E'\n'
      || '• ' || v_kids_rooms || ' aptos com crianças' || E'\n'
      || case when v_arrivals is not null
              then '• ⬆️ ' || v_arrivals || case when v_arrivals = 1 then ' chegada prevista' else ' chegadas previstas' end
                   || ' · ⬇️ ' || v_departures || case when v_departures = 1 then ' saída' else ' saídas' end || ' hoje' || E'\n'
                   || '• Previsão do dia: ' || v_prev_ad || ' adultos · ' || v_prev_cr || ' crianças (' || v_prev_pax || ' pessoas)' || E'\n\n'
              else '• ⬇️ ' || v_departures || case when v_departures = 1 then ' saída' else ' saídas' end || ' hoje' || E'\n\n' end
      || '📱 *Uso do app* (' || since_label || ')' || E'\n'
      || '• ' || v_app_rooms || ' famílias entraram no app'
      || case when v_rooms > 0 then ' (' || round(100.0 * v_app_rooms / v_rooms) || '% dos aptos)' else '' end || E'\n'
      || '• ' || v_ratings || ' avaliações'
      || case when v_avg is not null then ' · média ⭐ ' || replace(v_avg::text, '.', ',') else '' end || E'\n'
      || case when low_count > 0
              then '• ⚠️ ' || low_count || ' avaliaç' || case when low_count = 1 then 'ão baixa' else 'ões baixas' end
                   || ' (' || low_lines  || ')' || E'\n'
              else '• ✅ Nenhuma avaliação baixa' || E'\n' end
      || E'\n' || '🏆 *Destaques*' || E'\n'
      || '• Mais bem avaliada: ' || coalesce(best, '—') || E'\n'
      || '• Mais avaliações: ' || coalesce(most, '—') || E'\n'
      || '• Líder do ranking: ' || coalesce(leader, '—') || E'\n\n'
      || '📅 *Hoje na programação:* ' || v_today_acts || ' atividade' || case when v_today_acts = 1 then '' else 's' end
      || coalesce(', a primeira às ' || replace(to_char(v_first_act, 'FMHH24"h"MI'), 'h00', 'h'), '');

  return msg;
end;
$$;

revoke all on function public.build_recreation_report() from public, anon, authenticated;
