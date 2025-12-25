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
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#0e0e0e]">
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
                                className="w-24 h-24 rounded-full bg-secondary hover:bg-secondary/80 text-foreground border-4 border-zinc-800 flex items-center justify-center shadow-[0_0_30px_-5px_hsl(var(--secondary)/0.3)] transition-transform hover:scale-105"
                            >
                                <Eye className="w-10 h-10" />
                            </Button>
                            <p className="text-zinc-500 text-sm font-medium animate-pulse">
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
                            "relative overflow-hidden rounded-3xl border  bg-[#0e0e0e] shadow-2xl p-8 flex flex-col items-center text-center gap-8",
                            "border-primary/50 shadow-primary/10" // Default purple-ish glow
                        )}>
                            <div className="space-y-4">
                                <h3 className={cn(
                                    "text-2xl font-bold tracking-tight text-white",
                                    currentPlayer.role === 'mrWhite' && "text-[#F43F5E]",
                                    currentPlayer.role === 'jester' && "text-[#F59E0B]", // Amber for Jester
                                    currentPlayer.role === 'bodyguard' && "text-[#10B981]" // Emerald for Bodyguard
                                )}>
                                    {currentPlayer.role === 'mrWhite' ? "Mr. White" :
                                        currentPlayer.role === 'jester' ? t('roles.jester') :
                                            currentPlayer.role === 'bodyguard' ? t('roles.bodyguard') :
                                                t('reveal.yourWord')}
                                </h3>

                                <p className={cn(
                                    "text-5xl font-black tracking-wider break-words py-4",
                                    currentPlayer.role === 'mrWhite' ? "text-[#F43F5E]" :
                                        currentPlayer.role === 'jester' ? "text-[#F59E0B]" :
                                            currentPlayer.role === 'bodyguard' ? "text-[#10B981]" : "text-white"
                                )}>
                                    {currentPlayer.role === 'mrWhite' ? "???" : currentPlayer.word}
                                </p>

                                {currentPlayer.role === 'bodyguard' && currentPlayer.bodyguardTargetId && (
                                    <div className="bg-zinc-900/80 p-4 rounded-xl border border-zinc-800 animate-in fade-in slide-in-from-bottom-2">
                                        <div className="flex items-center gap-2 text-[#10B981] mb-1 justify-center">
                                            <Shield className="w-4 h-4" />
                                            <span className="text-xs font-bold uppercase tracking-widest">{t('roles.protect')}</span>
                                        </div>
                                        <p className="text-xl font-bold text-white">
                                            {players.find(p => p.id === currentPlayer.bodyguardTargetId)?.name || "Unknown"}
                                        </p>
                                    </div>
                                )}

                                {currentPlayer.role === 'jester' && (
                                    <div className="flex justify-center pb-2">
                                        <Smile className="w-12 h-12 text-[#F59E0B] opacity-80" />
                                    </div>
                                )}

                                <p className="text-sm font-medium text-zinc-400 max-w-[260px] mx-auto leading-relaxed">
                                    {currentPlayer.role === 'mrWhite' ? t('reveal.mrWhiteHint') :
                                        currentPlayer.role === 'jester' ? t('reveal.jesterHint') :
                                            currentPlayer.role === 'bodyguard' ? t('reveal.bodyguardHint') :
                                                t('reveal.memorize')}
                                </p>
                            </div>

                            {/* Next Button */}
                            <Button
                                onClick={handleNext}
                                className={cn(
                                    "w-full h-14 text-lg rounded-full font-bold mt-8 transition-all",
                                    "bg-[#8B5CF6] hover:bg-[#7C3AED] text-white shadow-[0_0_20px_-5px_hsl(262_83%_58%_/_0.5)] border-none"
                                )}
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
