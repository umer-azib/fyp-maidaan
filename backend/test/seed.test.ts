import {provisionAdministrator} from '../src/admin-provision';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import type { Database } from '../src/postgres';
import { actor } from '../src/postgres';
import { createApp } from '../src/app';
import { applicationRouter } from '../src/application';
import { accountService } from '../src/accounts';
import { applyMigrations, migrationPreflight } from '../scripts/migration-review';
import { seedLahore } from '../scripts/seed-lahore';
import { cleanupLahore } from '../scripts/cleanup-lahore';
import { fixtureId, fixturePassword } from '../scripts/dev-fixtures';
const policy={environment:'development',enabled:'true'};
test('fresh migrations, Lahore fixtures, permissions, idempotency and guarded cleanup',async()=>{
 const {btree_gist}=await import('@electric-sql/pglite/contrib/btree_gist');
 const pg=new PGlite({extensions:{btree_gist}});
 const wrap=(engine:Pick<PGlite,'query'|'exec'>):Database=>({query:async<T>(sql:string,values?:unknown[])=>{
  if(!values&&sql.includes(';')){const results=await engine.exec(sql);return {rows:(results.at(-1)?.rows||[]) as T[]};}
  return {rows:(await engine.query<T>(sql,values)).rows};
 },transaction:async work=>work(wrap(engine))});
 const db:Database={...wrap(pg),transaction:work=>pg.transaction(tx=>work(wrap(tx)))};
 try{
  await assert.rejects(()=>applyMigrations(db,false),/explicit/);
  await assert.rejects(()=>migrationPreflight(db),/managed Supabase/);
  await pg.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
  create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets,name text);alter table storage.objects enable row level security;create function storage.foldername(name text) returns text[] language sql immutable as $$select string_to_array(name,'/')$$;`);
  assert.equal((await migrationPreflight(db)).status,'ready-empty-schema');
  assert.equal((await applyMigrations(db,true)).status,'applied-atomically');
  assert.equal((await applyMigrations(db,true)).status,'already-applied');
  await assert.rejects(()=>seedLahore(db,{...policy,enabled:'false'}),/development/i);
  await assert.rejects(()=>seedLahore(db,{...policy,environment:'production'}),/development/i);
  const first=await seedLahore(db,policy);await assert.rejects(()=>provisionAdministrator(db,'maidaan.dev.player01@example.com','development',true),/non-fixture/);assert.equal(first.courts,24);assert.equal(first.open_games,24);assert.equal(first.full_games,8);
  assert.deepEqual(await seedLahore(db,policy),first);
  console.log('Verified local fixture counts:',JSON.stringify(first));
  const owner=fixtureId('account-40'),otherOwner=fixtureId('account-41');
  const venue=(await db.query<{id:string}>('select venue_id id from public.venue_managers where user_id=$1',[owner])).rows[0].id;
  await actor(db,owner,tx=>tx.query('select public.require_manager($1)',[venue]));
  await assert.rejects(()=>actor(db,otherOwner,tx=>tx.query('select public.require_manager($1)',[venue])));
  const full=(await db.query<{id:string}>(`select g.id from public.games g where g.status='open' and (select count(*) from public.game_participants p where p.game_id=g.id)=g.max_players limit 1`)).rows[0].id;
  const outsider=(await db.query<{id:string}>('select id from public.profiles p where not exists(select 1 from public.game_participants m where m.game_id=$1 and m.player_id=p.id) limit 1',[full])).rows[0].id;
  await assert.rejects(()=>actor(db,outsider,tx=>tx.query("select public.game_action($1,'join',null)",[full])),/Game is full/);
  const suspended=(await db.query<{id:string}>("select c.id from public.courts c join public.venues v on v.id=c.venue_id where v.approval_status='suspended' limit 1")).rows[0].id;
  await assert.rejects(()=>actor(db,outsider,tx=>tx.query("select public.reserve_court($1,now()+interval '2 days')",[suspended])),/unavailable/);
  const sentinel='ffffffff-ffff-4fff-8fff-ffffffffffff';
  await db.query('insert into app_private.accounts(id,email,username) values($1,$2,$3)',[sentinel,'unrelated@example.test','unrelated_real']);
  const auth=accountService(db,true),productionAuth=accountService(db,false);
  await assert.rejects(()=>productionAuth.login('dev_player_01',fixturePassword,'mobile'),/Incorrect/);
  const ownerSession=await auth.login('dev_owner_01',fixturePassword,'mobile');
  const app=createApp({publicDb:null,authenticate:async()=>{throw new Error('Legacy disabled')}},[],applicationRouter(db,[],false));
  const server=app.listen(0,'127.0.0.1');
  await new Promise<void>(resolve=>server.once('listening',resolve));
  try{
   const port=(server.address() as {port:number}).port;
   const response=await fetch('http://127.0.0.1:'+port+'/v1/hub/venues',{headers:{'X-Maidaan-Client':'mobile',Authorization:'Bearer '+ownerSession.token}});
   assert.equal(response.status,200);assert.deepEqual((await response.json()).data.map((v:{id:string})=>v.id),[venue]);
   const analytics=await fetch('http://127.0.0.1:'+port+'/v1/hub/analytics?from='+new Date(Date.parse(first.anchorDate)-20*86400000).toISOString().slice(0,10)+'&to='+new Date(Date.parse(first.anchorDate)+21*86400000).toISOString().slice(0,10),{headers:{'X-Maidaan-Client':'mobile',Authorization:'Bearer '+ownerSession.token}});assert.equal(analytics.status,200);const metrics=await analytics.json();assert.equal(metrics.summary.collected,0);assert.ok(metrics.summary.total>0);assert.ok(metrics.scheduled.length>0);
   const courtId=(await db.query<{id:string}>('select id from public.courts where venue_id=$1 order by id limit 1',[venue])).rows[0].id;const calendar=await fetch('http://127.0.0.1:'+port+'/v1/hub/courts/'+courtId+'/calendar?date='+first.anchorDate+'&view=week',{headers:{'X-Maidaan-Client':'mobile',Authorization:'Bearer '+ownerSession.token}});assert.equal(calendar.status,200);assert.ok((await calendar.json()).slots.length>0);
   for(const path of ['/hub/games','/hub/reviews']){const r=await fetch('http://127.0.0.1:'+port+'/v1'+path,{headers:{'X-Maidaan-Client':'mobile',Authorization:'Bearer '+ownerSession.token}});assert.equal(r.status,200);const result=await r.json();assert.ok(result.data.length>0);assert.ok(result.data.every((x:{venueName:string})=>x.venueName.includes('Juniper')));}
   for(const path of ['/admin/reviews','/admin/audit-logs']){const r=await fetch('http://127.0.0.1:'+port+'/v1'+path,{headers:{'X-Maidaan-Client':'mobile',Authorization:'Bearer '+ownerSession.token}});assert.equal(r.status,403);}

  }finally{await new Promise<void>(resolve=>server.close(()=>resolve()));}
  await auth.logout(await auth.authenticate(ownerSession.token,'mobile'));
  const session=await auth.login('dev_player_01',fixturePassword,'mobile');
  await assert.rejects(()=>productionAuth.authenticate(session.token,'mobile'),/expired/);
  await assert.rejects(()=>cleanupLahore(db,policy),/unregistered records/);
  assert.deepEqual(await seedLahore(db,policy),first);
  await auth.logout(await auth.authenticate(session.token,'mobile'));
  assert.ok((await cleanupLahore(db,policy)).removed>0);
  assert.deepEqual((await db.query<{id:string}>('select id from app_private.accounts')).rows,[{id:sentinel}]);
  assert.equal((await cleanupLahore(db,policy)).removed,0);
  await db.query('update app_private.accounts set username=$1 where id=$2',['dev_player_01',sentinel]);
  await assert.rejects(()=>seedLahore(db,policy),/unique|duplicate/i);
  assert.deepEqual((await db.query<{id:string}>('select id from app_private.accounts')).rows,[{id:sentinel}]);
  assert.equal((await db.query<{n:number}>('select count(*)::int n from public.venues')).rows[0].n,0);

 }finally{await pg.close();}
});

test('full game labels reflect capacity, time and terminal status',async()=>{
 const {effectiveGameStatus}=await import('../../shared/games.js');const base={status:'open',startsAt:'2099-01-01T00:00:00Z',maxPlayers:4,participants:4};assert.equal(effectiveGameStatus(base),'Full');assert.equal(effectiveGameStatus({...base,participants:2}),'Open');assert.equal(effectiveGameStatus({...base,participants:2,joinMode:'request'}),'Requests open');assert.equal(effectiveGameStatus({...base,status:'completed'}),'Completed');assert.equal(effectiveGameStatus({...base,startsAt:'2000-01-01T00:00:00Z'}),'Started');
});
