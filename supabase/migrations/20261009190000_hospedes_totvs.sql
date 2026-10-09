-- =====================================================================
-- Hóspedes sincronizados do TOTVS PMS
-- Recebe só o mínimo: apto, titular, adultos, crianças, entrada, saída e status.
-- Os dados são apagados automaticamente 1 dia após a saída (LGPD).
-- =====================================================================

create table if not exists public.pms_stays (
  id uuid primary key default gen_random_uuid(),
  reservation_code text not null,
  uh text not null,
  guest_name text not null,
  surname text not null,
  adults integer not null default 0,
  children integer not null default 0,
  guests_listed integer not null default 0,
  arrival_date timestamptz,
  departure_date timestamptz,
  status text,
  synced_at timestamptz not null default now(),
  unique (reservation_code, uh)
);

create index if not exists pms_stays_uh_idx on public.pms_stays (uh);

alter table public.pms_stays enable row level security;

drop policy if exists "Equipe le hospedes do PMS" on public.pms_stays;
create policy "Equipe le hospedes do PMS" on public.pms_stays
  for select using (
    public.has_role(auth.uid(), 'gestor'::app_role)
    or public.has_role(auth.uid(), 'recreador'::app_role)
  );

create table if not exists public.pms_sync_log (
  id uuid primary key default gen_random_uuid(),
  synced_at timestamptz not null default now(),
  rooms integer not null default 0,
  guests integer not null default 0,
  removed integer not null default 0,
  source text
);

alter table public.pms_sync_log enable row level security;

drop policy if exists "Equipe le log do PMS" on public.pms_sync_log;
create policy "Equipe le log do PMS" on public.pms_sync_log
  for select using (
    public.has_role(auth.uid(), 'gestor'::app_role)
    or public.has_role(auth.uid(), 'recreador'::app_role)
  );
