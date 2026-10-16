begin;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('venue-media','venue-media',false,5242880,array['image/jpeg','image/png','image/webp','application/pdf']);
create table public.venue_media(id uuid primary key default gen_random_uuid(),venue_id uuid not null references public.venues,court_id uuid references public.courts,path text not null unique,kind text not null check(kind in ('photo','document')),uploaded_by uuid not null references public.profiles,created_at timestamptz not null default now());
alter table public.venue_media enable row level security;
revoke all on public.venue_media from public,anon,authenticated;
commit;
