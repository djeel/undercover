import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Skull, Vote } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { useLocalGameStore } from '../features/local-game/local-game-store';
import { cn } from '../lib/utils';

const GamePage = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const players = useLocalGameStore((state) => state.players);
    const phase = useLocalGameStore((state) => state.phase);
    const winner = useLocalGameStore((state) => state.winner);
    const round = useLocalGameStore((state) => state.round);
    const openVoting = useLocalGameStore((state) => state.openVoting);
    const castVote = useLocalGameStore((state) => state.castVote);
    const resolveVote = useLocalGameStore((state) => state.resolveVote);
    const submitMrWhiteGuess = useLocalGameStore((state) => state.submitMrWhiteGuess);
    const pendingMrWhiteId = useLocalGameStore((state) => state.pendingMrWhiteId);
    const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
    const [voterId, setVoterId] = useState('');
    const [guess, setGuess] = useState('');

    useEffect(() => {
        if (phase === 'finished' || winner) navigate('/results');
        if (phase === 'idle') navigate('/');
    }, [phase, winner, navigate]);

    const selected = players.find((player) => player.id === selectedPlayerId);
    const activePlayers = players.filter((player) => player.alive);
    const votesNeeded = activePlayers.length;

    return (
        <div className="flex flex-col gap-6 animate-in fade-in duration-500">
            <header className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">{t('game.round')} {round}</p><h1 className="text-3xl font-black">{phase === 'voting' ? t('game.voteTitle') : t('game.title')}</h1></div><Skull className="w-8 h-8 text-primary" /></header>
            {phase === 'mr_white_guess' ? (
                <Card><CardHeader><CardTitle>{t('game.mrWhiteFound')}</CardTitle><CardDescription>{t('game.mrWhiteGuessPrompt')}</CardDescription></CardHeader><CardContent className="space-y-3"><Input value={guess} onChange={(event) => setGuess(event.target.value)} placeholder={t('game.enterWordPlaceholder')} /><Button className="w-full" onClick={() => submitMrWhiteGuess(guess)}>{t('game.submitGuess')}</Button></CardContent></Card>
            ) : (
                <>
                    {phase === 'playing' && <Button onClick={openVoting} className="w-full"><Vote className="mr-2 w-4 h-4" />{t('game.openVoting', 'Open voting')}</Button>}
                    {phase === 'voting' && <Card><CardContent className="pt-6 space-y-3"><label className="text-sm font-semibold">{t('game.voter', 'Voter')}</label><select className="w-full rounded-md border bg-background p-2" value={voterId} onChange={(event) => setVoterId(event.target.value)}><option value="">{t('game.selectPlayer', 'Select player')}</option>{activePlayers.map((player) => <option key={player.id} value={player.id}>{player.displayName}</option>)}</select></CardContent></Card>}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{players.map((player) => <motion.button key={player.id} disabled={!player.alive || phase !== 'voting' || !voterId} whileTap={player.alive ? { scale: 0.98 } : undefined} onClick={() => { if (phase === 'voting' && voterId) { castVote(voterId, player.id); setVoterId(''); setSelectedPlayerId(player.id); } }} className={cn('relative aspect-[4/5] rounded-3xl p-4 flex flex-col items-center justify-center transition-all', player.alive ? 'bg-card border border-border hover:border-primary/50' : 'bg-muted opacity-60 grayscale')}><span className="font-bold text-center">{player.displayName}</span>{!player.alive && <span className="text-xs text-muted-foreground">{t('game.eliminated')}</span>}</motion.button>)}</div>
                    {phase === 'voting' && <CardFooter className="px-0"><Button className="w-full" disabled={Object.keys(useLocalGameStore.getState().votes).length !== votesNeeded} onClick={resolveVote}>{t('game.resolveVote', 'Resolve vote')}</Button></CardFooter>}
                </>
            )}
            <AnimatePresence>{selected && phase === 'voting' && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-sm text-muted-foreground">{t('game.voteRecorded', 'Vote recorded')}</motion.p>}</AnimatePresence>
            {pendingMrWhiteId && <span className="sr-only">{pendingMrWhiteId}</span>}
        </div>
    );
};

export default GamePage;
