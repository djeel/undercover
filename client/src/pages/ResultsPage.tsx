import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Trophy, Home, RotateCcw } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardFooter } from '../components/ui/Card';
import { useLocalGameStore } from '../features/local-game/local-game-store';
import { cn } from '../lib/utils';

const ResultsPage = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const winner = useLocalGameStore((state) => state.winner);
    const players = useLocalGameStore((state) => state.players);
    const config = useLocalGameStore((state) => state.config);
    const resetGame = useLocalGameStore((state) => state.resetGame);
    const restartGame = useLocalGameStore((state) => state.restartGame);

    if (!winner) return <div className="min-h-[50vh] flex items-center justify-center p-4 text-center"><Button onClick={() => navigate('/')}>{t('common.back')}</Button></div>;
    const winnerText = winner === 'mr_white' ? t('results.mrWhiteWins') : winner === 'jester' ? t('results.jesterWins') : winner === 'undercovers' ? t('results.undercoversWin') : t('results.civiliansWin');
    const winnerColor = winner === 'mr_white' ? 'text-cyan-500' : winner === 'jester' ? 'text-orange-500' : winner === 'undercovers' ? 'text-pink-600' : 'text-emerald-500';

    return (
        <div className="flex flex-col items-center justify-center animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md space-y-8">
                <div className="text-center space-y-4"><div className="mx-auto w-24 h-24 rounded-full bg-secondary border border-border flex items-center justify-center shadow-xl"><Trophy className={cn('w-12 h-12', winnerColor)} /></div><h1 className={cn('text-4xl font-black tracking-tight uppercase', winnerColor)}>{winnerText}</h1></div>
                <Card className="shadow-2xl"><CardContent className="space-y-6 pt-6"><div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-secondary/50 border border-border"><div className="text-center"><p className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest mb-1">{t('results.civilianWord')}</p><p className="text-xl font-bold text-foreground">{config.civilianWord || '?'}</p></div><div className="text-center border-l border-border"><p className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest mb-1">{t('results.undercoverWord')}</p><p className="text-xl font-bold text-primary">{config.undercoverWord || '?'}</p></div></div><div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">{players.map((player, index) => <motion.div key={player.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 * index }} className="flex items-center justify-between p-3 rounded-xl bg-secondary/30"><div className="flex items-center gap-3"><span className="font-medium text-foreground">{player.displayName}</span>{!player.alive && <span className="bg-destructive/10 text-destructive text-[10px] uppercase px-1.5 py-0.5 rounded font-bold">{t('game.eliminated')}</span>}</div><span className="text-sm font-bold uppercase tracking-wide text-primary">{t(`roles.${player.role === 'mr_white' ? 'mrWhite' : player.role}`)}</span></motion.div>)}</div></CardContent><CardFooter className="gap-4 pl-6 pr-6 pb-6 pt-2"><Button variant="secondary" onClick={() => { resetGame(); navigate('/'); }} className="flex-1 rounded-xl h-12"><Home className="mr-2 w-4 h-4" />{t('results.backToHome')}</Button><Button onClick={() => { restartGame(); navigate('/setup'); }} className="flex-1 rounded-xl h-12 shadow-lg shadow-primary/20 bg-primary text-primary-foreground hover:bg-primary/90"><RotateCcw className="mr-2 w-4 h-4" />{t('results.playAgain')}</Button></CardFooter></Card>
            </motion.div>
        </div>
    );
};

export default ResultsPage;
