import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@astryxdesign/core/Button';
import { AlertDialog } from '@astryxdesign/core/AlertDialog';
import { Card } from '@astryxdesign/core/Card';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Text } from '@astryxdesign/core/Text';
import { Vote } from 'lucide-react';
import type { GamePlayerView, GameView } from '@undercover/shared';

import { IdentityDialog } from '../features/game/IdentityDialog';
import { PlayerActionCard } from '../features/game/PlayerActionCard';
import { canSubmitLocalMrWhiteGuess, resolveGameMode, selectLocalIdentityPlayer } from '../features/game/game-page-state';
import { selectCanOpenVoting, selectOwnPlayer } from '../features/game/game-selectors';
import { useGameStore } from '../features/game/game-store';
import { useLocalGameStore } from '../features/local-game/local-game-store';
import { api } from '../lib/api-client';

function ResolutionNotice({ resolution }: { resolution: GameView['lastResolution'] }) {
    const { t } = useTranslation();
    if (resolution?.type === 'tie') return <p role="status" className="rounded-[var(--radius-element)] bg-[var(--color-background-muted)] p-3">{t('game.tie')}</p>;
    if (resolution?.source === 'bodyguard_protection') return <p role="status" className="rounded-[var(--radius-element)] bg-[var(--color-background-muted)] p-3">{t('game.bodyguardProtected')}</p>;
    return null;
}

function PlayerGrid({ players, phase, canVote, onVote }: { players: GamePlayerView[]; phase: GameView['phase']; canVote: boolean; onVote: (playerId: string) => void }) {
    const { t } = useTranslation();
    return <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{players.map((player) => <button key={player.id} type="button" disabled={!player.alive || phase !== 'voting' || !canVote} onClick={() => onVote(player.id)} className="min-h-28 rounded-[var(--radius-container)] border border-[var(--color-border)] bg-[var(--color-background-card)] p-4 text-center font-semibold enabled:hover:bg-[var(--color-background-muted)] disabled:opacity-45"><span className={player.alive ? '' : 'line-through'}>{player.displayName}</span><Text as="span" type="supporting" display="block">{player.alive ? (phase === 'voting' ? t('game.voteFor') : t('game.alive')) : t('game.eliminated')}</Text></button>)}</div>;
}

function OnlineGame({ game, playerId }: { game: GameView; playerId: string }) {
    const { t } = useTranslation();
    const [identityOpen, setIdentityOpen] = useState(false);
    const [guess, setGuess] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [working, setWorking] = useState(false);
    const votedRound = useRef<number | null>(null);
    const wasVoting = useRef(false);
    const ownPlayer = selectOwnPlayer(game, playerId);
    const canOpenVoting = selectCanOpenVoting(game, playerId);
    const hasVoted = votedRound.current === game.round;
    const canVote = game.phase === 'voting' && Boolean(ownPlayer?.alive) && !hasVoted;
    const canGuess = game.phase === 'mr_white_guess' && Boolean(game.mrWhiteGuessPrompt);
    const bodyguardTarget = ownPlayer?.bodyguardTargetId ? game.players.find((player) => player.id === ownPlayer.bodyguardTargetId) : undefined;

    useEffect(() => {
        if (game.phase === 'voting' && !wasVoting.current) votedRound.current = null;
        wasVoting.current = game.phase === 'voting';
    }, [game.phase]);

    const perform = async (action: () => Promise<void>) => {
        setWorking(true); setError(null);
        try { await action(); } catch (cause) { setError(cause instanceof Error ? cause.message : t('common.error')); } finally { setWorking(false); }
    };

    if (game.phase === 'mr_white_guess') {
        return <section className="space-y-6"><header><Text as="p" type="supporting">{t('game.round', { round: game.round })}</Text><h1 className="text-3xl font-bold">{t('game.mrWhiteFound')}</h1></header><Card><div className="space-y-4 p-5"><Text as="p" type="body">{canGuess ? game.mrWhiteGuessPrompt : t('game.awaitingMrWhiteGuess')}</Text>{canGuess && <><TextInput label={t('game.enterWordPlaceholder')} value={guess} onChange={setGuess} width="100%" placeholder={t('game.enterWordPlaceholder')} /><Button variant="primary" label={t('game.submitGuess')} isDisabled={working} isLoading={working} onClick={() => void perform(() => useGameStore.getState().submitMrWhiteGuess(api, guess))} width="100%" /></>}</div></Card>{error && <p role="alert">{error}</p>}</section>;
    }

    return <section className="space-y-6"><header className="flex items-end justify-between gap-4"><div><Text as="p" type="supporting">{t('game.round', { round: game.round })}</Text><h1 className="text-3xl font-bold">{game.phase === 'voting' ? t('game.voteTitle') : t('game.title')}</h1></div>{ownPlayer?.alive && (game.phase === 'playing' || game.phase === 'voting') && <Button variant="secondary" label={t('identity.open')} onClick={() => setIdentityOpen(true)} />}</header><ResolutionNotice resolution={game.lastResolution} />{canOpenVoting && <Button variant="primary" label={t('game.openVoting')} icon={<Vote aria-hidden="true" />} isDisabled={working} isLoading={working} onClick={() => void perform(() => useGameStore.getState().openVoting(api))} width="100%" />}{game.phase === 'voting' && <Text as="p" type="supporting">{t('game.onlineVoteInstruction')}</Text>}<PlayerGrid players={game.players} phase={game.phase} canVote={canVote} onVote={(targetPlayerId) => void perform(async () => { await useGameStore.getState().vote(api, targetPlayerId); votedRound.current = game.round; })} />{error && <p role="alert">{error}</p>}{ownPlayer?.role && <IdentityDialog open={identityOpen} onClose={() => setIdentityOpen(false)} identity={{ role: ownPlayer.role, word: ownPlayer.word ?? null, bodyguardTargetName: bodyguardTarget?.displayName }} />}</section>;
}

