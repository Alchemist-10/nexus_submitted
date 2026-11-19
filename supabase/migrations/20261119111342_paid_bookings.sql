begin;

alter table public.mentor_profiles add column session_price_paise integer
  check (session_price_paise between 100 and 2500000);
alter table public.bookings
  add column kind text not null default 'intro' check (kind in ('intro','paid')),
  add column amount_paise integer not null default 0,
  add column currency text not null default 'INR' check (currency='INR'),
  add column hold_expires_at timestamptz,
  drop constraint bookings_status_check,
  add constraint bookings_status_check check (status in ('awaiting_payment','confirmed','completed','cancelled','expired')),
  add constraint booking_price_kind check (
    (kind='intro' and amount_paise=0 and hold_expires_at is null and status not in ('awaiting_payment','expired')) or
    (kind='paid' and amount_paise between 100 and 2500000 and hold_expires_at is not null)
  );
drop index public.one_intro_per_pair;
create unique index one_intro_per_pair on public.bookings(learner_id,mentor_id)
  where kind='intro' and status in ('confirmed','completed');
drop index public.one_booking_per_slot;
create unique index one_booking_per_slot on public.bookings(slot_id)
  where status in ('awaiting_payment','confirmed','completed');
create unique index one_checkout_per_learner on public.bookings(learner_id) where status='awaiting_payment';
create index expired_payment_holds on public.bookings(hold_expires_at) where status='awaiting_payment';
alter table public.booking_events drop constraint booking_events_action_check,
  add constraint booking_events_action_check check(action in ('awaiting_payment','expired','confirmed','cancelled','completed','meeting_updated'));

create table public.booking_payment_status (
  booking_id uuid primary key references public.bookings(id) on delete cascade,
  state text not null check(state in ('awaiting_payment','paid','expired','refund_pending','refunded','action_required')),
  updated_at timestamptz not null default now()
);
alter table public.booking_payment_status enable row level security;
revoke all on public.booking_payment_status from public,anon,authenticated;
grant select on public.booking_payment_status to authenticated;
create policy payment_participants on public.booking_payment_status for select to authenticated using (
  exists(select 1 from public.bookings b where b.id=booking_id and (select auth.uid()) in (b.learner_id,b.mentor_id))
);

create table app_private.payment_orders (
  booking_id uuid primary key references public.bookings(id) on delete cascade,
  provider_order_id text unique,
  create_token uuid,
  creating_until timestamptz,
  paid_payment_id text unique
);
create table app_private.captured_payments (
  payment_id text primary key,
  booking_id uuid not null references public.bookings(id) on delete cascade,
  order_id text not null,
  refund_id text unique,
  refund_state text check(refund_state in ('pending','submitted','processed','action_required')),
  created_at timestamptz not null default now()
);
create index payment_booking on app_private.captured_payments(booking_id);
create table app_private.payment_events (
  event_id text primary key,
  booking_id uuid not null references public.bookings(id) on delete cascade,
  processed_at timestamptz not null default now()
);
create index payment_event_booking on app_private.payment_events(booking_id);
create table app_private.payment_jobs (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  kind text not null check(kind in ('reconcile','refund')),
  payment_id text references app_private.captured_payments(payment_id) on delete cascade,
  state text not null default 'ready' check(state in ('ready','done','action_required')),
  attempts integer not null default 0,
  available_at timestamptz not null default now(),
  lease_token uuid,
  leased_until timestamptz,
  last_error text,
  unique nulls not distinct (booking_id,kind,payment_id),
  check ((kind='refund')=(payment_id is not null))
);
create index due_payment_jobs on app_private.payment_jobs(available_at) where state='ready';
create index payment_job_payment on app_private.payment_jobs(payment_id) where payment_id is not null;
alter table app_private.payment_orders enable row level security;
alter table app_private.captured_payments enable row level security;
alter table app_private.payment_events enable row level security;
alter table app_private.payment_jobs enable row level security;
revoke all on app_private.payment_orders,app_private.captured_payments,app_private.payment_events,app_private.payment_jobs
  from public,anon,authenticated;

