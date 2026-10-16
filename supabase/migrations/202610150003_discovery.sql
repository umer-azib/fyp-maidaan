begin;
create function public.distance_km(lat1 double precision,lng1 double precision,lat2 double precision,lng2 double precision)
returns double precision language sql immutable set search_path=public,pg_temp as $$
 select 6371 * 2 * asin(sqrt(least(1.0,power(sin(radians(lat2-lat1)/2),2)+cos(radians(lat1))*cos(radians(lat2))*power(sin(radians(lng2-lng1)/2),2))))
$$;
create function public.discover_venues(p_city text,p_area text default null,p_lat double precision default null,p_lng double precision default null,p_radius double precision default 20)
returns setof public.venues language sql stable security invoker set search_path=public,pg_temp as $$
 select v.* from public.venues v where v.published and v.city_id=p_city and (p_area is null or v.area_id=p_area)
 and (p_lat is null or public.distance_km(p_lat,p_lng,v.latitude,v.longitude)<=p_radius)
 order by case when p_lat is not null then public.distance_km(p_lat,p_lng,v.latitude,v.longitude) end nulls last,v.name,v.id
$$;
create function public.discover_games(p_city text,p_area text default null,p_lat double precision default null,p_lng double precision default null,p_radius double precision default 20)
returns setof public.games language sql stable security invoker set search_path=public,pg_temp as $$
 select g.* from public.games g where g.status='open' and g.starts_at>now() and g.city_id=p_city and (p_area is null or g.area_id=p_area)
 and (select count(*) from public.game_participants p where p.game_id=g.id)<g.max_players
 and (p_lat is null or public.distance_km(p_lat,p_lng,g.latitude,g.longitude)<=p_radius)
 order by g.starts_at,g.id
$$;
create function public.my_games() returns setof public.games language sql stable security invoker set search_path=public,pg_temp as $$
 select g.* from public.games g where g.host_id=auth.uid() or exists(select 1 from public.game_participants p where p.game_id=g.id and p.player_id=auth.uid())
 or exists(select 1 from public.join_requests r where r.game_id=g.id and r.player_id=auth.uid()) order by g.starts_at desc,g.id
$$;
revoke all on function public.discover_games(text,text,double precision,double precision,double precision),public.my_games() from public,anon;
grant execute on function public.discover_games(text,text,double precision,double precision,double precision),public.my_games() to authenticated;
grant execute on function public.discover_venues(text,text,double precision,double precision,double precision),public.distance_km(double precision,double precision,double precision,double precision) to anon,authenticated;
commit;
