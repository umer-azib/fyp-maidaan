begin;
alter table public.venues add column approval_status text not null default 'pending' check(approval_status in ('pending','approved','rejected','suspended'));
alter table public.venues add column owner_id uuid references public.profiles;
alter table public.venues add column whatsapp text;
alter table public.venues add column rules text not null default '';
alter table public.venues add column cancellation_policy text not null default '';
alter table public.venues add column confirmation_mode text not null default 'instant' check(confirmation_mode in ('instant','manual'));
-- Existing verified listings remain visible, but approval must be explicitly reviewed before bookings.
create table app_private.venue_applications (
 venue_id uuid primary key references public.venues, applicant_id uuid not null references public.profiles,
 business_name text not null, owner_name text not null, document_paths text[] not null default '{}',
 decision_note text, submitted_at timestamptz not null default now()
);
alter table public.courts add column formats text[] not null default '{}';
alter table public.courts add column photos text[] not null default '{}';
alter table public.court_hours add constraint hours_no_overlap exclude using gist
 (court_id with =,day_of_week with =,int4range(extract(epoch from opens_at)::int,extract(epoch from closes_at)::int,'[)') with &&);
alter table public.bookings drop constraint bookings_status_check;
alter table public.bookings add constraint bookings_status_check check(status in ('pending','confirmed','completed','cancelled','expired'));
alter table public.bookings add column offline boolean not null default false;
alter table public.bookings add column customer_name text;
alter table public.bookings add column updated_at timestamptz not null default now();
alter table public.bookings add column payment_status text not null default 'unpaid' check(payment_status in ('unpaid','paid_at_venue'));
alter table public.bookings add column paid_pkr numeric(12,2) not null default 0 check(paid_pkr>=0);
create index bookings_player_time_idx on public.bookings(player_id,starts_at desc);
create index bookings_court_status_idx on public.bookings(court_id,status,starts_at);
alter table public.games drop constraint games_booking_source_check;
alter table public.games add constraint games_booking_source_check check(booking_source in ('external','booking'));
alter table public.games add column booking_id uuid unique references public.bookings;
alter table public.games add column visibility text not null default 'public' check(visibility in ('public','private'));
alter table public.games add constraint game_booking_link check((booking_source='booking')=(booking_id is not null));

create function public.require_manager(p_venue uuid) returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 perform ensure_profile();
 if not exists(select 1 from venue_managers where venue_id=p_venue and user_id=auth.uid()) then raise exception 'Venue manager required' using errcode='42501'; end if;
end $$;
create function public.require_admin() returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 perform ensure_profile();
 if not exists(select 1 from admin_memberships where user_id=auth.uid()) then raise exception 'Administrator required' using errcode='42501'; end if;
end $$;

create function public.court_slots(p_court uuid,p_date date)
returns table(starts_at timestamptz,ends_at timestamptz,price_pkr numeric,available boolean)
language sql stable security definer set search_path=public,pg_temp as $$
 select t.start_at,t.start_at+make_interval(mins=>h.slot_minutes),h.price_pkr,
 t.start_at>now() and not exists(select 1 from bookings b where b.court_id=c.id and b.status in ('pending','confirmed','completed') and tstzrange(b.starts_at,b.ends_at,'[)') && tstzrange(t.start_at,t.start_at+make_interval(mins=>h.slot_minutes),'[)'))
 and not exists(select 1 from court_blocks b where b.court_id=c.id and tstzrange(b.starts_at,b.ends_at,'[)') && tstzrange(t.start_at,t.start_at+make_interval(mins=>h.slot_minutes),'[)'))
 from courts c join venues v on v.id=c.venue_id join court_hours h on h.court_id=c.id
 cross join lateral generate_series((p_date+h.opens_at) at time zone 'Asia/Karachi',((p_date+h.closes_at) at time zone 'Asia/Karachi')-make_interval(mins=>h.slot_minutes),make_interval(mins=>h.slot_minutes)) t(start_at)
 where exists(select 1 from cities where id=v.city_id and active) and (v.area_id is null or exists(select 1 from areas where id=v.area_id and active)) and exists(select 1 from sports where name=c.sport and active) and c.id=p_court and c.active and v.published and v.verified and v.approval_status='approved' and v.source='onboarded'
 and h.day_of_week=extract(dow from p_date)::int and h.price_pkr is not null
 and p_date between (now() at time zone 'Asia/Karachi')::date and (now() at time zone 'Asia/Karachi')::date+90
 order by t.start_at
