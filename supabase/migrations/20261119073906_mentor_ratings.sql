begin;
create table public.mentor_ratings (
  booking_id uuid primary key references public.bookings(id) on delete cascade,
  score smallint not null check(score between 1 and 5),
  created_at timestamptz not null default now()
);
alter table public.mentor_ratings enable row level security;
revoke all on public.mentor_ratings from anon,authenticated;
grant select on public.mentor_ratings to authenticated;
create policy rating_participants_read on public.mentor_ratings for select to authenticated
  using(exists(select 1 from public.bookings b where b.id=booking_id and (b.learner_id=(select auth.uid()) or b.mentor_id=(select auth.uid()))));

create function public.rate_mentor(p_booking_id uuid,p_score integer) returns void
language plpgsql security definer set search_path='' as $$
declare b public.bookings; existing_score integer;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_score is null or p_score<1 or p_score>5 then raise exception 'INVALID_RATING'; end if;
  select * into b from public.bookings where id=p_booking_id for update;
  if not found or b.learner_id<>auth.uid() then raise exception 'NOT_ALLOWED'; end if;
  if b.status<>'completed' or b.ends_at>now() then raise exception 'RATING_NOT_READY'; end if;
  select score into existing_score from public.mentor_ratings where booking_id=b.id;
  if found then
    if existing_score=p_score then return; end if;
    raise exception 'RATING_ALREADY_SUBMITTED';
  end if;
  insert into public.mentor_ratings(booking_id,score) values(b.id,p_score);
end; $$;
revoke all on function public.rate_mentor(uuid,integer) from public,anon,authenticated;
grant execute on function public.rate_mentor(uuid,integer) to authenticated;

-- This public endpoint reveals only listed mentors' aggregates, never students
-- or booking identifiers. A definer is needed to aggregate private rating rows.
create function public.get_mentor_ratings(p_mentor_ids uuid[])
returns table(mentor_id uuid,average_rating numeric,rating_count bigint)
language plpgsql stable security definer set search_path='' as $$
begin
  if cardinality(p_mentor_ids)>60 then raise exception 'INVALID_MENTOR_LIST'; end if;
  return query select m.user_id,round(avg(r.score),1),count(r.booking_id)
  from public.mentor_profiles m
  left join public.bookings b on b.mentor_id=m.user_id and b.status='completed' and b.ends_at<=now()
  left join public.mentor_ratings r on r.booking_id=b.id
  where m.is_listed and m.user_id=any(p_mentor_ids)
  group by m.user_id;
end; $$;
revoke all on function public.get_mentor_ratings(uuid[]) from public,anon,authenticated;
grant execute on function public.get_mentor_ratings(uuid[]) to anon,authenticated;
commit;
