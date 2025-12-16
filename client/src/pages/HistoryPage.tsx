import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Trash2, Calendar, Trophy } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { useGameStore } from '../store/gameStore';

const HistoryPage = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { history, clearHistory } = useGameStore();

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="min-h-screen p-4 bg-background">
            <div className="max-w-2xl mx-auto space-y-6">
                <header className="flex items-center justify-between py-4">
                    <Button variant="ghost" onClick={() => navigate('/')}>
                        <ArrowLeft className="mr-2 w-4 h-4" />
                        {t('common.back')}
                    </Button>
                    <h1 className="text-xl font-bold text-foreground">{t('history.title')}</h1>
                    {history.length > 0 && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={clearHistory}
                            className="text-destructive hover:bg-destructive/10"
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    )}
                    {history.length === 0 && <div className="w-10" />}
                </header>

                <div className="space-y-4">
                    {history.length === 0 ? (
                        <div className="text-center py-20 opacity-50 space-y-4">
                            <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center mx-auto">
                                <Trophy className="w-10 h-10 text-muted-foreground" />
                            </div>
                            <p className="text-muted-foreground">{t('history.noGames')}</p>
                            <Button variant="link" onClick={() => navigate('/setup')} className="text-primary">
                                {t('history.playFirst')}
                            </Button>
                        </div>
                    ) : (
                        history.map((game) => (
                            <Card key={game.id} className="bg-card hover:bg-secondary/50 transition-colors border-border">
                                <CardHeader className="flex flex-row items-start justify-between pb-2">
                                    <div className="space-y-1">
                                        <CardTitle className={`text-lg font-bold ${game.winner === 'civilians' ? 'text-blue-500' :
                                                game.winner === 'undercovers' ? 'text-destructive' :
                                                    'text-primary'
                                            }`}>
                                            {game.winner === 'civilians' ? t('results.civiliansWin') :
                                                game.winner === 'undercovers' ? t('results.undercoversWin') :
                                                    t('results.mrWhiteWins')}
                                        </CardTitle>
                                        <div className="flex items-center text-xs text-muted-foreground gap-2">
                                            <Calendar className="w-3 h-3" />
                                            {formatDate(game.date)}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm font-medium text-foreground">{t('history.rounds', { count: game.rounds })}</div>
                                        <div className="text-xs text-muted-foreground">{t('history.players', { count: game.players.length })}</div>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-0">
                                    <div className="mt-2 text-sm grid grid-cols-2 gap-4 opacity-70">
                                        <div>
                                            <span className="block text-xs uppercase font-bold text-muted-foreground">{t('results.civilianWord')}</span>
                                            <span className="text-foreground">{game.civilianWord}</span>
                                        </div>
                                        <div>
                                            <span className="block text-xs uppercase font-bold text-muted-foreground">{t('results.undercoverWord')}</span>
                                            <span className="text-foreground">{game.undercoverWord}</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default HistoryPage;
