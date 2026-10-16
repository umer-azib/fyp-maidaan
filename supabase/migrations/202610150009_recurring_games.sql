begin;
create table public.game_series(id uuid primary key default gen_random_uuid(),host_id uuid not null references public.profiles,interval_weeks integer not null check(interval_weeks between 1 and 12),occurrences integer not null check(occurrences between 2 and 12),created_at timestamptz not null default now());
alter table public.games add column series_id uuid references public.game_series;
alter table public.games add column needs_replacement boolean not null default false;
alter table public.game_series enable row level security;
revoke all on public.game_series from public,anon,authenticated;
alter function public.create_game(jsonb) rename to create_game_base;
create function public.create_game(p jsonb) returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare result uuid;
begin
 result:=create_game_base(p);
 update public.games set visibility=coalesce(p->>'visibility','public') where id=result;
 return result;
end $$;
revoke execute on all functions in schema public from public,anon,authenticated;
commit;