-- A short transaction-scoped scheduler lock gives every reservation mutation
-- the same lock order. No provider/network calls run while this lock is held.
-- Deliberately conservative for the campus pilot; unrelated reservations can
-- later use ordered participant locks without changing the external contract.
create function app_private.lock_schedule() returns void language sql set search_path='' as $$
  select pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('nexus-schedule-v1',0));
$$;

create or replace function app_private.sync_participants() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if tg_op='INSERT' then
    insert into public.booking_participants(booking_id,user_id,starts_at,ends_at)
      values(new.id,new.mentor_id,new.starts_at,new.ends_at),(new.id,new.learner_id,new.starts_at,new.ends_at);
  elsif new.status in ('cancelled','expired') then
    update public.booking_participants set active=false where booking_id=new.id;
  end if;
  return new;
end; $$;

create function app_private.expire_payment_holds() returns void
language plpgsql security definer set search_path='' as $$
declare b public.bookings;
begin
  perform app_private.lock_schedule();
  for b in update public.bookings set status='expired',updated_at=clock_timestamp()
    where status='awaiting_payment' and hold_expires_at<=clock_timestamp() returning *
  loop
    update public.booking_payment_status set state='expired',updated_at=clock_timestamp() where booking_id=b.id;
    insert into public.booking_events(booking_id,actor_id,action) values(b.id,b.learner_id,'expired');
  end loop;
end; $$;

create function public.set_mentor_price(p_amount_paise integer) returns void
language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_amount_paise is not null and p_amount_paise not between 100 and 2500000 then raise exception 'INVALID_PRICE'; end if;
  update public.mentor_profiles set session_price_paise=p_amount_paise where user_id=auth.uid();
  if not found then raise exception 'MENTOR_REQUIRED'; end if;
end; $$;

create or replace function public.book_free_intro(p_slot_id uuid,p_request_key uuid)
returns setof public.bookings language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); s public.availability_slots; b public.bookings;
begin
  if u is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_slot_id is null or p_request_key is null then raise exception 'INVALID_INPUT'; end if;
  perform app_private.expire_payment_holds();
  select * into b from public.bookings where learner_id=u and request_key=p_request_key;
  if found then
    if b.slot_id<>p_slot_id or b.kind<>'intro' then raise exception 'REQUEST_KEY_REUSED'; end if;
    return next b; return;
  end if;
  select * into s from public.availability_slots where id=p_slot_id for update;
  if not found or not s.is_open or s.starts_at<=clock_timestamp() then raise exception 'SLOT_UNAVAILABLE'; end if;
  if s.mentor_id=u then raise exception 'SELF_BOOKING'; end if;
  if not exists(select 1 from public.mentor_profiles where user_id=s.mentor_id and is_listed) then raise exception 'SLOT_UNAVAILABLE'; end if;
  if exists(select 1 from public.bookings where learner_id=u and mentor_id=s.mentor_id and kind='intro' and status in ('confirmed','completed'))
    then raise exception 'TRIAL_UNAVAILABLE'; end if;
  if exists(select 1 from public.bookings where slot_id=s.id and status in ('awaiting_payment','confirmed','completed'))
    then raise exception 'SLOT_UNAVAILABLE'; end if;
  insert into public.bookings(slot_id,mentor_id,learner_id,request_key,starts_at,ends_at)
    values(s.id,s.mentor_id,u,p_request_key,s.starts_at,s.ends_at) returning * into b;
  insert into public.booking_events(booking_id,actor_id,action) values(b.id,u,'confirmed');
  return next b;
exception when exclusion_violation then raise exception 'SCHEDULE_CONFLICT';
  when unique_violation then raise exception 'TRIAL_UNAVAILABLE';
end; $$;