$$;
create function public.reserve_court(p_court uuid,p_start timestamptz,p_method text default 'pay_at_venue',p_offline boolean default false,p_customer text default null)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare c courts; v venues; s record; result uuid;
begin
 perform ensure_profile();
 select v1.* into v from venues v1 join courts c1 on c1.venue_id=v1.id where c1.id=p_court for share of v1;
 select * into c from courts where id=p_court for update;
 if not found then raise exception 'Court not found' using errcode='P0002'; end if;
 if p_offline then perform require_manager(c.venue_id); end if;
 if p_method not in ('pay_at_venue','manual_confirmation') then raise exception 'Invalid payment method' using errcode='22023'; end if;
 select * into s from court_slots(p_court,(p_start at time zone 'Asia/Karachi')::date) where starts_at=p_start and available;
 if not found then raise exception 'Slot is unavailable. Refresh availability.' using errcode='P0001'; end if;
 insert into bookings(court_id,player_id,starts_at,ends_at,status,payment_method,price_pkr,offline,customer_name)
 values(p_court,auth.uid(),s.starts_at,s.ends_at,case when v.confirmation_mode='manual' or p_method='manual_confirmation' then 'pending' else 'confirmed' end,p_method,s.price_pkr,p_offline,p_customer) returning id into result;
 insert into audit_logs(actor_id,action,entity_id) values(auth.uid(),'booking.create',result);
 return result;
end $$;
create function public.booking_action(p_id uuid,p_action text,p_paid numeric default null) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare b bookings; v venues; manager boolean;
begin
 perform ensure_profile();
 select v1.* into v from venues v1 join courts c on c.venue_id=v1.id join bookings b1 on b1.court_id=c.id where b1.id=p_id for share of v1;
 perform 1 from courts c join bookings b1 on b1.court_id=c.id where b1.id=p_id for update of c;
 select * into b from bookings where id=p_id for update;
 if not found then raise exception 'Booking not found' using errcode='P0002'; end if;
 manager:=exists(select 1 from venue_managers where venue_id=v.id and user_id=auth.uid());
 if p_action='cancel' then
  if not manager and b.player_id<>auth.uid() then raise exception 'Booking permission required' using errcode='42501'; end if;
  if b.status not in ('pending','confirmed') or b.starts_at<=now() then raise exception 'Booking cannot be cancelled' using errcode='P0001'; end if;
  update bookings set status='cancelled',updated_at=now() where id=p_id;
  update games set status='cancelled' where booking_id=p_id;
 elsif manager and p_action='confirm' then
  if b.status<>'pending' or v.approval_status<>'approved' or not v.published then raise exception 'Booking cannot be confirmed' using errcode='P0001'; end if;
  update bookings set status='confirmed',updated_at=now() where id=p_id;
 elsif manager and p_action='complete' then
  if b.status<>'confirmed' or b.ends_at>now() then raise exception 'Booking has not finished' using errcode='P0001'; end if;
  update bookings set status='completed',updated_at=now() where id=p_id;
  update games set status='completed' where booking_id=p_id and status='open';
 elsif manager and p_action='record_payment' then
  if b.status not in ('confirmed','completed') or p_paid is null or p_paid<>b.price_pkr then raise exception 'Record the actual full court payment' using errcode='22023'; end if;
  update bookings set paid_pkr=p_paid,payment_status='paid_at_venue',updated_at=now() where id=p_id;
 else raise exception 'Booking permission required' using errcode='42501'; end if;
 insert into audit_logs(actor_id,action,entity_id) values(auth.uid(),'booking.'||p_action,p_id);
end $$;

create function public.replace_court_hours(p_court uuid,p_hours jsonb) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare c courts; item jsonb;
begin
 select * into c from courts where id=p_court;
 if not found then raise exception 'Court not found' using errcode='P0002'; end if;
 perform require_manager(c.venue_id);
 perform 1 from venues where id=c.venue_id for share;
 perform 1 from courts where id=p_court for update;
 delete from court_hours where court_id=p_court;
 for item in select * from jsonb_array_elements(p_hours) loop
 insert into court_hours(court_id,day_of_week,opens_at,closes_at,slot_minutes,price_pkr)
 values(p_court,(item->>'dayOfWeek')::int,(item->>'opensAt')::time,(item->>'closesAt')::time,(item->>'slotMinutes')::int,(item->>'pricePkr')::numeric);
 end loop;
 if exists(select 1 from bookings b where b.court_id=p_court and b.status in ('pending','confirmed') and b.ends_at>now()
 and not exists(select 1 from court_hours h where h.court_id=p_court and h.day_of_week=extract(dow from b.starts_at at time zone 'Asia/Karachi')::int
 and (b.starts_at at time zone 'Asia/Karachi')::date=(b.ends_at at time zone 'Asia/Karachi')::date
 and (b.starts_at at time zone 'Asia/Karachi')::time>=h.opens_at and (b.ends_at at time zone 'Asia/Karachi')::time<=h.closes_at))
 then raise exception 'Schedule conflicts with existing reservations. Cancel/reschedule them explicitly first.' using errcode='P0001'; end if;
 insert into audit_logs(actor_id,action,entity_id) values(auth.uid(),'court.schedule',p_court);
