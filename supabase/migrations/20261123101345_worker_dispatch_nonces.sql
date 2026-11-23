begin;
create table app_private.worker_dispatch_nonces(nonce uuid primary key,created_at timestamptz not null default clock_timestamp());
create index worker_dispatch_nonce_age on app_private.worker_dispatch_nonces(created_at);
alter table app_private.worker_dispatch_nonces enable row level security;
revoke all on app_private.worker_dispatch_nonces from public,anon,authenticated,service_role;
create function public.claim_worker_dispatch(p_nonce uuid,p_timestamp bigint) returns boolean
language plpgsql security definer set search_path='' as $$
declare inserted integer;
begin
  if p_nonce is null or p_timestamp is null or abs(extract(epoch from clock_timestamp())-p_timestamp)>120 then return false; end if;
  delete from app_private.worker_dispatch_nonces where created_at<clock_timestamp()-interval '5 minutes';
  insert into app_private.worker_dispatch_nonces(nonce) values(p_nonce) on conflict do nothing;
  get diagnostics inserted=row_count;
  return inserted=1;
end;
$$;
revoke all on function public.claim_worker_dispatch(uuid,bigint) from public,anon,authenticated;
grant execute on function public.claim_worker_dispatch(uuid,bigint) to service_role;
commit;
