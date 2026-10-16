import { isProduction } from './runtime';
import type {Database} from './postgres';
export async function provisionAdministrator(db:Database,email:string,environment:string|undefined,grant=false){
 if(environment!=='development'||isProduction())throw new Error('Administrator provisioning requires local NODE_ENV=development and is disabled on Vercel.');
 if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)||email.length>254)throw new Error('Supply the exact approved account email.');
 return db.transaction(async tx=>{
  const r=await tx.query<{id:string;status:string;password_hash:string|null;is_development_fixture:boolean;profile:boolean;admin:boolean}>(`select a.id,a.status,a.password_hash,a.is_development_fixture,exists(select 1 from public.profiles where id=a.id) profile,exists(select 1 from public.admin_memberships where user_id=a.id) admin from app_private.accounts a where a.email=$1 for update`,[email.trim().toLowerCase()]);
  const a=r.rows[0];if(!a||a.status!=='active'||a.is_development_fixture||!a.password_hash||!a.profile)throw new Error('Requires an active, registered, non-fixture application account with a profile. No account or password was created.');
  if(!grant)return {userId:a.id,status:a.admin?'already-admin':'eligible-dry-run'};
  if(a.admin)return {userId:a.id,status:'already-admin'};
  await tx.query('insert into public.admin_memberships(user_id) values($1)',[a.id]);
  await tx.query("insert into public.audit_logs(action,entity_id) values('admin.provision.trusted_cli',$1)",[a.id]);
  return {userId:a.id,status:'granted'};
 });
}