end $$;
create function public.block_court(p_court uuid,p_start timestamptz,p_end timestamptz,p_reason text) returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_id uuid; result uuid;
begin
 select venue_id into v_id from courts where id=p_court;
 perform require_manager(v_id);
 perform 1 from venues where id=v_id for share;
 perform 1 from courts where id=p_court for update;
 if p_end<=p_start then raise exception 'End must follow start' using errcode='22023'; end if;
 if exists(select 1 from bookings where court_id=p_court and status in ('pending','confirmed','completed') and tstzrange(starts_at,ends_at,'[)') && tstzrange(p_start,p_end,'[)')) then raise exception 'Closure conflicts with a reservation' using errcode='P0001'; end if;
 insert into court_blocks(court_id,starts_at,ends_at,reason) values(p_court,p_start,p_end,p_reason) returning id into result;
 insert into audit_logs(actor_id,action,entity_id) values(auth.uid(),'court.block',result);
 return result;
end $$;

create function public.create_booking_game(p_booking uuid,p jsonb) returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare b bookings; c courts; v venues; result uuid;
begin
 perform ensure_profile();
 select * into b from bookings where id=p_booking for update;
 if not found or b.player_id<>auth.uid() or b.status<>'confirmed' or b.offline or b.starts_at<=now() then raise exception 'Your upcoming confirmed booking is required' using errcode='42501'; end if;
 select * into c from courts where id=b.court_id;
 select * into v from venues where id=c.venue_id;
 if cardinality(c.formats)>0 and not (p->>'format'=any(c.formats)) then raise exception 'Court does not support this format' using errcode='22023';end if;
 if v.approval_status<>'approved' then raise exception 'Venue is not approved' using errcode='P0001'; end if;
 result:=create_game(p || jsonb_build_object('sport',c.sport,'cityId',v.city_id,'areaId',v.area_id,'venueId',v.id,'venue',v.name||' / '||c.name,'location',v.address,'latitude',v.latitude,'longitude',v.longitude,'startsAt',b.starts_at,'duration',extract(epoch from b.ends_at-b.starts_at)::int/60,'bookingSource','external'));
 update games set booking_source='booking',booking_id=p_booking,visibility=coalesce(p->>'visibility','public') where id=result;
 return result;
end $$;
create function public.protect_booking_game() returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
 if old.booking_id is not null and (new.starts_at,new.duration,new.sport,new.venue_id,new.venue,new.location,new.latitude,new.longitude,new.booking_id,new.booking_source)
 is distinct from (old.starts_at,old.duration,old.sport,old.venue_id,old.venue,old.location,old.latitude,old.longitude,old.booking_id,old.booking_source) then
 raise exception 'Game editing cannot change the court reservation' using errcode='42501'; end if;
 return new;
end $$;
create trigger booking_game_immutable before update on games for each row execute function protect_booking_game();
create function public.reschedule_booking(p_booking uuid,p_start timestamptz) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare b bookings; v_id uuid; s record;
begin
 select c.venue_id into v_id from bookings b1 join courts c on c.id=b1.court_id where b1.id=p_booking;
 perform require_manager(v_id);
 perform 1 from venues where id=v_id for share;
 perform 1 from courts c join bookings b1 on b1.court_id=c.id where b1.id=p_booking for update of c;
 select * into b from bookings where id=p_booking for update;
 if b.status not in ('confirmed','pending') or b.starts_at<=now() then raise exception 'Only upcoming reservations can be rescheduled' using errcode='P0001'; end if;
 if b.starts_at=p_start then return; end if;
 select * into s from court_slots(b.court_id,(p_start at time zone 'Asia/Karachi')::date) where starts_at=p_start and available;
 if not found then raise exception 'New slot is unavailable' using errcode='P0001'; end if;
 if b.payment_status<>'unpaid' then raise exception 'Resolve the recorded payment before rescheduling' using errcode='P0001'; end if;
 update bookings set starts_at=s.starts_at,ends_at=s.ends_at,price_pkr=s.price_pkr,updated_at=now() where id=p_booking;
 -- Existing recruitment cannot silently move players to a new time.
 update games set status='cancelled' where booking_id=p_booking;
 insert into audit_logs(actor_id,action,entity_id) values(auth.uid(),'booking.reschedule',p_booking);
end $$;
-- Server-only new functions and sensitive tables. No client session can call PostgREST.
revoke execute on all functions in schema public from public,anon,authenticated;
revoke all on all tables in schema public,app_private from anon,authenticated;
commit;
