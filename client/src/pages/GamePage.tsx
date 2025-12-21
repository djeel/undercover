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


// Simple string normalization for comparison
const normalize = (str: string) => str.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const GamePage = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { players, eliminatePlayer, phase, winner, round, config, setWinner } = useGameStore();
    const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
    const [mrWhiteGuessing, setMrWhiteGuessing] = useState(false);
    const [guessWord, setGuessWord] = useState('');

    useEffect(() => {
        // Only redirect if explicitly in results phase or won
        if (phase === 'results' || winner) {
            const timer = setTimeout(() => navigate('/results'), 1500); // Small delay to see toast/result
            return () => clearTimeout(timer);
        }

        // Redirect to home if game state is invalid/idle
        if (phase === 'idle') {
            navigate('/');
        }
    }, [phase, winner, navigate]);

    const activePlayers = players.filter(p => !p.isEliminated);
    const selectedPlayer = players.find(p => p.id === selectedPlayerId);

    const handleElimination = () => {
        if (!selectedPlayer) return;

        if (selectedPlayer.role === 'mrWhite') {
            setMrWhiteGuessing(true);
        } else {
            eliminatePlayer(selectedPlayer.id);
            setSelectedPlayerId(null);
        }
    };

    const handleMrWhiteGuess = () => {
        if (!selectedPlayerId) return;

        const civilianWord = normalize(config.civilianWord);
        const guess = normalize(guessWord);

        // Exact match or very close match
        if (civilianWord === guess) {
            setWinner('mrWhite');
        } else {
            eliminatePlayer(selectedPlayerId);
        }

        setSelectedPlayerId(null);
        setMrWhiteGuessing(false);
        setGuessWord('');
    };

    return (
        <div className="min-h-screen p-4 bg-background pb-24">
            <header className="flex items-center justify-between py-4 max-w-2xl mx-auto mb-6">
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold flex items-center gap-2 text-foreground">
                        {t('game.title')}
                    </h1>
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <span className="bg-primary/20 text-primary px-2 py-0.5 rounded text-xs font-bold uppercase">
                            {t('game.round', { round })}
                        </span>
                        <span>•</span>
                        <span>{t('game.playersRemaining', { count: activePlayers.length })}</span>
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
                        whileHover={!player.isEliminated ? { scale: 1.05 } : {}}
                        whileTap={!player.isEliminated ? { scale: 0.95 } : {}}
                        onClick={() => !player.isEliminated && setSelectedPlayerId(player.id)}
                        disabled={player.isEliminated}
                        className={cn(
                            "relative aspect-square rounded-2xl p-4 flex flex-col items-center justify-center transition-all duration-300",
                            player.isEliminated
                                ? "bg-card border border-border cursor-not-allowed"
                                : "bg-card border border-border hover:border-primary/50 hover:bg-secondary"
                        )}
                    >
                        <div className={cn(
                            "w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold mb-3 transition-colors",
                            player.isEliminated
                                ? "bg-secondary text-muted-foreground"
                                : "bg-primary text-primary-foreground"
                        )}>
                            {player.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium truncate w-full text-center px-2 text-foreground">
                            {player.name}
                        </span>
                        {player.isEliminated && (
                            <span className="absolute inset-0 flex items-center justify-center">
                                <Skull className="w-16 h-16 text-destructive/40 rotate-12" />
                            </span>
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
                                    {mrWhiteGuessing ? t('game.mrWhiteFound') : t('game.confirmElimination')}
                                </CardTitle>
                                <CardDescription className="text-muted-foreground">
                                    {mrWhiteGuessing
                                        ? t('game.mrWhiteGuessPrompt')
                                        : t('game.eliminatePlayer', { name: selectedPlayer.name })
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

                            <CardFooter className="gap-2">
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
                                    <Button variant="destructive" onClick={handleElimination} className="flex-1">
                                        {t('game.confirm')}
                                    </Button>
                                )}
                            </CardFooter>
                        </Card>
                    </motion.div>
                </div>
            )}
        </div>
    );
};

export default GamePage;
