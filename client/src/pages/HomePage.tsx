import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../store/gameStore';
import { ShieldAlert } from 'lucide-react';

const HomePage = () => {
    const { t } = useTranslation();
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



    return (
        <div className="flex flex-col h-full py-8 animate-in fade-in duration-500">
            {/* Header Area */}
            {/* Header Area */}
            <header className="flex flex-col gap-4 mb-6 md:mb-12 md:items-start md:text-left">
                <div className="md:hidden">
                    <h1 className="text-3xl font-black tracking-tighter text-foreground">
                        {t('app.title')}
                    </h1>
                </div>
                <div className="text-muted-foreground font-medium bg-secondary/20 p-6 rounded-2xl border border-secondary/30 w-full text-left">
                    <p className="whitespace-pre-line leading-relaxed">
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