create function public.reserve_paid_session(p_slot_id uuid,p_request_key uuid,p_post_id uuid default null)
returns setof public.bookings language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); s public.availability_slots; b public.bookings; price integer;
begin
  if u is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_slot_id is null or p_request_key is null then raise exception 'INVALID_INPUT'; end if;
  perform app_private.expire_payment_holds();
  select * into b from public.bookings where learner_id=u and request_key=p_request_key;
  if found then
    if b.slot_id<>p_slot_id or b.kind<>'paid' or b.source_post_id is distinct from p_post_id then raise exception 'REQUEST_KEY_REUSED'; end if;
    return next b; return;
  end if;
  if exists(select 1 from public.bookings where learner_id=u and status='awaiting_payment') then raise exception 'CHECKOUT_PENDING'; end if;
  if (select count(*) from public.bookings where learner_id=u and kind='paid' and created_at>clock_timestamp()-interval '10 minutes')>=5
    then raise exception 'CHECKOUT_RATE_LIMIT'; end if;
  select * into s from public.availability_slots where id=p_slot_id for update;
  if not found or not s.is_open or s.starts_at<=clock_timestamp()+interval '15 minutes' then raise exception 'SLOT_UNAVAILABLE'; end if;
  if s.mentor_id=u then raise exception 'SELF_BOOKING'; end if;
  select session_price_paise into price from public.mentor_profiles where user_id=s.mentor_id and is_listed;
  if not found or price is null then raise exception 'PAID_SESSIONS_DISABLED'; end if;
  if not exists(select 1 from public.bookings where learner_id=u and mentor_id=s.mentor_id and kind='intro' and status='completed')
    then raise exception 'INTRO_REQUIRED'; end if;
  if p_post_id is not null and not exists(select 1 from public.community_posts where id=p_post_id) then raise exception 'POST_UNAVAILABLE'; end if;
  if exists(select 1 from public.bookings where slot_id=s.id and status in ('awaiting_payment','confirmed','completed')) then raise exception 'SLOT_UNAVAILABLE'; end if;
  insert into public.bookings(slot_id,mentor_id,learner_id,request_key,starts_at,ends_at,kind,amount_paise,status,hold_expires_at,source_post_id)
    values(s.id,s.mentor_id,u,p_request_key,s.starts_at,s.ends_at,'paid',price,'awaiting_payment',clock_timestamp()+interval '10 minutes',p_post_id) returning * into b;
  insert into public.booking_payment_status(booking_id,state) values(b.id,'awaiting_payment');
  insert into app_private.payment_orders(booking_id) values(b.id);
  insert into app_private.payment_jobs(booking_id,kind,available_at) values(b.id,'reconcile',clock_timestamp()+interval '30 seconds');
  insert into public.booking_events(booking_id,actor_id,action) values(b.id,u,'awaiting_payment');
  return next b;
exception when exclusion_violation then raise exception 'SCHEDULE_CONFLICT';
end; $$;

