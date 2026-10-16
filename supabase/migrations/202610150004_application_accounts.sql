-- REVIEW BEFORE DEPLOYMENT. Apply after 001-003; never run automatically.
begin;
create schema app_private;
revoke all on schema app_private from public,anon,authenticated;
create table app_private.accounts (
 id uuid primary key default gen_random_uuid(), email text not null unique check(email=lower(email)),
 username text not null unique check(username ~ '^[a-z0-9_]{3,30}$'), password_hash text,
 status text not null default 'active' check(status in ('active','suspended')),
 email_verified boolean not null default false, is_development_fixture boolean not null default false, phone text, created_at timestamptz not null default now()
);
-- Existing identities keep their UUID and data; they cannot log in with a legacy Auth password.
insert into app_private.accounts(id,email,username)
 select p.id,coalesce(lower(u.email),p.id::text||'@legacy.invalid'),coalesce(p.username,'legacy_'||substr(replace(p.id::text,'-',''),1,23))
 from public.profiles p left join auth.users u on u.id=p.id;
alter table public.profiles drop constraint profiles_id_fkey;
alter table public.profiles add foreign key(id) references app_private.accounts(id);
create table app_private.sessions (
 token_hash text primary key check(length(token_hash)=64), account_id uuid not null references app_private.accounts on delete cascade,
 client text not null check(client in ('web','mobile')), expires_at timestamptz not null,
 absolute_expires_at timestamptz not null, created_at timestamptz not null default now()
);
create index sessions_account_idx on app_private.sessions(account_id);
create index sessions_expiry_idx on app_private.sessions(expires_at);
alter table public.profiles add column date_of_birth date;
alter table public.profiles add column preferred_areas text[] not null default '{}';
create or replace function public.ensure_profile() returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if auth.uid() is null or not exists(select 1 from app_private.accounts where id=auth.uid() and status='active') then
 raise exception 'Active application account required' using errcode='42501'; end if;
 if not exists(select 1 from public.profiles where id=auth.uid()) then raise exception 'Profile not found' using errcode='P0002'; end if;
end $$;
-- Express is the sole identity/permission boundary. No application session is a Supabase JWT.
revoke all on all tables in schema public from anon,authenticated;
revoke execute on all functions in schema public from public,anon,authenticated;
revoke all on all tables in schema app_private from public,anon,authenticated;
-- Uploads now pass through Express, which uses the private Storage server key.
drop policy if exists avatars_read on storage.objects;
drop policy if exists avatars_insert on storage.objects;
drop policy if exists avatars_update on storage.objects;
drop policy if exists avatars_delete on storage.objects;
commit;
