// Test-only in-memory PostgreSQL; never reads DATABASE_URL or writes a remote database.
import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { createApp } from '../src/app';
import { applicationRouter } from '../src/application';
import { accountService } from '../src/accounts';
import type { Database } from '../src/postgres';
async function start(){
 const {btree_gist}=await import('@electric-sql/pglite/contrib/btree_gist');
 const pg=new PGlite({extensions:{btree_gist}});
 await pg.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets,name text);alter table storage.objects enable row level security;create function storage.foldername(name text) returns text[] language sql immutable as $$select string_to_array(name,'/')$$;`);
 const folder=resolve('../supabase/migrations');for(const file of readdirSync(folder).filter(f=>f.endsWith('.sql')).sort())await pg.exec(readFileSync(resolve(folder,file),'utf8'));
 const wrap=(engine:Pick<PGlite,'query'>):Database=>({query:async<T>(sql:string,values?:unknown[])=>({rows:(await engine.query<T>(sql,values)).rows}),transaction:async work=>work(wrap(engine))});
 const db:Database={...wrap(pg),transaction:work=>pg.transaction(tx=>work(wrap(tx)))};
 const accounts=accountService(db);const ids:Record<string,string>={};
 for(const username of ['qa_player','qa_owner','qa_admin']){const session=await accounts.register({name:username,username,email:username+'@example.test',password:'UITestPassword123!',confirmation:'UITestPassword123!'},'web');ids[username]=session.userId;}
 await db.query('insert into public.admin_memberships(user_id) values($1)',[ids.qa_admin]);
 const venue=(await db.query<{id:string}>(`insert into public.venues(name,description,address,city_id,area_id,latitude,longitude,phone,verified,published,approval_status,owner_id) values('Automated QA Venue (test only)','In-memory browser-test fixture','Test address, DHA Lahore','lahore','lahore-dha-1',31.47,74.4,'03001234567',true,true,'approved',$1) returning id`,[ids.qa_owner])).rows[0].id;
 await db.query('insert into public.venue_managers(venue_id,user_id) values($1,$2)',[venue,ids.qa_owner]);
 const court=(await db.query<{id:string}>("insert into public.courts(venue_id,name,sport) values($1,'QA Court 1','Padel') returning id",[venue])).rows[0].id;
 for(let day=0;day<7;day++)await db.query("insert into public.court_hours(court_id,day_of_week,opens_at,closes_at,slot_minutes,price_pkr) values($1,$2,'08:00','23:00',60,2500)",[court,day]);
 const origins=['http://127.0.0.1:5178'];const server=createApp({publicDb:null,authenticate:async()=>{throw new Error('Disabled')}},origins,applicationRouter(db,origins)).listen(3007,'127.0.0.1',()=>console.log('Isolated UI test API ready on 3007'));
 process.on('SIGTERM',()=>server.close(()=>void pg.close().then(()=>process.exit(0))));
}
void start();
