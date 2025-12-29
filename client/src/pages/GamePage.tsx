import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Skull, Vote } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardFooter, CardContent } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { useGameStore } from '../store/gameStore';
import { cn } from '../lib/utils';
import { api } from '../services/api';
import { socketService } from '../services/socket';
import { SocketEvents } from '@undercover/shared';

// Simple string normalization for comparison
const normalize = (str: string) => str.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const GamePage = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const players = useGameStore(state => state.players);
    const eliminatePlayer = useGameStore(state => state.eliminatePlayer);
    const phase = useGameStore(state => state.phase);
    const winner = useGameStore(state => state.winner);
    const round = useGameStore(state => state.round);
    const config = useGameStore(state => state.config);
    const setWinner = useGameStore(state => state.setWinner);
    const gameMode = useGameStore(state => state.gameMode);
    const votePlayer = useGameStore(state => state.votePlayer);
    const onlineState = useGameStore(state => state.onlineState);
    const syncWithServer = useGameStore(state => state.syncWithServer);
    const isHost = onlineState.isHost;

    const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
    const [mrWhiteGuessing, setMrWhiteGuessing] = useState(false);
    const [guessWord, setGuessWord] = useState('');

    useEffect(() => {
        // Only redirect if explicitly in results phase or won
        if (phase === 'results' || winner) {
            const timer = setTimeout(() => navigate('/results'), 1500);
            return () => clearTimeout(timer);
        }

        // Redirect to home if game state is invalid/idle AND local
        if (phase === 'idle' && gameMode === 'local') {
            navigate('/');
        }
    }, [phase, winner, navigate, gameMode]);

    // WebSocket connection for Online Mode + Polling Fallback
    useEffect(() => {
        if (gameMode !== 'online' || !onlineState.roomId || !onlineState.playerId) return;

        // Connect and Join
        socketService.connect(onlineState.playerId);
        socketService.joinGame(onlineState.roomId);

        // Listen for updates
        const handleUpdate = (state: any) => {
            syncWithServer(state);
        };

        socketService.on(SocketEvents.UPDATE_STATE, handleUpdate);

        // Polling fallback (every 3 seconds) to ensure we don't get stuck if socket event is missed
        const poll = async () => {
            try {
                const state = await api.getGameState(onlineState.roomId!, onlineState.playerId || undefined);
                syncWithServer(state);
            } catch (e) {
                console.error("Polling error:", e);
            }
        }

        poll(); // Initial fetch
        const interval = setInterval(poll, 3000);

        return () => {
            clearInterval(interval);
            socketService.off(SocketEvents.UPDATE_STATE, handleUpdate);
        };
    }, [gameMode, onlineState.roomId, onlineState.playerId, syncWithServer]);

    const activePlayers = players.filter(p => !p.isEliminated);
    const selectedPlayer = players.find(p => p.id === selectedPlayerId);

    // Online: Everyone can click to open menu (to Vote). Host has extra power.
    // Local: Anyone can click to Eliminate (Pass & Play).
    const canAction = gameMode === 'local' || true; // Everyone can interact in online mode
    const canEliminate = gameMode === 'local' || isHost;

    const handleElimination = async () => {
        if (!selectedPlayer) return;

        if (selectedPlayer.role === 'mrWhite') {
            setMrWhiteGuessing(true);
        } else {
            if (gameMode === 'online') {
                if (!onlineState.roomId) return;
                try {
                    await api.eliminatePlayer(onlineState.roomId, selectedPlayer.id);
                } catch (e) {
                    console.error(e);
                }
            } else {
                eliminatePlayer(selectedPlayer.id);
            }
            setSelectedPlayerId(null);
        }
    };

    const handleVote = async () => {
        if (!selectedPlayer || gameMode !== 'online') return;
        await votePlayer(selectedPlayer.id);
        setSelectedPlayerId(null);
    };

    const handleMrWhiteGuess = async () => {
        if (!selectedPlayerId) return;

        const guess = normalize(guessWord);

        if (gameMode === 'online') {
            if (!onlineState.roomId) return;
            try {
                await api.eliminatePlayer(onlineState.roomId, selectedPlayerId, guess);
            } catch (e) {
                console.error(e);
            }
        } else {
            const civilianWord = normalize(config.civilianWord);
            if (civilianWord === guess) {
                setWinner('mrWhite');
            } else {
                eliminatePlayer(selectedPlayerId);
            }
        }

        setSelectedPlayerId(null);
        setMrWhiteGuessing(false);
        setGuessWord('');
    };

    const currentPlayer = gameMode === 'online'
        ? players.find(p => p.id === onlineState.playerId)
        : null;
    const hasCurrentPlayerVoted = currentPlayer?.hasVoted || false;

    return (
        <div className="flex flex-col gap-6 animate-in fade-in duration-500">
            <header className="flex items-center justify-between">
                <div className="space-y-1">
                    <h1 className="text-2xl font-black flex items-center gap-2 text-foreground tracking-tight">
                        {t('game.title')}
                        {gameMode === 'online' && <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full font-bold tracking-wide">ONLINE</span>}
                    </h1>
                    <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <span className="bg-muted text-foreground px-2 py-0.5 rounded-md text-xs font-bold uppercase border border-border">
                            {t('game.round', { round })}
                        </span>
                        <span>•</span>
                        <span>{t('game.playersRemaining', { count: activePlayers.length })}</span>
                        {gameMode === 'online' && (
                            <>
                                <span>•</span>
                                <span className={cn(
                                    "font-bold",
                                    hasCurrentPlayerVoted ? "text-green-500" : "text-amber-500"
                                )}>
                                    {hasCurrentPlayerVoted ? "✓ Voted" : "Voting..."}
                                </span>
                            </>
                        )}
                    </p>
                </div>
            </header>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <AnimatePresence>
                    {players.map((player) => (
                        <motion.button
                            key={player.id}
                            layout
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{
                                opacity: player.isEliminated ? 0.6 : 1,
                                scale: 1,
                                filter: player.isEliminated ? 'grayscale(1)' : 'grayscale(0)'
                            }}
                            whileHover={!player.isEliminated && canAction ? { scale: 1.02 } : {}}
                            whileTap={!player.isEliminated && canAction ? { scale: 0.98 } : {}}
                            onClick={() => !player.isEliminated && canAction && setSelectedPlayerId(player.id)}
                            disabled={player.isEliminated || !canAction}
                            className={cn(
                                "relative aspect-[4/5] sm:aspect-square rounded-3xl p-4 flex flex-col items-center justify-center transition-all duration-300 group",
                                player.isEliminated
                                    ? "bg-muted border border-transparent"
                                    : "bg-card border border-border hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10"
                            )}
                        >
                            <div className={cn(
                                "w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black mb-4 transition-colors relative shadow-sm",
                                player.isEliminated
                                    ? "bg-muted-foreground/20 text-muted-foreground"
                                    : "bg-primary/20 text-primary"
                            )}>
                                {player.name.charAt(0).toUpperCase()}

                                {/* Vote Badge */}
                                {!player.isEliminated && player.votesReceived > 0 && (
                                    <div className="absolute -top-2 -right-2 min-w-[24px] h-6 bg-destructive text-destructive-foreground rounded-full text-xs flex items-center justify-center border-2 border-card font-bold px-1.5 shadow-sm z-10">
                                        {player.votesReceived}
                                    </div>
                                )}
                            </div>
                            <span className={cn(
                                "font-bold truncate w-full text-center px-1",
                                player.isEliminated ? "text-muted-foreground" : "text-foreground"
                            )}>
                                {player.name}
                            </span>

                            {player.isEliminated && (
                                <div className="absolute inset-0 flex items-center justify-center bg-background/20 backdrop-blur-[1px] rounded-3xl">
                                    <Skull className="w-16 h-16 text-destructive/50 rotate-12" />
                                </div>
                            )}

                            {/* Show roles/words for self */}
                            {gameMode === 'online' && player.id === onlineState.playerId && player.word && !player.isEliminated && (
                                <div className="absolute bottom-3 left-0 right-0 text-center">
                                    <span className="text-[10px] font-bold uppercase tracking-wider bg-foreground/90 text-background px-2 py-1 rounded-full shadow-sm">
                                        {player.role === 'mrWhite' ? 'Mr. White' : player.word}
                                    </span>
                                </div>
                            )}
                            {gameMode === 'online' && player.id === onlineState.playerId && player.role === 'mrWhite' && !player.isEliminated && (
                                <div className="absolute bottom-3 left-0 right-0 text-center">
                                    <span className="text-[10px] font-bold uppercase tracking-wider bg-accent text-accent-foreground px-2 py-1 rounded-full shadow-sm">
                                        Mr. White
                                    </span>
                                </div>
                            )}
                        </motion.button>
                    ))}
                </AnimatePresence>
            </div>

            <AnimatePresence>
                {selectedPlayer && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="w-full max-w-sm"
                        >
                            <Card className="border-border shadow-2xl">
                                <CardHeader className="text-center pb-2">
                                    <CardTitle className={cn("text-2xl", mrWhiteGuessing ? "text-primary" : "text-foreground")}>
                                        {mrWhiteGuessing ? t('game.mrWhiteFound') : (gameMode === 'online' && !canEliminate ? t('game.voteTitle') : t('game.confirmElimination'))}
                                    </CardTitle>
                                    <CardDescription className="text-base">
                                        {mrWhiteGuessing
                                            ? t('game.mrWhiteGuessPrompt')
                                            : (gameMode === 'online'
                                                ? hasCurrentPlayerVoted
                                                    ? t('game.alreadyVoted')
                                                    : t('game.voteConfirm', { name: selectedPlayer.name })
                                                : t('game.eliminatePlayer', { name: selectedPlayer.name }))
                                        }
                                    </CardDescription>
                                </CardHeader>

                                {mrWhiteGuessing && (
                                    <CardContent className="pb-2">
                                        <Input
                                            value={guessWord}
                                            onChange={(e) => setGuessWord(e.target.value)}
                                            placeholder={t('game.enterWordPlaceholder')}
                                            className="text-center text-xl py-6 rounded-xl border-2 focus-visible:ring-0 focus-visible:border-primary"
                                            autoFocus
                                        />
                                    </CardContent>
                                )}

                                <CardFooter className="flex-col gap-3 pt-4">
                                    <div className="flex gap-3 w-full">
                                        <Button
                                            variant="outline"
                                            size="lg"
                                            onClick={() => {
                                                setSelectedPlayerId(null);
                                                setMrWhiteGuessing(false);
                                                setGuessWord('');
                                            }}
                                            className="flex-1 rounded-xl h-12 border-2 hover:bg-muted"
                                        >
                                            {t('game.cancel')}
                                        </Button>

                                        {mrWhiteGuessing ? (
                                            <Button
                                                onClick={handleMrWhiteGuess}
                                                size="lg"
                                                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl h-12 font-bold shadow-lg shadow-primary/20"
                                                disabled={!guessWord.trim()}
                                            >
                                                {t('game.submitGuess')}
                                            </Button>
                                        ) : (
                                            <>
                                                {/* Vote Button (Online only) */}
                                                {gameMode === 'online' && !mrWhiteGuessing && (
                                                    <Button
                                                        onClick={handleVote}
                                                        size="lg"
                                                        disabled={hasCurrentPlayerVoted}
                                                        className={cn(
                                                            "flex-1 rounded-xl h-12 font-bold shadow-lg",
                                                            hasCurrentPlayerVoted
                                                                ? "bg-muted text-muted-foreground shadow-none"
                                                                : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary/20"
                                                        )}
                                                    >
                                                        {hasCurrentPlayerVoted ? t('game.alreadyVoted') : (
                                                            <>
                                                                <Vote className="w-5 h-5 mr-2" />
                                                                {t('game.voteAction')}
                                                            </>
                                                        )}
                                                    </Button>
                                                )}

                                                {/* Eliminate Button (Local OR Host) */}
                                                {(canEliminate || mrWhiteGuessing) && (
                                                    <Button
                                                        variant="destructive"
                                                        size="lg"
                                                        onClick={handleElimination}
                                                        className="flex-1 rounded-xl h-12 font-bold shadow-lg shadow-destructive/20"
                                                    >
                                                        {gameMode === 'online' ? "Force Eliminate" : t('game.confirm')}
                                                    </Button>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </CardFooter>
                            </Card>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default GamePage;
