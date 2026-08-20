import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { Text } from '@astryxdesign/core/Text';
import { Eye } from 'lucide-react';
import { useLocalGameStore } from '../features/local-game/local-game-store';
import { IdentityDialog } from '../features/game/IdentityDialog';

const RevealPage = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const players = useLocalGameStore((state) => state.players);
    const index = useLocalGameStore((state) => state.currentRevealIndex);
    const phase = useLocalGameStore((state) => state.phase);
    const nextRevealPlayer = useLocalGameStore((state) => state.nextRevealPlayer);
    const startPlaying = useLocalGameStore((state) => state.startPlaying);
    const [open, setOpen] = useState(false);
    const player = players[index];
    const target = player?.bodyguardTargetId ? players.find((entry) => entry.id === player.bodyguardTargetId) : undefined;

    useEffect(() => { if (phase === 'playing') navigate('/game'); }, [navigate, phase]);
    if (!player) return null;
    const isLast = index === players.length - 1;

    return <section className="mx-auto max-w-md space-y-7 text-center"><Text as="p" type="supporting">{t('reveal.passPhone')}</Text><h1 className="text-4xl font-bold">{player.displayName}</h1><Card><div className="space-y-6 p-7"><Eye className="mx-auto text-[var(--color-accent)]" size={42} aria-hidden="true" /><Text as="p" type="body">{t('reveal.identify', 'Tap to reveal your identity privately.')}</Text><Button variant="primary" label={t('identity.open', 'Voir mon mot')} onClick={() => setOpen(true)} width="100%" /></div></Card><Button variant="secondary" label={isLast ? t('reveal.startDiscussion') : t('reveal.nextPlayer')} onClick={() => { if (isLast) { startPlaying(); navigate('/game'); } else { setOpen(false); nextRevealPlayer(); } }} width="100%" /><IdentityDialog open={open} onClose={() => setOpen(false)} identity={{ role: player.role, word: player.word, bodyguardTargetName: target?.displayName }} /></section>;
};

export default RevealPage;
