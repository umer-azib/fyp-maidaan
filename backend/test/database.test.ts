import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

let db:PGlite;
const host='11111111-1111-4111-8111-111111111111',alice='22222222-2222-4222-8222-222222222222',bob='33333333-3333-4333-8333-333333333333';
let instant:string,requests:string;
async function asUser(id:string){await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${id}',false);`);}
async function root(){await db.exec('reset role');}
async function count(table:string,id:string){const r=await db.query<{n:number}>(`select count(*)::int n from public.${table} where game_id=$1`,[id]);return r.rows[0].n;}
const input={sport:'Padel',title:'Real SQL test',description:'A verified test fixture, not a venue listing.',cityId:'lahore',areaId:'lahore-gulberg',venue:'External test court',location:'Gulberg',latitude:31.5,longitude:74.3,startsAt:new Date(Date.now()+86400000).toISOString(),duration:60,maxPlayers:2,skill:'All levels',joinMode:'instant',format:'1v1',bookingSource:'external'};
before(async()=>{
 const {btree_gist}=await import('@electric-sql/pglite/contrib/btree_gist');
 db=new PGlite({extensions:{btree_gist}});
 await db.exec(`create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key,raw_user_meta_data jsonb not null default '{}');
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema public,auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;
 insert into auth.users(id) values('${host}'),('${alice}'),('${bob}');`);
 await db.exec(readFileSync('../supabase/migrations/202610150001_core.sql','utf8'));
 await db.exec(`create schema storage;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets,name text);
 alter table storage.objects enable row level security;
 create function storage.foldername(name text) returns text[] language sql immutable as $$select string_to_array(name,'/')$$;
 grant usage on schema storage to authenticated;
 grant select,insert,update,delete on storage.objects to authenticated;`);
 await db.exec(readFileSync('../supabase/migrations/202610150002_storage.sql','utf8'));
 await db.exec(readFileSync('../supabase/migrations/202610150003_discovery.sql','utf8'));
 for(const id of [host,alice,bob]){await asUser(id);await db.query('select public.ensure_profile()');}
 await asUser(host);instant=(await db.query<{id:string}>('select public.create_game($1::jsonb) id',[JSON.stringify(input)])).rows[0].id;
 requests=(await db.query<{id:string}>('select public.create_game($1::jsonb) id',[JSON.stringify({...input,joinMode:'request'})])).rows[0].id;
});
after(async()=>{await db.close()});
test('SQL migrations, RLS and transactional game permissions',async()=>{
 await asUser(alice);await db.query("select public.game_action($1,'join')",[instant]);assert.equal(await count('game_participants',instant),2);
 await db.query("insert into storage.objects(bucket_id,name) values('avatars',$1)",[alice+'/photo.png']);
 await assert.rejects(()=>db.query("insert into storage.objects(bucket_id,name) values('avatars',$1)",[host+'/photo.png']),/row-level security/);
 await assert.rejects(()=>db.query("select public.game_action($1,'join')",[instant]),/Already joined/);
 await asUser(bob);await assert.rejects(()=>db.query("select public.game_action($1,'join')",[instant]),/full/);
 await assert.rejects(()=>db.query("select public.game_action($1,'cancel')",[instant]),/host/);
 await assert.rejects(()=>db.query("select public.game_action($1,'edit',null,$2::jsonb)",[instant,JSON.stringify(input)]),/host/);
 await assert.rejects(()=>db.query('insert into public.admin_memberships(user_id) values($1)',[bob]),/permission denied/);
 await assert.rejects(()=>db.query('insert into public.game_participants(game_id,player_id) values($1,$2)',[requests,bob]),/permission denied/);
 await assert.rejects(()=>db.query("update public.games set max_players=100 where id=$1",[instant]),/permission denied/);
 await asUser(alice);await db.query("select public.game_action($1,'leave')",[instant]);assert.equal(await count('game_participants',instant),1);
 await db.query("select public.game_action($1,'join')",[requests]);assert.equal(await count('game_participants',requests),1);assert.equal(await count('join_requests',requests),1);
 await assert.rejects(()=>db.query("select public.game_action($1,'join')",[requests]),/Already joined/);
 await asUser(bob);await db.query("select public.game_action($1,'join')",[requests]);
 assert.equal(await count('join_requests',requests),1,'Non-host can only read their own request');
 await assert.rejects(()=>db.query("select public.game_action($1,'approve',$2)",[requests,alice]),/host/);
 await asUser(host);assert.equal(await count('join_requests',requests),2);await db.query("select public.game_action($1,'approve',$2)",[requests,alice]);
 assert.equal(await count('game_participants',requests),2);assert.equal(await count('join_requests',requests),1);
 await assert.rejects(()=>db.query("select public.game_action($1,'approve',$2)",[requests,bob]),/full/);
 await db.query("select public.game_action($1,'reject',$2)",[requests,bob]);assert.equal(await count('join_requests',requests),0);
 await assert.rejects(()=>db.query("select public.game_action($1,'leave')",[requests]),/Hosts/);
 await assert.rejects(()=>db.query('select public.create_game($1::jsonb)',[JSON.stringify({...input,maxPlayers:4})]),/check constraint/);
 await db.query("select public.game_action($1,'cancel')",[requests]);
 await asUser(bob);await assert.rejects(()=>db.query("select public.game_action($1,'join')",[requests]),/no longer open/);
 await db.query('select public.save_profile($1::jsonb)',[JSON.stringify({name:'Bob',username:'bob_test',bio:'',cityId:'lahore',areaId:'lahore-gulberg',avatarPath:null,sports:[{sport:'Padel',skill:'Beginner',positions:[],formats:['1v1']}]})]);
 await assert.rejects(()=>db.query('select public.save_profile($1::jsonb)',[JSON.stringify({name:'Bob',username:null,bio:'',cityId:'lahore',areaId:null,avatarPath:host+'/photo.png',sports:[]})]),/photo path/);
 await db.exec('set role anon');await assert.rejects(()=>db.query('select * from public.profiles'),/permission denied/);
 await root();const venue=(await db.query<{id:string}>("insert into public.venues(name,address,city_id,area_id,latitude,longitude,verified,published) values('Test venue','Not a real listing','lahore','lahore-gulberg',31.5,74.3,true,true) returning id")).rows[0].id;
 const court=(await db.query<{id:string}>("insert into public.courts(venue_id,name,sport) values($1,'Test court','Padel') returning id",[venue])).rows[0].id;
 await db.query("insert into public.bookings(court_id,player_id,starts_at,ends_at,status) values($1,$2,'2030-01-01 12:00Z','2030-01-01 13:00Z','confirmed')",[court,host]);
 await assert.rejects(()=>db.query("insert into public.bookings(court_id,player_id,starts_at,ends_at,status) values($1,$2,'2030-01-01 12:30Z','2030-01-01 13:30Z','pending')",[court,alice]),/exclusion constraint/);
 await db.query("insert into public.bookings(court_id,player_id,starts_at,ends_at,status) values($1,$2,'2030-01-01 13:00Z','2030-01-01 14:00Z','confirmed')",[court,alice]);
 await db.exec('set role anon');const nearby=await db.query("select * from public.discover_venues('lahore','lahore-gulberg',31.5,74.3,1)");assert.equal(nearby.rows.length,1);
 const far=await db.query("select * from public.discover_venues('lahore',null,30,73,1)");assert.equal(far.rows.length,0);
 await assert.rejects(()=>db.query('select * from public.bookings'),/permission denied/);
});
