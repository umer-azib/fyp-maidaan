import {provisionAdministrator} from '../src/admin-provision';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import type { Database } from '../src/postgres';
import { actor } from '../src/postgres';
import { applicationRouter } from '../src/application';
import { createApp } from '../src/app';
import { createServer, type Server } from 'node:http';
let pg:PGlite,db:Database,server:Server,base:string;
let owner:string,player:string,other:string,venue:string,court:string,booking:string;
const origin='http://localhost:5173';
const account=(username:string)=>({name:username,username,email:username+'@example.test',password:'StrongPass123!',confirmation:'StrongPass123!',kind:'player'});
const hours=Array.from({length:7},(_,dayOfWeek)=>({dayOfWeek,opensAt:'08:00',closesAt:'23:00',slotMinutes:60,pricePkr:2500}));
before(async()=>{
 const {btree_gist}=await import('@electric-sql/pglite/contrib/btree_gist');pg=new PGlite({extensions:{btree_gist}});
 await pg.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets,name text);alter table storage.objects enable row level security;create function storage.foldername(name text) returns text[] language sql immutable as $$select string_to_array(name,'/')$$;`);
 for(const file of ['202610150001_core','202610150002_storage','202610150003_discovery','202610150004_application_accounts','202610150005_booking_operations','202610150006_content','202610150007_venue_media','202610150008_social','202610150009_recurring_games']){
  await pg.exec(readFileSync('../supabase/migrations/'+file+'.sql','utf8'));
  if(file==='202610150003_discovery')await pg.exec(`insert into auth.users(id,email,raw_user_meta_data) values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','legacy@example.test','{"name":"Legacy Player"}');select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',false);select public.ensure_profile();select set_config('request.jwt.claim.sub','',false);`);
 }
 const legacy=await pg.query<{id:string;password_hash:string|null}>("select id,password_hash from app_private.accounts where email='legacy@example.test'");assert.equal(legacy.rows[0].id,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');assert.equal(legacy.rows[0].password_hash,null);
 const wrap=(engine:Pick<PGlite,'query'>):Database=>({query:async<T>(sql:string,values?:unknown[])=>({rows:(await engine.query<T>(sql,values)).rows}),transaction:async work=>work(wrap(engine))});
 db={...wrap(pg),transaction:work=>pg.transaction(tx=>work(wrap(tx)))};
 const app=createApp({publicDb:null,authenticate:async()=>{throw new Error('Legacy disabled')}},[origin],applicationRouter(db,[origin]));
 server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));base='http://127.0.0.1:'+((server.address() as {port:number}).port);
});
after(async()=>{await new Promise<void>(resolve=>server.close(()=>resolve()));await pg.close()});
async function request(path:string,method='GET',body?:unknown,cookie?:string,headers:Record<string,string>={}){const r=await fetch(base+'/v1'+path,{method,headers:{Origin:origin,'Content-Type':'application/json','X-Maidaan-Client':'web',...(cookie?{Cookie:cookie}:{}),...headers},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,json:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]||'',setCookie:r.headers.get('set-cookie')||''};}
test('application accounts, HttpOnly sessions, permissions, booking and matchmaking journey',async()=>{
 const first=await request('/auth/register','POST',account('owner_test'));assert.equal(first.status,200);assert.match(first.setCookie,/HttpOnly/);assert.match(first.setCookie,/SameSite=Lax/);assert.equal(first.json.token,undefined);owner=first.cookie;
 assert.equal((await request('/auth/register','POST',account('owner_test'))).status,409);
 assert.equal((await request('/auth/register','POST',{...account('bad_user'),password:'short'})).status,400);
 assert.equal((await request('/auth/login','POST',{identifier:'owner_test',password:'bad'})).status,401);
 assert.equal((await request('/auth/session')).status,401);
 assert.equal((await request('/me/profile','GET',undefined,undefined,{Authorization:'Bearer admin'})).status,401);
 assert.equal((await request('/admin/access','GET',undefined,owner)).status,403);
 assert.equal((await request('/auth/login','POST',{identifier:'OWNER_TEST@example.test',password:'StrongPass123!'})).status,200);
 const p=await request('/auth/register','POST',account('player_test'));player=p.cookie;
 const o=await request('/auth/register','POST',account('other_test'));other=o.cookie;
 const raw=await db.query<{password_hash:string}>('select password_hash from app_private.accounts where username=$1',['player_test']);assert.match(raw.rows[0].password_hash,/^\$2[aby]\$12\$/);assert.notEqual(raw.rows[0].password_hash,'StrongPass123!');
 assert.equal((await request('/me/profile','GET',undefined,player)).json.emailVerified,false);
 const v=await request('/hub/venues','POST',{name:'Isolated Test Venue',businessName:'Test business',ownerName:'Owner',description:'Test fixture only',address:'Test address Lahore',cityId:'lahore',areaId:'lahore-dha-1',latitude:31.5,longitude:74.3,phone:'03001234567',facilities:['Lighting']},owner);assert.equal(v.status,201);venue=v.json.id;
 const c=await request('/hub/venues/'+venue+'/courts','POST',{name:'Court 1',sport:'Padel',formats:['1v1','2v2']},owner);assert.equal(c.status,201);court=c.json.id;
 assert.equal((await request('/hub/courts/'+court+'/hours','PUT',hours,player)).status,403);
 assert.equal((await request('/hub/courts/'+court+'/hours','PUT',hours,owner)).status,200);
 const date=new Date(Date.now()+86400000*2).toISOString().slice(0,10);
 assert.equal((await request('/courts/'+court+'/availability?date='+date)).json.slots.length,0);
 assert.equal((await request('/admin/venues/'+venue+'/status','POST',{status:'approved',note:'Attempt'},player)).status,403);
 const ownerId=(await request('/me/profile','GET',undefined,owner)).json.id;
 assert.equal((await provisionAdministrator(db,'owner_test@example.test','development')).status,'eligible-dry-run');
 await assert.rejects(()=>provisionAdministrator(db,'owner_test@example.test','production',true),/development/);
 assert.equal((await provisionAdministrator(db,'owner_test@example.test','development',true)).status,'granted');
 assert.equal((await provisionAdministrator(db,'owner_test@example.test','development',true)).status,'already-admin');
 for(const path of ['/admin/reviews','/admin/audit-logs'])assert.equal((await request(path,'GET',undefined,owner)).status,200);
 assert.equal((await request('/admin/venues/'+venue+'/status','POST',{status:'approved',note:'Test review'},owner)).status,200);
 assert.equal((await request('/admin/catalog/areas/INVALID_ID','PUT',{name:'Invalid',active:true},owner)).status,400);
 const slots=await request('/courts/'+court+'/availability?date='+date);assert.ok(slots.json.slots.length>0);const start=slots.json.slots[0].startsAt;
 // Concurrent HTTP requests, independent sessions, one PostgreSQL inventory. PGlite serializes connections; deployed contention remains an acceptance gate.
 const attempts=await Promise.all([request('/bookings','POST',{courtId:court,startsAt:start},player),request('/bookings','POST',{courtId:court,startsAt:start},other)]);
 assert.deepEqual(attempts.map(a=>a.status).sort(),[201,409]);const winner=attempts.find(a=>a.status===201)!;booking=winner.json.id;
 const winnerCookie=attempts[0].status===201?player:other,loserCookie=winnerCookie===player?other:player;
 assert.equal(winner.json.pricePkr,2500);assert.equal(winner.json.paymentStatus,'unpaid');
 assert.equal((await request('/courts/'+court+'/availability?date='+date)).json.slots[0].available,false);
 assert.equal((await request('/hub/courts/'+court+'/hours','PUT',[],owner)).status,409);
 assert.equal((await request('/hub/courts/'+court+'/blocks','POST',{startsAt:start,endsAt:slots.json.slots[0].endsAt,reason:'Maintenance'},owner)).status,409);
 const recruit={title:'Test booked game',description:'Test participants',format:'1v1',maxPlayers:2,skill:'Intermediate',joinMode:'instant'};
 assert.equal((await request('/bookings/'+booking+'/game','POST',recruit,loserCookie)).status,403);
 const game=await request('/bookings/'+booking+'/game','POST',recruit,winnerCookie);assert.equal(game.status,201);assert.equal(game.json.bookingId,booking);assert.equal(game.json.bookingSource,'booking');
 assert.equal((await request('/games/'+game.json.id+'/actions','POST',{type:'join'},loserCookie)).status,200);
 assert.equal((await request('/games/'+game.json.id+'/actions','POST',{type:'join'},loserCookie)).status,409);
 const edit={...game.json};for(const key of ['id','hostId','players','requests','status','bookingId','waitlisted','waitlistCount','needsReplacement','estimatedCostPerPlayer'])delete edit[key];edit.bookingSource='external';edit.duration=120;
 assert.equal((await request('/games/'+game.json.id+'/actions','POST',{type:'edit',input:edit},winnerCookie)).status,403);
 assert.equal((await request('/admin/venues/'+venue+'/status','POST',{status:'suspended',note:'Test suspension'},owner)).status,200);
 assert.equal((await request('/courts/'+court+'/availability?date='+date)).json.slots.length,0);
 assert.equal((await request('/bookings','POST',{courtId:court,startsAt:slots.json.slots[1].startsAt},loserCookie)).status,409);
 assert.equal((await request('/bookings/'+booking+'/actions','POST',{type:'cancel'},loserCookie)).status,403);
 assert.equal((await request('/bookings/'+booking+'/actions','POST',{type:'cancel'},winnerCookie)).status,200);
 assert.equal((await request('/games/'+game.json.id,'GET',undefined,winnerCookie)).json.status,'cancelled');
 assert.equal((await request('/auth/logout','POST',{},player)).status,200);assert.equal((await request('/auth/session','GET',undefined,player)).status,401);
 const content=await request('/admin/content','POST',{title:'Court news',body:'Real database content',startsAt:new Date(Date.now()-60000).toISOString(),active:true,ctaLink:'/player',ctaLabel:'Find venues'},owner);assert.equal(content.status,200);
 const active=await request('/announcements?platform=web&page=discover&cityId=lahore','GET',undefined,other);assert.equal(active.json.data[0].title,'Court news');
 assert.equal((await request('/admin/content','POST',{title:'Unsafe link',body:'Test',startsAt:new Date().toISOString(),ctaLink:'javascript:alert(1)'},owner)).status,400);
 assert.equal((await request('/admin/content','POST',{title:'Denied',body:'Test',startsAt:new Date().toISOString()},other)).status,403);
 const mobile=await request('/auth/login','POST',{identifier:'other_test',password:'StrongPass123!'},undefined,{'X-Maidaan-Client':'mobile'});assert.match(mobile.json.token,/^[A-Za-z0-9_-]{43}$/);assert.equal(mobile.cookie,'');
 assert.equal((await request('/auth/session','GET',undefined,undefined,{'X-Maidaan-Client':'mobile',Authorization:'Bearer '+mobile.json.token})).status,200);
 assert.equal((await request('/auth/session','GET',undefined,undefined,{Authorization:'Bearer '+mobile.json.token})).status,401);
 assert.equal((await request('/auth/renew','POST',{},other)).status,200);assert.equal((await request('/auth/session','GET',undefined,other)).status,401);
 const logs=await db.query<{n:number}>('select count(*)::int n from public.audit_logs');assert.ok(logs.rows[0].n>=5);
 await assert.rejects(()=>actor(db,ownerId,async tx=>{await tx.query('set local role authenticated');await tx.query('select * from app_private.accounts')}),/permission denied/);
});

test('social permissions, waitlist promotion, recurring games and verified review eligibility',async()=>{
 const log=async(name:string)=>(await request('/auth/login','POST',{identifier:name,password:'StrongPass123!'})).cookie;
 const a=await log('player_test'),b=await log('other_test'),host=await log('owner_test');
 const aid=(await request('/me/profile','GET',undefined,a)).json.id,bid=(await request('/me/profile','GET',undefined,b)).json.id,hid=(await request('/me/profile','GET',undefined,host)).json.id;
 assert.equal((await request('/connections/'+bid,'POST',{type:'request'},a)).status,200);
 assert.equal((await request('/connections/'+aid,'POST',{type:'request'},b)).status,409);
 assert.equal((await request('/connections/'+aid,'POST',{type:'accept'},host)).status,404);
 assert.equal((await request('/connections/'+aid,'POST',{type:'accept'},b)).status,200);
 const input={sport:'Padel',title:'Waitlist test',description:'Test-only game',cityId:'lahore',areaId:'lahore-dha-1',venue:'External test venue',location:'DHA Lahore',latitude:31.5,longitude:74.3,startsAt:new Date(Date.now()+86400000).toISOString(),duration:60,maxPlayers:2,skill:'All levels',joinMode:'instant',format:'1v1',bookingSource:'external'};
 const game=await request('/games','POST',input,a);assert.equal(game.status,201);const gid=game.json.id;
 assert.equal((await request('/games/'+gid+'/actions','POST',{type:'join'},b)).status,200);
 assert.equal((await request('/games/'+gid+'/actions','POST',{type:'waitlist'},host)).status,200);
 assert.equal((await request('/games/'+gid+'/actions','POST',{type:'waitlist'},host)).status,409);
 assert.equal((await request('/games/'+gid+'/actions','POST',{type:'leave'},b)).status,200);
 const promoted=await request('/games/'+gid,'GET',undefined,host);assert.ok(promoted.json.players.some((p:{id:string})=>p.id===hid));assert.equal(promoted.json.waitlisted,false);
 const privateGame=await request('/games','POST',{...input,visibility:'private'},a);assert.equal(privateGame.status,201);
 assert.equal((await request('/games/'+privateGame.json.id,'GET',undefined,b)).status,404);
 assert.equal((await request('/games/'+privateGame.json.id+'/invitations','POST',{playerId:bid},a)).status,201);
 assert.equal((await request('/games/'+privateGame.json.id,'GET',undefined,b)).status,200);
 assert.equal((await request('/invitations/'+privateGame.json.id,'POST',{type:'accept'},b)).status,200);
 const series=await request('/game-series','POST',{input,intervalWeeks:1,occurrences:3},a);assert.equal(series.status,201);assert.equal(series.json.data.length,3);assert.equal(Date.parse(series.json.data[1].startsAt)-Date.parse(series.json.data[0].startsAt),7*86400000);
 assert.equal((await request('/games/'+gid+'/replacement','POST',{},b)).status,403);
 // Historical attendance fixture is inserted only in the isolated test database.
 const history=(await db.query<{id:string}>(`insert into public.bookings(court_id,player_id,starts_at,ends_at,status,price_pkr) values($1,$2,now()-interval '3 hours',now()-interval '2 hours','completed',2500) returning id`,[court,aid])).rows[0].id;
 const past=(await db.query<{id:string}>(`insert into public.games(host_id,sport,title,description,city_id,area_id,venue_id,venue,location,latitude,longitude,starts_at,duration,max_players,skill,join_mode,status,format,booking_source,booking_id) values($1,'Padel','Completed test game','Verified test fixture','lahore','lahore-dha-1',$2,'Test venue','DHA',31.5,74.3,now()-interval '3 hours',60,2,'All levels','instant','completed','1v1','booking',$3) returning id`,[aid,venue,history])).rows[0].id;
 await db.query('insert into public.game_participants(game_id,player_id) values($1,$2),($1,$3)',[past,aid,bid]);
 const review={playerId:bid,gameId:past,sportsmanship:5,reliability:4,teamwork:5,body:'Verified participant feedback'};
 assert.equal((await request('/reviews','POST',review,a)).status,403);
 assert.equal((await request('/hub/games/'+past+'/attendance','POST',{playerId:aid},a)).status,403);
 assert.equal((await request('/hub/games/'+past+'/attendance','POST',{playerId:aid},host)).status,200);
 assert.equal((await request('/hub/games/'+past+'/attendance','POST',{playerId:bid},host)).status,200);
 assert.equal((await request('/reviews','POST',{...review,playerId:aid},a)).status,403);
 assert.equal((await request('/reviews','POST',review,a)).status,201);
 assert.equal((await request('/reviews','POST',review,a)).status,409);
 assert.equal((await request('/reviews','POST',{venueId:venue,bookingId:history,quality:4,body:'Completed booking'},a)).status,201);
 assert.equal((await request('/reviews','POST',{venueId:venue,gameId:past,quality:4,body:'Same visit duplicate'},a)).status,409);
 assert.equal((await request('/reviews','POST',{venueId:venue,bookingId:history,quality:5,body:'Owner self review'},host)).status,403);
 assert.equal((await request('/connections/'+bid,'POST',{type:'block'},a)).status,200);
 assert.equal((await request('/connections/'+aid,'POST',{type:'request'},b)).status,403);
 assert.equal((await request('/players/'+aid,'GET',undefined,b)).status,404);
});

test('sensitive mutation limit is per account and does not exhaust normal reads',async()=>{
 const session=await request('/auth/register','POST',account('limit_test'));assert.equal(session.status,200);
 for(let i=0;i<60;i++)assert.equal((await request('/me/profile','PUT',{},session.cookie)).status,400);
 assert.equal((await request('/me/profile','PUT',{},session.cookie)).status,429);
 assert.equal((await request('/me/profile','GET',undefined,session.cookie)).status,200);
 const other=await request('/auth/login','POST',{identifier:'owner_test',password:'StrongPass123!'});assert.equal(other.status,200);
 assert.equal((await request('/me/profile','PUT',{},other.cookie)).status,400);
});

test('avatar Storage contract persists references, signs readable images and preserves old photo on provider failure',async()=>{
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aXioAAAAASUVORK5CYII=','base64');
 const objects=new Map<string,Buffer>();let fail=false;
 const provider=createServer(async(req,res)=>{const chunks:Buffer[]=[];for await(const chunk of req)chunks.push(Buffer.from(chunk));const bytes=Buffer.concat(chunks);const path=(req.url||'').split('?')[0];res.setHeader('Content-Type','application/json');
  if(req.method==='POST'&&path.startsWith('/storage/v1/object/sign/')){res.end(JSON.stringify({signedURL:path.replace('/storage/v1','')+'?token=local-test-only'}));return;}
  if(req.method==='GET'&&path.startsWith('/storage/v1/object/sign/')){const saved=objects.get(path.replace('/object/sign/','/object/'));res.statusCode=saved?200:404;res.setHeader('Content-Type','image/png');res.end(saved);return;}
  if(req.method==='POST'&&path.startsWith('/storage/v1/object/')){if(fail){res.statusCode=503;res.end(JSON.stringify({statusCode:'503',error:'Unavailable',message:'Test provider unavailable'}));return;}objects.set(path,bytes);res.end(JSON.stringify({Key:path,Id:'local-object'}));return;}
  res.end('{}');
 }).listen(0,'127.0.0.1');await new Promise<void>(resolve=>provider.once('listening',resolve));
 const app=createApp({publicDb:null,authenticate:async()=>{throw Error()}},[origin],applicationRouter(db,[origin],false,{url:'http://127.0.0.1:'+((provider.address() as {port:number}).port),key:'isolated-storage-contract-test-only'}));
 const photoServer=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>photoServer.once('listening',resolve));
 try{
  const session=await request('/auth/register','POST',account('photo_test'));assert.equal(session.status,200);
  const url='http://127.0.0.1:'+((photoServer.address() as {port:number}).port)+'/v1';
  const headers={Origin:origin,'X-Maidaan-Client':'web','Content-Type':'application/json',Cookie:session.cookie};
  const upload=await fetch(url+'/me/avatar',{method:'POST',headers,body:JSON.stringify({mime:'image/png',base64:png.toString('base64')})});assert.equal(upload.status,201);const saved=await upload.json();assert.ok(saved.path.startsWith(session.json.userId+'/'));assert.ok(saved.profile.avatarUrl);
  const image=await fetch(saved.profile.avatarUrl);assert.equal(image.status,200);assert.deepEqual(Buffer.from(await image.arrayBuffer()),png);
  const restored=await fetch(url+'/me/profile',{headers});assert.equal((await restored.json()).avatarPath,saved.path);
  const venue=await request('/hub/venues','POST',{name:'Private media test venue',businessName:'Local Storage test',ownerName:'Photo test',description:'Isolated test fixture',address:'Local test Lahore address',cityId:'lahore',areaId:'lahore-dha-1',latitude:31.5,longitude:74.3,phone:'03001234567',facilities:[]},session.cookie);assert.equal(venue.status,201);
  const mediaUrl=url+'/hub/venues/'+venue.json.id+'/media';
  const mediaBody={mime:'image/png',base64:png.toString('base64'),kind:'photo',courtId:null};
  assert.equal((await fetch(mediaUrl,{method:'POST',headers,body:JSON.stringify(mediaBody)})).status,201);
  const listed=await (await fetch(url+'/hub/venues',{headers})).json();const firstMedia=listed.data[0].media[0];assert.ok(firstMedia.id);assert.equal((await fetch(firstMedia.url)).status,200);
  assert.equal((await fetch(mediaUrl,{method:'POST',headers,body:JSON.stringify({...mediaBody,replaceId:firstMedia.id})})).status,201);
  const updated=(await (await fetch(url+'/hub/venues',{headers})).json()).data[0];assert.equal(updated.media.length,1);assert.notEqual(updated.media[0].path,firstMedia.path);
  const outsider=await request('/auth/register','POST',account('media_outsider'));assert.equal((await fetch(mediaUrl,{method:'POST',headers:{...headers,Cookie:outsider.cookie},body:JSON.stringify(mediaBody)})).status,403);
  assert.equal((await fetch(mediaUrl+'/'+updated.media[0].id,{method:'DELETE',headers})).status,200);
  assert.equal((await (await fetch(url+'/hub/venues',{headers})).json()).data[0].media.length,0);
  fail=true;const failed=await fetch(url+'/me/avatar',{method:'POST',headers,body:JSON.stringify({mime:'image/png',base64:png.toString('base64')})});assert.equal(failed.status,503);
  assert.equal((await (await fetch(url+'/me/profile',{headers})).json()).avatarPath,saved.path);
  assert.equal((await fetch(url+'/me/avatar',{method:'POST',headers,body:JSON.stringify({mime:'image/png',base64:'YmFk'})})).status,400);
  await request('/auth/logout','POST',{},session.cookie);const relogin=await request('/auth/login','POST',{identifier:'photo_test',password:'StrongPass123!'});headers.Cookie=relogin.cookie;
  assert.equal((await (await fetch(url+'/me/profile',{headers})).json()).avatarPath,saved.path);
 }finally{await new Promise<void>(resolve=>photoServer.close(()=>resolve()));await new Promise<void>(resolve=>provider.close(()=>resolve()));}
});

test('administrative cancellation is gated, cancels attached recruitment and records an audit',async()=>{
 const admin=await request('/auth/register','POST',account('cancel_admin'));await provisionAdministrator(db,'cancel_admin@example.test','development',true);
 const customer=await request('/auth/register','POST',account('cancel_player'));
 const v=await request('/hub/venues','POST',{name:'Admin cancellation fixture',businessName:'Local test',ownerName:'Test operator',description:'Isolated test',address:'Local Lahore test address',cityId:'lahore',areaId:'lahore-dha-1',latitude:31.5,longitude:74.3,phone:'03001234567',facilities:[]},admin.cookie);assert.equal(v.status,201);
 const c=await request('/hub/venues/'+v.json.id+'/courts','POST',{name:'Cancellation test court',sport:'Padel',formats:['1v1']},admin.cookie);assert.equal(c.status,201);
 assert.equal((await request('/hub/courts/'+c.json.id+'/hours','PUT',hours,admin.cookie)).status,200);
 assert.equal((await request('/admin/venues/'+v.json.id+'/status','POST',{status:'approved',note:'Local test approval'},admin.cookie)).status,200);
 const date=new Date(Date.now()+5*86400000).toISOString().slice(0,10),slots=await request('/courts/'+c.json.id+'/availability?date='+date);
 const b=await request('/bookings','POST',{courtId:c.json.id,startsAt:slots.json.slots[0].startsAt},customer.cookie);assert.equal(b.status,201);
 const g=await request('/bookings/'+b.json.id+'/game','POST',{title:'Local cancellation test',description:'Isolated test game',format:'1v1',maxPlayers:2,skill:'Intermediate',joinMode:'instant'},customer.cookie);assert.equal(g.status,201);
 assert.equal((await request('/admin/bookings/'+b.json.id+'/cancel','POST',{reason:'Local test cancellation'},customer.cookie)).status,403);
 assert.equal((await request('/admin/bookings/'+b.json.id+'/cancel','POST',{reason:'Local test cancellation'},admin.cookie)).status,200);
 assert.equal((await request('/games/'+g.json.id,'GET',undefined,customer.cookie)).json.status,'cancelled');
 assert.equal((await request('/admin/bookings/'+b.json.id+'/cancel','POST',{reason:'Duplicate cancellation'},admin.cookie)).status,409);
 assert.equal((await db.query<{status:string}>('select status from public.bookings where id=$1',[b.json.id])).rows[0].status,'cancelled');
 assert.equal((await db.query("select id from public.audit_logs where entity_id=$1 and action like 'booking.admin_cancel:%'",[b.json.id])).rows.length,1);
});
