-- =====================================================================
-- Bichinho da Fazenda: cada apartamento adota um animal virtual que
-- cresce conforme a família participa da recreação.
-- O crescimento (XP) é calculado no servidor a partir do que já existe:
-- check-ins em atividades, avaliações e jogos.
-- =====================================================================

create table if not exists public.guest_pets (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid not null unique references public.guests(id) on delete cascade,
  species text not null check (species in ('pintinho', 'potrinho', 'leitaozinho', 'bezerrinho')),
  name text not null check (char_length(name) between 1 and 20),
  created_at timestamptz not null default now()
);

alter table public.guest_pets enable row level security;

-- leitura liberada (nome e espécie do bichinho, sem dados pessoais) para o app e o totem
drop policy if exists "Todos veem os bichinhos" on public.guest_pets;
create policy "Todos veem os bichinhos" on public.guest_pets for select using (true);

drop policy if exists "Gestores gerenciam bichinhos" on public.guest_pets;
create policy "Gestores gerenciam bichinhos" on public.guest_pets
  for all using (public.has_role(auth.uid(), 'gestor'::app_role))
  with check (public.has_role(auth.uid(), 'gestor'::app_role));

-- Progresso do bichinho
create or replace function public.get_pet(p_guest_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  p record;
  has_pet boolean := false;
  n_checkins integer;
  n_ratings integer;
  n_games integer;
  xp integer;
begin
  for p in select * from public.guest_pets where guest_id = p_guest_id loop
    has_pet := true;
  end loop;

  if not has_pet then
    return null;
  end if;

  n_checkins := (select count(*) from public.activity_checkins where guest_id = p_guest_id);
  n_ratings := (select count(*) from public.activity_ratings where guest_id = p_guest_id);
  n_games := (select count(*) from public.minigame_results where guest_id = p_guest_id);
  xp := n_checkins * 15 + n_ratings * 10 + n_games * 5;

  return jsonb_build_object(
    'id', p.id,
    'species', p.species,
    'name', p.name,
    'created_at', p.created_at,
    'xp', xp,
    'checkins', n_checkins,
    'ratings', n_ratings,
    'games', n_games
  );
end;
$$;

-- Adoção (uma por apartamento/hóspede)
create or replace function public.adopt_pet(p_guest_id uuid, p_species text, p_name text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  clean_name text := left(trim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g')), 20);
begin
  if not exists (select 1 from public.guests where id = p_guest_id) then
    raise exception 'Hóspede não encontrado';
  end if;
  if clean_name = '' then
    raise exception 'Dê um nome ao bichinho';
  end if;

  insert into public.guest_pets (guest_id, species, name)
  values (p_guest_id, p_species, clean_name)
  on conflict (guest_id) do nothing;

  return public.get_pet(p_guest_id);
end;
$$;

revoke all on function public.get_pet(uuid) from public;
grant execute on function public.get_pet(uuid) to anon, authenticated;
revoke all on function public.adopt_pet(uuid, text, text) from public;
grant execute on function public.adopt_pet(uuid, text, text) to anon, authenticated;
