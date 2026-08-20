import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { Text } from '@astryxdesign/core/Text';
import { Trophy } from 'lucide-react';

import { resolveResultsGame } from '../features/game/results-page-state';
import { useGameStore } from '../features/game/game-store';
import { useLocalGameStore } from '../features/local-game/local-game-store';

const roleClass = (role: string) => `role-${role.replace('_', '-')}`;
const roleKey = (role: string | null | undefined) => role === 'mr_white' ? 'mrWhite' : role ?? 'unknown';
const winnerKey = (winner: string) => winner === 'mr_white' ? 'results.mrWhiteWins' : winner === 'jester' ? 'results.jesterWins' : winner === 'undercovers' ? 'results.undercoversWin' : 'results.civiliansWin';

const ResultsPage = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const localWinner = useLocalGameStore((state) => state.winner);
    const localPlayers = useLocalGameStore((state) => state.players);
    const localConfig = useLocalGameStore((state) => state.config);
    const resetGame = useLocalGameStore((state) => state.resetGame);
    const restartGame = useLocalGameStore((state) => state.restartGame);
    const onlineGame = useGameStore((state) => state.game);
    const clearOnlineGame = useGameStore((state) => state.clear);
    const result = resolveResultsGame(localWinner, onlineGame);

    if (!result) return <Button variant="secondary" label={t('common.back')} onClick={() => navigate('/')} />;

    if (result.mode === 'online') {
        const { game } = result;
        const civilianWord = game.players.find((player) => player.role === 'civilian' || player.role === 'bodyguard' || player.role === 'jester')?.word;
        const undercoverWord = game.players.find((player) => player.role === 'undercover')?.word;
        return <section className="mx-auto max-w-2xl space-y-7"><header className="text-center"><Trophy className="mx-auto mb-3 text-[var(--color-accent)]" size={42} aria-hidden="true" /><h1 className="text-3xl font-bold">{t(winnerKey(game.winner!))}</h1></header><Card><div className="space-y-5 p-5"><div className="grid grid-cols-2 gap-4"><div><Text as="p" type="supporting">{t('results.civilianWord')}</Text><strong>{civilianWord ?? '?'}</strong></div><div><Text as="p" type="supporting">{t('results.undercoverWord')}</Text><strong>{undercoverWord ?? '?'}</strong></div></div><div className="divide-y divide-[var(--color-border)]">{game.players.map((player) => <div key={player.id} className="flex items-center justify-between py-3"><span className={!player.alive ? 'line-through opacity-60' : ''}>{player.displayName}</span><span className={roleClass(player.role ?? 'unknown')}>{t(`roles.${roleKey(player.role)}`)}</span></div>)}</div></div></Card><Button variant="secondary" label={t('results.backHome')} onClick={() => { clearOnlineGame(); navigate('/'); }} width="100%" /></section>;
    }

    const winner = localWinner!;
    return <section className="mx-auto max-w-2xl space-y-7"><header className="text-center"><Trophy className="mx-auto mb-3 text-[var(--color-accent)]" size={42} aria-hidden="true" /><h1 className="text-3xl font-bold">{t(winnerKey(winner))}</h1></header><Card><div className="space-y-5 p-5"><div className="grid grid-cols-2 gap-4"><div><Text as="p" type="supporting">{t('results.civilianWord')}</Text><strong>{localConfig.civilianWord || '?'}</strong></div><div><Text as="p" type="supporting">{t('results.undercoverWord')}</Text><strong>{localConfig.undercoverWord || '?'}</strong></div></div><div className="divide-y divide-[var(--color-border)]">{localPlayers.map((player) => <div key={player.id} className="flex items-center justify-between py-3"><span className={!player.alive ? 'line-through opacity-60' : ''}>{player.displayName}</span><span className={roleClass(player.role)}>{t(`roles.${roleKey(player.role)}`)}</span></div>)}</div></div></Card><div className="grid gap-3 sm:grid-cols-2"><Button variant="primary" label={t('results.playAgain')} onClick={() => { restartGame(); navigate('/setup'); }} width="100%" /><Button variant="secondary" label={t('results.backHome')} onClick={() => { resetGame(); navigate('/'); }} width="100%" /></div></section>;
};

export default ResultsPage;
