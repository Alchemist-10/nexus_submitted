-- Hosted-only setup; pg_cron/pg_net are not available in disposable PGlite tests.
-- Before scheduling, save the final endpoint and random 64-hex bearer token as
-- nexus_worker_url and nexus_worker_token in Supabase Vault. Never put values
-- in this file or the cron command. Apply only after verifying the deployment.
begin;
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
create extension if not exists pgcrypto with schema extensions;
-- Hosted pg_net has extension-owned PUBLIC queue grants that postgres cannot
-- revoke. Never enqueue a reusable secret: sign a two-minute, single-use nonce.

create or replace function app_private.dispatch_hosted_workers() returns bigint
language plpgsql security definer set search_path='' as $$
declare endpoint text; token text; request_id bigint; dispatch_nonce uuid:=gen_random_uuid(); issued text:=floor(extract(epoch from clock_timestamp()))::bigint::text; signature text;
begin
  select decrypted_secret into endpoint from vault.decrypted_secrets where name='nexus_worker_url';
  select decrypted_secret into token from vault.decrypted_secrets where name='nexus_worker_token';
  if endpoint is null or endpoint !~ '^https://[^/[:space:]]+/api/internal/workers$'
    or token is null or token !~ '^[a-fA-F0-9]{64}$' then
    raise exception 'HOSTED_WORKER_CONFIGURATION_REQUIRED';
  end if;
  signature:=encode(extensions.hmac('nexus-workers:'||issued||':'||dispatch_nonce::text,token,'sha256'),'hex');
  select net.http_post(url:=endpoint,headers:=jsonb_build_object('Content-Type','application/json',
    'X-Nexus-Timestamp',issued,'X-Nexus-Nonce',dispatch_nonce::text,'X-Nexus-Signature',signature),
    body:='{}'::jsonb,timeout_milliseconds:=65000) into request_id;
  return request_id;
end;
$$;
revoke all on function app_private.dispatch_hosted_workers() from public,anon,authenticated,service_role;
-- Named scheduling is idempotent. The command stores no credential values.
select cron.schedule('nexus-hosted-workers','* * * * *','select app_private.dispatch_hosted_workers();');
commit;
