-- Apply to a NEW Supabase project, or review against existing schemas first.
-- No drops, truncates or remote execution are performed by the application.
begin;
create extension if not exists btree_gist;

create table public.cities (
  id text primary key, name text not null unique, country text not null default 'PK' check (country = 'PK'),
  timezone text not null default 'Asia/Karachi', active boolean not null default true
);
create table public.areas (
  id text primary key, city_id text not null references public.cities, name text not null,
  active boolean not null default true, unique(city_id, name), unique(id, city_id)
);
create table public.sports (name text primary key check(name in ('Padel','Badminton','Football','Cricket')), active boolean not null default true);
insert into public.sports(name) values ('Padel'),('Badminton'),('Football'),('Cricket');
insert into public.cities(id,name) values ('lahore','Lahore');
insert into public.areas(id,city_id,name)
select 'lahore-' || slug, 'lahore', name from (values
 ('dha-1','DHA Phase 1'),('dha-2','DHA Phase 2'),('dha-3','DHA Phase 3'),('dha-4','DHA Phase 4'),
 ('dha-5','DHA Phase 5'),('dha-6','DHA Phase 6'),('dha-7','DHA Phase 7'),('dha-8','DHA Phase 8'),('dha-9','DHA Phase 9'),
 ('gulberg','Gulberg'),('johar-town','Johar Town'),('model-town','Model Town'),('bahria-town','Bahria Town'),
 ('wapda-town','Wapda Town'),('garden-town','Garden Town'),('valencia','Valencia'),('cantt','Cantt'),('lake-city','Lake City'),('other','Other Lahore areas')
) as locations(slug,name);

create table public.profiles (
 id uuid primary key references auth.users on delete cascade,
 name text not null default '' check(char_length(name) <= 80),
 username text unique check(username ~ '^[a-z0-9_]{3,30}$'),
 bio text not null default '' check(char_length(bio) <= 1000),
 city_id text not null default 'lahore' references public.cities,
 area_id text, avatar_path text check(char_length(avatar_path) <= 240),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 foreign key(area_id,city_id) references public.areas(id,city_id)
);
create table public.player_sports (
 player_id uuid not null references public.profiles on delete cascade, sport text not null references public.sports,
 skill text not null check(skill in ('All levels','Beginner','Intermediate','Advanced')),
 positions text[] not null default '{}', formats text[] not null default '{}',
 check(cardinality(positions)<=12 and cardinality(formats)<=12), primary key(player_id,sport)
);
create table public.player_availability (
 id uuid primary key default gen_random_uuid(), player_id uuid not null references public.profiles on delete cascade,
 day_of_week integer not null check(day_of_week between 0 and 6), starts_at time not null, ends_at time not null,
 check(ends_at>starts_at), unique(player_id,day_of_week,starts_at)
);
create table public.admin_memberships (user_id uuid primary key references public.profiles on delete cascade, created_at timestamptz not null default now());
create table public.venues (
 id uuid primary key default gen_random_uuid(), name text not null check(char_length(name) between 1 and 160),
 description text not null default '', address text not null, city_id text not null references public.cities, area_id text,
 latitude double precision not null check(latitude between -90 and 90), longitude double precision not null check(longitude between -180 and 180),
 phone text, facilities text[] not null default '{}', photos text[] not null default '{}',
 source text not null default 'onboarded' check(source in ('onboarded','places')),
 verified boolean not null default false, published boolean not null default false,
 foreign key(area_id,city_id) references public.areas(id,city_id), check(not verified or source='onboarded')
);
create index venues_location_idx on public.venues(city_id,area_id) where published;
create table public.venue_managers (
 venue_id uuid not null references public.venues on delete cascade, user_id uuid not null references public.profiles on delete cascade,
 primary key(venue_id,user_id)
);
create index venue_managers_user_idx on public.venue_managers(user_id);
create table public.courts (
 id uuid primary key default gen_random_uuid(), venue_id uuid not null references public.venues on delete cascade,
 name text not null, sport text not null references public.sports, active boolean not null default true, unique(venue_id,name)
);
create table public.court_hours (
 id uuid primary key default gen_random_uuid(), court_id uuid not null references public.courts on delete cascade,
 day_of_week integer not null check(day_of_week between 0 and 6), opens_at time not null, closes_at time not null,
 slot_minutes integer not null check(slot_minutes between 15 and 720), price_pkr numeric(12,2) check(price_pkr >= 0),
 check(closes_at>opens_at), unique(court_id,day_of_week,opens_at)
);
create table public.court_blocks (
 id uuid primary key default gen_random_uuid(), court_id uuid not null references public.courts on delete cascade,
 starts_at timestamptz not null, ends_at timestamptz not null, reason text not null,
 check(ends_at>starts_at)
);
create index court_blocks_court_time_idx on public.court_blocks(court_id,starts_at,ends_at);

