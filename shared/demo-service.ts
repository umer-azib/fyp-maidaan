import { changeGame, currentPlayer, validateGame, type GameService } from './games';
import { demoGames } from './demo';
// shortcut: in-memory demo resets on refresh; replace this adapter when the Express API is ready.
export function createDemoService(): GameService {
    let games = demoGames();
    let nextId = 0;
    return {
        async list() { return games; },
        async create(input) { validateGame(input); const game = { ...input, id: 'demo-' + Date.now() + '-' + nextId++, hostId: currentPlayer.id, status: 'open' as const, players: [currentPlayer], requests: [] }; games = [game, ...games]; return game; },
        async update(id, action) { const game = games.find(g => g.id === id); if (!game)
            throw new Error('Game not found.'); const next = changeGame(game, currentPlayer, action); games = games.map(g => g.id === id ? next : g); return next; }
    };
}
