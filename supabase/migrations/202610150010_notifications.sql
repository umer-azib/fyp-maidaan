begin;
create table public.notifications(
 id bigint generated always as identity primary key,
 recipient_id uuid not null references public.profiles(id),
 type text not null check(type in ('join_request','player_joined','request_approved','request_rejected','player_left','booking_pending','booking_confirmed','booking_cancelled','booking_rescheduled','game_changed','game_cancelled','game_invitation')),
 game_id uuid references public.games(id),booking_id uuid references public.bookings(id),
 title text not null check(length(title) between 1 and 160),message text not null check(length(message)<=1000),
 created_at timestamptz not null default now(),read_at timestamptz
);
create index notifications_recipient_recent on public.notifications(recipient_id,id desc);
create index notifications_recipient_unread on public.notifications(recipient_id,id desc) where read_at is null;
alter table public.notifications enable row level security;
revoke all on public.notifications from public,anon,authenticated;
create function app_private.enqueue_notification(p_user uuid,p_type text,p_title text,p_message text,p_game uuid default null,p_booking uuid default null)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if p_user is not null then
  insert into public.notifications(recipient_id,type,title,message,game_id,booking_id) values(p_user,p_type,p_title,p_message,p_game,p_booking);
 end if;
end $$;
create function app_private.game_notifications() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare g games; who text; target uuid;
begin
 if tg_table_name='join_requests' then
  select * into g from games where id=coalesce(new.game_id,old.game_id);
  if tg_op='INSERT' then
   select name into who from profiles where id=new.player_id;
   perform app_private.enqueue_notification(g.host_id,'join_request','New join request',who||' requested to join '||g.title,g.id);
  elsif auth.uid()=g.host_id and g.status='open' and not exists(select 1 from game_participants where game_id=g.id and player_id=old.player_id) then
   perform app_private.enqueue_notification(old.player_id,'request_rejected','Join request declined','Your request for '||g.title||' was declined.',g.id);
  end if;
 elsif tg_table_name='game_participants' then
  select * into g from games where id=coalesce(new.game_id,old.game_id);
  if tg_op='INSERT' and new.player_id<>g.host_id then
   select name into who from profiles where id=new.player_id;
   if exists(select 1 from join_requests where game_id=g.id and player_id=new.player_id) then
    perform app_private.enqueue_notification(new.player_id,'request_approved','You are in!','Your request for '||g.title||' was approved.',g.id);
   else
    perform app_private.enqueue_notification(g.host_id,'player_joined','A player joined',who||' joined '||g.title,g.id);
   end if;
  elsif tg_op='DELETE' and old.player_id<>g.host_id and g.status='open' then
   select name into who from profiles where id=old.player_id;
   perform app_private.enqueue_notification(g.host_id,'player_left','A spot opened up',who||' left '||g.title,g.id);
  end if;
 elsif tg_table_name='games' and tg_op='UPDATE' then
  if row(new.title,new.description,new.starts_at,new.duration,new.status,new.max_players,new.join_mode,new.venue) is distinct from row(old.title,old.description,old.starts_at,old.duration,old.status,old.max_players,old.join_mode,old.venue) then
   for target in select player_id from game_participants where game_id=new.id union select player_id from join_requests where game_id=new.id loop
    if target is distinct from auth.uid() then
     perform app_private.enqueue_notification(target,case when new.status='cancelled' then 'game_cancelled' else 'game_changed' end,case when new.status='cancelled' then 'Game cancelled' else 'Game updated' end,new.title||' has been '||case when new.status='cancelled' then 'cancelled.' else 'updated. Check the latest details.' end,new.id);
    end if;
   end loop;
  end if;
 elsif tg_table_name='invitations' and (tg_op='INSERT' or (new.status='pending' and old.status<>'pending')) then
  select * into g from games where id=new.game_id;
  perform app_private.enqueue_notification(new.invitee_id,'game_invitation','You are invited','You have an invitation to '||g.title,g.id);
 end if;
 return null;
end $$;
create function app_private.booking_notifications() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare kind text; label text; target uuid;
begin
 if tg_op='INSERT' then
  if new.status not in ('pending','confirmed') then return null;end if;
  kind:=case when new.status='confirmed' then 'booking_confirmed' else 'booking_pending' end;
 elsif new.status='cancelled' and old.status<>'cancelled' then kind:='booking_cancelled';
 elsif row(new.starts_at,new.ends_at) is distinct from row(old.starts_at,old.ends_at) then kind:='booking_rescheduled';
 elsif new.status='confirmed' and old.status<>'confirmed' then kind:='booking_confirmed';
 else return null;end if;
 label:=replace(kind,'_',' ');
 perform app_private.enqueue_notification(new.player_id,kind,initcap(label),'Your court '||label||'. Time: '||to_char(new.starts_at at time zone 'Asia/Karachi','DD Mon HH24:MI')||' PKT.',null,new.id);
 if tg_op='INSERT' then
  for target in select m.user_id from venue_managers m join courts c on c.venue_id=m.venue_id where c.id=new.court_id and m.user_id<>new.player_id loop
   perform app_private.enqueue_notification(target,kind,'New court reservation','A court reservation was recorded. Review your bookings.',null,new.id);
  end loop;
 end if;
 return null;
end $$;
create trigger notify_join_requests after insert or delete on public.join_requests for each row execute function app_private.game_notifications();
create trigger notify_participants after insert or delete on public.game_participants for each row execute function app_private.game_notifications();
create trigger notify_game_changes after update on public.games for each row execute function app_private.game_notifications();
create trigger notify_invitations after insert or update on public.invitations for each row execute function app_private.game_notifications();
create trigger notify_bookings after insert or update on public.bookings for each row execute function app_private.booking_notifications();
revoke all on function app_private.enqueue_notification(uuid,text,text,text,uuid,uuid),app_private.game_notifications(),app_private.booking_notifications() from public,anon,authenticated;
commit;