-- Schema groundwork only. No booking/hold write grants, procedures or API in milestone 1.
-- The next milestone must coordinate holds, schedules, blocks and bookings under one court lock.
create table public.bookings (
 id uuid primary key default gen_random_uuid(), court_id uuid not null references public.courts,
 player_id uuid not null references public.profiles, starts_at timestamptz not null, ends_at timestamptz not null,
 status text not null check(status in ('pending','confirmed','completed','cancelled')),
 payment_method text not null default 'pay_at_venue' check(payment_method in ('pay_at_venue','manual_confirmation')),
 price_pkr numeric(12,2) check(price_pkr>=0), created_at timestamptz not null default now(),
 check(ends_at>starts_at),
 exclude using gist(court_id with =, tstzrange(starts_at,ends_at,'[)') with &&) where(status in ('pending','confirmed','completed'))
);
create table public.booking_holds (
 id uuid primary key default gen_random_uuid(), court_id uuid not null references public.courts,
 player_id uuid not null references public.profiles, starts_at timestamptz not null, ends_at timestamptz not null,
 expires_at timestamptz not null, check(ends_at>starts_at)
);
create table public.games (
 id uuid primary key default gen_random_uuid(), host_id uuid not null references public.profiles,
 sport text not null references public.sports, title text not null check(char_length(title) between 1 and 120),
 description text not null check(char_length(description) between 1 and 2000),
 city_id text not null references public.cities, area_id text, venue_id uuid references public.venues,
 venue text not null check(char_length(venue) between 1 and 160), location text not null check(char_length(location) between 1 and 200),
 latitude double precision not null check(latitude between -90 and 90), longitude double precision not null check(longitude between -180 and 180),
 starts_at timestamptz not null, duration integer not null check(duration between 15 and 720),
 max_players integer not null check(max_players between 2 and 100),
 skill text not null check(skill in ('All levels','Beginner','Intermediate','Advanced')),
 join_mode text not null check(join_mode in ('instant','request')), status text not null default 'open' check(status in ('open','cancelled','completed')),
 format text not null, booking_source text not null default 'external' check(booking_source='external'),
 created_at timestamptz not null default now(),
 foreign key(area_id,city_id) references public.areas(id,city_id),
 check((sport in ('Padel','Badminton') and ((format='1v1' and max_players=2) or (format='2v2' and max_players=4))) or
       (sport='Football' and ((format='5v5' and max_players=10) or (format='7v7' and max_players=14) or (format='11v11' and max_players=22))) or
       (sport='Cricket' and format='Custom'))
);
create index games_discover_idx on public.games(city_id,area_id,starts_at) where status='open';
create index games_host_idx on public.games(host_id,starts_at);
create table public.game_participants (
 game_id uuid not null references public.games on delete cascade, player_id uuid not null references public.profiles,
 joined_at timestamptz not null default now(), primary key(game_id,player_id)
);
create index game_participants_player_idx on public.game_participants(player_id,game_id);
create table public.join_requests (
 game_id uuid not null references public.games on delete cascade, player_id uuid not null references public.profiles,
 created_at timestamptz not null default now(), primary key(game_id,player_id)
);
create index join_requests_player_idx on public.join_requests(player_id,game_id);
create table public.audit_logs (
 id bigint generated always as identity primary key, actor_id uuid references public.profiles,
 action text not null, entity_id uuid, created_at timestamptz not null default now()
);

create function public.ensure_profile() returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 insert into public.profiles(id,name) select auth.uid(),left(coalesce(raw_user_meta_data->>'name',''),80) from auth.users where id=auth.uid() on conflict(id) do nothing;
end $$;
create function public.save_profile(p jsonb) returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 perform public.ensure_profile();
 if not exists(select 1 from public.cities where id=p->>'cityId' and active) or
 (p->>'areaId' is not null and not exists(select 1 from public.areas where id=p->>'areaId' and city_id=p->>'cityId' and active)) then
  raise exception 'Choose an active city and matching area' using errcode='22023'; end if;
 if p->>'avatarPath' is not null and (p->>'avatarPath' not like auth.uid()::text || '/%' or p->>'avatarPath' like '%..%') then
  raise exception 'Invalid photo path' using errcode='22023';
 end if;
 if char_length(trim(p->>'name')) not between 1 and 80 then raise exception 'Name is required' using errcode='22023'; end if;
 update public.profiles set name=trim(p->>'name'),username=p->>'username',bio=p->>'bio',city_id=p->>'cityId',
  area_id=p->>'areaId',avatar_path=p->>'avatarPath',updated_at=now() where id=auth.uid();
 delete from public.player_sports where player_id=auth.uid();
 insert into public.player_sports(player_id,sport,skill,positions,formats)
 select auth.uid(), s->>'sport',s->>'skill',array(select jsonb_array_elements_text(s->'positions')),array(select jsonb_array_elements_text(s->'formats'))
 from jsonb_array_elements(p->'sports') s;
