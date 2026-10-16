import type { Database } from '../src/postgres';
import { dataset, entities, keyExpression, requireDevelopment, type Entity, type SeedPolicy } from './dev-fixtures';
type ForeignKey={child:string;parent:string;child_columns:string[];parent_columns:string[]};
export async function cleanupLahore(db:Database,policy:SeedPolicy){
 requireDevelopment(policy);
 return db.transaction(async tx=>{
  await tx.query('select pg_advisory_xact_lock(63421057)');
  const exists=await tx.query<{present:boolean}>("select to_regclass('app_private.dev_seed_runs') is not null present");if(!exists.rows[0].present)return {removed:0};
  const run=await tx.query('select dataset from app_private.dev_seed_runs where dataset=$1',[dataset]);if(!run.rows.length)return {removed:0};
  const registered=await tx.query<{entity:string}>('select distinct entity from app_private.dev_fixture_records where dataset=$1',[dataset]);if(registered.rows.some(r=>!(r.entity in entities)))throw new Error('Unknown fixture entity. Cleanup refused.');
  const tables=Object.values(entities).map(e=>e[0]);
  // Lock before checking incoming references: an unregistered concurrent insert cannot race a cascade.
  await tx.query('lock table '+tables.join(',')+' in share row exclusive mode');
  const relations=await tx.query<ForeignKey>(`select nc.nspname||'.'||cc.relname child,np.nspname||'.'||cp.relname parent,array(select a.attname::text from unnest(f.conkey) with ordinality k(attnum,n) join pg_attribute a on a.attrelid=f.conrelid and a.attnum=k.attnum order by k.n) child_columns,array(select a.attname::text from unnest(f.confkey) with ordinality k(attnum,n) join pg_attribute a on a.attrelid=f.confrelid and a.attnum=k.attnum order by k.n) parent_columns from pg_constraint f join pg_class cc on cc.oid=f.conrelid join pg_namespace nc on nc.oid=cc.relnamespace join pg_class cp on cp.oid=f.confrelid join pg_namespace np on np.oid=cp.relnamespace where f.contype='f' and np.nspname||'.'||cp.relname=any($1::text[])`,[tables]);
  const quote=(v:string)=>'"'+v.replace(/"/g,'""')+'"';
  const incoming=[...new Set(relations.rows.map(f=>f.child))].map(t=>t.split('.').map(quote).join('.'));
  if(incoming.length)await tx.query('lock table '+incoming.join(',')+' in share row exclusive mode');
  for(const fk of relations.rows){
   const parent=(Object.keys(entities) as Entity[]).find(e=>entities[e][0]===fk.parent)!;
   const child=(Object.keys(entities) as Entity[]).find(e=>entities[e][0]===fk.child);
   const childTable=fk.child.split('.').map(quote).join('.');
   const join=fk.child_columns.map((col,i)=>'c.'+quote(col)+'=p.'+quote(fk.parent_columns[i])).join(' and ');
   const unknown=child?`not exists(select 1 from app_private.dev_fixture_records d where d.dataset=$1 and d.entity='${child}' and d.row_key=${keyExpression(child,'c')})`:'true';
   const conflicts=await tx.query(`select 1 from ${childTable} c join ${entities[parent][0]} p on ${join} join app_private.dev_fixture_records r on r.dataset=$1 and r.entity=$2 and r.row_key=${keyExpression(parent,'p')} where ${unknown} limit 1`,[dataset,parent]);
   if(conflicts.rows.length)throw new Error('Cleanup refused: unregistered records in '+fk.child+' reference fixtures. Logout fixture sessions and review added activity; no data was removed.');
  }
  const order:Entity[]=['audit_logs','reviews','game_attendance','join_requests','game_participants','games','bookings','court_blocks','court_hours','courts','venue_managers','venue_applications','venues','player_availability','player_sports','profiles','accounts'];
  let removed=0;
  for(const entity of order){const r=await tx.query<{n:number}>(`with deleted as(delete from ${entities[entity][0]} d using app_private.dev_fixture_records r where r.dataset=$1 and r.entity=$2 and r.row_key=${keyExpression(entity,'d')} returning 1) select count(*)::int n from deleted`,[dataset,entity]);removed+=r.rows[0].n;}
  await tx.query('delete from app_private.dev_fixture_records where dataset=$1',[dataset]);await tx.query('delete from app_private.dev_seed_runs where dataset=$1',[dataset]);
  return {removed};
 });
}
