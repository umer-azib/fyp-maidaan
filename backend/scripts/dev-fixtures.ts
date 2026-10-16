import { isProduction } from '../src/runtime';
import { createHash } from 'node:crypto';
import type { Database } from '../src/postgres';
export const dataset='maidaan-lahore-dev-v1';
export const fixturePassword='MaidaanDev!2026';
export const entities={
 accounts:['app_private.accounts',['id']],profiles:['public.profiles',['id']],
 venues:['public.venues',['id']],courts:['public.courts',['id']],
 venue_applications:['app_private.venue_applications',['venue_id']],venue_managers:['public.venue_managers',['venue_id','user_id']],
 player_sports:['public.player_sports',['player_id','sport']],player_availability:['public.player_availability',['id']],
 court_hours:['public.court_hours',['id']],court_blocks:['public.court_blocks',['id']],
 bookings:['public.bookings',['id']],games:['public.games',['id']],game_participants:['public.game_participants',['game_id','player_id']],
 join_requests:['public.join_requests',['game_id','player_id']],game_attendance:['public.game_attendance',['game_id','player_id']],
 reviews:['public.reviews',['id']],audit_logs:['public.audit_logs',['id']],
} as const;
export type Entity=keyof typeof entities;
export type SeedPolicy={environment:string|undefined;enabled:string|undefined};
export function requireDevelopment(policy:SeedPolicy){if(isProduction()||policy.environment!=='development'||policy.enabled!=='true')throw new Error('Development fixtures require NODE_ENV=development and MAIDAAN_ENABLE_DEV_SEED=true. Never target a production database.');}
export function fixtureId(key:string){const hex=createHash('sha256').update(dataset+':'+key).digest('hex').slice(0,32).split('');hex[12]='4';hex[16]='8';const value=hex.join('');return [value.slice(0,8),value.slice(8,12),value.slice(12,16),value.slice(16,20),value.slice(20)].join('-');}
export const keyExpression=(entity:Entity,alias:string)=>'jsonb_build_object('+entities[entity][1].map(k=>`'${k}',to_jsonb(${alias})->'${k}'`).join(',')+')';
export async function prepareRegistry(db:Database){
 await db.query(`create table if not exists app_private.dev_seed_runs(dataset text primary key,anchor_date date not null,version integer not null,created_at timestamptz not null default now())`);
 await db.query(`create table if not exists app_private.dev_fixture_records(dataset text not null references app_private.dev_seed_runs,entity text not null,row_key jsonb not null,primary key(dataset,entity,row_key))`);
 await db.query('revoke all on app_private.dev_seed_runs,app_private.dev_fixture_records from public,anon,authenticated');
}
export async function capture(db:Database,entity:Entity,where:string,values:unknown[]=[]){
 await db.query(`insert into app_private.dev_fixture_records(dataset,entity,row_key) select '${dataset}','${entity}',${keyExpression(entity,'r')} from ${entities[entity][0]} r where ${where} on conflict do nothing`,values);
}
export async function insertFixtures(db:Database,entity:Entity,rows:Record<string,unknown>[]){
 if(!rows.length)return;
 const table=entities[entity][0],keys=entities[entity][1];
 const columns=Object.keys(rows[0]);
 if(!columns.every(c=>/^[a-z_]+$/.test(c))||rows.some(row=>Object.keys(row).sort().join()!==[...columns].sort().join()))throw new Error('Invalid fixture columns.');
 const join=keys.map(k=>`existing.${k}=incoming.${k}`).join(' and ');
 const collision=await db.query(`select 1 from ${table} existing join jsonb_populate_recordset(null::${table},$1::jsonb) incoming on ${join} limit 1`,[JSON.stringify(rows)]);
 if(collision.rows.length)throw new Error('Refusing to overwrite an existing '+entity+' record. Cleanup owned fixtures explicitly before rebuilding.');
 await db.query(`with inserted as (insert into ${table}(${columns.join(',')}) select ${columns.join(',')} from jsonb_populate_recordset(null::${table},$1::jsonb) returning *) insert into app_private.dev_fixture_records(dataset,entity,row_key) select $2,$3,${keyExpression(entity,'i')} from inserted i`,[JSON.stringify(rows),dataset,entity]);
}
export async function assertSchema(db:Database){const r=await db.query<{ready:boolean}>(`select to_regclass('app_private.accounts') is not null and to_regclass('public.game_series') is not null and exists(select 1 from information_schema.columns where table_schema='app_private' and table_name='accounts' and column_name='is_development_fixture') ready`);if(!r.rows[0].ready)throw new Error('Apply the reviewed full 001-009 migration chain before seeding.');}
