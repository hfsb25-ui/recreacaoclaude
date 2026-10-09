-- =====================================================================
-- Login do hóspede por apartamento + sobrenome (dados do TOTVS)
-- Não diferencia maiúsculas, minúsculas nem acentos.
-- =====================================================================

alter table public.guests add column if not exists pms_stay_key text;
create unique index if not exists guests_pms_stay_key_idx
  on public.guests (pms_stay_key) where pms_stay_key is not null;

-- Deixa o texto sem acento, minúsculo e só com letras
create or replace function public.normalize_name(t text)
returns text
language sql
immutable
as $$
  select trim(regexp_replace(
    lower(translate(coalesce(t, ''),
      'ÁÀÂÃÄÅÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑÝáàâãäåéèêëíìîïóòôõöúùûüçñýÿ',
      'AAAAAAEEEEIIIIOOOOOUUUUCNYaaaaaaeeeeiiiiooooouuuucnyy')),
    '[^a-z]+', ' ', 'g'))
$$;

create or replace function public.guest_login_pms(p_uh text, p_surname text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  st record;
  g record;
  wanted text[];
  name_words text[];
  w text;
  ok boolean;
  found_stay boolean := false;
  found_guest boolean := false;
  short_name text;
  new_pin text;
  tries integer := 0;
begin
  -- palavras do sobrenome digitado, sem "de/da/do/dos/das/e"
  wanted := array(
    select x from unnest(string_to_array(public.normalize_name(p_surname), ' ')) as x
    where length(x) > 1 and x not in ('de', 'da', 'do', 'dos', 'das', 'e')
  );
  if coalesce(array_length(wanted, 1), 0) = 0 then
    return null;
  end if;

  for st in
    select * from public.pms_stays
    where ltrim(trim(uh), '0') = ltrim(trim(p_uh), '0')
      and (departure_date is null or departure_date > now() - interval '12 hours')
    order by arrival_date desc
  loop
    -- compara com os sobrenomes do titular (todas as palavras menos o primeiro nome)
    name_words := (string_to_array(public.normalize_name(st.guest_name), ' '))[2:];
    ok := true;
    foreach w in array wanted loop
      if not (w = any(name_words)) then
        ok := false;
      end if;
    end loop;
    if ok then
      found_stay := true;
      exit;
    end if;
  end loop;

  if not found_stay then
    return null;
  end if;

  -- já existe hóspede ligado a esta reserva?
  for g in
    select * from public.guests where pms_stay_key = st.reservation_code || '|' || st.uh
  loop
    found_guest := true;
  end loop;

  if found_guest then
    return to_jsonb(g) - 'pin_code';
  end if;

  -- cria o hóspede: primeiro nome + último sobrenome (é o que aparece no ranking)
  short_name := initcap(split_part(trim(st.guest_name), ' ', 1));
  if array_length(string_to_array(trim(st.guest_name), ' '), 1) > 1 then
    short_name := short_name || ' ' || initcap(
      (string_to_array(trim(st.guest_name), ' '))[array_length(string_to_array(trim(st.guest_name), ' '), 1)]
    );
  end if;

  loop
    tries := tries + 1;
    new_pin := lpad((floor(random() * 10000))::int::text, 4, '0');
    begin
      for g in
        insert into public.guests (name, room_number, pin_code, total_points, pms_stay_key)
        values (short_name, st.uh, new_pin, 50, st.reservation_code || '|' || st.uh)
        returning *
      loop
        found_guest := true;
      end loop;
      exit;
    exception when unique_violation then
      if tries >= 20 then
        raise;
      end if;
    end;
  end loop;

  return (to_jsonb(g) - 'pin_code') || jsonb_build_object('is_new', true);
end;
$$;

revoke all on function public.guest_login_pms(text, text) from public;
grant execute on function public.guest_login_pms(text, text) to anon, authenticated;
