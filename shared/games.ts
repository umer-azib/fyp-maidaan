import type { Sport } from './tokens';
export type Player = {
    id: string;
    name: string;
    avatarUrl?:string|null;
};
export type JoinMode = 'instant' | 'request';
export type Game = {
    cityId?: string;
    areaId?: string | null;
    format?: string;
    bookingSource?: 'external' | 'confirmed' | 'booking';
    venueId?: string | null;
    bookingId?:string|null;
    estimatedCostPerPlayer?:number;needsReplacement?:boolean;waitlisted?:boolean;waitlistCount?:number;visibility?:'public'|'private';
    id: string;
    sport: Sport;
    title: string;
    description: string;
    location: string;
    latitude: number;
    longitude: number;
    venue: string;
    startsAt: string;
    duration: number;
    maxPlayers: number;
    skill: 'All levels' | 'Beginner' | 'Intermediate' | 'Advanced';
    joinMode: JoinMode;
    status: 'open' | 'cancelled' | 'completed';
    hostId: string;
    players: Player[];
    requests: Player[];
};
export type GameInput = Omit<Game, 'id' | 'status' | 'hostId' | 'players' | 'requests'>;
export const currentPlayer: Player = { id: 'me', name: 'Umer Ahmed' };
export const spots = (g: Game) => Math.max(0, g.maxPlayers - g.players.length);
export const dateLabel = (g: Game) => new Date(g.startsAt).toLocaleString('en-PK', { timeZone:'Asia/Karachi', weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
export function validateGame(g: GameInput) {
    if (!['Cricket', 'Football', 'Badminton', 'Padel'].includes(g.sport) || !['All levels', 'Beginner', 'Intermediate', 'Advanced'].includes(g.skill) || !['instant', 'request'].includes(g.joinMode))
        throw new Error('Choose valid game options.');
    if (!g.title.trim() || !g.venue.trim() || !g.location.trim() || !g.description.trim())
        throw new Error('Complete the title, description, venue and location.');
    if (!Number.isFinite(Date.parse(g.startsAt)) || Date.parse(g.startsAt) <= Date.now())
        throw new Error('Choose a future date and time.');
    if (!Number.isInteger(g.maxPlayers) || g.maxPlayers < 2 || g.maxPlayers > 100)
        throw new Error('Choose 2–100 players.');
    if (!Number.isFinite(g.duration) || g.duration < 15 || g.duration > 720)
        throw new Error('Duration must be 15–720 minutes.');
    if (!Number.isFinite(g.latitude) || Math.abs(g.latitude) > 90 || !Number.isFinite(g.longitude) || Math.abs(g.longitude) > 180)
        throw new Error('Enter valid latitude and longitude.');
}
export type GameAction = {
    type: 'join' | 'leave' | 'cancel' | 'waitlist' | 'leave_waitlist' | 'complete';
} | {
    type: 'approve' | 'reject';
    playerId: string;
} | {
    type: 'edit';
    input: GameInput;
};
export function changeGame(g: Game, actor: Player, action: GameAction): Game {
    if(['waitlist','leave_waitlist','complete'].includes(action.type))throw new Error('This action is not available in local demo mode.');
    const host = g.hostId === actor.id;
    if (['approve', 'reject', 'cancel', 'edit'].includes(action.type) && !host)
        throw new Error('Only this game’s host can manage it.');
    if (action.type === 'cancel')
        return { ...g, status: 'cancelled', requests: [] };
    if (g.status !== 'open')
        throw new Error('This game is no longer open.');
    if (action.type === 'edit') {
        validateGame(action.input);
        if (action.input.maxPlayers < g.players.length)
            throw new Error('Capacity cannot be below the current player count.');
        return { ...g, ...action.input };
    }
    if (action.type === 'leave') {
        if (host)
            throw new Error('Hosts must cancel their game instead.');
        return { ...g, players: g.players.filter(p => p.id !== actor.id), requests: g.requests.filter(p => p.id !== actor.id) };
    }
    if (action.type === 'reject')
        return { ...g, requests: g.requests.filter(p => p.id !== action.playerId) };
    if (action.type === 'approve') {
        const p = g.requests.find(p => p.id === action.playerId);
        if (!p)
            throw new Error('Request no longer exists.');
        if (!spots(g))
            throw new Error('The game is full.');
        return { ...g, players: [...g.players, p], requests: g.requests.filter(request => request.id !== p.id) };
    }
    if (host || g.players.some(p => p.id === actor.id) || g.requests.some(p => p.id === actor.id))
        throw new Error('You have already joined or requested this game.');
    if (Date.parse(g.startsAt) <= Date.now())
        throw new Error('This game has already started.');
    if (!spots(g))
        throw new Error('The game is full.');
    return g.joinMode === 'instant' ? { ...g, players: [...g.players, actor] } : { ...g, requests: [...g.requests, actor] };
}
export interface GameService {
    list(): Promise<Game[]>;
    create(input: GameInput): Promise<Game>;
    update(id: string, action: GameAction): Promise<Game>;
}

export function effectiveGameStatus(game:{status:string;startsAt:string;maxPlayers:number;participants:number;joinMode?:string},now=Date.now()){
 if(game.status!=='open')return game.status==='completed'?'Completed':'Cancelled';
 if(Date.parse(game.startsAt)<=now)return 'Started';
 if(game.participants>=game.maxPlayers)return 'Full';
 return game.joinMode==='request'?'Requests open':'Open';
}
