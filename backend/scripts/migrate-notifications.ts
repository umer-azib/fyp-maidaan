import 'dotenv/config';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {postgresDatabase} from '../src/postgres';
async function main(){
 const args=process.argv.slice(2);if(args.length!==1||!['--check','--apply'].includes(args[0]))throw new Error('Use --check or --apply after explicit migration approval.');
 if(!process.env.DATABASE_URL)throw new Error('Configure private DATABASE_URL.');
 const name='202610150010_notifications.sql',sql=readFileSync(resolve(process.cwd(),'../supabase/migrations',name),'utf8'),checksum=createHash('sha256').update(sql).digest('hex');
 const db=postgresDatabase(process.env.DATABASE_URL);
 try{const result=await db.transaction(async tx=>{
  if(args[0]==='--check')await tx.query('set transaction read only');else await tx.query('select pg_advisory_xact_lock(63421058)');
  const state=(await tx.query<{ready:boolean;exists:boolean;ledger:boolean}>("select to_regclass('public.game_series') is not null and to_regclass('app_private.accounts') is not null ready,to_regclass('public.notifications') is not null exists,to_regclass('app_private.schema_updates') is not null ledger")).rows[0];
  if(!state.ready)throw new Error('Reviewed migrations 001-009 must already be deployed.');
  if(state.exists){if(!state.ledger)throw new Error('Notifications already exists without this migration ledger. Review manually; no overwrite attempted.');const saved=await tx.query<{checksum:string}>('select checksum from app_private.schema_updates where version=$1',[name]);if(saved.rows[0]?.checksum!==checksum)throw new Error('Migration checksum differs. Stop and review; no changes applied.');return {status:'already-applied',migration:name};}
  if(args[0]==='--check')return {status:'ready-additive',migration:name,checksum};
  await tx.query(sql.replace(/^\s*(?:begin|commit);[ \t]*$/gmi,''));
  await tx.query('create table if not exists app_private.schema_updates(version text primary key,checksum text not null,applied_at timestamptz not null default now())');await tx.query('revoke all on app_private.schema_updates from public,anon,authenticated');await tx.query('insert into app_private.schema_updates(version,checksum) values($1,$2)',[name,checksum]);return {status:'applied-atomically',migration:name};
 });console.log(JSON.stringify(result,null,2));}finally{await db.close()}
}
void main().catch(e=>{console.error((e instanceof Error?e.message:'Migration check failed').replace(/postgres(?:ql)?:\/\/[^\s]+/gi,'[database URL redacted]'));process.exitCode=1});
