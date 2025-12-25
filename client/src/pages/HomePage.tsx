import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Button } from '../components/ui/Button';
import { useGameStore } from '../store/gameStore';

const HomePage = () => {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const resetGame = useGameStore((state) => state.resetGame);
    const setGameMode = useGameStore((state) => state.setGameMode);

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
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background relative">
            <div className="absolute top-6 right-6">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleLanguage}
                    className="text-zinc-500 hover:text-white hover:bg-white/5 font-medium transition-colors"
                >
                    {i18n.language.toUpperCase()}
                </Button>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="w-full max-w-sm flex flex-col gap-12 text-center"
            >
                <div className="space-y-4">
                    <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-foreground text-center">
                        {t('app.title')}
                    </h1>
                    <p className="text-base md:text-lg font-medium text-muted-foreground text-center">
                        {t('home.subtitle')}
                    </p>
                </div>

                <div className="space-y-4 w-full">
                    <Button
                        onClick={handleNewGame}
                        size="lg"
                        className="w-full text-lg h-16 bg-primary hover:bg-primary/90 text-primary-foreground border-0 rounded-2xl shadow-md shadow-primary/20"
                    >
                        {t('home.newGame')}
                    </Button>

                    <Button
                        onClick={handleOnlineGame}
                        size="lg"
                        className="w-full text-lg h-16 bg-accent hover:bg-accent/90 text-white border-0 rounded-2xl shadow-md shadow-accent/20"
                    >
                        {t('home.playOnline')}
                    </Button>


                </div>
            </motion.div>
        </div>
    );
};

export default HomePage;