end $$;

-- The only mutation path for games locks the parent row before membership/capacity checks.
create function public.create_game(p jsonb) returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare game_id uuid;
begin
 perform public.ensure_profile();
 if (p->>'startsAt')::timestamptz <= now() then raise exception 'Choose a future start time' using errcode='22023'; end if;
 if not exists(select 1 from public.cities where id=p->>'cityId' and active) or
 (p->>'areaId' is not null and not exists(select 1 from public.areas where id=p->>'areaId' and city_id=p->>'cityId' and active)) then raise exception 'Choose an active city and matching area' using errcode='22023'; end if;
 if not exists(select 1 from public.sports where name=p->>'sport' and active) then raise exception 'Sport is not active' using errcode='22023'; end if;
 insert into public.games(host_id,sport,title,description,city_id,area_id,venue_id,venue,location,latitude,longitude,starts_at,duration,max_players,skill,join_mode,format,booking_source)
 values(auth.uid(),p->>'sport',trim(p->>'title'),p->>'description',p->>'cityId',p->>'areaId',(p->>'venueId')::uuid,p->>'venue',p->>'location',
 (p->>'latitude')::double precision,(p->>'longitude')::double precision,(p->>'startsAt')::timestamptz,(p->>'duration')::integer,
 (p->>'maxPlayers')::integer,p->>'skill',p->>'joinMode',p->>'format',coalesce(p->>'bookingSource','external')) returning id into game_id;
 insert into public.game_participants(game_id,player_id) values(game_id,auth.uid());
 return game_id;
end $$;
create function public.game_action(p_id uuid,p_action text,p_player uuid default null,p_input jsonb default null)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare g public.games; n integer;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 select * into g from public.games where id=p_id for update;
 if not found then raise exception 'Game not found' using errcode='P0002'; end if;
 if p_action in ('approve','reject','cancel','edit') and g.host_id<>auth.uid() then raise exception 'Only the game host may manage it' using errcode='42501'; end if;
 if p_action='cancel' then
  if g.status='completed' then raise exception 'Game already completed' using errcode='P0001'; end if;
  update public.games set status='cancelled' where id=p_id; delete from public.join_requests where game_id=p_id;
 elsif p_action='leave' then
  if g.host_id=auth.uid() then raise exception 'Hosts must cancel their game' using errcode='P0001'; end if;
  if g.status='completed' then raise exception 'Completed participation is history' using errcode='P0001'; end if;
  delete from public.game_participants where game_id=p_id and player_id=auth.uid();
  delete from public.join_requests where game_id=p_id and player_id=auth.uid();
 else
  if g.status<>'open' or g.starts_at<=now() then raise exception 'Game is no longer open' using errcode='P0001'; end if;
  select count(*) into n from public.game_participants where game_id=p_id;
  if p_action='join' then
   if exists(select 1 from public.game_participants where game_id=p_id and player_id=auth.uid()) or exists(select 1 from public.join_requests where game_id=p_id and player_id=auth.uid()) then
    raise exception 'Already joined or requested' using errcode='23505'; end if;
   if n>=g.max_players then raise exception 'Game is full' using errcode='P0001'; end if;
   if g.join_mode='instant' then insert into public.game_participants(game_id,player_id) values(p_id,auth.uid());
   else insert into public.join_requests(game_id,player_id) values(p_id,auth.uid()); end if;
  elsif p_action='approve' then
   if n>=g.max_players then raise exception 'Game is full' using errcode='P0001'; end if;
   if not exists(select 1 from public.join_requests where game_id=p_id and player_id=p_player) then raise exception 'Request not found' using errcode='P0002'; end if;
   insert into public.game_participants(game_id,player_id) values(p_id,p_player);
   delete from public.join_requests where game_id=p_id and player_id=p_player;
  elsif p_action='reject' then delete from public.join_requests where game_id=p_id and player_id=p_player;
  elsif p_action='edit' then
   if not exists(select 1 from public.cities where id=p_input->>'cityId' and active) or
   (p_input->>'areaId' is not null and not exists(select 1 from public.areas where id=p_input->>'areaId' and city_id=p_input->>'cityId' and active)) then raise exception 'Choose an active city and matching area' using errcode='22023'; end if;
   if not exists(select 1 from public.sports where name=p_input->>'sport' and active) then raise exception 'Sport is not active' using errcode='22023'; end if;
   if (p_input->>'maxPlayers')::integer<n then raise exception 'Capacity below current membership' using errcode='P0001'; end if;
   if (p_input->>'startsAt')::timestamptz<=now() then raise exception 'Choose a future start time' using errcode='22023'; end if;
   update public.games set sport=p_input->>'sport',title=p_input->>'title',description=p_input->>'description',city_id=p_input->>'cityId',area_id=p_input->>'areaId',
    venue_id=(p_input->>'venueId')::uuid,venue=p_input->>'venue',location=p_input->>'location',latitude=(p_input->>'latitude')::double precision,longitude=(p_input->>'longitude')::double precision,
    starts_at=(p_input->>'startsAt')::timestamptz,duration=(p_input->>'duration')::integer,max_players=(p_input->>'maxPlayers')::integer,
    skill=p_input->>'skill',join_mode=p_input->>'joinMode',format=p_input->>'format' where id=p_id;
  else raise exception 'Unsupported action' using errcode='22023'; end if;
 end if;
 insert into public.audit_logs(actor_id,action,entity_id) values(auth.uid(),'game.' || p_action,p_id);
