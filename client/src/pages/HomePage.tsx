import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../store/gameStore';
import { User, VenetianMask, UserX, Ghost, Shield } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '../components/ui/Card';

const roles = [
    { id: 'civilian', icon: User, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { id: 'undercover', icon: VenetianMask, color: 'text-orange-500', bg: 'bg-orange-500/10' },
    { id: 'mrWhite', icon: UserX, color: 'text-stone-400', bg: 'bg-stone-500/10' },
    { id: 'jester', icon: Ghost, color: 'text-pink-500', bg: 'bg-pink-500/10' },
    { id: 'bodyguard', icon: Shield, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
];

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

    // Check for tutorial
    useEffect(() => {
        const hasSeen = localStorage.getItem('hasSeenTutorial');
        const forceTutorial = searchParams.get('tutorial');

        if (!hasSeen || forceTutorial) {
            navigate('/onboarding');
        }
    }, [searchParams, navigate]);

    return (
        <div className="flex flex-col h-full py-6 gap-8 animate-in fade-in duration-500">

            {/* Header Area */}
            <header className="flex flex-col gap-2 md:items-start md:text-left px-1">
                <div className="md:hidden">
                    <h1 className="text-3xl md:text-4xl break-words font-black tracking-tighter text-foreground bg-gradient-to-br from-foreground to-muted-foreground bg-clip-text text-transparent">
                        {t('app.title')}
                    </h1>
                </div>
                <p className="text-muted-foreground font-medium text-lg max-w-md leading-relaxed">
                    {t('home.subtitle').split('\n')[0]}
                </p>
            </header>

            {/* Role Gallery */}
            <div className="flex-1 overflow-y-auto px-5 -mx-4 md:mx-0 scrollbar-hide py-2">
                <div className="flex flex-col gap-4 pb-20 md:grid md:grid-cols-2 lg:grid-cols-3">
                    {roles.map((role, index) => (
                        <motion.div
                            key={role.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="h-full"
                        >
                            <Card className="border-border/50 bg-secondary/20 backdrop-blur-sm overflow-hidden h-full">
                                <CardContent className="p-4 flex items-start gap-4">
                                    <div className={`p-3 rounded-xl ${role.bg}`}>
                                        <role.icon className={`w-6 h-6 ${role.color}`} />
                                    </div>
                                    <div className="space-y-1">
                                        <h3 className="font-bold text-lg">{t(`roles.${role.id}`)}</h3>
                                        <p className="text-sm text-muted-foreground leading-relaxed">
                                            {t(`roleDescriptions.${role.id}`)}
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Bottom Prompt */}
            <div className="text-center opacity-60 md:hidden absolute bottom-24 left-0 right-0 pointer-events-none">
                <p className="text-sm text-muted-foreground animate-pulse">
                    {t('home.selectMode')}
                </p>
            </div>
        </div>
    );
};

export default HomePage;
