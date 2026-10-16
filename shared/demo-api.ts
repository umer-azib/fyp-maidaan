import type { createApi } from './api';
import type { createDemoAuth } from './demo-auth';
import type { Profile, VenueDetail } from './contracts';
import { changeGame, validateGame, type Game } from './games';
import { demoGames } from './demo';
import { capacityForFormat, formats } from './formats';

export function createDemoApi(auth: ReturnType<typeof createDemoAuth>): ReturnType<typeof createApi> {
  const player = { id: 'demo-player', name: 'Player One' };
  let profile: Profile = { ...player, username: 'player', bio: 'A friendly Lahore player who enjoys badminton and padel. Local sample profile.',
    cityId: 'lahore', areaId: 'lahore-dha-1', avatarPath: 'local-avatar:player-one', avatarUrl: null,
    sports: ['Badminton', 'Padel'].map(sport => ({ sport: sport as 'Badminton' | 'Padel', skill: 'Intermediate', positions: [], formats: ['2v2'] })) };
  const venues: VenueDetail[] = [
    { id:'demo-rally', name:'Rally Courts (sample venue)', description:'Fictional venue for the local UI preview.', address:'DHA Lahore — sample address',cityId:'lahore',areaId:'lahore-dha-1',latitude:31.4697,longitude:74.4126,phone:null,facilities:['Sample parking','Sample changing rooms'],photos:[],source:'onboarded',verified:false,sports:['Badminton','Padel'],bookingEnabled:false,
      courts:[{id:'demo-court-badminton',name:'Badminton court A (sample)',sport:'Badminton',active:true,hours:[]},{id:'demo-court-padel',name:'Padel court A (sample)',sport:'Padel',active:true,hours:[]}] },
    { id:'demo-field', name:'Community Field (sample venue)', description:'Fictional ground for testing discovery cards.', address:'DHA Lahore — sample address',cityId:'lahore',areaId:'lahore-dha-1',latitude:31.47,longitude:74.41,phone:null,facilities:[],photos:[],source:'onboarded',verified:false,sports:['Football','Cricket'],bookingEnabled:false,
      courts:[{id:'demo-pitch',name:'Pitch A (sample)',sport:'Football',active:true,hours:[]}] },
  ];
  let games: Game[] = demoGames().map(g => ({...g,id:'demo-'+g.id,cityId:'lahore',areaId:'lahore-dha-1',bookingSource:'external',format:g.sport==='Football'?'5v5':g.sport==='Cricket'?'Custom':'2v2',
    hostId:g.hostId==='me'?player.id:g.hostId,players:g.players.map(p=>p.id==='me'?player:p),requests:g.requests.map(p=>p.id==='me'?player:p)}));
  games.push({...games[3],id:'demo-completed',title:'Last weekend’s padel (sample history)',status:'completed',startsAt:new Date(Date.now()-7*86400000).toISOString()});
  let nextId=0;
  function session() { const current=auth.getSnapshot().session;if(!auth.enabled||!current)throw new Error('Sign in to a local demo account first.');return current; }
  function playerOnly() { if(session().role!=='player')throw new Error('Use the Player demo account for this preview.'); }
  function page<T>(data:T[],number=1) { return {data:data.slice((number-1)*50,number*50),page:number,pageSize:50,total:data.length}; }
  return {
    async request(){throw new Error('Demo accounts cannot perform live backend operations.');},
    async locations(){session();return {cities:[{id:'lahore',name:'Lahore',country:'PK',timezone:'Asia/Karachi'}],areas:[{id:'lahore-dha-1',cityId:'lahore',name:'DHA Lahore'},{id:'lahore-gulberg',cityId:'lahore',name:'Gulberg'}]};},
    async access(){const s=session();return {player:true,venueManager:s.role==='hub',admin:s.role==='admin'};},
    async profile(){const s=session();return s.role==='player'?profile:{...profile,id:s.userId,name:s.role==='hub'?'Venue Owner Preview':'Admin Preview',username:s.role};},
    async saveProfile(input){playerOnly();if(!input.name.trim())throw new Error('Name is required.');profile={...profile,...input};player.name=profile.name;return profile;},
    async venues(filter,number){session();return page(venues.filter(v=>v.cityId===filter.cityId&&(!filter.areaId||filter.areaId===v.areaId)),number);},
    async venue(id){session();const venue=venues.find(v=>v.id===id);if(!venue)throw new Error('Sample venue not found.');return venue;},
    async availability(id,date){session();return {courtId:id,date,timezone:'Asia/Karachi',hours:[],bookingEnabled:false,message:'Local demonstration only. No real availability or booking.'};},
    async games(filter,number){session();return page(games.filter(g=>g.status==='open'&&g.cityId===filter.cityId&&(!filter.areaId||g.areaId===filter.areaId)),number);},
    async myGames(number){if(session().role!=='player')return page([],number);return page(games.filter(g=>g.hostId===player.id||g.players.some(p=>p.id===player.id)||g.requests.some(p=>p.id===player.id)),number);},
    async game(id){playerOnly();const game=games.find(g=>g.id===id);if(!game)throw new Error('Sample game not found.');return game;},
    async createGame(input){playerOnly();validateGame(input);if(!formats[input.sport].includes(input.format||'')||(capacityForFormat(input.format||'')&&capacityForFormat(input.format!)!==input.maxPlayers))throw new Error('Choose a matching format and capacity.');
      const game:Game={...input,id:'demo-created-'+(++nextId),hostId:player.id,status:'open',players:[{...player}],requests:[]};games=[game,...games];return game;},
    async updateGame(id,action){playerOnly();const game=games.find(g=>g.id===id);if(!game)throw new Error('Sample game not found.');const next=changeGame(game,player,action);games=games.map(g=>g.id===id?next:g);return next;},
  };
}
