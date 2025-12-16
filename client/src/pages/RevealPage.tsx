import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useGameStore } from '../store/gameStore';
import { cn } from '../lib/utils';

const RevealPage = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const {
        players,
        currentRevealIndex,
        revealCurrentPlayer,
        nextRevealPlayer,
        startPlaying,
        phase
    } = useGameStore();

    // Steps: 'pass' (Pass to X) -> 'reveal' (Show Card)
    const [step, setStep] = useState<'pass' | 'reveal'>('pass');

    const currentPlayer = players[currentRevealIndex];
    const isLastPlayer = currentRevealIndex === players.length - 1;

    useEffect(() => {
        if (phase === 'playing') {
            navigate('/game');
        } else if (phase === 'idle' || phase === 'setup') {
            navigate('/');
        }
    }, [phase, navigate]);

    const handleIdentify = () => {
        setStep('reveal');
        revealCurrentPlayer();
    };

    const handleNext = () => {
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
                                {t('reveal.passPhone')}
                            </p>
                            <h2 className="text-5xl font-black text-foreground tracking-tight">
                                {currentPlayer.name}
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
                                    currentPlayer.role === 'mrWhite' && "text-[#F43F5E]" // Rose for Mr White
                                )}>
                                    {currentPlayer.role === 'mrWhite'
                                        ? "Mr. White"
                                        : t('reveal.yourWord') // Only show "Your Word" for others
                                    }
                                </h3>

                                <p className={cn(
                                    "text-5xl font-black tracking-wider break-words py-4",
                                    currentPlayer.role === 'mrWhite' ? "text-[#F43F5E]" : "text-white" // White for others (was Cyan)
                                )}>
                                    {currentPlayer.role === 'mrWhite' ? "???" : currentPlayer.word}
                                </p>

                                <p className="text-sm font-medium text-zinc-400 max-w-[260px] mx-auto leading-relaxed">
                                    {currentPlayer.role === 'mrWhite'
                                        ? t('reveal.mrWhiteHint')
                                        : t('reveal.memorize') // "Describe this word..."
                                    }
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
        </div>
    );
};

export default RevealPage;
