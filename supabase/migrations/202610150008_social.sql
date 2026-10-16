begin;
create table public.player_connections(requester_id uuid references public.profiles,recipient_id uuid references public.profiles,status text not null default 'pending' check(status in ('pending','accepted')),created_at timestamptz default now(),primary key(requester_id,recipient_id),check(requester_id<>recipient_id));
create unique index connections_pair_unique on public.player_connections(least(requester_id,recipient_id),greatest(requester_id,recipient_id));
create table public.player_blocks(blocker_id uuid references public.profiles,blocked_id uuid references public.profiles,primary key(blocker_id,blocked_id),check(blocker_id<>blocked_id));
create table public.invitations(game_id uuid references public.games,inviter_id uuid references public.profiles,invitee_id uuid references public.profiles,status text not null default 'pending' check(status in ('pending','accepted','declined')),created_at timestamptz default now(),primary key(game_id,invitee_id),check(inviter_id<>invitee_id));
create table public.game_waitlist(game_id uuid references public.games,player_id uuid references public.profiles,position bigint generated always as identity,created_at timestamptz default now(),primary key(game_id,player_id));
create table public.game_attendance(game_id uuid,player_id uuid,verified_by uuid not null references public.profiles,verified_at timestamptz not null default now(),primary key(game_id,player_id),foreign key(game_id,player_id) references public.game_participants(game_id,player_id));
create table public.reviews(id uuid primary key default gen_random_uuid(),author_id uuid not null references public.profiles,player_id uuid references public.profiles,venue_id uuid references public.venues,game_id uuid references public.games,booking_id uuid references public.bookings,sportsmanship integer check(sportsmanship between 1 and 5),reliability integer check(reliability between 1 and 5),teamwork integer check(teamwork between 1 and 5),quality integer check(quality between 1 and 5),body text not null check(length(body)<=2000),status text not null default 'published' check(status in ('published','hidden')),created_at timestamptz not null default now(),check((player_id is not null)<>(venue_id is not null)),check(player_id is null or player_id<>author_id));
create unique index player_review_unique on public.reviews(author_id,player_id,game_id) where player_id is not null;
create unique index venue_booking_review_unique on public.reviews(author_id,venue_id,booking_id) where booking_id is not null;
create unique index venue_game_review_unique on public.reviews(author_id,venue_id,game_id) where game_id is not null;
create table public.reports(id uuid primary key default gen_random_uuid(),reporter_id uuid not null references public.profiles,player_id uuid references public.profiles,review_id uuid references public.reviews,game_id uuid references public.games,reason text not null check(length(reason) between 1 and 2000),status text not null default 'open' check(status in ('open','resolved','dismissed')),created_at timestamptz not null default now(),check(num_nonnulls(player_id,review_id,game_id)=1));
create function public.blocked(p_a uuid,p_b uuid) returns boolean language sql stable security definer set search_path=public,pg_temp as $$select exists(select 1 from player_blocks where (blocker_id=p_a and blocked_id=p_b) or (blocker_id=p_b and blocked_id=p_a))$$;
alter function public.game_action(uuid,text,uuid,jsonb) rename to game_action_base;
create function public.game_action(p_id uuid,p_action text,p_player uuid default null,p_input jsonb default null) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare g games; next_player uuid;
begin
 perform ensure_profile();select * into g from games where id=p_id for update;
 if not found then raise exception 'Game not found' using errcode='P0002'; end if;
 if p_action in ('join','waitlist') and blocked(auth.uid(),g.host_id) then raise exception 'Interaction is blocked' using errcode='42501'; end if;
 if p_action in ('join','waitlist') and g.visibility='private' and g.host_id<>auth.uid() and not exists(select 1 from invitations where game_id=p_id and invitee_id=auth.uid() and status in ('pending','accepted')) then raise exception 'Invitation required' using errcode='42501'; end if;
 if p_action='waitlist' then
  if g.status<>'open' or g.starts_at<=now() or (select count(*) from game_participants where game_id=p_id)<g.max_players then raise exception 'Waitlists are for full upcoming games' using errcode='P0001'; end if;
  if exists(select 1 from game_participants where game_id=p_id and player_id=auth.uid()) or exists(select 1 from join_requests where game_id=p_id and player_id=auth.uid()) then raise exception 'Already participating or requested' using errcode='P0001'; end if;
  insert into game_waitlist(game_id,player_id) values(p_id,auth.uid());
 elsif p_action='leave_waitlist' then delete from game_waitlist where game_id=p_id and player_id=auth.uid();
 elsif p_action='complete' then
  if g.host_id<>auth.uid() or g.status<>'open' or g.starts_at+make_interval(mins=>g.duration)>now() then raise exception 'Only the host may complete a finished game' using errcode='42501'; end if;
  update games set status='completed' where id=p_id;
 else
  if p_action='join' and exists(select 1 from game_waitlist where game_id=p_id and player_id=auth.uid()) then raise exception 'Already waitlisted' using errcode='P0001'; end if;
  if p_action='approve' and blocked(p_player,g.host_id) then raise exception 'Interaction is blocked' using errcode='42501'; end if;
  perform game_action_base(p_id,p_action,p_player,p_input);
  if p_action='edit' and p_input ? 'visibility' then update games set visibility=p_input->>'visibility' where id=p_id;end if;
  update games set needs_replacement=false where id=p_id and (select count(*) from game_participants where game_id=p_id)>=max_players;
  if p_action='leave' and g.status='open' and g.starts_at>now() and (select count(*) from game_participants where game_id=p_id)<g.max_players then
   select w.player_id into next_player from game_waitlist w join app_private.accounts a on a.id=w.player_id where w.game_id=p_id and a.status='active' and not blocked(w.player_id,g.host_id) order by w.position limit 1;
   if next_player is not null then
    delete from game_waitlist where game_id=p_id and player_id=next_player;
    if g.join_mode='instant' then insert into game_participants(game_id,player_id) values(p_id,next_player);else insert into join_requests(game_id,player_id) values(p_id,next_player) on conflict do nothing;end if;
   end if;
  end if;
  if p_action='cancel' then delete from game_waitlist where game_id=p_id;end if;
 end if;
