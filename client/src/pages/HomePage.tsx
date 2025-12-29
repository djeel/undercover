import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Button } from '../components/ui/Button';
import { useGameStore } from '../store/gameStore';
import { ThemeToggle } from '../components/ThemeToggle';
import { Globe, Users, Zap } from 'lucide-react';

const HomePage = () => {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const resetGame = useGameStore((state) => state.resetGame);
    const setGameMode = useGameStore((state) => state.setGameMode);

    // Deep Link Redirect
    useEffect(() => {
        const code = searchParams.get('code');
        if (code) {
            setGameMode('online');
            navigate(`/lobby?code=${code}`);
        }
    }, [searchParams, navigate, setGameMode]);

    const handleNewGame = () => {
        setGameMode('local');
        resetGame();
        navigate('/setup');
    };

    const handleOnlineGame = () => {
        setGameMode('online');
        resetGame();
        navigate('/lobby');
    };

    const toggleLanguage = () => {
        const newLang = i18n.language === 'en' ? 'fr' : 'en';
        i18n.changeLanguage(newLang);
        localStorage.setItem('language', newLang);
    };

    return (
        <div className="flex flex-col gap-8 py-8 animate-in fade-in duration-500">
            {/* Header Area */}
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black tracking-tighter text-foreground">
                        {t('app.title')}
                    </h1>
                    <p className="text-muted-foreground font-medium">
                        {t('home.subtitle')}
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={toggleLanguage} className="rounded-full">
                        <Globe className="w-5 h-5" />
                    </Button>
                    <ThemeToggle />
                </div>
            </header>

            {/* Main Action Cards */}
            <div className="grid gap-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <button
                        onClick={handleNewGame}
                        className="w-full relative group overflow-hidden rounded-3xl bg-card border border-border p-6 text-left hover:border-primary/50 transition-all hover:shadow-neon-primary"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="relative z-10 flex items-center justify-between">
                            <div className="space-y-1">
                                <h3 className="text-2xl font-bold font-heading">{t('home.newGame')}</h3>
                                <p className="text-muted-foreground">Play nicely on a single device</p>
                            </div>
                            <div className="h-12 w-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                <Zap className="w-6 h-6" />
                            </div>
                        </div>
                    </button>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <button
                        onClick={handleOnlineGame}
                        className="w-full relative group overflow-hidden rounded-3xl bg-card border border-border p-6 text-left hover:border-accent/50 transition-all hover:shadow-neon-accent"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-accent/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="relative z-10 flex items-center justify-between">
                            <div className="space-y-1">
                                <h3 className="text-2xl font-bold font-heading">{t('home.playOnline')}</h3>
                                <p className="text-muted-foreground">Join friends remotely</p>
                            </div>
                            <div className="h-12 w-12 rounded-2xl bg-accent/20 flex items-center justify-center text-accent group-hover:scale-110 transition-transform">
                                <Users className="w-6 h-6" />
                            </div>
                        </div>
                    </button>
                </motion.div>
            </div>

            {/* Stats or Info - Optional */}
            <div className="mt-4 p-6 rounded-3xl bg-secondary/30 border border-border/50">
                <h4 className="font-semibold mb-2">Did you know?</h4>
                <p className="text-sm text-muted-foreground">
                    The "Mr. White" role was added in 2024 to spice things up!
                </p>
            </div>
        </div>
    );
};

export default HomePage;
