-- Local development accounts only. Run through `supabase db reset` on the local stack.
-- Password for both accounts: Nexus-local-demo-2026!
create extension if not exists pgcrypto with schema extensions;
insert into auth.users (instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new)
values
('00000000-0000-0000-0000-000000000000', '10000000-0000-4000-8000-000000000001',
 'authenticated', 'authenticated', 'mentor@nexus.test',
 extensions.crypt('Nexus-local-demo-2026!', extensions.gen_salt('bf')), now(),
 '{"provider":"email","providers":["email"]}', '{"full_name":"Aarav Mehta"}', now(), now(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '20000000-0000-4000-8000-000000000002',
 'authenticated', 'authenticated', 'learner@nexus.test',
 extensions.crypt('Nexus-local-demo-2026!', extensions.gen_salt('bf')), now(),
 '{"provider":"email","providers":["email"]}', '{"full_name":"Riya Sharma"}', now(), now(), '', '', '', '')
on conflict (id) do nothing;

insert into auth.identities (id, user_id, provider_id, identity_data, provider, created_at, updated_at)
select id, id, id::text, jsonb_build_object('sub', id::text, 'email', email, 'email_verified', true), 'email', now(), now()
from auth.users where email in ('mentor@nexus.test', 'learner@nexus.test')
on conflict (provider_id, provider) do nothing;

insert into public.mentor_profiles (user_id, headline, bio, expertise)
values ('10000000-0000-4000-8000-000000000001', 'Build your first dependable backend',
 'Work through backend design, PostgreSQL, and project interview preparation with practical examples.', array['Backend', 'PostgreSQL', 'Interviews']);

insert into public.availability_slots (mentor_id, starts_at, ends_at)
select '10000000-0000-4000-8000-000000000001',
 date_trunc('day', now()) + interval '2 days 10 hours' + (n * interval '1 hour'),
 date_trunc('day', now()) + interval '2 days 10 hours 30 minutes' + (n * interval '1 hour')
from generate_series(0, 2) n;
