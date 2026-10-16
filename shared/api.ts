import type { Access, Availability, City, Area, LocationFilter, Page, Profile, ProfileInput, Venue, VenueDetail } from './contracts';
import type { Game, GameAction, GameInput } from './games';

export class ApiError extends Error {
  status: number;
  code: string;
  constructor(message: string, status: number, code: string) { super(message); this.status=status; this.code=code; }
}
function gamePayload(input: GameInput) {
  const { sport,title,description,location,latitude,longitude,venue,startsAt,duration,maxPlayers,skill,joinMode,cityId,areaId,format,bookingSource,venueId,visibility } = input;
  return { sport,title,description,location,latitude,longitude,venue,startsAt,duration,maxPlayers,skill,joinMode,cityId,areaId,format,bookingSource:bookingSource==='booking'?'external':bookingSource,venueId,visibility };
}
export function createApi(baseUrl: string, getToken: () => Promise<string | undefined>, client: 'web'|'mobile' = 'web', onUnauthorized?:()=>void, onMutation?:(path:string,method:string,body:unknown,result:unknown)=>void, onError?:(error:Error)=>void) {
  async function request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
    if (!baseUrl) throw new ApiError('Set the API URL in your environment file.', 503, 'NOT_CONFIGURED');
    const token = await getToken();
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),20000);
    try {
    const response = await fetch(baseUrl.replace(/\/$/, '') + '/v1' + path, {
      method, credentials:client==='web'?'include':'omit', headers: { 'Content-Type': 'application/json', 'X-Maidaan-Client':client, ...(token ? { Authorization: 'Bearer ' + token } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body), signal: controller.signal,
    });
    const json = await response.json();
    if(response.status===401&&!path.startsWith('/auth/'))onUnauthorized?.();
    if (!response.ok) throw new ApiError(json.error?.message || 'The request failed.', response.status, json.error?.code || 'REQUEST_FAILED');
    if(!['GET','HEAD'].includes(method))onMutation?.(path,method,body,json);
    return json;
    } catch(error){if(!['GET','HEAD'].includes(method))onError?.(error instanceof Error?error:new Error('The change could not be saved.'));throw error;} finally { clearTimeout(timeout); }
  }
  function query(filter: LocationFilter, page = 1) {
    const params = new URLSearchParams({ cityId: filter.cityId, page: String(page), pageSize: '50' });
    for (const [key, value] of Object.entries(filter)) if (value !== undefined && value !== '') params.set(key, String(value));
    return '?' + params.toString();
  }
  return {
    request,
    locations: () => request<{ cities: City[]; areas: Area[] }>('/locations'),
    access: () => request<Access>('/me/access'),
    profile: () => request<Profile>('/me/profile'),
    saveProfile: (profile: ProfileInput) => request<Profile>('/me/profile', 'PUT', profile),
    venues: (filter: LocationFilter, page = 1) => request<Page<Venue>>('/venues' + query(filter, page)),
    venue: (id: string) => request<VenueDetail>('/venues/' + encodeURIComponent(id)),
    availability: (id: string, date: string) => request<Availability>('/courts/' + encodeURIComponent(id) + '/availability?date=' + encodeURIComponent(date)),
    games: (filter: LocationFilter, page = 1) => request<Page<Game>>('/games' + query(filter, page)),
    myGames: (page = 1) => request<Page<Game>>('/me/games?page=' + page + '&pageSize=50'),
    game: (id: string) => request<Game>('/games/' + encodeURIComponent(id)),
    createGame: (input: GameInput) => request<Game>('/games', 'POST', gamePayload(input)),
    updateGame: (id: string, action: GameAction) => request<Game>('/games/' + encodeURIComponent(id) + '/actions', 'POST', action.type === 'edit' ? {...action,input:gamePayload(action.input)} : action),
  };
}
