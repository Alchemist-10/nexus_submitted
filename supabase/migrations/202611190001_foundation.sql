begin;

create schema if not exists extensions;
create extension if not exists btree_gist with schema extensions;
create schema if not exists app_private;
revoke all on schema app_private from public, anon, authenticated;
set local search_path = public, extensions;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,40}$'),
  full_name text not null check (char_length(full_name) between 1 and 80),
  created_at timestamptz not null default now()
);

create table public.mentor_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  headline text not null check (char_length(headline) between 5 and 120),
  bio text not null default '' check (char_length(bio) <= 1500),
  expertise text[] not null default '{}' check (cardinality(expertise) <= 8),
  is_listed boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.availability_slots (
  id uuid primary key default gen_random_uuid(),
  mentor_id uuid not null references public.mentor_profiles(user_id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  is_open boolean not null default true,
  created_at timestamptz not null default now(),
  check (ends_at - starts_at between interval '15 minutes' and interval '120 minutes'),
  unique (id, mentor_id, starts_at, ends_at),
  exclude using gist (mentor_id with =, tstzrange(starts_at, ends_at, '[)') with &&)
    where (is_open)
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid not null,
  mentor_id uuid not null references public.profiles(id),
  learner_id uuid not null references public.profiles(id),
  request_key uuid not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'confirmed' check (status in ('confirmed', 'cancelled', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (mentor_id <> learner_id),
  unique (learner_id, request_key),
  foreign key (slot_id, mentor_id, starts_at, ends_at)
    references public.availability_slots(id, mentor_id, starts_at, ends_at)
);
create unique index one_intro_per_pair on public.bookings (learner_id, mentor_id)
  where (status in ('confirmed', 'completed'));
create unique index one_booking_per_slot on public.bookings (slot_id)
  where (status in ('confirmed', 'completed'));
create index learner_bookings on public.bookings (learner_id, starts_at desc);
create index mentor_bookings on public.bookings (mentor_id, starts_at desc);
create index future_slots on public.availability_slots (mentor_id, starts_at) where is_open;

-- A common reservation table prevents overlap across BOTH participant roles.
create table public.booking_participants (
  booking_id uuid not null references public.bookings(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  active boolean not null default true,
  primary key (booking_id, user_id),
  exclude using gist (user_id with =, tstzrange(starts_at, ends_at, '[)') with &&)
    where (active)
);

create table public.booking_meetings (
  booking_id uuid primary key references public.bookings(id) on delete cascade,
  join_url text not null check (join_url ~ '^https://[^[:space:]]+$' and char_length(join_url) <= 1000),
  updated_at timestamptz not null default now()
);

create table public.booking_events (
  id bigint generated always as identity primary key,
  booking_id uuid not null references public.bookings(id) on delete cascade,
  actor_id uuid not null references public.profiles(id),
  action text not null check (action in ('confirmed', 'cancelled', 'completed', 'meeting_updated')),
  created_at timestamptz not null default now()
);

create function app_private.create_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, username, full_name)
  values (new.id, 'u_' || replace(new.id::text, '-', ''),
    left(coalesce(nullif(btrim(new.raw_user_meta_data->>'full_name'), ''), 'Nexus member'), 80));
  return new;
end;
$$;
create trigger create_nexus_profile after insert on auth.users
  for each row execute function app_private.create_profile();

create function app_private.sync_participants() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    insert into public.booking_participants (booking_id, user_id, starts_at, ends_at)
    values (new.id, new.mentor_id, new.starts_at, new.ends_at),
           (new.id, new.learner_id, new.starts_at, new.ends_at);
  elsif new.status = 'cancelled' then
    update public.booking_participants set active = false where booking_id = new.id;
  end if;
  return new;
end;
$$;
create trigger sync_booking_participants after insert or update of status on public.bookings
  for each row execute function app_private.sync_participants();

alter table public.profiles enable row level security;
alter table public.mentor_profiles enable row level security;
alter table public.availability_slots enable row level security;
alter table public.bookings enable row level security;
alter table public.booking_participants enable row level security;
alter table public.booking_meetings enable row level security;
alter table public.booking_events enable row level security;

revoke all on public.profiles, public.mentor_profiles, public.availability_slots,
  public.bookings, public.booking_participants, public.booking_meetings, public.booking_events
  from anon, authenticated;
grant select on public.profiles, public.mentor_profiles to anon, authenticated;
grant select on public.availability_slots, public.bookings, public.booking_events to authenticated;

create policy public_profiles on public.profiles for select to anon, authenticated using (true);
create policy listed_mentors on public.mentor_profiles for select to anon, authenticated
  using (is_listed or user_id = (select auth.uid()));
create policy own_availability on public.availability_slots for select to authenticated
  using (mentor_id = (select auth.uid()));
create policy participant_bookings on public.bookings for select to authenticated
  using ((select auth.uid()) in (mentor_id, learner_id));
create policy participant_events on public.booking_events for select to authenticated
  using (exists (select 1 from public.bookings b where b.id = booking_id
    and (select auth.uid()) in (b.mentor_id, b.learner_id)));

create function public.save_mentor_profile(p_headline text, p_bio text, p_expertise text[])
returns void language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_headline is null or char_length(btrim(p_headline)) not between 5 and 120
    or p_bio is null or char_length(p_bio) > 1500
    or p_expertise is null or cardinality(p_expertise) > 8
    or exists (select 1 from unnest(p_expertise) x where x is null or char_length(btrim(x)) not between 1 and 40)
  then raise exception 'INVALID_INPUT'; end if;
  insert into public.mentor_profiles (user_id, headline, bio, expertise)
  values (v_user, btrim(p_headline), btrim(p_bio), p_expertise)
  on conflict (user_id) do update set headline = excluded.headline, bio = excluded.bio, expertise = excluded.expertise;
end;
$$;

create function public.create_availability(p_starts_at timestamptz, p_ends_at timestamptz)
returns setof public.availability_slots language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists (select 1 from public.mentor_profiles where user_id = v_user and is_listed)
    then raise exception 'MENTOR_REQUIRED'; end if;
  if p_starts_at is null or p_ends_at is null or p_starts_at <= now()
    or p_starts_at > now() + interval '90 days'
    or p_ends_at - p_starts_at not between interval '15 minutes' and interval '120 minutes'
    then raise exception 'INVALID_SLOT'; end if;
  return query insert into public.availability_slots (mentor_id, starts_at, ends_at)
    values (v_user, p_starts_at, p_ends_at) returning *;
exception when exclusion_violation then raise exception 'SCHEDULE_CONFLICT';
end;
$$;

create function public.close_availability(p_slot_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_slot public.availability_slots; v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_slot from public.availability_slots where id = p_slot_id for update;
  if not found or v_slot.mentor_id <> v_user then raise exception 'NOT_ALLOWED'; end if;
  if exists (select 1 from public.bookings where slot_id = p_slot_id and status = 'confirmed')
    then raise exception 'SLOT_HAS_BOOKING'; end if;
  update public.availability_slots set is_open = false where id = p_slot_id;
end;
$$;

create function public.get_available_slots(p_mentor_id uuid)
returns table (id uuid, mentor_id uuid, starts_at timestamptz, ends_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select s.id, s.mentor_id, s.starts_at, s.ends_at
  from public.availability_slots s
  join public.mentor_profiles m on m.user_id = s.mentor_id and m.is_listed
  where s.mentor_id = p_mentor_id and s.is_open and s.starts_at > now()
    and not exists (select 1 from public.bookings b where b.slot_id = s.id and b.status <> 'cancelled')
  order by s.starts_at limit 100;
$$;

create function public.book_free_intro(p_slot_id uuid, p_request_key uuid)
returns setof public.bookings language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_slot public.availability_slots; v_booking public.bookings;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_slot_id is null or p_request_key is null then raise exception 'INVALID_INPUT'; end if;
  -- Serializes requests by the same learner, including retries for different slots.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('nexus-intro:' || v_user::text, 0));
  select * into v_booking from public.bookings where learner_id = v_user and request_key = p_request_key;
  if found then
    if v_booking.slot_id <> p_slot_id then raise exception 'REQUEST_KEY_REUSED'; end if;
    return next v_booking; return;
  end if;
  select * into v_slot from public.availability_slots where id = p_slot_id for update;
  if not found or not v_slot.is_open or v_slot.starts_at <= now()
    then raise exception 'SLOT_UNAVAILABLE'; end if;
  if v_slot.mentor_id = v_user then raise exception 'SELF_BOOKING'; end if;
  if not exists (select 1 from public.mentor_profiles where user_id = v_slot.mentor_id and is_listed)
    then raise exception 'SLOT_UNAVAILABLE'; end if;
  if exists (select 1 from public.bookings where learner_id = v_user
    and mentor_id = v_slot.mentor_id and status <> 'cancelled')
    then raise exception 'TRIAL_UNAVAILABLE'; end if;
  if exists (select 1 from public.bookings where slot_id = p_slot_id and status <> 'cancelled')
    then raise exception 'SLOT_UNAVAILABLE'; end if;
  insert into public.bookings (slot_id, mentor_id, learner_id, request_key, starts_at, ends_at)
  values (v_slot.id, v_slot.mentor_id, v_user, p_request_key, v_slot.starts_at, v_slot.ends_at)
  returning * into v_booking;
  insert into public.booking_events (booking_id, actor_id, action) values (v_booking.id, v_user, 'confirmed');
  return next v_booking;
exception
  when exclusion_violation then raise exception 'SCHEDULE_CONFLICT';
  when unique_violation then raise exception 'TRIAL_UNAVAILABLE';
end;
$$;

create function public.cancel_free_intro(p_booking_id uuid)
returns setof public.bookings language plpgsql security definer set search_path = '' as $$
declare v_booking public.bookings; v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_booking from public.bookings where id = p_booking_id for update;
  if not found or v_user not in (v_booking.learner_id, v_booking.mentor_id) then raise exception 'NOT_ALLOWED'; end if;
  if v_booking.status = 'cancelled' then return next v_booking; return; end if;
  if v_booking.status <> 'confirmed' or v_booking.starts_at <= now() then raise exception 'CANNOT_CANCEL'; end if;
  update public.bookings set status = 'cancelled', updated_at = now() where id = p_booking_id returning * into v_booking;
  insert into public.booking_events (booking_id, actor_id, action) values (p_booking_id, v_user, 'cancelled');
  return next v_booking;
end;
$$;

create function public.complete_free_intro(p_booking_id uuid)
returns setof public.bookings language plpgsql security definer set search_path = '' as $$
declare v_booking public.bookings; v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_booking from public.bookings where id = p_booking_id for update;
  if not found or v_user <> v_booking.mentor_id then raise exception 'NOT_ALLOWED'; end if;
  if v_booking.status = 'completed' then return next v_booking; return; end if;
  if v_booking.status <> 'confirmed' or v_booking.ends_at > now() then raise exception 'CANNOT_COMPLETE'; end if;
  update public.bookings set status = 'completed', updated_at = now() where id = p_booking_id returning * into v_booking;
  insert into public.booking_events (booking_id, actor_id, action) values (p_booking_id, v_user, 'completed');
  return next v_booking;
end;
$$;

create function public.set_booking_meeting(p_booking_id uuid, p_join_url text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_booking public.bookings; v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_booking from public.bookings where id = p_booking_id for update;
  if not found or v_booking.mentor_id <> v_user then raise exception 'NOT_ALLOWED'; end if;
  if v_booking.status <> 'confirmed' or v_booking.ends_at <= now() then raise exception 'INVALID_STATE'; end if;
  if p_join_url is null or p_join_url !~ '^https://[^[:space:]]+$' or char_length(p_join_url) > 1000
    then raise exception 'INVALID_MEETING_URL'; end if;
  insert into public.booking_meetings (booking_id, join_url) values (p_booking_id, p_join_url)
    on conflict (booking_id) do update set join_url = excluded.join_url, updated_at = now();
  insert into public.booking_events (booking_id, actor_id, action) values (p_booking_id, v_user, 'meeting_updated');
end;
$$;

create function public.get_booking_join_url(p_booking_id uuid)
returns text language plpgsql stable security definer set search_path = '' as $$
declare v_booking public.bookings; v_user uuid := auth.uid(); v_url text;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_booking from public.bookings where id = p_booking_id;
  if not found or v_user not in (v_booking.learner_id, v_booking.mentor_id) then raise exception 'NOT_ALLOWED'; end if;
  if v_booking.status <> 'confirmed' or now() < v_booking.starts_at - interval '15 minutes'
    or now() > v_booking.ends_at + interval '15 minutes' then raise exception 'OUTSIDE_JOIN_WINDOW'; end if;
  select join_url into v_url from public.booking_meetings where booking_id = p_booking_id;
  if v_url is null then raise exception 'MEETING_NOT_READY'; end if;
  return v_url;
end;
$$;

revoke all on function public.save_mentor_profile(text,text,text[]),
  public.create_availability(timestamptz,timestamptz), public.close_availability(uuid),
  public.book_free_intro(uuid,uuid), public.cancel_free_intro(uuid), public.complete_free_intro(uuid),
  public.set_booking_meeting(uuid,text), public.get_booking_join_url(uuid)
  from public, anon;
grant execute on function public.save_mentor_profile(text,text,text[]),
  public.create_availability(timestamptz,timestamptz), public.close_availability(uuid),
  public.book_free_intro(uuid,uuid), public.cancel_free_intro(uuid), public.complete_free_intro(uuid),
  public.set_booking_meeting(uuid,text), public.get_booking_join_url(uuid)
  to authenticated;
revoke all on function public.get_available_slots(uuid) from public;
grant execute on function public.get_available_slots(uuid) to anon, authenticated;

commit;
