import type { SupabaseClient, PostgrestError } from '@supabase/supabase-js';
import type { Game } from '../../shared/games';
import type { Profile, SportProfile, Venue, VenueDetail, CourtHours } from '../../shared/contracts';

export class HttpError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}
export function check(error: Pick<PostgrestError,'code'|'message'> | null) {
  if (!error) return;
  const codes: Record<string, [number,string]> = { '42501':[403,'FORBIDDEN'], '23P01':[409,'BOOKING_CONFLICT'], '23505':[409,'CONFLICT'], '23503':[400,'INVALID_REFERENCE'], '23514':[400,'INVALID_INPUT'], '22023':[400,'INVALID_INPUT'], 'P0001':[409,'CONFLICT'], 'P0002':[404,'NOT_FOUND'], 'PGRST116':[404,'NOT_FOUND'] };
  const mapped=codes[error.code];
  if (mapped) throw new HttpError(mapped[0],mapped[1], error.code==='23505'?'Already exists, joined or requested.':error.code==='23503'?'Choose valid location and venue records.':error.code==='23514'?'Invalid field values or game format.':error.message);
  console.error('Database request failed:',error.code);
  throw new HttpError(503,'DATABASE_UNAVAILABLE','The data service is unavailable. Check configuration and migrations.');
}
export type GameRow = {
 id:string;host_id:string;sport:Game['sport'];title:string;description:string;city_id:string;area_id:string|null;venue_id:string|null;venue:string;location:string;
 latitude:number;longitude:number;starts_at:string;duration:number;max_players:number;skill:Game['skill'];join_mode:Game['joinMode'];status:Game['status'];format:string;booking_source:'external';
 game_participants:{profiles:{id:string;name:string}}[]; join_requests:{profiles:{id:string;name:string}}[];
};
export const gameSelect='*,game_participants(profiles(id,name)),join_requests(profiles(id,name))';
export function mapGame(g:GameRow):Game {
 return {id:g.id,hostId:g.host_id,sport:g.sport,title:g.title,description:g.description,cityId:g.city_id,areaId:g.area_id,venueId:g.venue_id,venue:g.venue,location:g.location,latitude:g.latitude,longitude:g.longitude,startsAt:g.starts_at,duration:g.duration,maxPlayers:g.max_players,skill:g.skill,joinMode:g.join_mode,status:g.status,format:g.format,bookingSource:g.booking_source,players:g.game_participants.map(p=>p.profiles),requests:g.join_requests.map(p=>p.profiles)};
}
export async function getGame(db:SupabaseClient,id:string) {
 const {data,error}=await db.from('games').select(gameSelect).eq('id',id).single<GameRow>();check(error);if(!data)throw new HttpError(404,'NOT_FOUND','Game not found.');return mapGame(data);
}
export async function getProfile(db:SupabaseClient,id:string):Promise<Profile> {
 const ensured=await db.rpc('ensure_profile');check(ensured.error);
 const {data,error}=await db.from('profiles').select('*,player_sports(*)').eq('id',id).single();check(error);
 if(!data)throw new HttpError(404,'NOT_FOUND','Profile not found.');
 let avatarUrl:string|null=null;
 if(data.avatar_path){const signed=await db.storage.from('avatars').createSignedUrl(data.avatar_path,3600);if(signed.error)throw new HttpError(503,'STORAGE_UNAVAILABLE','Profile photo could not be loaded.');avatarUrl=signed.data.signedUrl;}
 return {id:data.id,name:data.name,username:data.username,bio:data.bio,cityId:data.city_id,areaId:data.area_id,avatarPath:data.avatar_path,avatarUrl,
 sports:data.player_sports.map((s:SportProfile)=>({sport:s.sport,skill:s.skill,positions:s.positions,formats:s.formats}))};
}
type VenueRow={id:string;name:string;description:string;address:string;city_id:string;area_id:string|null;latitude:number;longitude:number;phone:string|null;facilities:string[];photos:string[];source:Venue['source'];verified:boolean;courts:{sport:Game['sport']}[]};
export const venueSelect='*,courts(sport)';
export function mapVenue(v:VenueRow):Venue {return {id:v.id,name:v.name,description:v.description,address:v.address,cityId:v.city_id,areaId:v.area_id,latitude:v.latitude,longitude:v.longitude,phone:v.phone,facilities:v.facilities,photos:v.photos,source:v.source,verified:v.verified,sports:[...new Set(v.courts.map(c=>c.sport))]};}
export async function getVenue(db:SupabaseClient,id:string):Promise<VenueDetail>{
 const {data,error}=await db.from('venues').select('*,courts(*,court_hours(*))').eq('id',id).single();check(error);if(!data)throw new HttpError(404,'NOT_FOUND','Venue not found.');
 return {...mapVenue(data),bookingEnabled:false,courts:data.courts.map((court:{id:string;name:string;sport:Game['sport'];active:boolean;court_hours:{day_of_week:number;opens_at:string;closes_at:string;slot_minutes:number;price_pkr:number|null}[]})=>({id:court.id,name:court.name,sport:court.sport,active:court.active,hours:court.court_hours.map((h):CourtHours=>({dayOfWeek:h.day_of_week,opensAt:h.opens_at,closesAt:h.closes_at,slotMinutes:h.slot_minutes,pricePkr:h.price_pkr}))}))};
}
