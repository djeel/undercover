import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Skull } from 'lucide-react';
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

    // WebSocket connection for Online Mode
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

        // Initial fetch to ensure sync on load (optional but safe)
        api.getGameState(onlineState.roomId, onlineState.playerId).then(syncWithServer).catch(console.error);

        return () => {
            socketService.off(SocketEvents.UPDATE_STATE, handleUpdate);
            // We don't necessarily disconnect here to allow navigation? 
            // Better to disconnect on unmount if leaving game flow.
            // For now, keep connection alive or handle in store.
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
        // ... (keep existing handleMrWhiteGuess)
        if (!selectedPlayerId) return;

        // Common logic for guess normalization
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

    // Find current player for online mode
    const currentPlayer = gameMode === 'online'
        ? players.find(p => p.id === onlineState.playerId)
        : null;
    const hasCurrentPlayerVoted = currentPlayer?.hasVoted || false;

    return (
        <div className="min-h-screen p-4 bg-background pb-24">
            <header className="flex items-center justify-between py-4 max-w-2xl mx-auto mb-6">
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold flex items-center gap-2 text-foreground">
                        {t('game.title')}
                        {gameMode === 'online' && <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded ml-2">ONLINE</span>}
                    </h1>
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <span className="bg-primary/20 text-primary px-2 py-0.5 rounded text-xs font-bold uppercase">
                            {t('game.round', { round })}
                        </span>
                        <span>•</span>
                        <span>{t('game.playersRemaining', { count: activePlayers.length })}</span>
                        {gameMode === 'online' && (
                            <>
                                <span>•</span>
                                <span className={hasCurrentPlayerVoted ? "text-green-500" : "text-yellow-500"}>
                                    {hasCurrentPlayerVoted ? "✓ Voted" : "Voting..."}
                                </span>
                            </>
                        )}
                    </p>
                </div>
            </header>

            <div className="max-w-2xl mx-auto grid grid-cols-2 md:grid-cols-3 gap-4">
                {players.map((player) => (
                    <motion.button
                        key={player.id}
                        layout
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{
                            opacity: player.isEliminated ? 0.5 : 1,
                            scale: 1,
                            filter: player.isEliminated ? 'grayscale(1)' : 'grayscale(0)'
                        }}
                        whileHover={!player.isEliminated && canAction ? { scale: 1.05 } : {}}
                        whileTap={!player.isEliminated && canAction ? { scale: 0.95 } : {}}
                        onClick={() => !player.isEliminated && canAction && setSelectedPlayerId(player.id)}
                        disabled={player.isEliminated || !canAction}
                        className={cn(
                            "relative aspect-square rounded-2xl p-4 flex flex-col items-center justify-center transition-all duration-300",
                            player.isEliminated
                                ? "bg-card border border-border cursor-not-allowed"
                                : "bg-card border border-border hover:border-primary/50 hover:bg-secondary cursor-pointer"
                        )}
                    >
                        <div className={cn(
                            "w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold mb-3 transition-colors relative",
                            player.isEliminated
                                ? "bg-secondary text-muted-foreground"
                                : "bg-primary text-primary-foreground"
                        )}>
                            {player.name.charAt(0).toUpperCase()}

                            {/* Vote Badge */}
                            {!player.isEliminated && player.votesReceived > 0 && (
                                <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center border-2 border-card font-bold">
                                    {player.votesReceived}
                                </div>
                            )}
                        </div>
                        <span className="font-medium truncate w-full text-center px-2 text-foreground">
                            {player.name}
                        </span>
                        {player.isEliminated && (
                            <span className="absolute inset-0 flex items-center justify-center">
                                <Skull className="w-16 h-16 text-destructive/40 rotate-12" />
                            </span>
                        )}

                        {/* Show roles for self */}
                        {gameMode === 'online' && player.id === onlineState.playerId && player.word && !player.isEliminated && (
                            <div className="absolute bottom-2 left-0 right-0 text-center">
                                <span className="text-xs bg-black/50 text-white px-2 py-0.5 rounded-full backdrop-blur-sm">
                                    {player.role === 'mrWhite' ? 'Mr. White' : player.word}
                                </span>
                            </div>
                        )}
                        {gameMode === 'online' && player.id === onlineState.playerId && player.role === 'mrWhite' && !player.isEliminated && (
                            <div className="absolute bottom-2 left-0 right-0 text-center">
                                <span className="text-xs bg-black/50 text-white px-2 py-0.5 rounded-full backdrop-blur-sm">
                                    Mr. White
                                </span>
                            </div>
                        )}
                    </motion.button>
                ))}
            </div>

            {selectedPlayer && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="w-full max-w-md"
                    >
                        <Card className="border-border bg-card shadow-lg">
                            <CardHeader>
                                <CardTitle className={mrWhiteGuessing ? "text-primary" : "text-destructive"}>
                                    {mrWhiteGuessing ? t('game.mrWhiteFound') : (gameMode === 'online' && !canEliminate ? "Vote Player" : t('game.confirmElimination'))}
                                </CardTitle>
                                <CardDescription className="text-muted-foreground">
                                    {mrWhiteGuessing
                                        ? t('game.mrWhiteGuessPrompt')
                                        : (gameMode === 'online'
                                            ? hasCurrentPlayerVoted
                                                ? `You already voted this round`
                                                : `Cast a vote against ${selectedPlayer.name}?`
                                            : t('game.eliminatePlayer', { name: selectedPlayer.name }))
                                    }
                                </CardDescription>
                            </CardHeader>

                            {mrWhiteGuessing && (
                                <CardContent>
                                    <Input
                                        value={guessWord}
                                        onChange={(e) => setGuessWord(e.target.value)}
                                        placeholder={t('game.enterWordPlaceholder')}
                                        className="text-center text-lg py-6"
                                        autoFocus
                                    />
                                </CardContent>
                            )}

                            <CardFooter className="flex-col gap-2">
                                <div className="flex gap-2 w-full">
                                    <Button
                                        variant="ghost"
                                        onClick={() => {
                                            setSelectedPlayerId(null);
                                            setMrWhiteGuessing(false);
                                            setGuessWord('');
                                        }}
                                        className="flex-1"
                                    >
                                        {t('game.cancel')}
                                    </Button>

                                    {mrWhiteGuessing ? (
                                        <Button
                                            onClick={handleMrWhiteGuess}
                                            className="flex-1 bg-primary text-white"
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
                                                    disabled={hasCurrentPlayerVoted}
                                                    className="flex-1 bg-secondary hover:bg-secondary/80 text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    {hasCurrentPlayerVoted ? "Already Voted" : "Vote"}
                                                </Button>
                                            )}

                                            {/* Eliminate Button (Local OR Host) */}
                                            {(canEliminate || mrWhiteGuessing) && (
                                                <Button
                                                    variant="destructive"
                                                    onClick={handleElimination}
                                                    className="flex-1"
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
        </div>
    );
};

export default GamePage;