end $$;
create function public.verify_attendance(p_game uuid,p_player uuid) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare v_id uuid;
begin
 select c.venue_id into v_id from games g join bookings b on b.id=g.booking_id join courts c on c.id=b.court_id where g.id=p_game and g.status='completed' and b.status='completed' and b.ends_at<=now();
 if v_id is null then raise exception 'A completed managed booking is required' using errcode='P0001';end if;
 perform require_manager(v_id);
 insert into game_attendance(game_id,player_id,verified_by) values(p_game,p_player,auth.uid()) on conflict do nothing;
 insert into audit_logs(actor_id,action,entity_id) values(auth.uid(),'attendance.verify',p_game);
end $$;
create function public.submit_review(p jsonb) returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare target_player uuid:=(p->>'playerId')::uuid;target_venue uuid:=(p->>'venueId')::uuid;g_id uuid:=(p->>'gameId')::uuid;b_id uuid:=(p->>'bookingId')::uuid;result uuid;
begin
 perform ensure_profile();
 if (target_player is null)=(target_venue is null) then raise exception 'Choose one review target' using errcode='22023';end if;
 if target_player is not null then
  if target_player=auth.uid() or blocked(auth.uid(),target_player) then raise exception 'Review not permitted' using errcode='42501';end if;
  if not exists(select 1 from game_attendance a join game_attendance b on b.game_id=a.game_id join games g on g.id=a.game_id where a.game_id=g_id and a.player_id=auth.uid() and b.player_id=target_player and g.status='completed') then raise exception 'Both players need verified attendance in this completed game' using errcode='42501';end if;
  if p->>'sportsmanship' is null or p->>'reliability' is null or p->>'teamwork' is null then raise exception 'All player ratings are required' using errcode='22023';end if;
 else
  if g_id is not null and b_id is null then select booking_id into b_id from games where id=g_id and venue_id=target_venue;end if;
  if exists(select 1 from venue_managers where venue_id=target_venue and user_id=auth.uid()) then raise exception 'Managers cannot review their venue' using errcode='42501';end if;
  if not (exists(select 1 from bookings b join courts c on c.id=b.court_id where b.id=b_id and c.venue_id=target_venue and b.player_id=auth.uid() and b.status='completed' and not b.offline)
   or exists(select 1 from game_attendance a join games g on g.id=a.game_id where a.game_id=g_id and a.player_id=auth.uid() and g.venue_id=target_venue and g.status='completed')) then raise exception 'Completed booking or verified attendance required' using errcode='42501';end if;
  if p->>'quality' is null then raise exception 'Venue rating required' using errcode='22023';end if;
 end if;
 insert into reviews(author_id,player_id,venue_id,game_id,booking_id,sportsmanship,reliability,teamwork,quality,body) values(auth.uid(),target_player,target_venue,case when target_player is not null or b_id is null then g_id else null end,case when target_player is null then b_id else null end,(p->>'sportsmanship')::int,(p->>'reliability')::int,(p->>'teamwork')::int,(p->>'quality')::int,p->>'body') returning id into result;
 return result;
end $$;
create or replace function public.discover_games(p_city text,p_area text default null,p_lat double precision default null,p_lng double precision default null,p_radius double precision default 20) returns setof public.games language sql stable security invoker set search_path=public,pg_temp as $$
 select g.* from games g where g.status='open' and g.starts_at>now() and g.city_id=p_city and (p_area is null or g.area_id=p_area)
 and (p_lat is null or public.distance_km(p_lat,p_lng,g.latitude,g.longitude)<=p_radius) order by g.starts_at,g.id
$$;
-- Protect all social records behind the same Express identity boundary.
do $$declare t text;begin foreach t in array array['player_connections','player_blocks','invitations','game_waitlist','game_attendance','reviews','reports'] loop execute format('alter table public.%I enable row level security',t);execute format('revoke all on public.%I from public,anon,authenticated',t);end loop;end $$;
revoke execute on all functions in schema public from public,anon,authenticated;
commit;
