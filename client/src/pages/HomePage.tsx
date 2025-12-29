import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../components/ui/Button';
import { useGameStore } from '../store/gameStore';
import { ThemeToggle } from '../components/ThemeToggle';
import { Globe, ShieldAlert } from 'lucide-react';

const HomePage = () => {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const setGameMode = useGameStore((state) => state.setGameMode);

    // Deep Link Redirect
    useEffect(() => {
        const code = searchParams.get('code');
        if (code) {
            setGameMode('online');
            navigate(`/lobby?code=${code}`);
        }
    }, [searchParams, navigate, setGameMode]);

    const toggleLanguage = () => {
        const newLang = i18n.language === 'en' ? 'fr' : 'en';
        i18n.changeLanguage(newLang);
        localStorage.setItem('language', newLang);
    };

    return (
        <div className="flex flex-col h-full py-8 animate-in fade-in duration-500">
            {/* Header Area */}
            <header className="flex justify-between items-center mb-12">
                <div>
                    <h1 className="text-3xl font-black tracking-tighter text-foreground">
                        {t('app.title')}
                    </h1>
                    <p className="text-muted-foreground font-medium">
                        {t('home.subtitle')}
                    </p>
                </div>
            </header>

            {/* Dashboard Content */}
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 opacity-60">
                <div className="w-24 h-24 rounded-full bg-secondary/30 flex items-center justify-center mb-4">
                    <ShieldAlert className="w-12 h-12 text-muted-foreground" />
                </div>
                <p className="max-w-xs text-muted-foreground">
                    Select a mode from the bottom menu to start playing.
                </p>
            </div>
        </div>
    );
};

export default HomePage;
