import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Trophy, Home, RotateCcw } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardFooter } from '../components/ui/Card';
import { useGameStore } from '../store/gameStore';
import { cn } from '../lib/utils';


const ResultsPage = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const gameMode = useGameStore(state => state.gameMode);
    const onlineState = useGameStore(state => state.onlineState);
    const { winner, players, config, resetGame, restartGame, leaveRoom } = useGameStore();

    const handleHome = () => {
        if (gameMode === 'online') {
            leaveRoom();
        } else {
            resetGame();
        }
        navigate('/');
    };

    if (!winner) {
        return (
            <div className="min-h-[50vh] flex items-center justify-center p-4 text-center">
                <Button onClick={() => navigate('/')}>{t('common.back')}</Button>
            </div>
        );
    }

    const winnerText = winner === 'mrWhite'
        ? t('results.mrWhiteWins')
        : winner === 'jester'
            ? t('results.jesterWins')
            : winner === 'undercovers'
                ? t('results.undercoversWin')
                : t('results.civiliansWin');

    const getWinnerColor = (w: typeof winner) => {
        if (w === 'mrWhite') return 'text-accent';
        if (w === 'jester') return 'text-amber-500';
        return 'text-primary';
    };

    const handlePlayAgain = () => {
        restartGame();
        if (gameMode === 'local') {
            navigate('/setup');
        }
    };

    return (
        <div className="flex flex-col items-center justify-center animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md space-y-8"
            >
                <div className="text-center space-y-4">
                    <motion.div
                        initial={{ y: -20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="mx-auto w-24 h-24 rounded-full bg-secondary border border-border flex items-center justify-center shadow-xl"
                    >
                        <Trophy className={cn("w-12 h-12", getWinnerColor(winner))} />
                    </motion.div>

                    <h1 className={cn("text-4xl font-black tracking-tight uppercase", getWinnerColor(winner))}>
                        {winnerText}
                    </h1>
                </div>

                <Card className="shadow-2xl">
                    <CardContent className="space-y-6 pt-6">
                        {/* Word Reveal */}
                        <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-secondary/50 border border-border">
                            <div className="text-center">
                                <p className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest mb-1">{t('results.civilianWord')}</p>
                                <p className="text-xl font-bold text-foreground">{config.civilianWord || '?'}</p>
                            </div>
                            <div className="text-center border-l border-border">
                                <p className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest mb-1">{t('results.undercoverWord')}</p>
                                <p className="text-xl font-bold text-primary">{config.undercoverWord || '?'}</p>
                            </div>
                        </div>

                        {/* Player Roles List */}
                        <div className="space-y-3">
                            <h3 className="font-bold text-lg text-foreground ml-2">
                                {t('results.roles')}
                            </h3>
                            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                {players.map((player, idx) => (
                                    <motion.div
                                        key={player.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.1 * idx }}
                                        className="flex items-center justify-between p-3 rounded-xl bg-secondary/30 border border-transparent hover:border-border transition-all"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="font-medium text-foreground">{player.name}</span>
                                            {player.isEliminated && (
                                                <span className="bg-destructive/10 text-destructive text-[10px] uppercase px-1.5 py-0.5 rounded font-bold">
                                                    {t('game.eliminated')}
                                                </span>
                                            )}
                                        </div>
                                        <span className={cn(
                                            "text-sm font-bold uppercase tracking-wide",
                                            player.role === 'mrWhite' ? 'text-accent' :
                                                player.role === 'jester' ? 'text-amber-500' :
                                                    player.role === 'bodyguard' ? 'text-emerald-500' :
                                                        'text-primary'
                                        )}>
                                            {t(`roles.${player.role}`)}
                                        </span>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </CardContent>

                    <CardFooter className="gap-4 pl-6 pr-6 pb-6 pt-2">
                        <Button
                            variant="secondary"
                            onClick={handleHome}
                            className="flex-1 rounded-xl h-12"
                        >
                            <Home className="mr-2 w-4 h-4" />
                            {t('results.backToHome')}
                        </Button>

                        {/* Only Host can Play Again in Online mode, or anyone in Local mode */}
                        {(!onlineState.roomId || onlineState.isHost) && (
                            <Button
                                onClick={handlePlayAgain}
                                className="flex-1 rounded-xl h-12 shadow-lg shadow-primary/20 bg-primary text-primary-foreground hover:bg-primary/90"
                            >
                                <RotateCcw className="mr-2 w-4 h-4" />
                                {t('results.playAgain')}
                            </Button>
                        )}
                    </CardFooter>
                </Card>
            </motion.div>
        </div>
    );
};

export default ResultsPage;
