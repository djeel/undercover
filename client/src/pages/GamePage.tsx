import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Text } from '@astryxdesign/core/Text';
import { Vote } from 'lucide-react';
import { useLocalGameStore } from '../features/local-game/local-game-store';
import { IdentityDialog } from '../features/game/IdentityDialog';


const GamePage = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const players = useLocalGameStore((state) => state.players);
    const phase = useLocalGameStore((state) => state.phase);
    const winner = useLocalGameStore((state) => state.winner);
    const round = useLocalGameStore((state) => state.round);
    const votes = useLocalGameStore((state) => state.votes);
    const lastResolution = useLocalGameStore((state) => state.lastResolution);
    const openVoting = useLocalGameStore((state) => state.openVoting);
    const castVote = useLocalGameStore((state) => state.castVote);
    const resolveVote = useLocalGameStore((state) => state.resolveVote);
    const submitMrWhiteGuess = useLocalGameStore((state) => state.submitMrWhiteGuess);
    const pendingMrWhiteId = useLocalGameStore((state) => state.pendingMrWhiteId);
    const [voterId, setVoterId] = useState('');
    const [guess, setGuess] = useState('');
    const [identityPlayerId, setIdentityPlayerId] = useState<string | null>(null);
    const alivePlayers = players.filter((player) => player.alive);
    const identity = players.find((player) => player.id === identityPlayerId);
    const bodyguardTarget = identity?.bodyguardTargetId ? players.find((player) => player.id === identity.bodyguardTargetId) : undefined;

    useEffect(() => {
        if (phase === 'finished' || winner) navigate('/results');
        if (phase === 'idle') navigate('/');
    }, [phase, winner, navigate]);

    if (phase === 'mr_white_guess') {
        const player = players.find((entry) => entry.id === pendingMrWhiteId);
        return <section className="space-y-6"><header><Text as="p" type="supporting">{t('game.round')} {round}</Text><h1 className="text-3xl font-bold">{t('game.mrWhiteFound')}</h1></header><Card><div className="space-y-4 p-5"><Text as="p" type="body">{player ? t('game.mrWhiteGuessPrompt') : t('game.awaitingMrWhiteGuess', 'Waiting for Mr. White.')}</Text><TextInput label={t('game.enterWordPlaceholder')} value={guess} onChange={setGuess} width="100%" placeholder={t('game.enterWordPlaceholder')} isDisabled={!player} /><Button variant="primary" label={t('game.submitGuess')} isDisabled={!player} onClick={() => submitMrWhiteGuess(guess)} width="100%" /></div></Card></section>;
    }

    return <section className="space-y-6"><header className="flex items-end justify-between gap-4"><div><Text as="p" type="supporting">{t('game.round')} {round}</Text><h1 className="text-3xl font-bold">{phase === 'voting' ? t('game.voteTitle') : t('game.title')}</h1></div>{(phase === 'playing' || phase === 'voting') && <Button variant="secondary" label={t('identity.open', 'Voir mon mot')} onClick={() => setIdentityPlayerId(voterId || (alivePlayers[0]?.id ?? null))} />}</header>
        {lastResolution?.type === 'tie' && <p role="status" className="rounded-[var(--radius-element)] bg-[var(--color-background-muted)] p-3">{t('game.tie', 'Tie: no one is eliminated. Start a new vote when ready.')}</p>}
        {lastResolution?.source === 'bodyguard_protection' && <p role="status" className="rounded-[var(--radius-element)] bg-[var(--color-background-muted)] p-3">{t('game.bodyguardProtected', 'The Bodyguard protected their target.')}</p>}
        {phase === 'playing' && <Button variant="primary" label={t('game.openVoting', 'Open voting')} icon={<Vote aria-hidden="true" />} onClick={openVoting} width="100%" />}
        {phase === 'voting' && <Card><div className="space-y-3 p-5"><label className="block text-sm font-semibold" htmlFor="voter">{t('game.voter', 'Voter')}</label><select id="voter" className="w-full rounded-[var(--radius-element)] border border-[var(--color-border)] bg-[var(--color-background-surface)] p-3" value={voterId} onChange={(event) => setVoterId(event.target.value)}><option value="">{t('game.selectPlayer', 'Select player')}</option>{alivePlayers.filter((player) => !votes[player.id]).map((player) => <option key={player.id} value={player.id}>{player.displayName}</option>)}</select><Text as="p" type="supporting">{Object.keys(votes).length} / {alivePlayers.length} {t('game.votesRecorded', 'votes recorded')}</Text></div></Card>}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{players.map((player) => <button key={player.id} type="button" disabled={!player.alive || phase !== 'voting' || !voterId || Boolean(votes[voterId])} onClick={() => { castVote(voterId, player.id); setVoterId(''); }} className="min-h-28 rounded-[var(--radius-container)] border border-[var(--color-border)] bg-[var(--color-background-card)] p-4 text-center font-semibold enabled:hover:bg-[var(--color-background-muted)] disabled:opacity-45"><span className={player.alive ? '' : 'line-through'}>{player.displayName}</span><Text as="span" type="supporting" display="block">{player.alive ? (phase === 'voting' ? t('game.voteFor', 'Vote') : t('game.alive', 'Alive')) : t('game.eliminated')}</Text></button>)}</div>
        {phase === 'voting' && <Button variant="primary" label={t('game.resolveVote', 'Resolve vote')} isDisabled={Object.keys(votes).length !== alivePlayers.length} onClick={resolveVote} width="100%" />}
        {identity && <IdentityDialog open={Boolean(identity)} onClose={() => setIdentityPlayerId(null)} identity={{ role: identity.role, word: identity.word, bodyguardTargetName: bodyguardTarget?.displayName }} />}
    </section>;
};

export default GamePage;
