begin;

create table public.community_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 10 and 160),
  body text not null check (char_length(btrim(body)) between 20 and 10000),
  stuck_on text not null check (char_length(btrim(stuck_on)) between 10 and 2000),
  category text not null check (category in ('coding','projects','academics','career')),
  tags text[] not null check (cardinality(tags) between 1 and 5 and array_position(tags,null) is null
    and tags <@ array['dsa','python','java','cpp','javascript','react','backend','databases','machine-learning','devops','mathematics','electronics','system-design','career','projects','computer-networks','operating-systems']::text[]),
  image_paths text[] not null default '{}' check (cardinality(image_paths) <= 3 and array_position(image_paths,null) is null),
  accepted_answer_id uuid,
  created_at timestamptz not null default now()
);
create table public.community_answers (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 20 and 10000),
  created_at timestamptz not null default now(),
  unique(id, post_id)
);
-- A composite reference prevents accepting an answer to a different question.
alter table public.community_posts add constraint accepted_answer_same_post
  foreign key (accepted_answer_id, id) references public.community_answers(id,post_id)
  on delete set null (accepted_answer_id);
create table public.community_votes (
  id bigint generated always as identity primary key,
  voter_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  post_id uuid references public.community_posts(id) on delete cascade,
  answer_id uuid references public.community_answers(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (num_nonnulls(post_id,answer_id)=1),
  unique(voter_id,post_id), unique(voter_id,answer_id)
);
create table public.community_reports (
  id bigint generated always as identity primary key,
  post_id uuid not null references public.community_posts(id) on delete cascade,
  reporter_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  reason text not null check (char_length(btrim(reason)) between 10 and 500),
  created_at timestamptz not null default now(),
  unique(post_id,reporter_id)
);
create index community_posts_newest on public.community_posts(created_at desc,id desc);
create index community_posts_category on public.community_posts(category,created_at desc);
create index community_posts_author on public.community_posts(author_id,created_at desc);
create index community_posts_tags on public.community_posts using gin(tags);
create index community_accepted_answer on public.community_posts(accepted_answer_id) where accepted_answer_id is not null;
create index community_answers_post on public.community_answers(post_id,created_at);
create index community_answers_author on public.community_answers(author_id,created_at desc);
create index community_votes_post on public.community_votes(post_id) where post_id is not null;
create index community_votes_answer on public.community_votes(answer_id) where answer_id is not null;
create index community_reports_author on public.community_reports(reporter_id);

alter table public.community_posts enable row level security;
alter table public.community_answers enable row level security;
alter table public.community_votes enable row level security;
alter table public.community_reports enable row level security;
revoke all on public.community_posts,public.community_answers,public.community_votes,public.community_reports from anon,authenticated;
grant select on public.community_posts,public.community_answers,public.community_votes to anon,authenticated;
grant insert(id,author_id,title,body,stuck_on,category,tags,image_paths),delete on public.community_posts to authenticated;
grant insert(id,post_id,author_id,body),delete on public.community_answers to authenticated;
grant insert(voter_id,post_id,answer_id),delete on public.community_votes to authenticated;
grant insert(post_id,reporter_id,reason),select on public.community_reports to authenticated;
grant usage,select on sequence public.community_votes_id_seq,public.community_reports_id_seq to authenticated;

create policy community_posts_read on public.community_posts for select to anon,authenticated using(true);
create policy community_posts_insert on public.community_posts for insert to authenticated with check(author_id=(select auth.uid()));
create policy community_posts_delete on public.community_posts for delete to authenticated using(author_id=(select auth.uid()));
create policy community_answers_read on public.community_answers for select to anon,authenticated using(true);
create policy community_answers_insert on public.community_answers for insert to authenticated with check(author_id=(select auth.uid()));
create policy community_answers_delete on public.community_answers for delete to authenticated using(author_id=(select auth.uid()));
create policy community_votes_read on public.community_votes for select to anon,authenticated using(true);
create policy community_votes_insert on public.community_votes for insert to authenticated with check (
  voter_id=(select auth.uid()) and (
    (post_id is not null and exists(select 1 from public.community_posts p where p.id=post_id and p.author_id<>(select auth.uid())))
    or (answer_id is not null and exists(select 1 from public.community_answers a where a.id=answer_id and a.author_id<>(select auth.uid())))
  )
);
create policy community_votes_delete on public.community_votes for delete to authenticated using(voter_id=(select auth.uid()));
create policy community_reports_insert on public.community_reports for insert to authenticated with check(reporter_id=(select auth.uid()));
create policy community_reports_read on public.community_reports for select to authenticated using(reporter_id=(select auth.uid()));

-- Public media is only written beneath its owner's UUID. No SVG/HTML uploads.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('post-images','post-images',true,3145728,array['image/png','image/jpeg','image/webp']);
create policy community_image_insert on storage.objects for insert to authenticated
  with check(bucket_id='post-images' and split_part(name,'/',1)=(select auth.uid())::text);
create policy community_image_delete on storage.objects for delete to authenticated
  using(bucket_id='post-images' and split_part(name,'/',1)=(select auth.uid())::text);
create policy community_image_owner_read on storage.objects for select to authenticated
  using(bucket_id='post-images' and split_part(name,'/',1)=(select auth.uid())::text);

-- Enforce image references even for direct Data API inserts.
create function app_private.check_community_images() returns trigger language plpgsql security definer set search_path='' as $$
declare path text;
begin
  foreach path in array new.image_paths loop
    if path not like new.author_id::text || '/' || new.id::text || '/%'
      or path !~ '\.(png|jpg|webp)$'
      or not exists(select 1 from storage.objects o where o.bucket_id='post-images' and o.name=path)
    then raise exception 'INVALID_IMAGE'; end if;
  end loop;
  return new;
end; $$;
revoke all on function app_private.check_community_images() from public,anon,authenticated;
create trigger check_community_images before insert on public.community_posts for each row execute function app_private.check_community_images();

create view public.community_post_summaries with(security_invoker=true) as
select p.*,
  (select count(*) from public.community_votes v where v.post_id=p.id) as upvotes,
  (select count(*) from public.community_answers a where a.post_id=p.id) as answer_count,
  pr.full_name as author_name
from public.community_posts p join public.profiles pr on pr.id=p.author_id;
create view public.community_answer_summaries with(security_invoker=true) as
select a.*,pr.full_name as author_name,
  (select count(*) from public.community_votes v where v.answer_id=a.id) as upvotes,
  exists(select 1 from public.mentor_profiles m where m.user_id=a.author_id and m.is_listed) as is_mentor
from public.community_answers a join public.profiles pr on pr.id=a.author_id;
grant select on public.community_post_summaries,public.community_answer_summaries to anon,authenticated;

create function public.accept_community_answer(p_post_id uuid,p_answer_id uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  perform 1 from public.community_posts where id=p_post_id and author_id=auth.uid() for update;
  if not found then raise exception 'NOT_ALLOWED'; end if;
  if p_answer_id is not null and not exists(select 1 from public.community_answers where id=p_answer_id and post_id=p_post_id)
    then raise exception 'INVALID_ANSWER'; end if;
  update public.community_posts set accepted_answer_id=p_answer_id where id=p_post_id;
end; $$;
revoke all on function public.accept_community_answer(uuid,uuid) from public,anon,authenticated;
grant execute on function public.accept_community_answer(uuid,uuid) to authenticated;

create function public.community_skill_key(p_skill text) returns text language sql immutable set search_path='' as $$
select case lower(btrim(p_skill))
when 'data structures' then 'dsa' when 'data structures and algorithms' then 'dsa' when 'algorithms' then 'dsa' when 'leetcode' then 'dsa'
when 'c++' then 'cpp' when 'react.js' then 'react' when 'reactjs' then 'react'
when 'node.js' then 'backend' when 'nodejs' then 'backend' when 'node' then 'backend' when 'sql' then 'databases' when 'postgresql' then 'databases' when 'database' then 'databases'
when 'ai/ml' then 'machine-learning' when 'machine learning' then 'machine-learning' when 'ml' then 'machine-learning'
when 'system design' then 'system-design' when 'career guidance' then 'career' when 'operating systems' then 'operating-systems' when 'computer networks' then 'computer-networks'
else lower(btrim(p_skill)) end;
$$;
revoke all on function public.community_skill_key(text) from public;
grant execute on function public.community_skill_key(text) to anon,authenticated;

create function public.recommend_post_mentors(p_post_id uuid)
returns table(mentor_id uuid,full_name text,headline text,matched_tags text[],accepted_answers bigint,answer_upvotes bigint,next_available timestamptz)
language sql stable security invoker set search_path='' as $$
with question as(select * from public.community_posts where id=p_post_id),
evidence as(
  select a.author_id,array_agg(distinct t.tag) as tags,count(distinct a.id) as accepted
  from public.community_posts p join public.community_answers a on a.id=p.accepted_answer_id
  cross join lateral unnest(p.tags) t(tag) group by a.author_id
), candidates as(
  select m.user_id,pr.full_name,m.headline,
    array(select distinct t from unnest(q.tags) t where
      t=any(array(select public.community_skill_key(s) from unnest(m.expertise) s))
      or t=any(coalesce(e.tags,'{}'))) as matches,
    (select count(*) from public.community_answers a join public.community_posts p on p.accepted_answer_id=a.id
      where a.author_id=m.user_id and p.tags && q.tags) as accepted,
    (select count(*) from public.community_votes v join public.community_answers a on a.id=v.answer_id
      join public.community_posts p on p.id=a.post_id where a.author_id=m.user_id and p.tags && q.tags) as votes,
    (select min(s.starts_at) from public.get_available_slots(m.user_id) s) as next_slot
  from question q cross join public.mentor_profiles m join public.profiles pr on pr.id=m.user_id
  left join evidence e on e.author_id=m.user_id
  where m.is_listed and m.user_id<>q.author_id and m.user_id is distinct from auth.uid()
)
select user_id,full_name,headline,matches,accepted,votes,next_slot from candidates where cardinality(matches)>0
order by (cardinality(matches)*100 + least(accepted,10)*3 + least(votes,20) + case when next_slot is not null then 10 else 0 end) desc,
next_slot nulls last,user_id limit 5;
$$;
revoke all on function public.recommend_post_mentors(uuid) from public;
grant execute on function public.recommend_post_mentors(uuid) to anon,authenticated;

alter table public.bookings add column source_post_id uuid references public.community_posts(id) on delete set null;
create index bookings_source_post on public.bookings(source_post_id) where source_post_id is not null;
create function public.book_post_intro(p_post_id uuid,p_slot_id uuid,p_request_key uuid) returns setof public.bookings
language plpgsql security definer set search_path='' as $$
declare b public.bookings;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists(select 1 from public.community_posts where id=p_post_id) then raise exception 'POST_UNAVAILABLE'; end if;
  select * into b from public.book_free_intro(p_slot_id,p_request_key);
  if b.source_post_id is not null and b.source_post_id<>p_post_id then raise exception 'REQUEST_KEY_REUSED'; end if;
  update public.bookings set source_post_id=p_post_id where id=b.id returning * into b;
  return next b;
end; $$;
revoke all on function public.book_post_intro(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.book_post_intro(uuid,uuid,uuid) to authenticated;

commit;
