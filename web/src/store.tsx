import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { createPlayerStore } from '../../shared/player-store';
import { api, accountAuth, configured, demoAuth } from './services';
import { createDemoApi } from '../../shared/demo-api';

type Stores={live:ReturnType<typeof createPlayerStore>;preview:ReturnType<typeof createPlayerStore>;previewApi:ReturnType<typeof createDemoApi>};
const Context = createContext<Stores | null>(null);
export function GameProvider({ children }: { children: ReactNode }) {
  const [stores] = useState(()=>{const previewApi=createDemoApi(demoAuth);return {live:createPlayerStore(api),preview:createPlayerStore(previewApi),previewApi};});
  const store=stores.live;
  const demo=useSyncExternalStore(demoAuth.subscribe,demoAuth.getSnapshot,demoAuth.getSnapshot);
  useEffect(()=>{void demoAuth.restore();},[]);
  useEffect(()=>{void stores.preview.setUser(demo.session?.userId||null);},[stores,demo.session]);
  useEffect(() => {
    let active = true;
    if (!demo.ready || demo.session) return;
    const sync=()=>{if(active)void store.setUser(accountAuth.getSnapshot().userId)};
    const unsubscribe=accountAuth.subscribe(sync);
    void accountAuth.restore();
    return()=>{active=false;unsubscribe()};
  }, [store,demo.ready,demo.session]);
  useEffect(()=>{const sync=()=>{if(!demo.session&&accountAuth.getSnapshot().userId&&document.visibilityState==='visible')void store.refresh().then(()=>window.dispatchEvent(new Event('maidaan:live-update')))};const timer=setInterval(sync,15000);window.addEventListener('focus',sync);return()=>{clearInterval(timer);window.removeEventListener('focus',sync)}},[store,demo.session]);
  return <Context.Provider value={stores}>{children}</Context.Provider>;
}
// eslint-disable-next-line react-refresh/only-export-components
export function useGames() {
  const stores = useContext(Context);
  if (!stores) throw new Error('Missing GameProvider');
  const demo=useSyncExternalStore(demoAuth.subscribe,demoAuth.getSnapshot,demoAuth.getSnapshot);
  const account=useSyncExternalStore(accountAuth.subscribe,accountAuth.getSnapshot,accountAuth.getSnapshot);
  const store=demo.session?stores.preview:stores.live;
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  return {
    ...state, ...store, configured, api:demo.session?stores.previewApi:api, demoSession:demo.session,demoEnabled:demoAuth.enabled,
    authReady:demo.ready&&state.authReady&&(demo.session?state.userId===demo.session.userId:account.ready&&state.userId===account.userId),
    async logout(){if(demoAuth.getSnapshot().session){await demoAuth.logout();return;}await accountAuth.logout();await stores.live.setUser(null);},
    name: state.profile?.name || 'Player', preferences: state.profile?.sports.map(s => s.sport) || [],
    setName: (name: string) => store.editProfile({name}),
    setPreferences: (preferences: string[]) => store.editProfile({sports: preferences.map(sport => state.profile?.sports.find(s=>s.sport===sport) || {sport: sport as import('../../shared/tokens').Sport, skill:'All levels', positions:[], formats:[]})}),
  };
}
