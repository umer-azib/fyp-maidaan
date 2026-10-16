import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { hash, compare, truncates } from 'bcryptjs';
import { z } from 'zod';
import type { Database } from './postgres';
import { actor } from './postgres';
import { HttpError } from './data';
import { profileSchema } from './validation';
export const passwordSchema=z.string().min(10).max(72).refine(p=>!truncates(p),'Password must be at most 72 UTF-8 bytes.');
export const hashApplicationPassword=(password:string)=>hash(passwordSchema.parse(password),12);
export const registerSchema=z.object({
 name:z.string().trim().min(1).max(80),username:z.string().trim().toLowerCase().regex(/^[a-z0-9_]{3,30}$/),email:z.email().trim().toLowerCase().max(254),
 password:passwordSchema,confirmation:z.string(),phone:z.string().regex(/^(?:\+92|0)3[0-9]{9}$/).optional(),
 profile:z.object({bio:profileSchema.shape.bio,cityId:profileSchema.shape.cityId,areaId:profileSchema.shape.areaId,avatarPath:z.null().optional(),sports:profileSchema.shape.sports}).strict().optional(),
 dateOfBirth:z.iso.date().optional(),preferredAreas:z.array(z.string().max(80)).max(12).default([]),
 availability:z.array(z.object({dayOfWeek:z.number().int().min(0).max(6),startsAt:z.string().regex(/^\d{2}:\d{2}$/),endsAt:z.string().regex(/^\d{2}:\d{2}$/)}).refine(x=>x.endsAt>x.startsAt,'End must follow start.')).max(21).default([]),
 kind:z.enum(['player','owner']).default('player')
}).strict().refine(x=>x.password===x.confirmation,'Passwords do not match.').refine(x=>!x.dateOfBirth||x.dateOfBirth<new Date().toISOString().slice(0,10),'Choose a past birth date.');
export type Identity={userId:string;sessionHash:string;client:'web'|'mobile';expiresAt:string};
export const digest=(token:string)=>createHash('sha256').update(token).digest('hex');
export function accountService(db:Database,allowDevelopmentFixtures=false){
 const dummy=hash(randomBytes(32).toString('hex'),12);
 async function issue(tx:Database,userId:string,client:'web'|'mobile',absolute?:Date|string){
  const token=randomBytes(32).toString('base64url');
  const r=await tx.query<{expires_at:Date|string}>("insert into app_private.sessions(token_hash,account_id,client,expires_at,absolute_expires_at) values($1,$2,$3,least(now()+interval '7 days',coalesce($4::timestamptz,now()+interval '30 days')),coalesce($4::timestamptz,now()+interval '30 days')) returning expires_at",[digest(token),userId,client,absolute||null]);
  return {userId,token,expiresAt:new Date(r.rows[0].expires_at).toISOString()};
 }
 return {
 async register(raw:unknown,client:'web'|'mobile'){
  const input=registerSchema.parse(raw),passwordHash=await hashApplicationPassword(input.password),id=randomUUID();
  return db.transaction(async tx=>{
   await tx.query('insert into app_private.accounts(id,email,username,password_hash,phone) values($1,$2,$3,$4,$5)',[id,input.email,input.username,passwordHash,input.phone||null]);
   await tx.query('insert into public.profiles(id,name,username,date_of_birth,preferred_areas) values($1,$2,$3,$4,$5)',[id,input.name,input.username,input.dateOfBirth||null,input.preferredAreas]);
   await tx.query("select set_config('request.jwt.claim.sub',$1,true)",[id]);
   await tx.query('select public.save_profile($1::jsonb)',[JSON.stringify({...input.profile,name:input.name,username:input.username,bio:input.profile?.bio||'',cityId:input.profile?.cityId||'lahore',areaId:input.profile?.areaId||null,avatarPath:null,sports:input.profile?.sports||[]})]);
   for(const slot of input.availability)await tx.query('insert into public.player_availability(player_id,day_of_week,starts_at,ends_at) values($1,$2,$3,$4)',[id,slot.dayOfWeek,slot.startsAt,slot.endsAt]);
   return issue(tx,id,client);
  });
 },
 async login(identifier:string,password:string,client:'web'|'mobile'){
  const r=await db.query<{id:string;password_hash:string|null;status:string;is_development_fixture:boolean}>('select id,password_hash,status,is_development_fixture from app_private.accounts where email=$1 or username=$1',[identifier.trim().toLowerCase()]);
  const account=r.rows[0];const valid=await compare(password,account?.password_hash||await dummy);
  if(!account||!valid||account.status!=='active'||(account.is_development_fixture&&!allowDevelopmentFixtures)||truncates(password))throw new HttpError(401,'INVALID_CREDENTIALS','Incorrect username/email or password.');
  return db.transaction(tx=>issue(tx,account.id,client));
 },
 async authenticate(token:string,client:'web'|'mobile'):Promise<Identity>{
  if(!/^[A-Za-z0-9_-]{43}$/.test(token))throw new HttpError(401,'UNAUTHORIZED','Sign in to continue.');
  const r=await db.query<{account_id:string;expires_at:Date|string}>(`update app_private.sessions s set expires_at=least(now()+interval '7 days',absolute_expires_at) from app_private.accounts a
   where s.token_hash=$1 and s.client=$2 and s.account_id=a.id and a.status='active' and s.expires_at>now() and s.absolute_expires_at>now() and (not a.is_development_fixture or $3) returning s.account_id,s.expires_at`,[digest(token),client,allowDevelopmentFixtures]);
  if(!r.rows[0])throw new HttpError(401,'UNAUTHORIZED','Session expired. Sign in again.');
  return {userId:r.rows[0].account_id,sessionHash:digest(token),client,expiresAt:new Date(r.rows[0].expires_at).toISOString()};
 },
 async logout(identity:Identity){await db.query('delete from app_private.sessions where token_hash=$1',[identity.sessionHash])},
 async renew(identity:Identity){return actor(db,identity.userId,async tx=>{const old=await tx.query<{absolute_expires_at:Date|string}>('delete from app_private.sessions where token_hash=$1 and expires_at>now() returning absolute_expires_at',[identity.sessionHash]);if(!old.rows[0])throw new HttpError(401,'UNAUTHORIZED','Session expired.');return issue(tx,identity.userId,identity.client,old.rows[0].absolute_expires_at)})}
 };
}
