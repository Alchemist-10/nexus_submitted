begin;

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  booking_id uuid not null references public.bookings(id) on delete cascade,
  dedupe_key text not null unique,
  kind text not null check(kind in ('booking_confirmed','booking_cancelled','meeting_updated','session_completed','reminder_24h','reminder_15m','missing_meeting')),
  counterpart_name text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  session_kind text not null check(session_kind in ('intro','paid')),
  available_at timestamptz not null,
  published_at timestamptz,
  read_at timestamptz,
  suppressed_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_recipient_history on public.notifications(recipient_id,published_at desc,id desc) where suppressed_at is null and published_at is not null;
create index notifications_recipient_unread on public.notifications(recipient_id) where read_at is null and suppressed_at is null and published_at is not null;
create index notifications_booking on public.notifications(booking_id);
alter table public.notifications enable row level security;
revoke all on public.notifications from public,anon,authenticated;
grant select on public.notifications to authenticated;
create policy notification_recipient_read on public.notifications for select to authenticated
  using(recipient_id=(select auth.uid()) and published_at<=now() and suppressed_at is null);

create table app_private.notification_jobs (
  id uuid primary key references public.notifications(id) on delete cascade,
  recipient_email text,
  state text not null default 'pending' check(state in ('pending','accepted','previewed','suppressed','review')),
  due_at timestamptz not null,
  expires_at timestamptz not null,
  attempts integer not null default 0 check(attempts between 0 and 8),
  first_attempt_at timestamptz,
  lease_token uuid,
  leased_until timestamptz,
  provider_id text,
  last_error text,
  finished_at timestamptz
);
alter table app_private.notification_jobs enable row level security;
revoke all on app_private.notification_jobs from public,anon,authenticated,service_role;
create index notification_jobs_due on app_private.notification_jobs(due_at,id) where state='pending';

create function app_private.enqueue_notification(p_booking_id uuid,p_recipient uuid,p_kind text,p_key text,p_due timestamptz,p_expiry timestamptz,p_publish boolean)
returns void language plpgsql security definer set search_path='' as $$
declare b public.bookings; n uuid; other_name text;
begin
  select * into strict b from public.bookings where id=p_booking_id;
  select full_name into other_name from public.profiles where id=case when p_recipient=b.mentor_id then b.learner_id else b.mentor_id end;
  insert into public.notifications(recipient_id,booking_id,dedupe_key,kind,counterpart_name,starts_at,ends_at,session_kind,available_at,published_at)
  values(p_recipient,b.id,p_key,p_kind,other_name,b.starts_at,b.ends_at,b.kind,p_due,case when p_publish then now() end)
  on conflict(dedupe_key) do nothing returning id into n;
  if n is not null then
    insert into app_private.notification_jobs(id,recipient_email,due_at,expires_at)
    select n,email,p_due,p_expiry from auth.users where id=p_recipient;
  end if;
end;
$$;

create function app_private.booking_notification_event() returns trigger
language plpgsql security definer set search_path='' as $$
declare b public.bookings; recipient uuid; prefix text; due timestamptz;
begin
  select * into strict b from public.bookings where id=new.booking_id;
  prefix:='event:'||new.id::text||':';
  if new.action='confirmed' and b.status='confirmed' then
    foreach recipient in array array[b.learner_id,b.mentor_id] loop
      perform app_private.enqueue_notification(b.id,recipient,'booking_confirmed',prefix||recipient::text,now(),b.starts_at,true);
      due:=b.starts_at-interval '24 hours';
      if due>now() then
        perform app_private.enqueue_notification(b.id,recipient,'reminder_24h','reminder:24h:'||b.id::text||':'||recipient::text,due,b.starts_at-interval '1 hour',false);
      end if;
      due:=b.starts_at-interval '15 minutes';
      if due>now() then
        perform app_private.enqueue_notification(b.id,recipient,'reminder_15m','reminder:15m:'||b.id::text||':'||recipient::text,due,b.starts_at,false);
      end if;
    end loop;
    due:=b.starts_at-interval '1 hour';
    if due>now() then
      perform app_private.enqueue_notification(b.id,b.mentor_id,'missing_meeting','missing:'||b.id::text,due,b.starts_at,false);
    end if;
  elsif new.action='cancelled' and b.status='cancelled' then
    foreach recipient in array array[b.learner_id,b.mentor_id] loop
      perform app_private.enqueue_notification(b.id,recipient,'booking_cancelled',prefix||recipient::text,now(),now()+interval '7 days',true);
    end loop;
  elsif new.action='meeting_updated' and b.status='confirmed' then
    perform app_private.enqueue_notification(b.id,b.learner_id,'meeting_updated',prefix||b.learner_id::text,now(),b.ends_at,true);
  elsif new.action='completed' and b.status='completed' then
    perform app_private.enqueue_notification(b.id,b.learner_id,'session_completed',prefix||b.learner_id::text,now(),now()+interval '7 days',true);
  end if;
  return new;
