-- =====================================================================
-- Alerta de avaliação baixa no WhatsApp do gestor
-- Quando uma avaliação com nota <= limite é registrada, o banco envia
-- uma mensagem pela Evolution API para cada número cadastrado.
-- =====================================================================

create extension if not exists pg_net;

-- 1) Segurança: a configuração do WhatsApp (com a API Key) só pode ser lida por gestores
drop policy if exists "Anyone can view whatsapp config" on public.whatsapp_config;
drop policy if exists "Gestores can view whatsapp config" on public.whatsapp_config;
create policy "Gestores can view whatsapp config" on public.whatsapp_config
  for select using (public.has_role(auth.uid(), 'gestor'::app_role));

-- 2) Configuração do alerta (fica junto da configuração do WhatsApp)
alter table public.whatsapp_config
  add column if not exists rating_alert_enabled boolean not null default true,
  add column if not exists rating_alert_threshold integer not null default 2
    check (rating_alert_threshold between 1 and 4);

-- 3) Números que recebem o alerta
create table if not exists public.rating_alert_recipients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.rating_alert_recipients enable row level security;

drop policy if exists "Gestores manage rating alert recipients" on public.rating_alert_recipients;
create policy "Gestores manage rating alert recipients" on public.rating_alert_recipients
  for all using (public.has_role(auth.uid(), 'gestor'::app_role))
  with check (public.has_role(auth.uid(), 'gestor'::app_role));

-- 4) Registro de quando o alerta foi disparado
alter table public.activity_ratings
  add column if not exists alert_sent_at timestamptz;

-- 5) Função que monta e envia a mensagem
create or replace function public.notify_low_rating()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  cfg record;
  act record;
  rcp record;
  msg text;
  digits text;
  sent integer := 0;
  has_cfg boolean := false;
  has_act boolean := false;
begin
  for cfg in
    select * from public.whatsapp_config
    where is_active = true
    order by updated_at desc
    limit 1
  loop
    has_cfg := true;
  end loop;

  if not has_cfg or not cfg.rating_alert_enabled or new.rating > cfg.rating_alert_threshold then
    return new;
  end if;

  for act in
    select a.name, a.activity_date, a.start_time, g.name as age_group
    from public.activities a
    left join public.age_groups g on g.id = a.age_group_id
    where a.id = new.activity_id
  loop
    has_act := true;
  end loop;

  if not has_act then
    return new;
  end if;

  msg := '⚠️ *Avaliação baixa na recreação*' || E'\n\n'
      || '*Atividade:* ' || coalesce(act.name, '—')
      || coalesce(' (' || act.age_group || ')', '') || E'\n'
      || '*Quando:* ' || coalesce(to_char(act.activity_date, 'DD/MM'), '—')
      || coalesce(' às ' || to_char(act.start_time, 'HH24:MI'), '') || E'\n'
      || '*Nota:* ' || repeat('⭐', new.rating) || ' (' || new.rating || ' de 5)' || E'\n'
      || '*Hóspede:* ' || coalesce(new.guest_name, '—')
      || coalesce(', apto ' || nullif(new.room_number, ''), '') || E'\n'
      || '*Comentário:* ' || coalesce(nullif(trim(new.comment), ''), '(sem comentário)') || E'\n\n'
      || 'Procure o hóspede antes do check-out 🙏';

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

  if sent > 0 then
    update public.activity_ratings set alert_sent_at = now() where id = new.id;
  end if;

  return new;
exception when others then
  -- O alerta nunca pode impedir o hóspede de avaliar
  raise warning 'notify_low_rating falhou: %', sqlerrm;
  return new;
end;
$$;

revoke all on function public.notify_low_rating() from public, anon, authenticated;

drop trigger if exists trg_notify_low_rating on public.activity_ratings;
create trigger trg_notify_low_rating
  after insert on public.activity_ratings
  for each row execute function public.notify_low_rating();