end $$;

-- RLS for direct Supabase REST access; the Express API uses the caller's JWT, not a service role.
alter table public.cities enable row level security;
alter table public.areas enable row level security;
alter table public.sports enable row level security;
alter table public.profiles enable row level security;
alter table public.player_sports enable row level security;
alter table public.player_availability enable row level security;
alter table public.admin_memberships enable row level security;
alter table public.venues enable row level security;
alter table public.venue_managers enable row level security;
alter table public.courts enable row level security;
alter table public.court_hours enable row level security;
alter table public.court_blocks enable row level security;
alter table public.bookings enable row level security;
alter table public.booking_holds enable row level security;
alter table public.games enable row level security;
alter table public.game_participants enable row level security;
alter table public.join_requests enable row level security;
alter table public.audit_logs enable row level security;

create policy cities_read on public.cities for select using(active);
create policy areas_read on public.areas for select using(active and exists(select 1 from public.cities where id=city_id));
create policy sports_read on public.sports for select using(active);
create policy profiles_read on public.profiles for select to authenticated using(true);
create policy player_sports_read on public.player_sports for select to authenticated using(true);
create policy availability_private on public.player_availability for select to authenticated using(player_id=auth.uid());
create policy admin_self_read on public.admin_memberships for select to authenticated using(user_id=auth.uid());
create policy managers_self_read on public.venue_managers for select to authenticated using(user_id=auth.uid());
create policy venues_read on public.venues for select using(published);
create policy courts_read on public.courts for select using(active and exists(select 1 from public.venues where id=venue_id and published));
create policy hours_read on public.court_hours for select using(exists(select 1 from public.courts c join public.venues v on v.id=c.venue_id where c.id=court_id and v.verified and v.source='onboarded' and v.published));
create policy games_read on public.games for select to authenticated using(true);
create policy participants_read on public.game_participants for select to authenticated using(true);
create policy requests_read on public.join_requests for select to authenticated using(player_id=auth.uid() or exists(select 1 from public.games where id=game_id and host_id=auth.uid()));
-- Block reasons, holds, audit logs, and booking customer data are not exposed in this milestone.

revoke all on public.cities,public.areas,public.sports,public.profiles,public.player_sports,public.player_availability,public.admin_memberships,
 public.venues,public.venue_managers,public.courts,public.court_hours,public.court_blocks,public.bookings,public.booking_holds,
 public.games,public.game_participants,public.join_requests,public.audit_logs from anon,authenticated;
grant select on public.cities,public.areas,public.sports,public.venues,public.courts,public.court_hours to anon,authenticated;
grant select on public.profiles,public.player_sports,public.player_availability,public.admin_memberships,public.venue_managers,public.games,public.game_participants,public.join_requests to authenticated;
revoke all on function public.ensure_profile(),public.save_profile(jsonb),public.create_game(jsonb),public.game_action(uuid,text,uuid,jsonb) from public,anon;
grant execute on function public.ensure_profile(),public.save_profile(jsonb),public.create_game(jsonb),public.game_action(uuid,text,uuid,jsonb) to authenticated;
commit;
