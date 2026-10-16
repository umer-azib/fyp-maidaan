import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {accountService,hashApplicationPassword} from '../src/accounts';
import {temporaryAdminId} from '../src/runtime';
import {provisionAdministrator} from '../src/admin-provision';
import {requireDevelopment} from '../scripts/dev-fixtures';
import {applicationRouter} from '../src/application';
import {createApp} from '../src/app';
import {postgresDatabase,type Database} from '../src/postgres';

test('Vercel TypeScript 7 temporary config resolves backend Node types and shared sources',()=>{
 const temp=mkdtempSync(join(tmpdir(),'maidaan-vercel-transpile-'));
 const config=join(temp,'tsconfig.json');
 // Match Vercel's native TypeScript compiler path: config lives outside the repository.
 writeFileSync(config,JSON.stringify({extends:resolve('tsconfig.json'),compilerOptions:{sourceMap:true,inlineSourceMap:false,inlineSources:true,declaration:false,declarationMap:false,emitDeclarationOnly:false,noEmit:false,outDir:join(temp,'output'),rootDir:resolve('..'),incremental:false,composite:false,noCheck:true,rewriteRelativeImportExtensions:true},files:[resolve('index.ts')],include:[],exclude:[]}));
 execFileSync(process.execPath,[resolve('node_modules/typescript/bin/tsc'),'--project',config],{encoding:'utf8',timeout:30000});
});

test('Vercel blocks fixture/admin logins and existing sessions, permits real accounts, and polls private notifications',async()=>{
 const pg=new PGlite();
 const wrap=(engine:Pick<PGlite,'query'>):Database=>({query:async<T>(sql:string,values?:unknown[])=>({rows:(await engine.query<T>(sql,values)).rows}),transaction:work=>work(wrap(engine))});
 const db:Database={...wrap(pg),transaction:work=>pg.transaction(tx=>work(wrap(tx)))};
 await pg.exec(`create schema app_private;
 create table app_private.accounts(id uuid primary key,username text,email text,password_hash text,status text default 'active',is_development_fixture boolean default false);
 create table app_private.sessions(token_hash text primary key,account_id uuid references app_private.accounts,client text,expires_at timestamptz,absolute_expires_at timestamptz);
 create table public.notifications(id bigint generated always as identity primary key,recipient_id uuid,type text,game_id uuid,booking_id uuid,title text,message text,created_at timestamptz default now(),read_at timestamptz);`);
 const password='IsolatedTestOnly123!',hashed=await hashApplicationPassword(password);
 const fixture='11111111-1111-4111-8111-111111111111',regular='22222222-2222-4222-8222-222222222222';
 for(const [id,name,isFixture] of [[fixture,'dev_player_01',true],[temporaryAdminId,'maidaan_admin',false],[regular,'real_player',false]])await db.query('insert into app_private.accounts(id,username,email,password_hash,is_development_fixture) values($1,$2,$3,$4,$5)',[id,name,name+'@example.test',hashed,isFixture]);
 const local=accountService(db,true);
 const sessions=[];
 for(const client of ['web','mobile'] as const)for(const name of ['dev_player_01','maidaan_admin'])sessions.push({client,...await local.login(name,password,client)});
 await db.query("insert into public.notifications(recipient_id,type,title,message) values($1,'join_request','Private','Only for regular player'),($2,'join_request','Other','Not yours')",[regular,fixture]);
 const previous={VERCEL:process.env.VERCEL,NODE_ENV:process.env.NODE_ENV};
 process.env.VERCEL='1';process.env.NODE_ENV='development';
 const origin='https://player.example.test';
 const app=createApp({publicDb:null,authenticate:async()=>{throw Error('Legacy disabled')}},[origin],applicationRouter(db,[origin]),true);
 const server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));
 const base='http://127.0.0.1:'+((server.address() as {port:number}).port);
 try{
  assert.throws(()=>postgresDatabase('postgresql://test:test@localhost/test?sslmode=disable'),/verified TLS/);
  assert.throws(()=>postgresDatabase('postgresql://test:test@localhost/test?sslmode=no-verify'),/verified TLS/);
  const deployed=accountService(db,true);
  for(const client of ['web','mobile'] as const)for(const name of ['dev_player_01','DEV_PLAYER_01@example.test','maidaan_admin','MAIDAAN_ADMIN@example.test'])await assert.rejects(()=>deployed.login(name,password,client),{status:401});
  for(const session of sessions)await assert.rejects(()=>deployed.authenticate(session.token,session.client),{status:401});
  assert.throws(()=>requireDevelopment({environment:'development',enabled:'true'}),/Development fixtures/);
  await assert.rejects(()=>provisionAdministrator(db,'real_player@example.test','development',true),/development/);
  const login=await fetch(base+'/v1/auth/login',{method:'POST',headers:{Origin:origin,'X-Maidaan-Client':'web','Content-Type':'application/json'},body:JSON.stringify({identifier:'real_player',password})});
  assert.equal(login.status,200);const cookie=login.headers.get('set-cookie')!;assert.match(cookie,/HttpOnly/);assert.match(cookie,/Secure/);assert.match(cookie,/SameSite=None/);
  const headers={Cookie:cookie.split(';')[0],Origin:origin,'X-Maidaan-Client':'web'};
  assert.equal((await fetch(base+'/health')).status,200);
  assert.equal((await fetch(base+'/v1/auth/session',{headers})).status,200);
  const polling=await fetch(base+'/v1/notifications',{headers});assert.equal(polling.status,200);
  const result=await polling.json() as {transport:string;unreadCount:number;data:{title:string}[]};assert.equal(result.transport,'polling');assert.equal(result.unreadCount,1);assert.deepEqual(result.data.map(n=>n.title),['Private']);
  assert.equal((await fetch(base+'/v1/notifications/stream',{headers})).status,503);
  assert.equal((await fetch(base+'/v1/notifications')).status,401);
  assert.equal((await fetch(base+'/v1/auth/logout',{method:'POST',headers})).status,200);
  assert.equal((await fetch(base+'/v1/auth/session',{headers})).status,401);
  assert.equal((await db.query('select * from app_private.accounts')).rows.length,3);
 }finally{
  for(const [key,value] of Object.entries(previous))if(value===undefined)delete process.env[key];else process.env[key]=value;
  await new Promise<void>(resolve=>server.close(()=>resolve()));await pg.close();
 }
});

test('compiled Vercel entry imports shared contracts, exports Express without listening, and serves health',()=>{
 const script=`const app=require('./dist/backend/index.js').default;
 if(typeof app!=='function')throw Error('Missing Express export');
 const server=app.listen(0,'127.0.0.1',async()=>{try{
 const base='http://127.0.0.1:'+server.address().port;
 for(const path of ['/health','/api/health']){
 const r=await fetch(base+path);const body=await r.json();
 if(r.status!==200||body.status!=='ok'||body.configured!==false)throw Error('Health response: '+path);
 }
 console.log('Compiled shared imports and health passed');
 }catch(e){process.exitCode=1;console.error(e.message)}finally{server.close()}});`;
 const output=execFileSync(process.execPath,['-e',script],{cwd:process.cwd(),env:{...process.env,VERCEL:'1',NODE_ENV:'production',CORS_ORIGINS:'https://player.example.test',DATABASE_URL:'',SUPABASE_URL:'',SUPABASE_SECRET_KEY:'',SUPABASE_SERVICE_ROLE_KEY:''},timeout:20000,encoding:'utf8'});
 assert.match(output,/Compiled shared imports and health passed/);
});
