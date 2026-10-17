-- Bichinho: cuidados do dia a dia (fome, energia, diversão, limpeza, peso e estrelinhas)
-- O celular calcula o tempo que passou; o banco só guarda o último estado (uma linha por bichinho).
alter table public.guest_pets add column if not exists cuidados jsonb not null default '{}'::jsonb;
alter table public.guest_pets add column if not exists cuidados_em timestamptz;

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
    'games', n_games,
    'cuidados', p.cuidados,
    'cuidados_em', p.cuidados_em
  );
end;
$$;

-- Guarda os cuidados (valores sempre entre 0 e 100; estrelinhas entre 0 e 9999)
create or replace function public.pet_salvar_cuidados(p_guest_id uuid, p_cuidados jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  c jsonb := coalesce(p_cuidados, '{}'::jsonb);
  n numeric;
  k text;
  limpo jsonb := '{}'::jsonb;
begin
  foreach k in array array['fome', 'energia', 'diversao', 'limpeza', 'gordura', 'xp'] loop
    n := least(100, greatest(0, coalesce((c ->> k)::numeric, 0)));
    limpo := limpo || jsonb_build_object(k, round(n, 1));
  end loop;
  limpo := limpo
    || jsonb_build_object('moedas', least(9999, greatest(0, coalesce((c ->> 'moedas')::int, 0))))
    || jsonb_build_object('vistos', least(9999, greatest(0, coalesce((c ->> 'vistos')::int, 0))))
    || jsonb_build_object('dormindo', coalesce((c ->> 'dormindo')::boolean, false));

  update public.guest_pets
     set cuidados = limpo, cuidados_em = now()
   where guest_id = p_guest_id;
end;
$$;

revoke all on function public.get_pet(uuid) from public;
grant execute on function public.get_pet(uuid) to anon, authenticated;
revoke all on function public.pet_salvar_cuidados(uuid, jsonb) from public;
grant execute on function public.pet_salvar_cuidados(uuid, jsonb) to anon, authenticated;
