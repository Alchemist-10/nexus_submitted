begin;
create or replace function public.complete_free_intro(p_booking_id uuid)
returns setof public.bookings language plpgsql security definer set search_path='' as $$
declare b public.bookings; v_user uuid:=auth.uid();
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into b from public.bookings where id=p_booking_id for update;
  if not found or b.mentor_id<>v_user then raise exception 'NOT_ALLOWED'; end if;
  if b.status='completed' then return next b; return; end if;
  if b.status<>'confirmed' or b.starts_at>now() then raise exception 'CANNOT_COMPLETE'; end if;
  update public.bookings set status='completed',updated_at=now() where id=p_booking_id returning * into b;
  insert into public.booking_events(booking_id,actor_id,action) values(b.id,v_user,'completed');
  return next b;
end; $$;

create or replace function public.rate_mentor(p_booking_id uuid,p_score integer) returns void
language plpgsql security definer set search_path='' as $$
declare b public.bookings; existing_score integer;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_score is null or p_score<1 or p_score>5 then raise exception 'INVALID_RATING'; end if;
  select * into b from public.bookings where id=p_booking_id for update;
  if not found or b.learner_id<>auth.uid() then raise exception 'NOT_ALLOWED'; end if;
  if b.status<>'completed' or b.starts_at>now() then raise exception 'RATING_NOT_READY'; end if;
  select score into existing_score from public.mentor_ratings where booking_id=b.id;
  if found then
    if existing_score=p_score then return; end if;
    raise exception 'RATING_ALREADY_SUBMITTED';
  end if;
  insert into public.mentor_ratings(booking_id,score) values(b.id,p_score);
end; $$;

create or replace function public.get_mentor_ratings(p_mentor_ids uuid[])
returns table(mentor_id uuid,average_rating numeric,rating_count bigint)
language plpgsql stable security definer set search_path='' as $$
begin
  if cardinality(p_mentor_ids)>60 then raise exception 'INVALID_MENTOR_LIST'; end if;
  return query select m.user_id,round(avg(r.score),1),count(r.booking_id)
  from public.mentor_profiles m
  left join public.bookings b on b.mentor_id=m.user_id and b.status='completed' and b.starts_at<=now()
  left join public.mentor_ratings r on r.booking_id=b.id
  where m.is_listed and m.user_id=any(p_mentor_ids) group by m.user_id;
end; $$;
-- CREATE OR REPLACE retains the existing restrictive EXECUTE grants.
commit;
