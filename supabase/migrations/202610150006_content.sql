begin;
create table public.announcements (
 id uuid primary key default gen_random_uuid(),title text not null check(length(title) between 1 and 120),body text not null check(length(body)<=3000),
 image_url text,cta_label text,cta_link text,display text not null check(display in ('banner','popup','bottom-sheet')),
 platform text not null default 'all' check(platform in ('all','web','mobile')),audience text not null default 'player' check(audience in ('player','owner','all')),
 city_id text references public.cities,page text not null default 'discover',active boolean not null default false,
 starts_at timestamptz not null default now(),ends_at timestamptz,priority integer not null default 0,
 frequency text not null default 'session' check(frequency in ('always','session','once')),dismissible boolean not null default true,
 check(ends_at is null or ends_at>starts_at),updated_at timestamptz not null default now()
);
create index announcements_active_idx on public.announcements(active,starts_at,ends_at);
create table public.announcement_events (
 id bigint generated always as identity primary key,announcement_id uuid not null references public.announcements on delete cascade,
 player_id uuid not null references public.profiles,event text not null check(event in ('impression','click','dismiss')),
 created_at timestamptz not null default now()
);
create index announcement_events_player_idx on public.announcement_events(player_id,announcement_id,event);
create table public.feature_flags (key text primary key check(key ~ '^[a-z_]{3,60}$'),enabled boolean not null default false,description text not null default '');
alter table public.announcements enable row level security;
alter table public.announcement_events enable row level security;
alter table public.feature_flags enable row level security;
revoke all on public.announcements,public.announcement_events,public.feature_flags from public,anon,authenticated;
commit;
