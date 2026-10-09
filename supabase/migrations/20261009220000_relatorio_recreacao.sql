-- =====================================================================
-- Relatório da Recreação no WhatsApp do gestor
-- Enviado nos dias/horário configurados no painel, para os mesmos
-- números do alerta de avaliação baixa.
-- =====================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- 1) Configuração (junto da configuração do WhatsApp)
alter table public.whatsapp_config
  add column if not exists report_enabled boolean not null default true,
  add column if not exists report_days integer[] not null default '{1,3,5}',
  add column if not exists report_hour integer not null default 8
    check (report_hour between 0 and 23),
  add column if not exists report_last_sent_at timestamptz;

-- 2) Resumo diário da ocupação (só números, sem nomes) para histórico
create table if not exists public.pms_daily_snapshot (
  day date primary key,
  rooms integer not null default 0,
  adults integer not null default 0,
  children integer not null default 0,
  rooms_with_kids integer not null default 0,
  captured_at timestamptz not null default now()
);

alter table public.pms_daily_snapshot enable row level security;

drop policy if exists "Equipe le resumo diario" on public.pms_daily_snapshot;
create policy "Equipe le resumo diario" on public.pms_daily_snapshot
  for select using (
    public.has_role(auth.uid(), 'gestor'::app_role)
    or public.has_role(auth.uid(), 'recreador'::app_role)
  );

-- Cada sincronização do TOTVS atualiza o resumo do dia
create or replace function public.capture_pms_snapshot()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.pms_daily_snapshot (day, rooms, adults, children, rooms_with_kids, captured_at)
  values (
    (now() at time zone 'America/Sao_Paulo')::date,
    (select count(*) from public.pms_stays),
    (select coalesce(sum(adults), 0) from public.pms_stays),
    (select coalesce(sum(children), 0) from public.pms_stays),
    (select count(*) from public.pms_stays where children > 0),
    now()
  )
  on conflict (day) do update set
    rooms = excluded.rooms,
    adults = excluded.adults,
    children = excluded.children,
    rooms_with_kids = excluded.rooms_with_kids,
    captured_at = excluded.captured_at;
  return new;
end;
$$;

drop trigger if exists trg_capture_pms_snapshot on public.pms_sync_log;
create trigger trg_capture_pms_snapshot
  after insert on public.pms_sync_log
  for each row execute function public.capture_pms_snapshot();

-- 3) Monta o texto do relatório
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
  v_arrivals := (select count(*) from public.pms_stays
                 where (arrival_date at time zone 'America/Sao_Paulo')::date = today);
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
      || '• ⬆️ ' || v_arrivals || case when v_arrivals = 1 then ' chegada' else ' chegadas' end || ' hoje · ⬇️ '
      || v_departures || case when v_departures = 1 then ' saída' else ' saídas' end || ' hoje' || E'\n\n'
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

-- 4) Envia o relatório (automático nos dias/horário configurados, ou forçado pelo painel)
create or replace function public.send_recreation_report(p_force boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  cfg record;
  has_cfg boolean := false;
  rcp record;
  local_now timestamp := now() at time zone 'America/Sao_Paulo';
  msg text;
  digits text;
  sent integer := 0;
begin
  if p_force and not public.has_role(auth.uid(), 'gestor'::app_role) then
    raise exception 'Apenas gestores podem enviar o relatório manualmente';
  end if;

  for cfg in
    select * from public.whatsapp_config where is_active = true order by updated_at desc limit 1
  loop
    has_cfg := true;
  end loop;

  if not has_cfg then
    return jsonb_build_object('sent', 0, 'reason', 'WhatsApp não configurado');
  end if;

  if not p_force then
    if not cfg.report_enabled
       or not (extract(dow from local_now)::int = any(cfg.report_days))
       or extract(hour from local_now)::int <> cfg.report_hour
       or (cfg.report_last_sent_at is not null
           and (cfg.report_last_sent_at at time zone 'America/Sao_Paulo')::date = local_now::date) then
      return jsonb_build_object('sent', 0, 'reason', 'fora do dia/horário');
    end if;
  end if;

  msg := public.build_recreation_report();

  for rcp in
    select * from public.rating_alert_recipients where is_active = true
  loop
    digits := regexp_replace(rcp.phone, '\D', '', 'g');
    if length(digits) in (10, 11) then
      digits := '55' || digits;
    end if;
    continue when length(digits) < 12;

    perform net.http_post(
      url := rtrim(cfg.instance_url, '/') || '/message/sendText/' || cfg.instance_name,
      headers := jsonb_build_object('Content-Type', 'application/json', 'apikey', cfg.api_key),
      body := jsonb_build_object('number', digits, 'text', msg)
    );
    sent := sent + 1;
  end loop;

  -- só o envio automático marca a data (o "Enviar agora" do painel não atrapalha o agendado)
  if sent > 0 and not p_force then
    update public.whatsapp_config set report_last_sent_at = now() where id = cfg.id;
  end if;

  return jsonb_build_object('sent', sent);
end;
$$;

-- Pré-visualização pelo painel (só gestor)
create or replace function public.preview_recreation_report()
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_role(auth.uid(), 'gestor'::app_role) then
    raise exception 'Apenas gestores';
  end if;
  return public.build_recreation_report();
end;
$$;

revoke all on function public.build_recreation_report() from public, anon, authenticated;
revoke all on function public.send_recreation_report(boolean) from public, anon;
grant execute on function public.send_recreation_report(boolean) to authenticated;
revoke all on function public.preview_recreation_report() from public, anon;
grant execute on function public.preview_recreation_report() to authenticated;

-- 5) Agendamento: confere de hora em hora (a função decide se é dia/hora de enviar)
select cron.unschedule(jobid) from cron.job where jobname = 'relatorio-recreacao';
select cron.schedule('relatorio-recreacao', '0 * * * *', $$ select public.send_recreation_report(false) $$);
