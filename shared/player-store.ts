import type { createApi } from './api';
import type { Area, City, LocationFilter, Profile, ProfileInput, Venue } from './contracts';
import type { Game, GameAction, GameInput } from './games';

export function createPlayerStore(api: ReturnType<typeof createApi>) {
  let state = {
    userId: null as string | null, authReady: false, profile: null as Profile | null,
    location: { cityId: 'lahore' } as LocationFilter, cities: [] as City[], areas: [] as Area[],
    games: [] as Game[], detailGames: [] as Game[], myGames: [] as Game[], venues: [] as Venue[],
    loading: false, error: '', gamePage: 1, venuePage: 1, myPage: 1, gameTotal: 0, venueTotal: 0, myTotal: 0,
  };
  const listeners = new Set<() => void>();
  let generation = 0;
  let profileDirty = false;
  function update(patch: Partial<typeof state>) { state = { ...state, ...patch }; listeners.forEach(fn => fn()); }
  async function refresh(options?:{preserveProfile?:boolean}) {
    const ticket = ++generation;
    const location = state.location;
    update({ loading: true, error: '' });
    const tasks = [
      api.locations().then(data => ({ cities: data.cities, areas: data.areas })),
      api.venues(location).then(data => ({ venues: data.data, venuePage: 1, venueTotal: data.total })),
      ...(state.userId ? [api.games(location).then(data => ({ games: data.data, gamePage: 1, gameTotal: data.total })),
        api.myGames().then(data => ({ myGames: data.data, myPage: 1, myTotal: data.total })),
        ...(options?.preserveProfile?[]:[api.profile().then(profile => ({ profile }))])] : []),
    ];
    const results = await Promise.allSettled(tasks);
    if (ticket !== generation) return;
    for (const result of results) {
      if (result.status === 'fulfilled') {
        if ('profile' in result.value && profileDirty) continue;
        update(result.value);
      }
      else update({ error: result.reason instanceof Error ? result.reason.message : 'Could not load data.' });
    }
    update({ loading: false });
  }
  async function loadMore(kind: 'games' | 'venues' | 'myGames') {
    try {
    const ticket = generation;
    const page = kind === 'games' ? state.gamePage : kind === 'venues' ? state.venuePage : state.myPage;
    const result = kind === 'games' ? await api.games(state.location, page + 1) : kind === 'venues' ? await api.venues(state.location, page + 1) : await api.myGames(page + 1);
    if (ticket !== generation) return;
    if (kind === 'venues') update({ venues: [...new Map([...state.venues, ...result.data as Venue[]].map(v=>[v.id,v])).values()], venuePage: page + 1 });
    else if (kind === 'games') update({ games: [...new Map([...state.games, ...result.data as Game[]].map(g=>[g.id,g])).values()], gamePage: page + 1 });
    else update({ myGames: [...new Map([...state.myGames, ...result.data as Game[]].map(g=>[g.id,g])).values()], myPage: page + 1 });
    } catch(error) { update({error:error instanceof Error?error.message:'Could not load the next page.'}); }
  }
  return {
    subscribe(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; },
    getSnapshot: () => state,
    async setUser(userId: string | null) {
      if (state.authReady && state.userId === userId) return;
      profileDirty=false;
      update({ userId, authReady: true, profile: null, games: [], detailGames: [], myGames: [], gameTotal:0, myTotal:0, error:'' });
      if(!userId){++generation;update({loading:false,error:''});return;}
      await refresh();
    },
    setLocation(location: LocationFilter) { update({ location, games: [], venues: [], gameTotal:0,venueTotal:0 }); void refresh(); },
    editProfile(patch: Partial<ProfileInput>) { if (state.profile) { profileDirty=true; update({ profile: { ...state.profile, ...patch } }); } },
    async saveProfile(input?: ProfileInput) {
      const profile = input || state.profile;
      if (!profile) throw new Error('Sign in and load your profile first.');
      const { name, username, bio, cityId, areaId, avatarPath, sports } = profile;
      const userId=state.userId;
      const result = await api.saveProfile({ name, username, bio, cityId, areaId, avatarPath, sports });
      if(userId!==state.userId)throw new Error('Session changed. Sign in again before saving.');
      profileDirty=false;
      update({ profile: result });await refresh({preserveProfile:true}); return result;
    },
    async ensureGame(id: string) {
      const ticket=generation;
      const game=await api.game(id);
      if(ticket===generation)update({detailGames:[...state.detailGames.filter(g=>g.id!==id),game]});
      return game;
    },
    async create(input: GameInput) {
      const game = await api.createGame({ ...input, cityId: input.cityId || state.location.cityId, areaId: input.areaId === undefined ? state.location.areaId || null : input.areaId, bookingSource: 'external' });
      await refresh(); return game;
    },
    async act(id: string, action: GameAction) {
      const userId=state.userId;
      const game=await api.updateGame(id, action);
      if(userId!==state.userId)throw new Error('Session changed. Sign in again.');
      update({detailGames:[...state.detailGames.filter(g=>g.id!==id),game]});
      await refresh();
    },
    refresh, loadMore,
  };
}
