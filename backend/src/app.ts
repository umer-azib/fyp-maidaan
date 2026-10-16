import { isVercel } from './runtime';
import express, { type Request, type Response, type NextFunction, type Router } from 'express';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { z, ZodError } from 'zod';
import { actionSchema, filterSchema, gameSchema, idSchema, pageSchema, profileSchema } from './validation';
import { check, getGame, getProfile, getVenue, gameSelect, HttpError, mapGame, mapVenue, venueSelect, type GameRow } from './data';

export type AuthContext={userId:string;db:SupabaseClient};
export type Services={publicDb:SupabaseClient|null;authenticate:(token:string)=>Promise<AuthContext>};
export function supabaseServices(url?:string,key?:string):Services {
 const client=()=>url&&key?createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}}):null;
 const publicDb=client();
 return {publicDb,async authenticate(token){
  if(!publicDb||!url||!key)throw new HttpError(503,'NOT_CONFIGURED','Configure Supabase on the server.');
  const {data,error}=await publicDb.auth.getUser(token);
  if(error||!data.user)throw new HttpError(401,'UNAUTHORIZED','Session is invalid or expired. Sign in again.');
  const db=createClient(url,key,{global:{headers:{Authorization:'Bearer '+token}},auth:{persistSession:false,autoRefreshToken:false}});
  return {userId:data.user.id,db};
 }};
}
export function createApp(services:Services,origins:string[]=['http://localhost:5173','http://127.0.0.1:5173'],application?:Router,databaseConfigured=false) {
 const app=express(); app.disable('x-powered-by');
 if(isVercel())app.set('trust proxy',1);
 app.use((_req,res,next)=>{res.locals.requestId=randomUUID();res.setHeader('X-Request-Id',res.locals.requestId);res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');next();});
 app.use(cors({credentials:true,origin(origin,cb){if(!origin||origins.includes(origin))cb(null,true);else cb(new HttpError(403,'ORIGIN_DENIED','Origin is not allowed.'));}}));
 app.use(['/v1/me/avatar','/v1/hub/venues/:id/media'],express.json({limit:'8mb'}));
 app.use(express.json({limit:'64kb'}));
 app.use('/v1',rateLimit({windowMs:60000,limit:600,standardHeaders:'draft-8',legacyHeaders:false,handler:(_req,res)=>res.status(429).json({error:{code:'RATE_LIMITED',message:'Too many requests. Try again shortly.',requestId:res.locals.requestId}})}));
 const writes=rateLimit({windowMs:60000,limit:30,standardHeaders:'draft-8',legacyHeaders:false,handler:(_req,res)=>res.status(429).json({error:{code:'RATE_LIMITED',message:'Too many changes. Try again shortly.',requestId:res.locals.requestId}})});
 function publicDb(){if(!services.publicDb)throw new HttpError(503,'NOT_CONFIGURED','Configure Supabase on the server.');return services.publicDb;}
 async function auth(req:Request,res:Response,next:NextFunction){try{const match=/^Bearer ([^\s]+)$/i.exec(req.headers.authorization||'');if(!match)throw new HttpError(401,'UNAUTHORIZED','Sign in to continue.');res.locals.auth=await services.authenticate(match[1]);next();}catch(e){next(e)}}
 const context=(res:Response)=>res.locals.auth as AuthContext;
 async function access(res:Response){const {db,userId}=context(res);const [admin,manager]=await Promise.all([db.from('admin_memberships').select('user_id').eq('user_id',userId).maybeSingle(),db.from('venue_managers').select('venue_id').eq('user_id',userId).limit(1)]);check(admin.error);check(manager.error);return {player:true,admin:!!admin.data,venueManager:!!manager.data?.length};}
 app.get('/health',(_req,res)=>res.json({status:'ok',configured:databaseConfigured||!!services.publicDb}));
 // Keep the existing /v1 cookie scope; 307 preserves POST body and sends the cookie to its authenticated destination.
 if(application)app.post('/api/ai/chat',(_req,res)=>res.redirect(307,'/v1/ai/chat'));
 if(application)app.use('/v1',application);
 app.get('/v1/locations',async(_req,res)=>{const db=publicDb();const [cities,areas]=await Promise.all([db.from('cities').select('*').order('name'),db.from('areas').select('*').order('name')]);check(cities.error);check(areas.error);res.json({cities:(cities.data||[]).map(c=>({id:c.id,name:c.name,country:c.country,timezone:c.timezone})),areas:(areas.data||[]).map(a=>({id:a.id,name:a.name,cityId:a.city_id}))});});
 app.get('/v1/venues',async(req,res)=>{
  const f=filterSchema.parse(req.query),start=(f.page-1)*f.pageSize;
  const {data,error,count}=await publicDb().rpc('discover_venues',{p_city:f.cityId,p_area:f.areaId||null,p_lat:f.latitude??null,p_lng:f.longitude??null,p_radius:f.radiusKm},{count:'exact'}).select(venueSelect).range(start,start+f.pageSize-1);
  check(error);res.json({data:(data||[]).map(mapVenue),page:f.page,pageSize:f.pageSize,total:count||0});
 });
 app.get('/v1/venues/:id',async(req,res)=>res.json(await getVenue(publicDb(),idSchema.parse(req.params.id))));
 app.get('/v1/courts/:id/availability',async(req,res)=>{
  const id=idSchema.parse(req.params.id);const date=z.iso.date().parse(req.query.date);
  const {data,error}=await publicDb().from('courts').select('venue_id').eq('id',id).single();check(error);if(!data)throw new HttpError(404,'NOT_FOUND','Court not found.');
  const venue=await getVenue(publicDb(),data.venue_id),court=venue.courts.find(c=>c.id===id);
  res.json({courtId:id,date,timezone:'Asia/Karachi',hours:venue.verified&&venue.source==='onboarded'?court?.hours.filter(h=>h.dayOfWeek===new Date(date+'T00:00:00Z').getUTCDay())||[]:[],bookingEnabled:false,message:'Opening hours are informational. Live slot availability and booking are not enabled yet.'});
 });
 app.get('/v1/me/access',auth,async(_req,res)=>res.json(await access(res)));
 app.get('/v1/hub/access',auth,async(_req,res)=>{const permissions=await access(res);if(!permissions.venueManager)throw new HttpError(403,'FORBIDDEN','Verified venue-manager access is required.');res.json(permissions)});
 app.get('/v1/admin/access',auth,async(_req,res)=>{const permissions=await access(res);if(!permissions.admin)throw new HttpError(403,'FORBIDDEN','Administrator access is required.');res.json(permissions)});
 app.get('/v1/me/profile',auth,async(_req,res)=>{const {db,userId}=context(res);res.json(await getProfile(db,userId))});
 app.put('/v1/me/profile',auth,writes,async(req,res)=>{const input=profileSchema.parse(req.body),{db,userId}=context(res);const result=await db.rpc('save_profile',{p:input});check(result.error);res.json(await getProfile(db,userId));});
 app.get('/v1/me/games',auth,async(req,res)=>{const p=pageSchema.parse(req.query),start=(p.page-1)*p.pageSize;const {data,error,count}=await context(res).db.rpc('my_games',{}, {count:'exact'}).select(gameSelect).range(start,start+p.pageSize-1);check(error);res.json({data:((data||[]) as unknown as GameRow[]).map(mapGame),...p,total:count||0});});
 app.get('/v1/games',auth,async(req,res)=>{
  const f=filterSchema.parse(req.query),start=(f.page-1)*f.pageSize;
  const {data,error,count}=await context(res).db.rpc('discover_games',{p_city:f.cityId,p_area:f.areaId||null,p_lat:f.latitude??null,p_lng:f.longitude??null,p_radius:f.radiusKm},{count:'exact'}).select(gameSelect).range(start,start+f.pageSize-1);check(error);res.json({data:((data||[]) as unknown as GameRow[]).map(mapGame),page:f.page,pageSize:f.pageSize,total:count||0});
 });
 app.get('/v1/games/:id',auth,async(req,res)=>res.json(await getGame(context(res).db,idSchema.parse(req.params.id))));
 app.post('/v1/games',auth,writes,async(req,res)=>{const input=gameSchema.parse(req.body),{db}=context(res);const result=await db.rpc('create_game',{p:input});check(result.error);res.status(201).json(await getGame(db,result.data));});
 app.post('/v1/games/:id/actions',auth,writes,async(req,res)=>{const id=idSchema.parse(req.params.id),action=actionSchema.parse(req.body),{db}=context(res);const result=await db.rpc('game_action',{p_id:id,p_action:action.type,p_player:'playerId'in action?action.playerId:null,p_input:action.type==='edit'?action.input:null});check(result.error);res.json(await getGame(db,id));});
 app.use((_req,_res,next)=>next(new HttpError(404,'NOT_FOUND','Endpoint not found.')));
 app.use((error:unknown,_req:Request,res:Response,_next:NextFunction)=>{
  if(error&&typeof error==='object'&&'code' in error&&'severity' in error){try{check({code:String(error.code),message:'message' in error?String(error.message):'Database request failed.'})}catch(mapped){error=mapped}}
  if(error instanceof ZodError){res.status(400).json({error:{code:'INVALID_INPUT',message:error.issues.map(i=>i.path.join('.')+': '+i.message).join('; '),requestId:res.locals.requestId}});return;}
  if(error&&typeof error==='object'&&'type' in error&&error.type==='entity.too.large'){res.status(413).json({error:{code:'PAYLOAD_TOO_LARGE',message:'JSON payload must be at most 64 KB.',requestId:res.locals.requestId}});return;}
  const e=error instanceof HttpError?error:error instanceof SyntaxError?new HttpError(400,'INVALID_JSON','Invalid JSON body.'):new HttpError(500,'INTERNAL_ERROR','Something went wrong.');
  if(e.status===500)console.error('API error',res.locals.requestId,error instanceof Error?error.name:'unknown');
  res.status(e.status).json({error:{code:e.code,message:e.message,requestId:res.locals.requestId}});
 });
 return app;
}
