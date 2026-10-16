import { ApiError, type createApi } from './api';
export type AccountSession={userId:string;expiresAt:string;token?:string};
export type TokenStore={getItem(key:string):Promise<string|null>;setItem(key:string,value:string):Promise<void>;removeItem(key:string):Promise<void>};
export function createAccountClient(api:ReturnType<typeof createApi>,tokens?:TokenStore){
 let revision=0;
 let state={userId:null as string|null,ready:false,error:''};const listeners=new Set<()=>void>();
 const update=(userId:string|null,error='')=>{state={userId,ready:true,error};listeners.forEach(fn=>fn())};
 async function accept(session:AccountSession){if(tokens&&session.token)await tokens.setItem('maidaan:account-token',session.token);update(session.userId);return session;}
 return {
  invalidate(){++revision;update(null)},
  subscribe(fn:()=>void){listeners.add(fn);return()=>{listeners.delete(fn)}},getSnapshot:()=>state,
  async restore(){const ticket=revision;try{const session=await api.request<AccountSession>('/auth/session');if(ticket===revision)await accept(session)}catch(e){if(ticket===revision)update(null,e instanceof ApiError&&e.status===401?'':(e as Error).message)}},
  async login(identifier:string,password:string){const ticket=++revision;const session=await api.request<AccountSession>('/auth/login','POST',{identifier,password});
   // A successful password check is not proof that the browser accepted its cookie.
   if(!tokens){try{const restored=await api.request<AccountSession>('/auth/session');if(restored.userId!==session.userId)throw new Error('Session identity changed.');}catch(e){if(e instanceof ApiError&&e.status===401)throw new Error('Session cookie was not retained. Open http://127.0.0.1:5173 and configure the API as http://127.0.0.1:5000 for local development.');throw e;}}
   if(ticket!==revision)throw new Error('Sign-in was cancelled. Try again.');return accept(session);
  },
  async register(input:unknown){++revision;return accept(await api.request<AccountSession>('/auth/register','POST',input))},
  async renew(){return accept(await api.request<AccountSession>('/auth/renew','POST',{}))},
  async logout(){++revision;try{await api.request('/auth/logout','POST',{})}catch(e){if(!(e instanceof ApiError&&e.status===401))throw e}if(tokens)await tokens.removeItem('maidaan:account-token');update(null)},
 };
}
export function encodeImage(bytes:Uint8Array){let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);return btoa(binary)}
export const pakistanDate=(date=new Date())=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Karachi',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
export const pakistanTime=(value:string)=>new Date(value).toLocaleString('en-PK',{timeZone:'Asia/Karachi',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});

export function nativePlayerPath(value:string):string|null{
 const routes:Record<string,string>={'/player':'/discover','/player/games':'/open-games','/player/bookings':'/bookings','/player/profile':'/profile','/player/create':'/create','/player/my-games':'/my-games','/player/map':'/map'};
 if(routes[value])return routes[value];
 const detail=/^\/player\/(games|venues)\/([0-9a-f-]{36})$/i.exec(value);
 return detail?'/'+(detail[1]==='games'?'game':'venue')+'/'+detail[2]:null;
}
