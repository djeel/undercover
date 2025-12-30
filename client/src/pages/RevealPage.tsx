import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, Shield, Smile } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useGameStore } from '../store/gameStore';
import { cn } from '../lib/utils';

const RevealPage = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const players = useGameStore(state => state.players);
    const currentRevealIndex = useGameStore(state => state.currentRevealIndex);
    const revealCurrentPlayer = useGameStore(state => state.revealCurrentPlayer);
    const nextRevealPlayer = useGameStore(state => state.nextRevealPlayer);
    const startPlaying = useGameStore(state => state.startPlaying);
    const phase = useGameStore(state => state.phase);
    const gameMode = useGameStore(state => state.gameMode);
    const onlineState = useGameStore(state => state.onlineState);

    // Steps: 'pass' (Pass to X) -> 'reveal' (Show Card)
    const [step, setStep] = useState<'pass' | 'reveal'>('pass');

    // Determine current player based on mode
    const currentPlayer = gameMode === 'online'
        ? players.find(p => p.id === onlineState.playerId)
        : players[currentRevealIndex];

    const isLastPlayer = gameMode === 'online'
        ? true
        : currentRevealIndex === players.length - 1;

    useEffect(() => {
        // Redirect if phase is invalid
        if (phase === 'playing' && gameMode === 'local') {
            navigate('/game');
        } else if (phase === 'idle' || phase === 'setup') {
            // navigate('/'); // Commented out to allow online reveal if phase is already playing
        }

        // For online, if we don't have a player ID, go home
        if (gameMode === 'online' && !currentPlayer) {
            navigate('/');
        }
    }, [phase, navigate, gameMode, currentPlayer]);

    const handleIdentify = () => {
        setStep('reveal');
        if (gameMode === 'local') {
            revealCurrentPlayer();
        }
    };

    const handleNext = () => {
        if (gameMode === 'online') {
            navigate('/game');
            return;
        }

        if (isLastPlayer) {
            startPlaying();
            navigate('/game');
        } else {
            setStep('pass');
            nextRevealPlayer();
        }
    };

    if (!currentPlayer) return null;

    return (
        <div className="flex flex-col items-center justify-center p-6 min-h-[50vh] animate-in fade-in duration-500">
            <AnimatePresence mode="wait">
                {step === 'pass' ? (
                    <motion.div
                        key="pass"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="text-center space-y-12 max-w-sm w-full"
                    >
                        <div className="space-y-4">
                            <p className="text-muted-foreground text-lg uppercase tracking-widest font-medium">
                                {gameMode === 'online' ? t('reveal.getReady') : t('reveal.passPhone')}
                            </p>
                            <h2 className="text-5xl font-black text-foreground tracking-tight">
                                {gameMode === 'online' ? t('reveal.yourRole') : currentPlayer.name}
                            </h2>
                        </div>

                        <div className="flex flex-col items-center gap-6">
                            <Button
                                onClick={handleIdentify}
                                className="w-24 h-24 rounded-full bg-secondary hover:bg-secondary/80 text-foreground border-4 border-border flex items-center justify-center shadow-xl hover:shadow-2xl transition-all hover:scale-105"
                            >
                                <Eye className="w-10 h-10" />
                            </Button>
                            <p className="text-muted-foreground text-sm font-medium animate-pulse">
                                {t('reveal.identify', "Tap to reveal")}
                            </p>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="reveal"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="w-full max-w-sm"
                    >
                        {/* Card inspired by user image */}
                        <div className={cn(
                            "relative overflow-hidden rounded-3xl border bg-card shadow-2xl p-8 flex flex-col items-center text-center gap-8",
                            "border-border shadow-primary/5"
                        )}>
                            <div className="space-y-4">
                                <h3 className={cn(
                                    "text-2xl font-bold tracking-tight text-foreground",
                                    currentPlayer.role === 'mrWhite' && "text-accent",
                                    currentPlayer.role === 'jester' && "text-amber-500",
                                    currentPlayer.role === 'bodyguard' && "text-emerald-500"
                                )}>
                                    {currentPlayer.role === 'mrWhite' ? "Mr. White" :
                                        currentPlayer.role === 'jester' ? t('roles.jester') :
                                            currentPlayer.role === 'bodyguard' ? t('roles.bodyguard') :
                                                t('reveal.yourWord')}
                                </h3>

                                <p className={cn(
                                    "text-5xl font-black tracking-wider break-words py-4",
                                    currentPlayer.role === 'mrWhite' ? "text-accent" :
                                        currentPlayer.role === 'jester' ? "text-amber-500" :
                                            currentPlayer.role === 'bodyguard' ? "text-emerald-500" : "text-primary"
                                )}>
                                    {currentPlayer.role === 'mrWhite' ? "???" : currentPlayer.word}
                                </p>

                                {currentPlayer.role === 'bodyguard' && currentPlayer.bodyguardTargetId && (
                                    <div className="bg-secondary/50 p-4 rounded-xl border border-border animate-in fade-in slide-in-from-bottom-2">
                                        <div className="flex items-center gap-2 text-emerald-500 mb-1 justify-center">
                                            <Shield className="w-4 h-4" />
                                            <span className="text-xs font-bold uppercase tracking-widest">{t('roles.protect')}</span>
                                        </div>
                                        <p className="text-xl font-bold text-foreground">
                                            {players.find(p => p.id === currentPlayer.bodyguardTargetId)?.name || "Unknown"}
                                        </p>
                                    </div>
                                )}

                                {currentPlayer.role === 'jester' && (
                                    <div className="flex justify-center pb-2">
                                        <Smile className="w-12 h-12 text-amber-500 opacity-80" />
                                    </div>
                                )}

                                <p className="text-sm font-medium text-muted-foreground max-w-[260px] mx-auto leading-relaxed">
                                    {currentPlayer.role === 'mrWhite' ? t('reveal.mrWhiteHint') :
                                        currentPlayer.role === 'jester' ? t('reveal.jesterHint') :
                                            currentPlayer.role === 'bodyguard' ? t('reveal.bodyguardHint') :
                                                t('reveal.memorize')}
                                </p>
                            </div>

                            {/* Next Button */}
                            <Button
                                onClick={handleNext}
                                className="w-full h-14 text-lg rounded-2xl font-bold mt-8 shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 text-primary-foreground"
                            >
                                {isLastPlayer ? t('reveal.startDiscussion') : t('reveal.nextPlayer')}
                            </Button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div >
    );
};

export default RevealPage;
