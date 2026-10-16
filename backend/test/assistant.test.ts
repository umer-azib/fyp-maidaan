import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Router} from 'express';
import {createApp} from '../src/app';
import {assistantRoutes,geminiInterpreter,searchIntent,type Interpret} from '../src/assistant';
import {weatherService} from '../src/weather';
import {HttpError} from '../src/data';
import {assistantLink,type AssistantCard,type SearchIntent} from '../../shared/assistant';
import type {Database} from '../src/postgres';

test('assistant structured filters, authenticated read-only contract, provider errors, empty results and real card routes',async()=>{
 const id='12345678-1234-4234-8234-123456789abc';let filters:SearchIntent={intent:'games',sport:'Badminton',area:null,date:'2026-10-17',time:'18:00',period:null},empty=false,fail=false;const seen:unknown[][]=[];
 const interpret:Interpret=async()=>{if(fail)throw new HttpError(503,'AI_UNAVAILABLE','Assistant temporarily unavailable.');return filters};
 const game:AssistantCard={kind:'game',id,title:'Stored game',subtitle:'Lahore',developmentFixture:true,remaining:1};
 const court:AssistantCard={kind:'court',id,title:'Stored court',subtitle:'Lahore',venueId:id,courtId:id,date:'2026-10-17',startsAt:'2026-10-17T13:00:00.000Z',pricePkr:1500,developmentFixture:true};
 const db:Database={query:async<T>(sql:string,values?:unknown[])=>{assert.match(sql,/^select /i,'Assistant must never mutate database records');if(sql.includes('discover_games')){assert.match(sql,/count\(\*\).*<g.max_players/);assert.match(sql,/a.status='active'/)}seen.push(values||[]);return {rows:(sql.includes('from public.areas')?[{id:'lahore-dha-1',name:'DHA Phase 1'},{id:'lahore-dha-5',name:'DHA Phase 5'},{id:'lahore-johar-town',name:'Johar Town'}]:empty?[]:sql.includes('court_slots')?[court]:[game]) as T[]}},transaction:async()=>{throw Error('Unexpected mutation transaction')}};
 const router=Router();assistantRoutes(router,()=>db,(req,res,next)=>{if(req.header('Authorization')!=='Bearer valid')return next(new HttpError(401,'UNAUTHORIZED','Sign in.'));res.locals.identity={userId:id};next()},async()=>{throw new HttpError(404,'NOT_FOUND','Game not found')},interpret);
 const server=createApp({publicDb:null,authenticate:async()=>{throw Error()}},['http://127.0.0.1:5173'],router).listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));const base='http://127.0.0.1:'+(server.address() as {port:number}).port;
 const ask=(body:unknown,auth=true)=>fetch(base+'/v1/ai/chat',{method:'POST',headers:{'Content-Type':'application/json',...(auth?{Authorization:'Bearer valid'}:{})},body:JSON.stringify(body)});
 try{
  assert.equal((await ask({message:'Find a game'},false)).status,401);
  assert.equal((await ask({message:' '})).status,400);assert.equal((await ask({message:'hi',userId:id})).status,400);
  let response=await ask({message:'Find badminton games tomorrow at 6 PM'});assert.equal(response.status,200);let reply=await response.json();assert.deepEqual(reply.cards,[game]);assert.equal(seen.at(-1)?.[4],'18:00');assert.equal(assistantLink(reply.cards[0]),'/player/games/'+id);assert.equal(assistantLink(reply.cards[0],true),'/game/'+id);
  filters={...filters,intent:'courts',area:'DHA'};response=await ask({message:'Which badminton courts are free in DHA?'});reply=await response.json();assert.equal(reply.cards[0].pricePkr,1500);const link=new URL(assistantLink(reply.cards[0]),'http://127.0.0.1:5173');assert.equal(link.pathname,'/player/venues/'+id);assert.equal(link.searchParams.get('court'),id);assert.equal(link.searchParams.get('date'),'2026-10-17');assert.equal(link.searchParams.get('time'),court.startsAt);assert.match(assistantLink(court,true),/^\/venue\//);assert.deepEqual(seen.at(-1)?.[1],['lahore-dha-1','lahore-dha-5']);filters={...filters,area:'DHA Phase 1'};const broad=await ask({message:'Show padel venues near DHA Lahore'});assert.equal((await broad.json()).filters.area,'DHA');assert.deepEqual(seen.at(-1)?.[1],['lahore-dha-1','lahore-dha-5']);
  empty=true;response=await ask({message:'No courts'});reply=await response.json();assert.deepEqual(reply.cards,[]);assert.match(reply.answer,/No matching courts/);
  filters={...filters,area:'Imaginary area'};response=await ask({message:'Unknown area'});assert.match((await response.json()).answer,/No matching area/);
  fail=true;response=await ask({message:'Provider unavailable'});assert.equal(response.status,503);assert.equal((await response.json()).error.code,'AI_UNAVAILABLE');
  response=await fetch(base+'/api/ai/chat',{method:'POST',redirect:'manual',headers:{'Content-Type':'application/json'},body:'{}'});assert.equal(response.status,307);assert.equal(response.headers.get('location'),'/v1/ai/chat');
  response=await fetch(base+'/v1/weather?gameId='+id,{headers:{Authorization:'Bearer valid'}});assert.equal(response.status,404,'Weather cannot reveal inaccessible games');
 }finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()))}
 assert.equal(searchIntent.safeParse({...filters,time:'26:00'}).success,false);assert.equal(searchIntent.safeParse({...filters,sql:'drop table'}).success,false);
});

test('Gemini missing configuration fails closed without fake search results',async()=>{
 const previous=process.env.GEMINI_API_KEY;delete process.env.GEMINI_API_KEY;try{await assert.rejects(()=>geminiInterpreter()('Find a game','Lahore'),(e:unknown)=>e instanceof HttpError&&e.status===503&&e.code==='AI_NOT_CONFIGURED')}finally{if(previous!==undefined)process.env.GEMINI_API_KEY=previous}
});

test('weather validates provider data, caches coordinates, uses real forecast time and flags rain/heat only outdoors',async()=>{
 const now=Math.floor(Date.now()/3600000)*3600;let calls=0;
 const provider:typeof fetch=async(url)=>{calls++;const parsed=new URL(String(url));assert.equal(parsed.hostname,'api.open-meteo.com');assert.equal(parsed.searchParams.get('timezone'),'Asia/Karachi');return new Response(JSON.stringify({current:{time:now,temperature_2m:39,weather_code:61,wind_speed_10m:12},hourly:{time:[now,now+3600],temperature_2m:[39,38],precipitation_probability:[80,75],weather_code:[61,61],wind_speed_10m:[12,14]}}),{status:200})};
 const weather=weatherService(provider);const current=await weather(31.52,74.35);assert.equal(current.source,'Open-Meteo');assert.equal(current.point?.rainProbability,80);assert.equal(current.warning,null);
 const outdoor=await weather(31.52,74.35,new Date((now+3600)*1000).toISOString(),'Court',true);assert.equal(calls,1);assert.equal(outdoor.point?.temperatureC,38);assert.match(outdoor.warning!,/High heat/);assert.match(outdoor.warning!,/Rain/);
 assert.equal((await weather(31.52,74.35,'2040-01-01T00:00:00Z')).point,null,'Never substitute current weather for an unavailable forecast');
 await assert.rejects(()=>weatherService(async()=>new Response('{}',{status:200}))(31.52,74.35),/temporarily unavailable/);
 await assert.rejects(()=>weatherService(async()=>{throw Error('Network failure')})(31.52,74.35),/temporarily unavailable/);
});
