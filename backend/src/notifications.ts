import type {Request,Response,NextFunction,Router} from 'express';
import {z} from 'zod';
import type {Database} from './postgres';
import {HttpError} from './data';
export function notificationRoutes(router:Router,db:()=>Database,auth:(req:Request,res:Response,next:NextFunction)=>void,validate:(req:Request)=>Promise<unknown>){
 const streams=new Map<string,number>();
 const user=(res:Response)=>String(res.locals.identity.userId);
 const columns='id::text,type,game_id as "gameId",booking_id as "bookingId",title,message,created_at as "createdAt",read_at as "readAt"';
 async function ready(){const r=await db().query<{ok:boolean}>("select to_regclass('public.notifications') is not null ok");if(!r.rows[0].ok)throw new HttpError(503,'NOTIFICATIONS_UNAVAILABLE','Notifications are temporarily unavailable. Please try again later.');}
 const count=async(id:string)=>Number((await db().query<{n:number}>('select count(*)::int n from public.notifications where recipient_id=$1 and read_at is null',[id])).rows[0].n);
 router.get('/notifications',auth,async(req,res)=>{await ready();const page=z.coerce.number().int().min(1).max(10000).default(1).parse(req.query.page),size=30;const r=await db().query('select '+columns+' from public.notifications where recipient_id=$1 order by id desc limit $2 offset $3',[user(res),size,(page-1)*size]);res.json({data:r.rows,unreadCount:await count(user(res)),page,pageSize:size})});
 router.patch('/notifications/:id/read',auth,async(req,res)=>{await ready();const id=z.string().regex(/^[0-9]{1,20}$/).parse(req.params.id);const r=await db().query('update public.notifications set read_at=coalesce(read_at,now()) where id=$1 and recipient_id=$2 returning id',[id,user(res)]);if(!r.rows.length)throw new HttpError(404,'NOT_FOUND','Notification not found.');res.json({ok:true,unreadCount:await count(user(res))})});
 router.post('/notifications/read-all',auth,async(_req,res)=>{await ready();await db().query('update public.notifications set read_at=now() where recipient_id=$1 and read_at is null',[user(res)]);res.json({ok:true,unreadCount:0})});
 router.get('/notifications/stream',auth,async(req,res)=>{
  await ready();const id=user(res);if((streams.get(id)||0)>=4)throw new HttpError(429,'TOO_MANY_STREAMS','Too many notification windows are open.');
  let cursor=z.string().regex(/^[0-9]{1,20}$/).parse(req.header('Last-Event-ID')||req.query.after||'0');let closed=false,running=false,lastValidation=Date.now();
  streams.set(id,(streams.get(id)||0)+1);
  res.status(200).set({'Content-Type':'text/event-stream','Cache-Control':'no-cache, no-transform','Connection':'keep-alive','X-Accel-Buffering':'no'});res.flushHeaders();res.write('retry: 2000\nevent: ready\ndata: {}\n\n');
  const close=()=>{if(closed)return;closed=true;clearInterval(timer);clearTimeout(lifetime);streams.set(id,Math.max(0,(streams.get(id)||1)-1));res.end()};
  const tick=async()=>{if(closed||running)return;running=true;try{
   if(Date.now()-lastValidation>=15000){await validate(req);lastValidation=Date.now();}
   const rows=await db().query<{id:string}>('select '+columns+' from public.notifications where recipient_id=$1 and id>$2::bigint order by id limit 100',[id,cursor]);if(closed)return;
   const unreadCount=await count(id);if(closed)return;
   if(rows.rows.length){cursor=rows.rows.at(-1)!.id;res.write('id: '+cursor+'\nevent: notifications\ndata: '+JSON.stringify({data:rows.rows,unreadCount})+'\n\n');}else res.write('event: heartbeat\ndata: '+JSON.stringify({unreadCount})+'\n\n');
  }catch{close()}finally{running=false}};
  const timer=setInterval(()=>void tick(),2000),lifetime=setTimeout(close,30*60000);req.on('close',close);res.on('error',close);void tick();
 });
}