end;
$$;
create trigger enqueue_booking_notifications after insert on public.booking_events
  for each row execute function app_private.booking_notification_event();

create function app_private.suppress_booking_reminders() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if new.status<>'confirmed' then
    update public.notifications set suppressed_at=now()
      where booking_id=new.id and kind in ('reminder_24h','reminder_15m','missing_meeting') and suppressed_at is null;
    update app_private.notification_jobs j set state='suppressed',finished_at=now(),lease_token=null,leased_until=null
      from public.notifications n where n.id=j.id and n.booking_id=new.id and j.state='pending'
      and n.kind in ('booking_confirmed','meeting_updated','reminder_24h','reminder_15m','missing_meeting');
  end if;
  return new;
end;
$$;
create trigger suppress_booking_notifications after update of status on public.bookings
  for each row when(old.status is distinct from new.status) execute function app_private.suppress_booking_reminders();

-- Repeatedly saving an unchanged meeting link is a no-op, including its event.
create or replace function public.set_booking_meeting(p_booking_id uuid,p_join_url text)
returns void language plpgsql security definer set search_path='' as $$
declare b public.bookings; u uuid:=auth.uid();
begin
  if u is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into b from public.bookings where id=p_booking_id for update;
  if not found or b.mentor_id<>u then raise exception 'NOT_ALLOWED'; end if;
  if b.status<>'confirmed' or b.ends_at<=now() then raise exception 'INVALID_STATE'; end if;
  if p_join_url is null or p_join_url !~ '^https://[^[:space:]]+$' or char_length(p_join_url)>1000 then raise exception 'INVALID_MEETING_URL'; end if;
  if exists(select 1 from public.booking_meetings where booking_id=b.id and join_url=p_join_url) then return; end if;
  insert into public.booking_meetings(booking_id,join_url) values(b.id,p_join_url)
    on conflict(booking_id) do update set join_url=excluded.join_url,updated_at=now();
  insert into public.booking_events(booking_id,actor_id,action) values(b.id,u,'meeting_updated');
end;
$$;

create function public.mark_notifications_read(p_id uuid default null) returns void
language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  update public.notifications set read_at=coalesce(read_at,now())
    where recipient_id=auth.uid() and (p_id is null or id=p_id)
    and published_at<=now() and suppressed_at is null and read_at is null;
end;
$$;
revoke all on function public.mark_notifications_read(uuid) from public,anon,authenticated;
grant execute on function public.mark_notifications_read(uuid) to authenticated;

create function public.notification_claim_jobs(p_limit integer default 10)
returns table(id uuid,lease_token uuid) language plpgsql security definer set search_path='' as $$
begin
  if p_limit is null or p_limit not between 1 and 50 then raise exception 'INVALID_LIMIT'; end if;
  -- Recover workers that crashed on their final attempt or outlived provider dedupe.
  update app_private.notification_jobs j set state='review',last_error='RETRY_WINDOW_EXHAUSTED',lease_token=null,leased_until=null,finished_at=clock_timestamp()
    where state='pending' and (leased_until is null or leased_until<=clock_timestamp())
      and (attempts>=8 or first_attempt_at<=clock_timestamp()-interval '23 hours');
  return query
  with candidates as (
    select j.id from app_private.notification_jobs j
    where j.state='pending' and j.due_at<=clock_timestamp()
      and (j.leased_until is null or j.leased_until<=clock_timestamp())
    order by j.due_at,j.id limit p_limit for update skip locked
  )
  update app_private.notification_jobs j set lease_token=gen_random_uuid(),leased_until=clock_timestamp()+interval '2 minutes',
    attempts=j.attempts+1,first_attempt_at=coalesce(j.first_attempt_at,clock_timestamp())
    from candidates c where j.id=c.id returning j.id,j.lease_token;
