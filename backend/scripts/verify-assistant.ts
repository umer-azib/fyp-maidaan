import 'dotenv/config';
import {writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import type {AssistantReply} from '../../shared/assistant';
import {assistantLink} from '../../shared/assistant';

async function main(){
 if(process.env.NODE_ENV!=='development'||!process.env.MAIDAAN_AI_TEST_PASSWORD)throw Error('Set NODE_ENV=development and MAIDAAN_AI_TEST_PASSWORD for the documented development fixture account.');
 const base='http://127.0.0.1:5000',origin='http://127.0.0.1:5173';const evidence:{name:string;status:number;details:unknown}[]=[];let cookie='';
 const record=(name:string,status:number,details:unknown)=>{evidence.push({name,status,details});console.log(name,status);writeFileSync('../docs/AI-WEATHER-LIVE-RESULTS.json',JSON.stringify({testedAt:new Date().toISOString(),method:'Real authenticated HTTP and provider requests; no rendered browser testing',checks:evidence},null,2))};
 const request=async(path:string,body?:unknown,authenticated=true)=>fetch(base+path,{method:body===undefined?'GET':'POST',headers:{Origin:origin,'X-Maidaan-Client':'web','Content-Type':'application/json',...(authenticated&&cookie?{Cookie:cookie}:{})},body:body===undefined?undefined:JSON.stringify(body)});
 const login=await request('/v1/auth/login',{identifier:'dev_player_01',password:process.env.MAIDAAN_AI_TEST_PASSWORD});assert.equal(login.status,200);cookie=login.headers.get('set-cookie')!.split(';')[0];
 try{
  const unauth=await request('/v1/ai/chat',{message:'Find games'},false);assert.equal(unauth.status,401);record('Unauthenticated assistant',unauth.status,await unauth.json());
  const alias=await fetch(base+'/api/ai/chat',{method:'POST',redirect:'manual',headers:{Origin:origin,'X-Maidaan-Client':'web','Content-Type':'application/json'},body:'{"message":"Find games"}'});assert.equal(alias.status,307);record('Canonical /api alias',alias.status,{location:alias.headers.get('location')});
  for(const message of ['Find badminton games tomorrow at 6 PM','Which badminton courts are free tonight?','Anyone looking for a padel partner in DHA?','Find an open football match','Show badminton players in Gulberg',"What's the weather in Lahore?",'Find badminton games on January 1, 2039']){
   const response=await request('/v1/ai/chat',{message,cityId:'lahore'});const reply=await response.json() as AssistantReply;assert.equal(response.status,200,JSON.stringify(reply));record(message,response.status,reply);
   if(message.includes('2039')){assert.equal(reply.cards.length,0);assert.match(reply.answer,/No matching/)}
   assert.ok(reply.cards.filter(c=>c.kind==='game').every(c=>(c.remaining??0)>0),'Full games must not be suggested as open matches');
   for(const card of reply.cards){
    if(card.kind==='game'){const detail=await request('/v1/games/'+card.id);assert.equal(detail.status,200);const game=await detail.json();assert.equal(game.title,card.title);assert.equal(game.maxPlayers-game.players.length,card.remaining);assert.ok(card.remaining!>0);assert.equal((await fetch(origin+assistantLink(card))).status,200);const forecast=await request('/v1/weather?gameId='+card.id);assert.equal(forecast.status,200);record('Location-specific game forecast',forecast.status,await forecast.json());record('Game card destination',200,{path:assistantLink(card),id:game.id,remaining:card.remaining});break}
    if(card.kind==='player'){const profile=await request('/v1/players/'+card.id);assert.equal(profile.status,200);assert.equal((await profile.json()).name,card.title);record('Public player card destination',200,{path:assistantLink(card),id:card.id});break}
    if(card.kind==='court'){const availability=await request('/v1/courts/'+card.courtId+'/availability?date='+card.date);assert.equal(availability.status,200);const data=await availability.json();const slot=data.slots.find((s:{startsAt:string})=>s.startsAt===card.startsAt);assert.ok(slot?.available);assert.equal(slot.pricePkr,card.pricePkr);const venue=await request('/v1/venues/'+card.venueId);assert.equal(venue.status,200);const path=assistantLink(card);const page=await fetch(origin+path);assert.equal(page.status,200);record('Court card destination and actual slot',200,{path,startsAt:slot.startsAt,pricePkr:slot.pricePkr,available:slot.available});break}
   }
  }
  const nativeLogin=await fetch(base+'/v1/auth/login',{method:'POST',headers:{'X-Maidaan-Client':'mobile','Content-Type':'application/json'},body:JSON.stringify({identifier:'dev_player_01',password:process.env.MAIDAAN_AI_TEST_PASSWORD})});assert.equal(nativeLogin.status,200);const nativeSession=await nativeLogin.json();
  try{const nativeReply=await fetch(base+'/api/ai/chat',{method:'POST',headers:{'X-Maidaan-Client':'mobile','Content-Type':'application/json',Authorization:'Bearer '+nativeSession.token},body:JSON.stringify({message:'Show Lahore venues',cityId:'lahore'})});assert.equal(nativeReply.status,200);record('Native bearer session through /api alias',nativeReply.status,await nativeReply.json())}finally{await fetch(base+'/v1/auth/logout',{method:'POST',headers:{'X-Maidaan-Client':'mobile',Authorization:'Bearer '+nativeSession.token,'Content-Type':'application/json'},body:'{}'})}
  const weather=await request('/v1/weather');assert.equal(weather.status,200);const data=await weather.json();assert.equal(data.source,'Open-Meteo');assert.ok(Number.isFinite(data.point.temperatureC));const cached=await request('/v1/weather');assert.equal((await cached.json()).fetchedAt,data.fetchedAt);record('Actual Open-Meteo response and cached timestamp',weather.status,data);
  const denied=await request('/v1/weather?gameId=12345678-1234-4234-8234-123456789abc');assert.equal(denied.status,404);record('Unauthorized or nonexistent game weather',denied.status,await denied.json());
 }finally{await request('/v1/auth/logout',{})}
}
void main().catch(e=>{console.error(e instanceof Error?e.message:'Verification failed');process.exitCode=1});
