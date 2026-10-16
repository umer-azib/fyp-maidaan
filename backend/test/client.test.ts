import {test} from 'node:test';
import assert from 'node:assert/strict';
import { createApi, ApiError } from '../../shared/api';
import { createPlayerStore } from '../../shared/player-store';
import { newGameInput } from '../../shared/formats';
import type { Profile } from '../../shared/contracts';

test('shared API sends JWT and writable fields only; propagates consistent errors',async()=>{
 const previous=globalThis.fetch;const requests:{url:string;init:RequestInit}[]=[];
 globalThis.fetch=async(url,init)=>{requests.push({url:String(url),init:init||{}});return new Response(JSON.stringify({id:'game'}),{status:200,headers:{'Content-Type':'application/json'}})};
 try{const api=createApi('http://localhost:3001/',async()=>'verified-token');
 await api.createGame({...newGameInput(),cityId:'lahore',areaId:null,id:'spoofed',hostId:'attacker'} as ReturnType<typeof newGameInput>);
 const body=JSON.parse(requests[0].init.body as string);assert.equal(body.hostId,undefined);assert.equal(body.id,undefined);assert.equal(body.bookingSource,'external');
 assert.equal((requests[0].init.headers as Record<string,string>).Authorization,'Bearer verified-token');
 await api.games({cityId:'lahore',areaId:'lahore-gulberg',latitude:31.5,longitude:74.3},2);
 assert(requests[1].url.includes('cityId=lahore'));assert(requests[1].url.includes('areaId=lahore-gulberg'));assert(requests[1].url.includes('page=2'));
 globalThis.fetch=async()=>new Response(JSON.stringify({error:{code:'CONFLICT',message:'Game is full.'}}),{status:409});
 await assert.rejects(()=>api.updateGame('id',{type:'join'}),(e:unknown)=>e instanceof ApiError&&e.status===409&&e.code==='CONFLICT');
 await assert.rejects(()=>createApi('',async()=>undefined).locations(),/API URL/);
 }finally{globalThis.fetch=previous}
});

test('shared player store preserves drafts, location filters and sign-out privacy without demo fallback',async()=>{
 const profile:Profile={id:'alice',name:'Alice',username:null,bio:'',cityId:'lahore',areaId:null,avatarPath:null,sports:[]};
 const calls:string[]=[];
 const api={locations:async()=>({cities:[],areas:[]}),venues:async(f:{cityId:string})=>{calls.push(f.cityId);return {data:[],total:0,page:1,pageSize:50}},games:async()=>({data:[],total:0,page:1,pageSize:50}),myGames:async()=>({data:[],total:0,page:1,pageSize:50}),profile:async()=>profile,saveProfile:async(p:Profile)=>({...p,id:'alice'})} as unknown as ReturnType<typeof createApi>;
 const store=createPlayerStore(api);assert.equal(store.getSnapshot().games.length,0);assert.equal(store.getSnapshot().location.cityId,'lahore');
 await store.setUser('alice');assert.equal(store.getSnapshot().profile?.name,'Alice');
 store.editProfile({bio:'Unsaved draft'});await store.refresh();assert.equal(store.getSnapshot().profile?.bio,'Unsaved draft');
 store.setLocation({cityId:'new-city'});await store.refresh();assert(calls.includes('new-city'));
 await store.saveProfile();assert.equal(store.getSnapshot().profile?.bio,'Unsaved draft');
 await store.setUser(null);assert.equal(store.getSnapshot().profile,null);assert.deepEqual(store.getSnapshot().games,[]);assert.deepEqual(store.getSnapshot().myGames,[]);
});
