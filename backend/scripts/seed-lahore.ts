import type { Database } from '../src/postgres';
import { hashApplicationPassword } from '../src/accounts';
import { formats, capacityForFormat } from '../../shared/formats';
import { dataset, fixtureId as id, fixturePassword, insertFixtures, capture, prepareRegistry, assertSchema, requireDevelopment, type SeedPolicy } from './dev-fixtures';
import { verifyLahore } from './verify-lahore';
export const neighborhoods=[
 ['dha-6','DHA Phase 6',31.4623,74.4447,'Juniper Padel Courts'],
 ['gulberg','Gulberg',31.5111,74.3489,'Willow Shuttle House'],
 ['johar-town','Johar Town',31.4697,74.2728,'Crescent Football Gardens'],
 ['model-town','Model Town',31.4828,74.3228,'Falcon Cricket Commons'],
 ['bahria-town','Bahria Town',31.3698,74.1866,'Saffron Padel Park'],
 ['wapda-town','Wapda Town',31.4325,74.2645,'Monsoon Shuttle Club'],
 ['garden-town','Garden Town',31.4990,74.3175,'Olive Five-a-Side Grounds'],
 ['cantt','Cantt',31.5289,74.3847,'Kite Cricket Meadows'],
 ['valencia','Valencia',31.4080,74.2500,'Cedar Padel Gardens'],
 ['lake-city','Lake City',31.3560,74.2518,'Lotus Badminton Pavilion'],
 ['township','Township',31.4475,74.2881,'Lantern Football Commons'],
 ['faisal-town','Faisal Town',31.4826,74.3037,'Mulberry Cricket Fields'],
] as const;
export const names=['Ali Raza','Ahmed Khan','Hassan Malik','Usman Tariq','Hamza Sheikh','Bilal Ahmed','Sara Khan','Ayesha Malik','Zainab Ali','Fatima Noor','Omar Farooq','Hira Shah','Saad Iqbal','Maryam Aslam','Danish Akhtar','Nimra Saleem','Fahad Aziz','Iqra Hassan','Talha Qureshi','Sana Yousaf','Waqas Butt','Mahnoor Ahmed','Imran Siddiqui','Anum Riaz','Asad Mahmood','Laiba Khalid','Faisal Javed','Rabia Zafar','Shahzaib Hussain','Maham Arif','Taimoor Nasir','Hafsa Nadeem','Salman Mirza','Noor Fatima','Adeel Anwar','Sidra Waheed','Rehan Ali','Amna Zahid','Shahzad Haider','Eman Waseem'];
const ownerNames=['Kamran Ashraf','Nadia Siddiqui','Farhan Masood','Sadia Anwar','Shahid Rauf','Muneeb Zia','Saira Habib','Kashif Saleem','Amir Nadeem','Bushra Imran','Rizwan Akram','Naila Tariq'];
const sports=['Padel','Badminton','Football','Cricket'] as const;
const skills=['Beginner','Intermediate','Advanced'];
export function shiftDate(date:string,days:number){return new Date(Date.parse(date+'T00:00:00Z')+days*86400000).toISOString().slice(0,10)}
function weekday(date:string){return new Date(date+'T00:00:00Z').getUTCDay()}
function local(date:string,hour:number){return new Date(date+'T'+String(hour).padStart(2,'0')+':00:00+05:00').toISOString()}
function closed(court:number){return court%2===0?2:3}
function duration(court:number){return sports[Math.floor(court/2)%4]==='Badminton'&&court%2?30:sports[Math.floor(court/2)%4]==='Football'&&court%2?90:sports[Math.floor(court/2)%4]==='Cricket'&&! (court%2)?120:60}
type Slot={court_id:string;local_date:string;local_time:string;starts_at:string;ends_at:string;price_pkr:number};
type PlannedBooking={id:string;court_id:string;player_id:string;starts_at:string;ends_at:string;status:string;payment_method:string;price_pkr:number;offline:boolean;customer_name:string|null};
export async function seedLahore(db:Database,policy:SeedPolicy){
 requireDevelopment(policy);await assertSchema(db);
 return db.transaction(async tx=>{
  await tx.query("select pg_advisory_xact_lock(63421057)");await prepareRegistry(tx);
  const today=(await tx.query<{today:string}>("select (now() at time zone 'Asia/Karachi')::date::text today")).rows[0].today;
  const old=await tx.query<{anchor_date:string;version:number}>('select anchor_date::text,version from app_private.dev_seed_runs where dataset=$1',[dataset]);
  if(old.rows.length){if(old.rows[0].anchor_date!==today||old.rows[0].version!==1)throw new Error('Existing fixtures use another date/version. Explicitly clean owned fixtures before refreshing the 21-day window.');return verifyLahore(tx);}
  await tx.query('insert into app_private.dev_seed_runs(dataset,anchor_date,version) values($1,$2,0)',[dataset,today]);
  for(const [slug,name] of neighborhoods){const area='lahore-'+slug;const existing=await tx.query<{city_id:string;name:string;active:boolean}>('select city_id,name,active from public.areas where id=$1',[area]);if(existing.rows.length){if(existing.rows[0].city_id!=='lahore'||existing.rows[0].name!==name||!existing.rows[0].active)throw new Error('Existing area conflicts with fixture catalogue: '+area);}else await tx.query(`insert into public.areas(id,city_id,name) values($1,'lahore',$2)`,[area,name]);}
  const passwordHash=await hashApplicationPassword(fixturePassword);
  const accounts=Array.from({length:52},(_,i)=>({id:id('account-'+i),username:i<40?'dev_player_'+String(i+1).padStart(2,'0'):'dev_owner_'+String(i-39).padStart(2,'0'),email:'maidaan.dev.'+(i<40?'player'+String(i+1).padStart(2,'0'):'owner'+String(i-39).padStart(2,'0'))+'@example.com',password_hash:passwordHash,is_development_fixture:true}));
  await insertFixtures(tx,'accounts',accounts);
  await insertFixtures(tx,'profiles',accounts.map((a,i)=>({id:a.id,name:i<40?names[i]:ownerNames[i-40],username:a.username,bio:'Fictional Maidaan development profile; not a real person.',city_id:'lahore',area_id:'lahore-'+neighborhoods[(i<40?i:i-40)%12][0],preferred_areas:['lahore-'+neighborhoods[(i<40?i:i-40)%12][0]]})));
  await insertFixtures(tx,'player_sports',accounts.flatMap((a,i)=>(i<40?[sports[i%4],sports[(i+1)%4]]:[sports[(i-40)%4]]).map((sport,j)=>({player_id:a.id,sport,skill:skills[(i+j)%3],positions:sport==='Football'?[['Goalkeeper','Defender','Midfielder','Forward'][i%4]]:[],formats:[...formats[sport]]}))));
  await insertFixtures(tx,'player_availability',accounts.flatMap((a,i)=>[1,3,5].map((offset,j)=>({id:id('availability-'+i+'-'+j),player_id:a.id,day_of_week:(i+offset)%7,starts_at:['07:00','14:00','18:00'][i%3],ends_at:['09:00','16:00','21:00'][i%3]}))));
  await insertFixtures(tx,'venues',neighborhoods.map(([slug,name,latitude,longitude,brand],i)=>({id:id('venue-'+i),owner_id:accounts[40+i].id,name:brand+' (Development fixture)',description:'Fictional sports facility for development testing in '+name+'. No real business, partnership, pricing or booking availability is represented.',address:'Illustrative neighborhood location, '+name+', Lahore (not a real premises address)',city_id:'lahore',area_id:'lahore-'+slug,latitude,longitude,facilities:['Lighting','Washrooms',i%2?'Indoor courts':'Outdoor grounds','Sample parking'],source:'onboarded',verified:i<9,published:i<9,approval_status:i<9?'approved':i===11?'suspended':'pending',confirmation_mode:i%3===0?'manual':'instant',rules:'Development fixture. Bring appropriate shoes and sports equipment.',cancellation_policy:'Sample policy for UI testing only; no real payment is requested.'})));
  await insertFixtures(tx,'venue_managers',neighborhoods.map((_,i)=>({venue_id:id('venue-'+i),user_id:accounts[40+i].id})));
  await insertFixtures(tx,'venue_applications',neighborhoods.map((v,i)=>({venue_id:id('venue-'+i),applicant_id:accounts[40+i].id,business_name:v[4]+' / fictional test business',owner_name:ownerNames[i]})));
  await insertFixtures(tx,'courts',Array.from({length:24},(_,i)=>({id:id('court-'+i),venue_id:id('venue-'+Math.floor(i/2)),name:(sports[Math.floor(i/2)%4]==='Cricket'?'Ground ':'Court ')+(i%2+1),sport:sports[Math.floor(i/2)%4],formats:[...formats[sports[Math.floor(i/2)%4]]],active:true})));

  const hours:Record<string,unknown>[]=[];
  for(let c=0;c<24;c++)for(let day=0;day<7;day++){if(day===closed(c))continue;const weekend=day===0||day===6;for(const [window,opens_at,closes_at,multiplier] of [[0,weekend?'07:00':'06:00',weekend?'11:00':'09:00',.65],[1,weekend?'13:00':'14:00','17:00',.85],[2,'18:00','23:00',1.3]] as const){const base=[3000,900,4500,3500][Math.floor(c/2)%4]+(c%2)*300;hours.push({id:id('hours-'+c+'-'+day+'-'+window),court_id:id('court-'+c),day_of_week:day,opens_at,closes_at,slot_minutes:duration(c),price_pkr:Math.round(base*multiplier)+(weekend?200:0)});}}
  await insertFixtures(tx,'court_hours',hours);
  const blocks:Record<string,unknown>[]=[];
  for(let c=0;c<8;c++){let date=shiftDate(today,2+c);while(weekday(date)===closed(c))date=shiftDate(date,1);blocks.push({id:id('block-'+c),court_id:id('court-'+c),starts_at:local(date,14),ends_at:local(date,17),reason:'Development fixture: scheduled maintenance'});}
  blocks.push({id:id('holiday'),court_id:id('court-2'),starts_at:local(shiftDate(today,12),6),ends_at:local(shiftDate(today,12),23),reason:'Development fixture: closed holiday'});
  await insertFixtures(tx,'court_blocks',blocks);
  // PostgreSQL is the source of inventory; no free-slot table or Google listing is fabricated.
  const available=await tx.query<Slot>(`select c.id court_id,to_char(d.day,'YYYY-MM-DD') local_date,to_char(s.starts_at at time zone 'Asia/Karachi','HH24:MI') local_time,s.starts_at::text,s.ends_at::text,s.price_pkr::float8 from public.courts c cross join generate_series($1::date+1,$1::date+21,interval '1 day') d(day) cross join lateral public.court_slots(c.id,d.day::date) s where c.id=any($2::uuid[]) and s.available order by c.id,s.starts_at`,[today,Array.from({length:18},(_,c)=>id('court-'+c))]);
  const future:PlannedBooking[]=[];
  for(let c=0;c<18;c++){
   const slots=available.rows.filter(s=>s.court_id===id('court-'+c)),peak=slots.filter(s=>s.local_time>='18:00');const firstDay=peak[0]?.local_date;if(!firstDay)throw new Error('No seeded court inventory. Check active Lahore/sports records.');
   const chosen=peak.filter(s=>s.local_date===firstDay).slice(0,5);
   // Long football/cricket slots have fewer than five evening positions; use later evenings to reach five.
   for(const slot of peak)if(chosen.length<5&&!chosen.includes(slot))chosen.push(slot);
   const later=slots.find(s=>s.local_date>=shiftDate(today,14)&&s.local_time>='14:00');if(!later)throw new Error('No later sample slot.');chosen.push(later);
   for(let j=0;j<chosen.length;j++){const slot=chosen[j],offline=j===4&&c%4===0;future.push({id:id('future-booking-'+c+'-'+j),court_id:slot.court_id,player_id:offline?accounts[40+Math.floor(c/2)].id:accounts[(c*3+j)%40].id,starts_at:new Date(slot.starts_at).toISOString(),ends_at:new Date(slot.ends_at).toISOString(),status:j===5?(c%3===0?'cancelled':'pending'):'confirmed',payment_method:j===5?'manual_confirmation':'pay_at_venue',price_pkr:slot.price_pkr,offline,customer_name:offline?'Fictional walk-in customer '+(c+1):null});}
  }
  await insertFixtures(tx,'bookings',future);
  const history:PlannedBooking[]=[];
  for(let i=0;i<24;i++){const c=i%18;let date=shiftDate(today,-1-Math.floor(i/18)*7);while(weekday(date)===closed(c))date=shiftDate(date,-1);const start=local(date,18);const price=hours.find(h=>h.court_id===id('court-'+c)&&h.day_of_week===weekday(date)&&h.opens_at==='18:00')!.price_pkr as number;history.push({id:id('history-booking-'+i),court_id:id('court-'+c),player_id:accounts[i%40].id,starts_at:start,ends_at:new Date(Date.parse(start)+duration(c)*60000).toISOString(),status:'completed',payment_method:'pay_at_venue',price_pkr:price,offline:false,customer_name:null});}
  await insertFixtures(tx,'bookings',history);
  const gameRows:Record<string,unknown>[]=[],participants:Record<string,unknown>[]=[],requests:Record<string,unknown>[]=[];
  const createGame=(booking:PlannedBooking,index:number,historical:boolean)=>{
   const c=Array.from({length:24},(_,c)=>id('court-'+c)).indexOf(booking.court_id),venueIndex=Math.floor(c/2),sport=sports[venueIndex%4];
   const format=sport==='Football'?(index%2?'7v7':'5v5'):sport==='Cricket'?'Custom':index%2?'2v2':'1v1';
   const max=capacityForFormat(format)||22,full=!historical&&index%4===3,gameId=id((historical?'history-game-':'future-game-')+index);
   const confirmed=historical?Math.min(max,sport==='Cricket'?6:4):full?max:Math.min(max-1,sport==='Cricket'?11:sport==='Football'?5:2);
   const hostIndex=accounts.findIndex(a=>a.id===booking.player_id),mode=Math.floor(index/4)%2===0?'request':'instant';
   gameRows.push({id:gameId,host_id:booking.player_id,sport,title:(historical?'Completed ':full?'Full ':'Open ')+sport+' / development fixture '+(index+1),description:'Fictional development game. No real venue booking or payment is represented.',city_id:'lahore',area_id:'lahore-'+neighborhoods[venueIndex][0],venue_id:id('venue-'+venueIndex),venue:neighborhoods[venueIndex][4]+' (Development fixture) / '+(c%2+1),location:neighborhoods[venueIndex][1]+', Lahore (illustrative)',latitude:neighborhoods[venueIndex][2],longitude:neighborhoods[venueIndex][3],starts_at:booking.starts_at,duration:Math.round((Date.parse(booking.ends_at)-Date.parse(booking.starts_at))/60000),max_players:max,skill:skills[index%3],join_mode:mode,status:historical?'completed':'open',format,booking_source:'booking',booking_id:booking.id,visibility:'public'});
   for(let j=0;j<confirmed;j++)participants.push({game_id:gameId,player_id:accounts[(hostIndex+j)%40].id});
   if(!historical&&!full&&mode==='request')for(let j=0;j<2;j++)requests.push({game_id:gameId,player_id:accounts[(hostIndex+confirmed+j)%40].id});
  };
  const candidates=Array.from({length:18},(_,c)=>future.filter(b=>b.court_id===id('court-'+c)&&b.status==='confirmed'&&!b.offline).slice(0,2)).flat();
  candidates.slice(0,32).forEach((b,i)=>createGame(b,i,false));history.forEach((b,i)=>createGame(b,i,true));
  await insertFixtures(tx,'games',gameRows);await insertFixtures(tx,'game_participants',participants);await insertFixtures(tx,'join_requests',requests);
  for(let i=0;i<history.length;i++){
   const game=gameRows.find(g=>g.id===id('history-game-'+i))!,members=participants.filter(p=>p.game_id===game.id),venueIndex=neighborhoods.findIndex((_,v)=>id('venue-'+v)===game.venue_id);
   await tx.query("select set_config('request.jwt.claim.sub',$1,true)",[accounts[40+venueIndex].id]);
   for(const member of members.slice(0,2))await tx.query('select public.verify_attendance($1,$2)',[game.id,member.player_id]);
   await tx.query("select set_config('request.jwt.claim.sub',$1,true)",[game.host_id]);
   const review=(await tx.query<{id:string}>('select public.submit_review($1::jsonb) id',[JSON.stringify({playerId:members[1].player_id,gameId:game.id,sportsmanship:3+i%3,reliability:3+(i+1)%3,teamwork:3+(i+2)%3,body:'Development review: punctual, cooperative play and a friendly match.'})])).rows[0].id;
   await tx.query('update public.reviews set id=$1 where id=$2',[id('player-review-'+i),review]);
   if(i<12){const venueReview=(await tx.query<{id:string}>('select public.submit_review($1::jsonb) id',[JSON.stringify({venueId:game.venue_id,bookingId:history[i].id,quality:3+i%3,body:'Development review: a useful test of court lighting, facilities and check-in.'})])).rows[0].id;await tx.query('update public.reviews set id=$1 where id=$2',[id('venue-review-'+i),venueReview]);}
  }
  const historicalIds=history.map((_,i)=>id('history-game-'+i));
  await capture(tx,'game_attendance','r.game_id=any($1::uuid[])',[historicalIds]);
  await capture(tx,'reviews','r.id=any($1::uuid[])',[Array.from({length:24},(_,i)=>id('player-review-'+i)).concat(Array.from({length:12},(_,i)=>id('venue-review-'+i)))]);
  await capture(tx,'audit_logs',"r.action='attendance.verify' and r.entity_id=any($1::uuid[])",[historicalIds]);
  await insertFixtures(tx,'audit_logs',historicalIds.map((game,i)=>({actor_id:accounts[i].id,action:'dev.seed.lahore-v1',entity_id:game})));
  await tx.query('update app_private.dev_seed_runs set version=1 where dataset=$1',[dataset]);
  return verifyLahore(tx);
 });
}
