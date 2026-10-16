import 'dotenv/config';
import {readFileSync,writeFileSync} from 'node:fs';
import {z} from 'zod';
import {postgresDatabase,type Database} from '../src/postgres';
import {hashApplicationPassword} from '../src/accounts';
import {fixtureId,fixturePassword} from './dev-fixtures';
const record=z.object({sourceId:z.string(),name:z.string().max(160),area:z.string(),address:z.string(),latitude:z.number().min(31.2).max(31.72),longitude:z.number().min(74.05).max(74.65),sports:z.array(z.enum(['Cricket','Football','Badminton','Padel'])),sources:z.array(z.url()).min(1),verifiedAt:z.iso.datetime({offset:true}),category:z.string(),website:z.url().nullable(),phone:z.string().nullable(),openingHours:z.string().nullable(),coordinateBasis:z.string(),originalName:z.string()});
export async function importRealVenues(db:Database,records:z.infer<typeof record>[],apply=false){
 const rows=z.array(record).min(19).parse(records);if(new Set(rows.map(v=>v.sourceId)).size!==rows.length)throw Error('Duplicate source identifiers.');
 const ready=await db.query("select 1 from information_schema.columns where table_schema='public' and table_name='venues' and column_name='directory_metadata'");if(!ready.rows.length)throw Error('Apply reviewed migration 011 first.');
 const hash=apply?await hashApplicationPassword(fixturePassword):'';
 return db.transaction(async tx=>{
  if(!apply)await tx.query('set transaction read only');else await tx.query('select pg_advisory_xact_lock(63421060)');
  const areas=(await tx.query<{id:string;name:string}>('select id,name from public.areas where city_id=\'lahore\'')).rows;
  const results=[];
  for(const [index,v] of rows.entries()){
   const suffix=String(index+1).padStart(2,'0'),username='dev_venue_owner_'+suffix,ownerId=fixtureId('directory-owner:'+v.sourceId),venueId=fixtureId('directory-venue:'+v.sourceId);
   const previous=await tx.query<{id:string}>('select id from app_private.accounts where ((username=$1 or email=$2) and id<>$3) or (id=$3 and not is_development_fixture)',[username,'maidaan.venue.demo'+suffix+'@example.com',ownerId]);if(previous.rows.length)throw Error('Account collision; existing account was not overwritten: '+username);
   const match=await tx.query<{id:string}>('select id from public.venues where id<>$1 and (directory_metadata->>\'sourceId\'=$2 or (lower(regexp_replace(name,\'[^a-zA-Z0-9]\',\'\',\'g\'))=lower(regexp_replace($3,\'[^a-zA-Z0-9]\',\'\',\'g\')) and public.distance_km(latitude,longitude,$4,$5)<0.15))',[venueId,v.sourceId,v.name,v.latitude,v.longitude]);if(match.rows.length)throw Error('Potential existing real venue match '+v.name+'; review ownership manually. Nothing overwritten.');
   const existing=await tx.query<{source:string;metadata:{sourceId?:string}|null;ownerId:string}>('select source,directory_metadata metadata,owner_id as "ownerId" from public.venues where id=$1',[venueId]);if(existing.rows.length&&(existing.rows[0].source!=='directory'||existing.rows[0].metadata?.sourceId!==v.sourceId))throw Error('Stable ID collision; import stopped.');
   if(existing.rows.length&&existing.rows[0].ownerId!==ownerId)throw Error('Ownership changed; refusing to reassign a real claim to an FYP account.');
   let area=areas.find(a=>a.name.toLowerCase()===v.area.toLowerCase())||areas.find(a=>a.id==='lahore-'+v.area.toLowerCase().replace(/ /g,'-'));
   if(apply){
    if(!area){const areaId='lahore-'+v.area.toLowerCase().replace(/[^a-z0-9]+/g,'-');await tx.query('insert into public.areas(id,city_id,name) values($1,\'lahore\',$2) on conflict(id) do nothing',[areaId,v.area]);area={id:areaId,name:v.area};areas.push(area);}
    await tx.query("insert into app_private.accounts(id,email,username,password_hash,is_development_fixture) values($1,$2,$3,$4,true) on conflict(id) do nothing",[ownerId,'maidaan.venue.demo'+suffix+'@example.com',username,hash]);
    await tx.query("insert into public.profiles(id,name,username,bio,city_id,area_id) values($1,$2,$3,'FYP simulation account. Not a representative of the real business.','lahore',$4) on conflict(id) do nothing",[ownerId,'FYP Venue Manager '+suffix,username,area?.id||null]);
    await tx.query(`insert into public.venues(id,name,description,address,city_id,area_id,latitude,longitude,phone,source,verified,published,approval_status,owner_id,directory_metadata) values($1,$2,$3,$4,'lahore',$5,$6,$7,$8,'directory',false,true,'approved',$9,$10::jsonb) on conflict(id) do nothing`,[venueId,v.name,'Public sports directory. Real location; unclaimed business. FYP demo management does not verify ownership. No Maidaan booking inventory or partnership is represented.',v.address,area?.id||null,v.latitude,v.longitude,v.phone,ownerId,JSON.stringify({...v,demoManaged:true,demoUsername:username})]);
    await tx.query('update public.venues set area_id=$2 where id=$1 and area_id is null and source=\'directory\'',[venueId,area?.id||null]);
    await tx.query('insert into public.venue_managers(venue_id,user_id) values($1,$2) on conflict do nothing',[venueId,ownerId]);
   }
   const count=await tx.query<{n:number}>('select count(*)::int n from public.courts where venue_id=$1',[venueId]);results.push({name:v.name,area:v.area,venueId,username,courts:count.rows[0].n,status:apply?'FYP management; ownership unverified; public booking disabled':'dry-run'});
  }
  return results;
 });
}
async function main(){
 if(process.env.NODE_ENV!=='development'||process.env.MAIDAAN_ENABLE_DIRECTORY_IMPORT!=='true')throw Error('Requires NODE_ENV=development and MAIDAAN_ENABLE_DIRECTORY_IMPORT=true. Production is forbidden.');
 const args=process.argv.slice(2);if(args.length!==1||!['--check','--apply'].includes(args[0]))throw Error('Use --check or --apply.');if(!process.env.DATABASE_URL)throw Error('Configure DATABASE_URL.');
 const db=postgresDatabase(process.env.DATABASE_URL);try{const results=await importRealVenues(db,JSON.parse(readFileSync('data/lahore-real-venues.json','utf8')),args[0]==='--apply');console.log(JSON.stringify({status:args[0],venues:results.length,accounts:results.length},null,2));if(args[0]==='--apply')writeFileSync('../docs/LAHORE-VENUE-ACCOUNTS.md','# Lahore real venue FYP accounts\n\nDevelopment only. Password follows the existing fixture convention in docs/DEMO-DATA.md. All business ownership is unverified; public booking remains disabled. No admin permissions. Zero courts are invented.\n\n| Venue | Area | Demo username | Venue ID | Courts | Status |\n|---|---|---|---|---|---|\n'+results.map(v=>`| ${v.name} | ${v.area} | ${v.username} | ${v.venueId} | ${v.courts} | ${v.status} |`).join('\n')+'\n');}finally{await db.close()}
}
if(require.main===module)void main().catch(e=>{console.error((e instanceof Error?e.message:'Import failed').replace(/postgres(?:ql)?:\/\/[^\s]+/gi,'[database URL redacted]'));process.exitCode=1});
