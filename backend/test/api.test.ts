import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createApp, type Services } from '../src/app';
import { HttpError } from '../src/data';
import { gameSchema, profileSchema } from '../src/validation';

test('API fails closed without configuration, credentials or permissions',async()=>{
 let tokenSeen='';
 const db={from(){return {select(){return this},eq(){return this},maybeSingle(){return Promise.resolve({data:null,error:null})},limit(){return Promise.resolve({data:[],error:null})}}}} as unknown as SupabaseClient;
 const services:Services={publicDb:null,async authenticate(token){tokenSeen=token;if(token==='valid')return {userId:'22222222-2222-4222-8222-222222222222',db};throw new HttpError(401,'UNAUTHORIZED','Invalid token.')}};
 const server=createApp(services).listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));
 const address=server.address();assert(address&&typeof address==='object');const base='http://127.0.0.1:'+address.port;
 try{
  let response=await fetch(base+'/health');assert.equal(response.status,200);assert.equal((await response.json()).configured,false);
  response=await fetch(base+'/v1/venues');assert.equal(response.status,503);assert.equal((await response.json()).error.code,'NOT_CONFIGURED');
  response=await fetch(base+'/v1/games');assert.equal(response.status,401);assert.equal(tokenSeen,'');
  response=await fetch(base+'/v1/games',{headers:{Authorization:'Bearer invalid'}});assert.equal(response.status,401);assert.equal(tokenSeen,'invalid');
  for(const token of ['player','hub','admin','demo-player','demo-admin']){
    response=await fetch(base+'/v1/admin/access',{headers:{Authorization:'Bearer '+token}});assert.equal(response.status,401,'Demo/password values are never backend credentials');
  }
  response=await fetch(base+'/v1/admin/access',{headers:{Authorization:'Bearer valid'}});assert.equal(response.status,403);
  response=await fetch(base+'/v1/hub/access',{headers:{Authorization:'Bearer valid'}});assert.equal(response.status,403);
  response=await fetch(base+'/v1/me/access',{headers:{Authorization:'Bearer valid'}});assert.deepEqual(await response.json(),{player:true,admin:false,venueManager:false});
  response=await fetch(base+'/v1/games',{method:'POST',headers:{Authorization:'Bearer valid','Content-Type':'application/json'},body:JSON.stringify({userId:'spoofed'})});assert.equal(response.status,400);const body=await response.json();assert.equal(body.error.code,'INVALID_INPUT');assert(body.error.requestId);
  response=await fetch(base+'/v1/games/not-a-uuid/actions',{method:'POST',headers:{Authorization:'Bearer valid','Content-Type':'application/json'},body:'{"type":"join"}'});assert.equal(response.status,400);
  response=await fetch(base+'/v1/me/profile',{method:'PUT',headers:{Authorization:'Bearer valid','Content-Type':'application/json'},body:'{"admin":true}'});assert.equal(response.status,400);
  response=await fetch(base+'/v1/me/profile',{method:'PUT',headers:{Authorization:'Bearer valid','Content-Type':'application/json'},body:'{'});assert.equal(response.status,400);assert.equal((await response.json()).error.code,'INVALID_JSON');
  response=await fetch(base+'/v1/me/profile',{method:'PUT',headers:{Authorization:'Bearer valid','Content-Type':'application/json'},body:JSON.stringify({bio:'a'.repeat(70000)})});assert.equal(response.status,413);assert.equal((await response.json()).error.code,'PAYLOAD_TOO_LARGE');
  response=await fetch(base+'/v1/venues',{headers:{Origin:'https://untrusted.example'}});assert.equal(response.status,403);
  response=await fetch(base+'/v1/bookings',{method:'POST'});assert.equal(response.status,404,'Booking API is not superficially implemented');
 }finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}
});
test('validation rejects self-assigned permissions and invalid formats',()=>{
 assert.equal(profileSchema.safeParse({name:'Player',username:null,bio:'',cityId:'lahore',areaId:null,avatarPath:null,sports:[],role:'admin'}).success,false);
 const input={sport:'Football',title:'Game',description:'Friendly game',cityId:'lahore',areaId:null,venue:'External venue',location:'Gulberg',latitude:31.5,longitude:74.3,startsAt:new Date(Date.now()+86400000).toISOString(),duration:60,maxPlayers:10,skill:'All levels',joinMode:'instant',format:'5v5',bookingSource:'external'};
 assert.equal(gameSchema.safeParse(input).success,true);assert.equal(gameSchema.safeParse({...input,maxPlayers:12}).success,false);
 assert.equal(gameSchema.safeParse({...input,hostId:'spoof'}).success,false);assert.equal(gameSchema.safeParse({...input,bookingSource:'confirmed'}).success,false);
});

test('public discovery contract returns real database-shaped rows and bounded pagination',async()=>{
 const venue={id:'11111111-1111-4111-8111-111111111111',name:'Test fixture, not a live venue',description:'',address:'Test only',city_id:'lahore',area_id:'lahore-gulberg',latitude:31.5,longitude:74.3,phone:null,facilities:[],photos:[],source:'onboarded',verified:true,courts:[{sport:'Padel'}]};
 let args:unknown;
 const db={rpc(_name:string,params:unknown){args=params;return {select(){return this},range(){return Promise.resolve({data:[venue],error:null,count:1})}}}} as unknown as SupabaseClient;
 const server=createApp({publicDb:db,async authenticate(){throw new Error('Public discovery should not authenticate')}}).listen(0,'127.0.0.1');
 await new Promise<void>(resolve=>server.once('listening',resolve));const address=server.address();assert(address&&typeof address==='object');const base='http://127.0.0.1:'+address.port;
 try{
  const response=await fetch(base+'/v1/venues?cityId=lahore&areaId=lahore-gulberg&page=2&pageSize=10');assert.equal(response.status,200);
  const body=await response.json();assert.equal(body.page,2);assert.equal(body.pageSize,10);assert.equal(body.total,1);assert.equal(body.data[0].cityId,'lahore');assert.deepEqual(body.data[0].sports,['Padel']);
  assert.deepEqual(args,{p_city:'lahore',p_area:'lahore-gulberg',p_lat:null,p_lng:null,p_radius:20});
  assert.equal((await fetch(base+'/v1/venues?pageSize=1000')).status,400);
  assert.equal((await fetch(base+'/v1/venues?latitude=31')).status,400);
 }finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}
});
