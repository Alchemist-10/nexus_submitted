begin;
-- No public/recipient policies: preview artifacts are service-role-only.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('notification-previews','notification-previews',false,65536,array['text/html','text/plain'])
on conflict(id) do nothing;
commit;
