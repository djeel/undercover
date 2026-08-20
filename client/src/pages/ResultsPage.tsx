import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { Text } from '@astryxdesign/core/Text';
import { Trophy } from 'lucide-react';
import { useLocalGameStore } from '../features/local-game/local-game-store';

const roleClass = (role: string) => `role-${role.replace('_', '-')}`;

const ResultsPage = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const winner = useLocalGameStore((state) => state.winner);
    const players = useLocalGameStore((state) => state.players);
    const config = useLocalGameStore((state) => state.config);
    const resetGame = useLocalGameStore((state) => state.resetGame);
    const restartGame = useLocalGameStore((state) => state.restartGame);
    if (!winner) return <Button variant="secondary" label={t('common.back')} onClick={() => navigate('/')} />;
    const winnerKey = winner === 'mr_white' ? 'results.mrWhiteWins' : winner === 'jester' ? 'results.jesterWins' : winner === 'undercovers' ? 'results.undercoversWin' : 'results.civiliansWin';

    return <section className="mx-auto max-w-2xl space-y-7"><header className="text-center"><Trophy className="mx-auto mb-3 text-[var(--color-accent)]" size={42} aria-hidden="true" /><h1 className="text-3xl font-bold">{t(winnerKey)}</h1></header><Card><div className="space-y-5 p-5"><div className="grid grid-cols-2 gap-4"><div><Text as="p" type="supporting">{t('results.civilianWord')}</Text><strong>{config.civilianWord || '?'}</strong></div><div><Text as="p" type="supporting">{t('results.undercoverWord')}</Text><strong>{config.undercoverWord || '?'}</strong></div></div><div className="divide-y divide-[var(--color-border)]">{players.map((player) => <div key={player.id} className="flex items-center justify-between py-3"><span className={!player.alive ? 'line-through opacity-60' : ''}>{player.displayName}</span><span className={roleClass(player.role)}>{t(`roles.${player.role === 'mr_white' ? 'mrWhite' : player.role}`)}</span></div>)}</div></div></Card><div className="grid gap-3 sm:grid-cols-2"><Button variant="primary" label={t('results.playAgain')} onClick={() => { restartGame(); navigate('/setup'); }} width="100%" /><Button variant="secondary" label={t('results.backHome')} onClick={() => { resetGame(); navigate('/'); }} width="100%" /></div></section>;
};

export default ResultsPage;
