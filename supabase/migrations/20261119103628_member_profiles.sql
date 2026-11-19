begin;
alter table public.profiles add column bio text not null default '' check(char_length(bio)<=500);
alter table public.profiles add column avatar_variant integer not null default floor(random()*24)::integer check(avatar_variant between 0 and 23);
alter table public.profiles add column avatar_path text;

create function public.update_public_profile(p_full_name text,p_username text,p_bio text,p_avatar_variant integer,p_avatar_path text)
returns void language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();
begin
  if actor is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_full_name is null or char_length(btrim(p_full_name)) not between 2 and 80
    or p_username is null or lower(btrim(p_username)) !~ '^[a-z0-9_]{3,40}$'
    or p_bio is null or char_length(p_bio)>500 or p_avatar_variant is null or p_avatar_variant not between 0 and 23
    then raise exception 'INVALID_PROFILE'; end if;
  if p_avatar_path is not null and (
    p_avatar_path not like actor::text||'/profile/%'
    or p_avatar_path !~ '\.(png|jpg|webp)$'
    or not exists(select 1 from storage.objects o where o.bucket_id='post-images' and o.name=p_avatar_path)
  ) then raise exception 'INVALID_AVATAR'; end if;
  update public.profiles set full_name=btrim(p_full_name),username=lower(btrim(p_username)),bio=btrim(p_bio),avatar_variant=p_avatar_variant,avatar_path=p_avatar_path where id=actor;
  if not found then raise exception 'NOT_ALLOWED'; end if;
exception when unique_violation then raise exception 'USERNAME_TAKEN';
end; $$;
revoke all on function public.update_public_profile(text,text,text,integer,text) from public,anon,authenticated;
grant execute on function public.update_public_profile(text,text,text,integer,text) to authenticated;

create or replace view public.community_post_summaries with(security_invoker=true) as
select p.*,
 (select count(*) from public.community_votes v where v.post_id=p.id) as upvotes,
 (select count(*) from public.community_answers a where a.post_id=p.id) as answer_count,
 pr.full_name as author_name,pr.username as author_username,pr.avatar_variant as author_avatar_variant,pr.avatar_path as author_avatar_path
from public.community_posts p join public.profiles pr on pr.id=p.author_id;
create or replace view public.community_answer_summaries with(security_invoker=true) as
select a.*,pr.full_name as author_name,
 (select count(*) from public.community_votes v where v.answer_id=a.id) as upvotes,
 exists(select 1 from public.mentor_profiles m where m.user_id=a.author_id and m.is_listed) as is_mentor,
 pr.username as author_username,pr.avatar_variant as author_avatar_variant,pr.avatar_path as author_avatar_path
from public.community_answers a join public.profiles pr on pr.id=a.author_id;
create view public.member_activity_counts with(security_invoker=true) as
select pr.id as profile_id,
 (select count(*) from public.community_posts p where p.author_id=pr.id) as post_count,
 (select count(*) from public.community_answers a where a.author_id=pr.id) as answer_count,
 (select count(*) from public.community_answers a join public.community_posts p on p.accepted_answer_id=a.id where a.author_id=pr.id and p.author_id<>pr.id) as helpful_answer_count
from public.profiles pr;
grant select on public.member_activity_counts to anon,authenticated;
commit;
