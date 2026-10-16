export type Portal = 'player' | 'hub' | 'admin';
export type DemoSession = { kind: 'local-demo'; role: Portal; userId: string };
export type DemoStorage = { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<void>; removeItem(key: string): Promise<void> };
export const demoSessionKey = 'maidaan:local-demo:v1';
export const accountEntries = [
  { role: 'player', title: "I'M A PLAYER", subtitle: 'Discover venues, join games and meet players.', icon: 'person' },
  { role: 'hub', title: "I'M A VENUE OWNER", subtitle: 'Manage your courts, bookings and facilities.', icon: 'stadium' },
  { role: 'admin', title: 'ADMIN LOGIN', subtitle: 'Authorized platform administrators only.', icon: 'shield' },
] as const;
export const welcomeSubtitle = 'Find your court. Meet your team. Make every game count.';
export const demoEnabledFor = (development: boolean, flag?: string) => development && flag === 'true';
export const portalHome = (role: Portal) => '/' + role;
export const portalLogin = (role: Portal) => '/' + role + '/login';
export const canPreview = (session: DemoSession | null, role: Portal) => session?.role === role;
export function webPortalLogin(base: string | undefined, role: Portal): string {
  if(!base)throw new Error('Set EXPO_PUBLIC_WEB_URL to your web app’s reachable address.');
  const url=new URL(portalLogin(role),base);
  if(!['http:','https:'].includes(url.protocol)||url.username||url.password)throw new Error('Use an HTTP(S) web portal URL without embedded credentials.');
  return url.toString();
}

// Preview identity is deliberately not a Supabase Session and never contains an access token.
export function createDemoAuth(enabled: boolean, storage: DemoStorage) {
  let state = { session: null as DemoSession | null, ready: !enabled };
  let revision = 0;
  let writes = Promise.resolve();
  function persist(operation:()=>Promise<void>) { writes=writes.catch(()=>{}).then(operation);return writes; }
  const listeners = new Set<() => void>();
  function update(session: DemoSession | null) { state = { session, ready: true }; listeners.forEach(fn => fn()); }
  return {
    enabled,
    getSnapshot: () => state,
    subscribe(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; },
    async restore() {
      if (!enabled) return;
      const version = revision;
      let session: DemoSession | null = null;
      try {
        const value = JSON.parse(await storage.getItem(demoSessionKey) || 'null');
        if (value?.kind === 'local-demo' && ['player', 'hub', 'admin'].includes(value.role) && value.userId === 'demo-' + value.role)
          session = { kind: 'local-demo', role: value.role, userId: value.userId };
      } catch { /* Invalid/unavailable local storage is treated as signed out. */ }
      if (version === revision) update(session);
    },
    async login(role: Portal, username: string, password: string) {
      if (!enabled) throw new Error('Demo login is disabled.');
      if (!accountEntries.some(entry=>entry.role===role) || username.trim() !== role || password !== role) throw new Error('Incorrect username or password.');
      const session: DemoSession = { kind: 'local-demo', role, userId: 'demo-' + role };
      const version=++revision;
      await persist(()=>storage.setItem(demoSessionKey, JSON.stringify(session)));
      if(version===revision)update(session);
    },
    async logout() {
      ++revision;
      if (enabled) await persist(()=>storage.removeItem(demoSessionKey));
      update(null);
    },
    assertLiveAccess() {
      if (state.session) throw new Error('Local demo accounts cannot call the live API.');
    },
  };
}