function LocalGame() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const players = useLocalGameStore((state) => state.players);
    const phase = useLocalGameStore((state) => state.phase);
    const winner = useLocalGameStore((state) => state.winner);
    const round = useLocalGameStore((state) => state.round);
    const lastResolution = useLocalGameStore((state) => state.lastResolution);
    const eliminatePlayer = useLocalGameStore((state) => state.eliminatePlayer);
    const submitMrWhiteGuess = useLocalGameStore((state) => state.submitMrWhiteGuess);
    const pendingMrWhiteId = useLocalGameStore((state) => state.pendingMrWhiteId);
    const [expandedPlayerId, setExpandedPlayerId] = useState<string | null>(null);
    const [identityPlayerId, setIdentityPlayerId] = useState<string | null>(null);
    const [eliminationTargetId, setEliminationTargetId] = useState<string | null>(null);
    const [confirmedMrWhiteId, setConfirmedMrWhiteId] = useState<string | null>(null);
    const [guess, setGuess] = useState('');
    const alivePlayers = players.filter((player) => player.alive);
    const identity = selectLocalIdentityPlayer(players, identityPlayerId ?? '');
    const bodyguardTarget = identity?.bodyguardTargetId ? players.find((player) => player.id === identity.bodyguardTargetId) : undefined;
    const pendingMrWhite = players.find((player) => player.id === pendingMrWhiteId);
    const eliminationTarget = players.find((player) => player.id === eliminationTargetId);

    useEffect(() => {
        if (phase === 'finished' || winner) navigate('/results');
        if (phase === 'idle') navigate('/');
    }, [phase, winner, navigate]);

    useEffect(() => { if (phase !== 'mr_white_guess') setConfirmedMrWhiteId(null); }, [phase]);

    const closeElimination = () => setEliminationTargetId(null);
    const confirmElimination = () => {
        if (!eliminationTargetId) return;
        eliminatePlayer(eliminationTargetId);
        setEliminationTargetId(null);
        setExpandedPlayerId(null);
    };

    if (phase === 'mr_white_guess') {
        const confirmed = canSubmitLocalMrWhiteGuess(pendingMrWhiteId, confirmedMrWhiteId);
        return <section className="space-y-6"><header><Text as="p" type="supporting">{t('game.round', { round })}</Text><h1 className="text-3xl font-bold">{t('game.mrWhiteFound')}</h1></header><Card><div className="space-y-4 p-5"><Text as="p" type="body">{confirmed ? t('game.mrWhiteGuessPrompt') : t('game.passDeviceToMrWhite', { name: pendingMrWhite?.displayName })}</Text>{confirmed ? <><TextInput label={t('game.enterWordPlaceholder')} value={guess} onChange={setGuess} width="100%" placeholder={t('game.enterWordPlaceholder')} /><Button variant="primary" label={t('game.submitGuess')} onClick={() => submitMrWhiteGuess(guess)} width="100%" /></> : <Button variant="primary" label={t('game.confirmMrWhiteIdentity')} isDisabled={!pendingMrWhite} onClick={() => setConfirmedMrWhiteId(pendingMrWhiteId)} width="100%" />}</div></Card></section>;
    }

    return (
        <section className="space-y-6">
            <header>
                <Text as="p" type="supporting">{t('game.round', { round })}</Text>
                <h1 className="text-3xl font-bold">{t('game.title')}</h1>
                <Text as="p" type="supporting">{t('game.playersRemaining', { count: alivePlayers.length })}</Text>
            </header>
            <ResolutionNotice resolution={lastResolution} />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {players.map((player) => (
                    <PlayerActionCard
                        key={player.id}
                        playerId={player.id}
                        displayName={player.displayName}
                        alive={player.alive}
                        expanded={expandedPlayerId === player.id}
                        confirmationPending={eliminationTargetId !== null}
                        onToggle={() => setExpandedPlayerId((current) => current === player.id ? null : player.id)}
                        onViewRole={() => setIdentityPlayerId(player.id)}
                        onVote={() => setEliminationTargetId(player.id)}
                    />
                ))}
            </div>
            {identity && <IdentityDialog open onClose={() => setIdentityPlayerId(null)} identity={{ role: identity.role, word: identity.word, bodyguardTargetName: bodyguardTarget?.displayName }} />}
            <AlertDialog
                isOpen={eliminationTarget !== undefined}
                onOpenChange={(isOpen) => { if (!isOpen) closeElimination(); }}
                title={t('game.confirmEliminationTitle', { name: eliminationTarget?.displayName })}
                description={t('game.confirmEliminationDescription')}
                cancelLabel={t('common.cancel')}
                actionLabel={t('game.confirmElimination')}
                actionVariant="destructive"
                onAction={confirmElimination}
                width="min(94vw, 26rem)"
            />
        </section>
    );
}

const GamePage = () => {
    const navigate = useNavigate();
    const localPhase = useLocalGameStore((state) => state.phase);
    const onlineGame = useGameStore((state) => state.game);
    const onlinePlayerId = useGameStore((state) => state.playerId);
    const mode = resolveGameMode(localPhase, onlineGame);

    useEffect(() => {
        if (mode === 'none') navigate('/');
        if (mode === 'online' && (onlineGame?.phase === 'finished' || onlineGame?.winner)) navigate('/results');
    }, [mode, navigate, onlineGame?.phase, onlineGame?.winner]);

    if (mode === 'online' && onlineGame && onlinePlayerId) return <OnlineGame game={onlineGame} playerId={onlinePlayerId} />;
    if (mode === 'local') return <LocalGame />;
    return null;
};

export default GamePage;
