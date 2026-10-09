-- Rollback for 31: restores the 10_additive.sql versions (email fallback for both).

create or replace function public.link_my_server()
returns table (id uuid, name text)
language plpgsql security definer set search_path = public as $$
declare
  v_uid text := auth.uid()::text;
  v_email text := lower(nullif(auth.jwt() ->> 'email', ''));
  v_id uuid;
begin
  if v_uid is null then return; end if;

  select s.id into v_id from public.servers s where s.wallet_address = v_uid limit 1;

  if v_id is null and v_email is not null then
    select s.id into v_id
    from public.servers s
    where lower(s.email) = v_email
      and (s.wallet_address is null
           or not exists (select 1 from auth.users u where u.id::text = s.wallet_address))
    order by s.created_at
    limit 1;
    if v_id is not null then
      update public.servers set wallet_address = v_uid where servers.id = v_id;
    end if;
  end if;

  return query select s.id, s.name from public.servers s where s.id = v_id;
end;
$$;

create or replace function public.link_my_manager()
returns table (id uuid, restaurant_name text)
language plpgsql security definer set search_path = public as $$
declare
  v_uid text := auth.uid()::text;
  v_email text := lower(nullif(auth.jwt() ->> 'email', ''));
  v_id uuid;
begin
  if v_uid is null then return; end if;

  select m.id into v_id from public.restaurant_managers m where m.auth_id = v_uid limit 1;

  if v_id is null and v_email is not null then
    select m.id into v_id
    from public.restaurant_managers m
    where lower(m.email) = v_email and m.auth_id is null
    limit 1;
    if v_id is not null then
      update public.restaurant_managers set auth_id = v_uid where restaurant_managers.id = v_id;
    end if;
  end if;

  return query select m.id, m.restaurant_name from public.restaurant_managers m where m.id = v_id;
end;
$$;
