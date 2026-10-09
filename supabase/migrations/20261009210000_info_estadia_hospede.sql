-- Datas da estadia do hóspede logado (para a mensagem de boas-vindas e o "último dia")
create or replace function public.guest_stay_info(p_guest_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'uh', s.uh,
    'arrival_date', s.arrival_date,
    'departure_date', s.departure_date
  )
  from public.guests g
  join public.pms_stays s on g.pms_stay_key = s.reservation_code || '|' || s.uh
  where g.id = p_guest_id
  limit 1
$$;

revoke all on function public.guest_stay_info(uuid) from public;
grant execute on function public.guest_stay_info(uuid) to anon, authenticated;
