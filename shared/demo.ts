import { currentPlayer, type Game, type GameInput } from './games';
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
tomorrow.setHours(18, 0, 0, 0);
export const defaultInput: GameInput = { sport: 'Football', title: 'Evening five-a-side', description: 'A friendly game after a long day. Bring your energy, water and a good sporting spirit.', location: 'DHA, Lahore', latitude: 31.4697, longitude: 74.4126, venue: 'Maidaan Sports Arena', startsAt: tomorrow.toISOString(), duration: 90, maxPlayers: 10, skill: 'All levels', joinMode: 'instant' };
const ali = { id: 'ali', name: 'Ali Raza' }, sara = { id: 'sara', name: 'Sara Khan' }, hamza = { id: 'hamza', name: 'Hamza Malik' };
export function demoGames(): Game[] {
    return [
        { ...defaultInput, id: 'football', sport: 'Football', hostId: ali.id, status: 'open', players: [ali, sara, hamza], requests: [] },
        { ...defaultInput, id: 'cricket', sport: 'Cricket', title: 'Sunday cricket crew', venue: 'Model Town Greens', location: 'Model Town, Lahore', maxPlayers: 22, joinMode: 'request', hostId: hamza.id, status: 'open', players: [hamza, sara], requests: [] },
        { ...defaultInput, id: 'badminton', sport: 'Badminton', title: 'A little friendly competition', venue: 'Rally Indoor Club', location: 'Gulberg, Lahore', maxPlayers: 4, hostId: currentPlayer.id, status: 'open', joinMode: 'request', players: [currentPlayer, ali], requests: [sara, hamza] },
        { ...defaultInput, id: 'padel', sport: 'Padel', title: 'Meet you at the court', venue: 'The Padel Yard', location: 'DHA Phase 6, Lahore', maxPlayers: 4, hostId: sara.id, status: 'open', players: [sara, currentPlayer], requests: [] }
    ];
}