create or replace function public.close_availability(p_slot_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare s public.availability_slots;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  perform app_private.expire_payment_holds();
  select * into s from public.availability_slots where id=p_slot_id for update;
  if not found or s.mentor_id<>auth.uid() then raise exception 'NOT_ALLOWED'; end if;
  if exists(select 1 from public.bookings where slot_id=s.id and status in ('awaiting_payment','confirmed')) then raise exception 'SLOT_HAS_BOOKING'; end if;
  update public.availability_slots set is_open=false where id=s.id;
end; $$;

-- Discovery is read-only: expired holds are ignored here and atomically released
-- when the next booking mutation starts.
create or replace function public.get_available_slots(p_mentor_id uuid)
returns table(id uuid,mentor_id uuid,starts_at timestamptz,ends_at timestamptz)
language sql stable security definer set search_path='' as $$
  select s.id,s.mentor_id,s.starts_at,s.ends_at from public.availability_slots s
  join public.mentor_profiles m on m.user_id=s.mentor_id and m.is_listed
  where s.mentor_id=p_mentor_id and s.is_open and s.starts_at>now()
    and not exists(select 1 from public.bookings b where b.slot_id=s.id and
      (b.status in ('confirmed','completed') or (b.status='awaiting_payment' and b.hold_expires_at>now())))
  order by s.starts_at limit 100;
$$;

create function app_private.queue_refund(p_payment_id text) returns void
language plpgsql security definer set search_path='' as $$
declare pay app_private.captured_payments;
begin
  update app_private.captured_payments set refund_state=coalesce(refund_state,'pending')
    where payment_id=p_payment_id returning * into pay;
  if not found or pay.refund_state='processed' then return; end if;
  insert into app_private.payment_jobs(booking_id,kind,payment_id)
    values(pay.booking_id,'refund',pay.payment_id) on conflict do nothing;
  if exists(select 1 from app_private.payment_orders where booking_id=pay.booking_id and paid_payment_id=pay.payment_id) then
    update public.booking_payment_status set state='refund_pending',updated_at=clock_timestamp() where booking_id=pay.booking_id;
  end if;
end; $$;

-- Keep the old endpoint compatible while applying the approved paid policy.
create or replace function public.cancel_free_intro(p_booking_id uuid)
returns setof public.bookings language plpgsql security definer set search_path='' as $$
declare b public.bookings; payment text; u uuid:=auth.uid();
begin
  if u is null then raise exception 'AUTH_REQUIRED'; end if;
  perform app_private.expire_payment_holds();
  select * into b from public.bookings where id=p_booking_id for update;
  if not found or u not in (b.learner_id,b.mentor_id) then raise exception 'NOT_ALLOWED'; end if;
  if b.status in ('cancelled','expired') then return next b; return; end if;
  if b.status not in ('confirmed','awaiting_payment') or b.starts_at<=clock_timestamp() then raise exception 'CANNOT_CANCEL'; end if;
  update public.bookings set status='cancelled',updated_at=clock_timestamp() where id=b.id returning * into b;
  if b.kind='paid' then
    select paid_payment_id into payment from app_private.payment_orders where booking_id=b.id;
    if payment is not null then perform app_private.queue_refund(payment);
    else update public.booking_payment_status set state='expired',updated_at=clock_timestamp() where booking_id=b.id;
    end if;
  end if;
  insert into public.booking_events(booking_id,actor_id,action) values(b.id,u,'cancelled');
  return next b;
end; $$;

create function public.payment_get_context(p_booking_id uuid) returns jsonb
language sql stable security definer set search_path='' as $$
  select jsonb_build_object('booking',to_jsonb(b),'order',to_jsonb(o),'payments',
    coalesce((select jsonb_agg(to_jsonb(p)) from app_private.captured_payments p where p.booking_id=b.id),'[]'::jsonb))
  from public.bookings b join app_private.payment_orders o on o.booking_id=b.id where b.id=p_booking_id;
$$;

create function public.payment_lookup_order(p_order_id text) returns uuid
language sql stable security definer set search_path='' as $$
  select booking_id from app_private.payment_orders where provider_order_id=p_order_id;
$$;

create function public.payment_claim_order(p_booking_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare o app_private.payment_orders; b public.bookings; claimed boolean:=false;
begin
  perform app_private.expire_payment_holds();
  select * into b from public.bookings where id=p_booking_id;
  select * into o from app_private.payment_orders where booking_id=p_booking_id for update;
  if not found then raise exception 'NOT_ALLOWED'; end if;
  if o.provider_order_id is null and b.status='awaiting_payment' and (o.creating_until is null or o.creating_until<=clock_timestamp()) then
    update app_private.payment_orders set create_token=gen_random_uuid(),creating_until=clock_timestamp()+interval '90 seconds'
      where booking_id=b.id returning * into o;
    claimed:=true;
  end if;
  return jsonb_build_object('claimed',claimed,'context',public.payment_get_context(b.id));
end; $$;

create function public.payment_attach_order(p_booking_id uuid,p_token uuid,p_order_id text,p_amount_paise integer,p_currency text)
returns void language plpgsql security definer set search_path='' as $$
declare b public.bookings; o app_private.payment_orders;
begin
  perform app_private.expire_payment_holds();
  select * into b from public.bookings where id=p_booking_id;
  select * into o from app_private.payment_orders where booking_id=b.id for update;
  if not found or p_order_id is null or p_order_id!~'^order_[a-zA-Z0-9]{1,100}$' or b.amount_paise is distinct from p_amount_paise
    or b.currency is distinct from p_currency then raise exception 'PAYMENT_MISMATCH'; end if;
  if o.provider_order_id is not null then
    if o.provider_order_id<>p_order_id then raise exception 'PAYMENT_MISMATCH'; end if;
    return;
  end if;
  if p_token is null or o.create_token is distinct from p_token then raise exception 'LEASE_LOST'; end if;
  update app_private.payment_orders set provider_order_id=p_order_id,creating_until=null where booking_id=b.id;
end; $$;

create function public.payment_record_capture(p_booking_id uuid,p_order_id text,p_payment_id text,p_amount_paise integer,p_currency text,p_fully_refunded boolean default false)
returns void language plpgsql security definer set search_path='' as $$
declare b public.bookings; o app_private.payment_orders; previous app_private.captured_payments;
begin
  perform app_private.expire_payment_holds();
  select * into b from public.bookings where id=p_booking_id for update;
  select * into o from app_private.payment_orders where booking_id=b.id for update;
  if not found or o.provider_order_id is distinct from p_order_id or p_payment_id is null or p_payment_id!~'^pay_[a-zA-Z0-9]{1,100}$'
    or b.amount_paise is distinct from p_amount_paise or b.currency is distinct from p_currency or p_fully_refunded is null
    then raise exception 'PAYMENT_MISMATCH'; end if;
  select * into previous from app_private.captured_payments where payment_id=p_payment_id;
  if found then
    if previous.booking_id<>b.id or previous.order_id<>p_order_id then raise exception 'PAYMENT_MISMATCH'; end if;
    return;
  end if;
  insert into app_private.captured_payments(payment_id,booking_id,order_id,refund_state)
    values(p_payment_id,b.id,p_order_id,case when p_fully_refunded then 'processed' else null end);
  if o.paid_payment_id is not null then
    if not p_fully_refunded then perform app_private.queue_refund(p_payment_id); end if;
    return;
  end if;
  update app_private.payment_orders set paid_payment_id=p_payment_id where booking_id=b.id;
  if p_fully_refunded then
    if b.status in ('awaiting_payment','confirmed') then
      update public.bookings set status='cancelled',updated_at=clock_timestamp() where id=b.id;
      insert into public.booking_events(booking_id,actor_id,action) values(b.id,b.learner_id,'cancelled');
    end if;
    update public.booking_payment_status set state='refunded',updated_at=clock_timestamp() where booking_id=b.id;
  elsif b.status='awaiting_payment' and b.hold_expires_at>clock_timestamp() then
    update public.bookings set status='confirmed',updated_at=clock_timestamp() where id=b.id;
    update public.booking_payment_status set state='paid',updated_at=clock_timestamp() where booking_id=b.id;
    insert into public.booking_events(booking_id,actor_id,action) values(b.id,b.learner_id,'confirmed');
  else
    perform app_private.queue_refund(p_payment_id);
  end if;
end; $$;

create function public.payment_record_refund(p_payment_id text,p_refund_id text,p_processed boolean)
returns void language plpgsql security definer set search_path='' as $$
declare p app_private.captured_payments; b public.bookings;
begin
  perform app_private.expire_payment_holds();
  if p_refund_id is null or p_refund_id!~'^rfnd_[a-zA-Z0-9]{1,100}$' or p_processed is null then raise exception 'PAYMENT_MISMATCH'; end if;
  select * into p from app_private.captured_payments where payment_id=p_payment_id for update;
  if not found or (p.refund_id is not null and p.refund_id<>p_refund_id) then raise exception 'PAYMENT_MISMATCH'; end if;
  update app_private.captured_payments set refund_id=p_refund_id,
    refund_state=case when p_processed or refund_state='processed' then 'processed' else 'submitted' end where payment_id=p_payment_id;
  if exists(select 1 from app_private.payment_orders where booking_id=p.booking_id and paid_payment_id=p.payment_id) then
    select * into b from public.bookings where id=p.booking_id for update;
    if b.status in ('awaiting_payment','confirmed') then
      update public.bookings set status='cancelled',updated_at=clock_timestamp() where id=b.id;
      insert into public.booking_events(booking_id,actor_id,action) values(b.id,b.learner_id,'cancelled');
    end if;
    update public.booking_payment_status set state=case when p_processed or p.refund_state='processed' then 'refunded' else 'refund_pending' end,
      updated_at=clock_timestamp() where booking_id=b.id;
  end if;
end; $$;

create function public.payment_webhook_event(p_event_id text,p_order_id text,p_complete boolean default false)
returns uuid language plpgsql security definer set search_path='' as $$
declare b uuid;
begin
  if p_event_id is null or char_length(p_event_id) not between 1 and 200 then raise exception 'INVALID_INPUT'; end if;
  if exists(select 1 from app_private.payment_events where event_id=p_event_id) then return null; end if;
  b:=public.payment_lookup_order(p_order_id);
  if b is not null and p_complete then insert into app_private.payment_events(event_id,booking_id) values(p_event_id,b) on conflict do nothing; end if;
  return b;
end; $$;

create function public.payment_claim_jobs(p_booking_id uuid default null,p_limit integer default 5)
returns setof jsonb language plpgsql security definer set search_path='' as $$
declare j app_private.payment_jobs;
begin
  if p_limit is null or p_limit not between 1 and 20 then raise exception 'INVALID_INPUT'; end if;
  perform app_private.expire_payment_holds();
  for j in select * from app_private.payment_jobs where state='ready' and available_at<=clock_timestamp()
    and (leased_until is null or leased_until<=clock_timestamp()) and (p_booking_id is null or booking_id=p_booking_id)
    order by available_at,id limit p_limit for update skip locked
  loop
    update app_private.payment_jobs set lease_token=gen_random_uuid(),leased_until=clock_timestamp()+interval '2 minutes',attempts=attempts+1
      where id=j.id returning * into j;
    return next to_jsonb(j);
  end loop;
end; $$;

create function public.payment_finish_job(p_job_id uuid,p_token uuid,p_done boolean,p_error text default null)
returns void language plpgsql security definer set search_path='' as $$
declare j app_private.payment_jobs;
begin
  if p_done is null or (p_error is not null and p_error!~'^[A-Z_]{1,60}$') then raise exception 'INVALID_INPUT'; end if;
  select * into j from app_private.payment_jobs where id=p_job_id and lease_token=p_token and leased_until>clock_timestamp() for update;
  if not found then raise exception 'LEASE_LOST'; end if;
  update app_private.payment_jobs set state=case when p_done then 'done' when attempts>=12 then 'action_required' else 'ready' end,
    available_at=clock_timestamp()+least(300,10*power(2,least(attempts,5))) * interval '1 second',
    lease_token=null,leased_until=null,last_error=p_error where id=j.id;
  if not p_done and j.attempts>=12 then
    if j.kind='refund' then
      update app_private.captured_payments set refund_state='action_required' where payment_id=j.payment_id and refund_state<>'processed';
    end if;
    update public.booking_payment_status set state='action_required',updated_at=clock_timestamp()
      where booking_id=j.booking_id and state in ('awaiting_payment','refund_pending');
  end if;
end; $$;

revoke all on function public.set_mentor_price(integer),public.reserve_paid_session(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.set_mentor_price(integer),public.reserve_paid_session(uuid,uuid,uuid) to authenticated;
-- PostgreSQL/Supabase defaults must not make trusted payment writes callable by
-- signed-in users. Generate these ACLs from their actual complete signatures.
do $$ declare f record; begin
  for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname like 'payment\_%' escape '\'
  loop
    execute format('revoke all on function %s from public,anon,authenticated',f.signature);
    execute format('grant execute on function %s to service_role',f.signature);
  end loop;
end; $$;
revoke all on all functions in schema app_private from public,anon,authenticated,service_role;
commit;
