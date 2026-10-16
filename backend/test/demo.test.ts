import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createDemoAuth,demoEnabledFor,demoSessionKey,canPreview,portalHome,portalLogin,webPortalLogin,type DemoStorage,type Portal} from '../../shared/demo-auth';
import {createDemoApi} from '../../shared/demo-api';
import {createPlayerStore} from '../../shared/player-store';
import {createApi} from '../../shared/api';
import {newGameInput} from '../../shared/formats';
import {profileCompleteness} from '../../shared/contracts';

function memoryStorage():DemoStorage {
 const data=new Map<string,string>();return {async getItem(key){return data.get(key)||null},async setItem(key,value){data.set(key,value)},async removeItem(key){data.delete(key)}};
}
test('demo is explicitly opt-in, off in production and cannot restore a production session',async()=>{
 for(const development of [false,true])for(const flag of [undefined,'false','true','TRUE','1'])assert.equal(demoEnabledFor(development,flag),development&&flag==='true');
 const storage=memoryStorage();await storage.setItem(demoSessionKey,JSON.stringify({kind:'local-demo',role:'admin',userId:'demo-admin'}));
 const production=createDemoAuth(demoEnabledFor(false,'true'),storage);await production.restore();assert.equal(production.getSnapshot().session,null);
 await assert.rejects(()=>production.login('admin','admin','admin'),/disabled/);
 const disabledApi=createDemoApi(production);await assert.rejects(()=>disabledApi.profile(),/Sign in/);
});
test('portal credentials, exact-role matrix, refresh, back-safe destinations and logout',async()=>{
 const roles:Portal[]=['player','hub','admin'];
 for(const role of roles){
  const storage=memoryStorage(),auth=createDemoAuth(true,storage);await auth.restore();assert.equal(auth.getSnapshot().session,null);
  for(const destination of roles)assert.equal(canPreview(null,destination),false);
  await assert.rejects(()=>auth.login(role,role,'wrong'),/Incorrect/);assert.equal(auth.getSnapshot().session,null);
  for(const other of roles.filter(r=>r!==role))await assert.rejects(()=>auth.login(role,other,other),/Incorrect/);
  await auth.login(role,role,role);const session=auth.getSnapshot().session;assert(session);
  assert.equal('access_token'in session,false);assert.equal('password'in session,false);
  for(const destination of roles)assert.equal(canPreview(session,destination),role===destination);
  assert.equal(portalHome(role),'/'+role);assert.equal(portalLogin(role),'/'+role+'/login');assert.notEqual(portalHome(role),portalLogin(role));
  const refreshed=createDemoAuth(true,storage);await refreshed.restore();assert.deepEqual(refreshed.getSnapshot().session,session);
  await refreshed.logout();assert.equal(refreshed.getSnapshot().session,null);const afterLogout=createDemoAuth(true,storage);await afterLogout.restore();assert.equal(afterLogout.getSnapshot().session,null);
 }
});
test('malformed sessions and restore/login/logout races cannot resurrect preview access',async()=>{
 const storage=memoryStorage();await storage.setItem(demoSessionKey,'not-json');const auth=createDemoAuth(true,storage);await auth.restore();assert.equal(auth.getSnapshot().session,null);
 await storage.setItem(demoSessionKey,JSON.stringify({kind:'local-demo',role:'admin',userId:'real-user-id'}));await auth.restore();assert.equal(auth.getSnapshot().session,null);
 const login=auth.login('player','player','player'),logout=auth.logout();await Promise.all([login,logout]);assert.equal(auth.getSnapshot().session,null);
 const reload=createDemoAuth(true,storage);await reload.restore();assert.equal(reload.getSnapshot().session,null);
});
test('demo data and game actions stay local even if a real JWT is available',async()=>{
 const previous=globalThis.fetch;let requests=0;
 globalThis.fetch=async()=>{requests++;throw new Error('Unexpected live request')};
 try {
  const auth=createDemoAuth(true,memoryStorage()),api=createDemoApi(auth);await auth.login('player','player','player');
  const live=createApi('https://example.invalid',async()=>{auth.assertLiveAccess();return 'real-token-must-not-be-used'});
  await assert.rejects(()=>live.profile(),/cannot call the live API/);assert.equal(requests,0);
  const store=createPlayerStore(api);await store.setUser('demo-player');assert.equal(store.getSnapshot().error,'');
  const profile=store.getSnapshot().profile!;assert.equal(profile.name,'Player One');assert.equal(profile.cityId,'lahore');assert.equal(profile.areaId,'lahore-dha-1');assert.equal(profileCompleteness(profile),100);
  assert.deepEqual(profile.sports.map(s=>[s.sport,s.skill]),[['Badminton','Intermediate'],['Padel','Intermediate']]);
  assert(store.getSnapshot().myGames.some(g=>g.status==='completed'));assert((await api.venues({cityId:'lahore'})).total>0);
  await api.updateGame('demo-football',{type:'join'});assert((await api.game('demo-football')).players.some(p=>p.id==='demo-player'));
  await assert.rejects(()=>api.updateGame('demo-football',{type:'join'}),/already/);
  await api.updateGame('demo-football',{type:'leave'});
  await api.updateGame('demo-cricket',{type:'join'});assert((await api.game('demo-cricket')).requests.some(p=>p.id==='demo-player'));
  await api.updateGame('demo-badminton',{type:'approve',playerId:'sara'});
  await assert.rejects(()=>api.updateGame('demo-football',{type:'cancel'}),/host/);
  const created=await api.createGame({...newGameInput(),title:'Sample created game',description:'Local test',venue:'Sample only',location:'DHA Lahore',cityId:'lahore',areaId:'lahore-dha-1'});
  assert.equal(created.hostId,'demo-player');await api.updateGame(created.id,{type:'cancel'});
  assert.equal((await api.availability('demo-court-padel','2030-01-01')).bookingEnabled,false);
  await assert.rejects(()=>api.request('/admin/access'),/cannot perform live/);
  await auth.logout();await assert.rejects(()=>api.createGame(newGameInput()),/Sign in/);assert.equal(requests,0);
 }finally{globalThis.fetch=previous}
});
test('mobile web handoff contains no preview credentials or session',()=>{
 assert.equal(webPortalLogin('http://localhost:5173/welcome','hub'),'http://localhost:5173/hub/login');
 assert.equal(webPortalLogin('https://example.com/?token=bad','admin'),'https://example.com/admin/login');
 assert.throws(()=>webPortalLogin(undefined,'hub'),/EXPO_PUBLIC_WEB_URL/);
 assert.throws(()=>webPortalLogin('javascript:alert(1)','admin'));
 assert.throws(()=>webPortalLogin('https://name:password@example.com','admin'),/without embedded/);
});
