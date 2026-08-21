import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@astryxdesign/core/Button';
import { Text } from '@astryxdesign/core/Text';
import { IdentityRevealCard } from '../features/game/IdentityRevealCard';
import { useLocalGameStore } from '../features/local-game/local-game-store';

const RevealPage = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const players = useLocalGameStore((state) => state.players);
    const index = useLocalGameStore((state) => state.currentRevealIndex);
    const phase = useLocalGameStore((state) => state.phase);
    const nextRevealPlayer = useLocalGameStore((state) => state.nextRevealPlayer);
    const startPlaying = useLocalGameStore((state) => state.startPlaying);
    const [revealedPlayerId, setRevealedPlayerId] = useState<string | null>(null);
    const player = players[index];
    const target = player?.bodyguardTargetId ? players.find((entry) => entry.id === player.bodyguardTargetId) : undefined;

    useEffect(() => { if (phase === 'playing') navigate('/game'); }, [navigate, phase]);
    if (!player) return null;
    const isLast = index === players.length - 1;

    return (
        <section className="reveal-page">
            <header className="reveal-page__header">
                <Text as="p" type="supporting">{t('reveal.passPhone')}</Text>
                <h1>{player.displayName}</h1>
            </header>
            <IdentityRevealCard
                key={player.id}
                active={phase === 'reveal'}
                identity={{ role: player.role, word: player.word, bodyguardTargetName: target?.displayName }}
                onReveal={() => setRevealedPlayerId(player.id)}
            />
            <div className="reveal-page__action">
                {revealedPlayerId === player.id ? (
                    <Button
                        variant="primary"
                        label={isLast ? t('reveal.startDiscussion') : t('reveal.nextPlayer')}
                        onClick={() => {
                            setRevealedPlayerId(null);
                            if (isLast) startPlaying();
                            else nextRevealPlayer();
                        }}
                        width="100%"
                    />
                ) : null}
            </div>
        </section>
    );
};

export default RevealPage;
