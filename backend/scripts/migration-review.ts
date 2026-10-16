import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Database } from '../src/postgres';
export function migrationFiles(){
 const folder=resolve(process.cwd(),'../supabase/migrations');
 const files=readdirSync(folder).filter(f=>/^20261015000[1-9]_.+\.sql$/.test(f)).sort();
 if(files.length!==9||files.some((f,i)=>!f.startsWith('20261015000'+(i+1)+'_')))throw new Error('Expected exactly the reviewed migration sequence 001-009.');
 return files.map(file=>{const sql=readFileSync(resolve(folder,file),'utf8');const boundaries=sql.match(/^\s*(?:begin|commit);[ \t]*$/gmi)||[];if(boundaries.length!==2||!/^\s*begin;/i.test(boundaries[0])||!/^\s*commit;/i.test(boundaries[1]))throw new Error('Unexpected transaction boundaries in '+file);return {file,checksum:createHash('sha256').update(sql).digest('hex'),sql:sql.replace(/^\s*(?:begin|commit);[ \t]*$/gmi,'')};});
}
export async function migrationPreflight(db:Database){
 const prerequisites=await db.query<{ready:boolean}>(`select to_regclass('auth.users') is not null and to_regprocedure('auth.uid()') is not null and to_regclass('storage.buckets') is not null and to_regclass('storage.objects') is not null and to_regprocedure('storage.foldername(text)') is not null and exists(select 1 from pg_roles where rolname='anon') and exists(select 1 from pg_roles where rolname='authenticated') ready`);
 if(!prerequisites.rows[0].ready)throw new Error('Requires managed Supabase Auth/Storage schemas and roles, even though application login does not use Supabase Auth.');
 const files=migrationFiles();const ledger=await db.query<{present:boolean}>("select to_regclass('app_private.schema_migrations') is not null present");
 if(ledger.rows[0].present){const applied=await db.query<{version:string;checksum:string}>('select version,checksum from app_private.schema_migrations order by version');if(applied.rows.length!==files.length||files.some((f,i)=>applied.rows[i].version!==f.file||applied.rows[i].checksum!==f.checksum))throw new Error('Existing migration ledger differs. Review deployment history; automatic upgrades are not supported by this fresh-schema runner.');return {status:'already-applied',files:files.map(f=>f.file)};}
 const objects=await db.query<{n:number}>(`select (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','p','v','m','f'))::int + (select count(*) from pg_namespace where nspname='app_private')::int n`);
 if(objects.rows[0].n)throw new Error('Fresh-schema runner requires an empty public schema and no app_private schema. No existing data will be changed.');
 const customFunctions=await db.query<{n:number}>(`select count(*)::int n from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and not exists(select 1 from pg_depend d where d.classid='pg_proc'::regclass and d.objid=p.oid and d.deptype='e')`);
 if(customFunctions.rows[0].n)throw new Error('Unrelated public functions exist; broad privilege revocations require manual review.');
 return {status:'ready-empty-schema',files:files.map(f=>f.file)};
}
export async function applyMigrations(db:Database,approved:boolean){
 if(!approved)throw new Error('Migrations require the explicit --apply flag after review/approval.');
 return db.transaction(async tx=>{
  await tx.query('select pg_advisory_xact_lock(63421056)');const state=await migrationPreflight(tx);if(state.status==='already-applied')return state;
  for(const file of migrationFiles())await tx.query(file.sql);
  await tx.query('create table app_private.schema_migrations(version text primary key,checksum text not null,applied_at timestamptz not null default now())');
  await tx.query('revoke all on app_private.schema_migrations from public,anon,authenticated');
  for(const file of migrationFiles())await tx.query('insert into app_private.schema_migrations(version,checksum) values($1,$2)',[file.file,file.checksum]);
  return {status:'applied-atomically',files:state.files};
 });
}
