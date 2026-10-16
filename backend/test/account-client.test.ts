import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAccountClient, nativePlayerPath } from '../../shared/account-client';
import { createApi } from '../../shared/api';
test('account restore cannot overwrite a newer login and web credentials remain cookie-based',async()=>{
 const original=globalThis.fetch;let finish:(value:Response)=>void=()=>{};let sessionCalls=0;
 globalThis.fetch=async(input,init)=>{assert.equal(init?.credentials,'include');assert.equal((init?.headers as Record<string,string>)['X-Maidaan-Client'],'web');assert.equal((init?.headers as Record<string,string>).Authorization,undefined);if(String(input).endsWith('/auth/session')&&++sessionCalls===1)return new Promise<Response>(resolve=>{finish=resolve});return new Response(JSON.stringify({userId:'new-account',expiresAt:new Date().toISOString()}),{status:200,headers:{'Content-Type':'application/json'}})};
 try{const auth=createAccountClient(createApi('http://isolated.test',async()=>undefined));const restore=auth.restore();await Promise.resolve();await auth.login('registered_name','A real password');finish(new Response(JSON.stringify({userId:'old-account',expiresAt:new Date().toISOString()}),{status:200}));await restore;assert.equal(auth.getSnapshot().userId,'new-account');await auth.logout();assert.equal(auth.getSnapshot().userId,null);}finally{globalThis.fetch=original}
});

test('CMS links map only implemented native player routes',()=>{assert.equal(nativePlayerPath('/player'),'/discover');assert.equal(nativePlayerPath('/player/bookings'),'/bookings');assert.equal(nativePlayerPath('/player/games/11111111-1111-4111-8111-111111111111'),'/game/11111111-1111-4111-8111-111111111111');assert.equal(nativePlayerPath('https://example.test'),null);assert.equal(nativePlayerPath('/admin'),null)});

test('web login fails closed when its HttpOnly cookie is not retained',async()=>{
 const original=globalThis.fetch;const calls:string[]=[];
 globalThis.fetch=async(input,init)=>{calls.push(String(input));assert.equal(init?.credentials,'include');return String(input).endsWith('/auth/login')?new Response(JSON.stringify({userId:'account',expiresAt:new Date().toISOString()}),{status:200}):new Response(JSON.stringify({error:{message:'Sign in to continue.'}}),{status:401})};
 try{const auth=createAccountClient(createApi('http://127.0.0.1:5000',async()=>undefined));await assert.rejects(()=>auth.login('dev_player_01','example'),/cookie was not retained/);assert.equal(auth.getSnapshot().userId,null);assert.equal(calls.length,2)}finally{globalThis.fetch=original}
});

test('expired protected requests invalidate real account state without treating forbidden access as logout',async()=>{
 const original=globalThis.fetch;let denied=0;let forbidden=false;
 globalThis.fetch=async()=>new Response(JSON.stringify({error:{message:'Denied'}}),{status:forbidden?403:401});
 try{const api=createApi('http://127.0.0.1:5000',async()=>undefined,'web',()=>denied++);await assert.rejects(()=>api.profile());assert.equal(denied,1);forbidden=true;await assert.rejects(()=>api.request('/admin/access'));assert.equal(denied,1);forbidden=false;await assert.rejects(()=>api.request('/auth/login','POST',{}));assert.equal(denied,1)}finally{globalThis.fetch=original}
});
