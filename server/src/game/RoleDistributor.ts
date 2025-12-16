import { Player, PlayerRole } from '@undercover/shared';
import { WORD_PAIRS } from '../data/words';

export class RoleDistributor {
    static distribute(players: Player[], undercoverCount: number, mrWhiteCount: number): void {
        const totalPlayers = players.length;
        if (undercoverCount + mrWhiteCount >= totalPlayers) {
            throw new Error('Too many special roles for player count');
        }

        // Reset roles
        players.forEach(p => {
            p.role = PlayerRole.CIVILIAN;
            p.word = '';
        });

        const shuffledIndices = Array.from({ length: totalPlayers }, (_, i) => i)
            .sort(() => Math.random() - 0.5);

        // Assign Mr White
        for (let i = 0; i < mrWhiteCount; i++) {
            const idx = shuffledIndices.pop();
            if (idx !== undefined) {
                players[idx].role = PlayerRole.MR_WHITE;
                // Mr White gets NO word (empty string)
            }
        }

        // Assign Undercovers
        for (let i = 0; i < undercoverCount; i++) {
            const idx = shuffledIndices.pop();
            if (idx !== undefined) {
                players[idx].role = PlayerRole.UNDERCOVER;
            }
        }

        // Assign Words
        const wordPair = WORD_PAIRS[Math.floor(Math.random() * WORD_PAIRS.length)];

        // Randomize which word is Civilian vs Undercover to prevent meta-gaming? 
        // Usually Undercover is the "minority" word, but strictly speaking it's cleaner if defined in the pair.
        // We'll stick to pair definition: civilian property -> Civilian role.

        players.forEach(p => {
            if (p.role === PlayerRole.CIVILIAN) {
                p.word = wordPair.civilian;
            } else if (p.role === PlayerRole.UNDERCOVER) {
                p.word = wordPair.undercover;
            }
            // Mr White stays empty
        });
    }
}