end;
$$;

create function public.notification_prepare_job(p_id uuid,p_token uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare j app_private.notification_jobs; n public.notifications; b public.bookings; valid boolean;
begin
  select * into j from app_private.notification_jobs where id=p_id for update;
  if not found or j.state<>'pending' or j.lease_token is null or j.lease_token is distinct from p_token or j.leased_until is null or j.leased_until<=clock_timestamp() then return null; end if;
  select * into strict n from public.notifications where id=j.id;
  select * into strict b from public.bookings where id=n.booking_id;
  valid:=j.expires_at>clock_timestamp() and n.suppressed_at is null;
  if n.kind in ('booking_confirmed','meeting_updated','reminder_24h','reminder_15m','missing_meeting') then valid:=valid and b.status='confirmed'; end if;
  if n.kind='missing_meeting' then valid:=valid and not exists(select 1 from public.booking_meetings where booking_id=b.id); end if;
  if not valid then
    update app_private.notification_jobs set state='suppressed',finished_at=clock_timestamp(),lease_token=null,leased_until=null where id=j.id;
    if n.published_at is null or n.kind in ('reminder_24h','reminder_15m','missing_meeting') then
      update public.notifications set suppressed_at=clock_timestamp() where id=j.id;
    end if;
    return null;
  end if;
  update public.notifications set published_at=coalesce(published_at,clock_timestamp()) where id=j.id;
  return jsonb_build_object('id',n.id,'recipientEmail',j.recipient_email,'bookingId',n.booking_id,'kind',n.kind,
    'counterpartName',n.counterpart_name,'startsAt',n.starts_at,'endsAt',n.ends_at,'sessionKind',n.session_kind);
end;
$$;

create function public.notification_finish_job(p_id uuid,p_token uuid,p_outcome text,p_provider_id text default null,p_error text default null)
returns boolean language plpgsql security definer set search_path='' as $$
declare j app_private.notification_jobs;
begin
  if p_outcome is null or p_outcome not in ('accepted','previewed','retry','review') then raise exception 'INVALID_OUTCOME'; end if;
  select * into j from app_private.notification_jobs where id=p_id for update;
  if not found or j.state<>'pending' or j.lease_token is null or j.lease_token is distinct from p_token or j.leased_until is null or j.leased_until<=clock_timestamp() then return false; end if;
  update app_private.notification_jobs set
    state=case when p_outcome='retry' then case when attempts>=8 or first_attempt_at<=clock_timestamp()-interval '23 hours' then 'review' else 'pending' end else p_outcome end,
    due_at=case when p_outcome='retry' then clock_timestamp()+least(3600,30*power(2,attempts-1))::double precision*interval '1 second' else due_at end,
    lease_token=null,leased_until=null,provider_id=left(p_provider_id,200),last_error=left(p_error,120),
    finished_at=case when p_outcome<>'retry' or attempts>=8 or first_attempt_at<=clock_timestamp()-interval '23 hours' then clock_timestamp() end
    where id=j.id;
  return true;
end;
$$;

create function public.notification_job_status() returns jsonb
language sql stable security definer set search_path='' as $$
  select coalesce(jsonb_object_agg(state,total),'{}'::jsonb) from
    (select state,count(*) as total from app_private.notification_jobs group by state) s;
$$;

do $$ declare f record; begin
  for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname in ('notification_claim_jobs','notification_prepare_job','notification_finish_job','notification_job_status')
  loop
    execute format('revoke all on function %s from public,anon,authenticated',f.signature);
    execute format('grant execute on function %s to service_role',f.signature);
  end loop;
end $$;
revoke all on function app_private.enqueue_notification(uuid,uuid,text,text,timestamptz,timestamptz,boolean),
  app_private.booking_notification_event(),app_private.suppress_booking_reminders() from public,anon,authenticated,service_role;

commit;
