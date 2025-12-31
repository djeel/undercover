import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Button } from '../components/ui/Button';
import { ChevronRight, Check, ShieldAlert, VenetianMask, MessageSquare, Languages } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const OnboardingPage = () => {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const [step, setStep] = useState(0);

    const slides = [
        {
            id: 'language',
            icon: Languages,
            title: "Language",
            desc: "Choose your preferred language\nChoisissez votre langue",
            color: 'text-purple-500',
            bg: 'bg-purple-500/10'
        },
        {
            id: 'concept',
            icon: ShieldAlert,
            title: t('tutorial.conceptTitle'),
            desc: t('tutorial.conceptDesc'),
            color: 'text-primary',
            bg: 'bg-primary/10'
        },
        {
            id: 'roles',
            icon: VenetianMask,
            title: t('tutorial.rolesTitle'),
            desc: t('tutorial.rolesDesc'),
            color: 'text-orange-500',
            bg: 'bg-orange-500/10'
        },
        {
            id: 'game',
            icon: MessageSquare,
            title: t('tutorial.gameTitle'),
            desc: t('tutorial.gameDesc'),
            color: 'text-blue-500',
            bg: 'bg-blue-500/10'
        }
    ];

    const currentSlide = slides[step];

    const changeLanguage = (lang: string) => {
        i18n.changeLanguage(lang);
        localStorage.setItem('language', lang);
        setStep(step + 1);
    };

    const completeOnboarding = () => {
        localStorage.setItem('hasSeenTutorial', 'true');
        navigate('/', { replace: true });
    };

    const handleNext = () => {
        if (step < slides.length - 1) {
            setStep(step + 1);
        } else {
            completeOnboarding();
        }
    };

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center pt-safe animate-in fade-in duration-500">
            <motion.div
                key="content"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="w-full max-w-md h-full min-h-screen flex flex-col relative overflow-hidden shadow-2xl md:min-h-[800px] md:h-auto md:rounded-3xl md:border md:border-border"
            >
                {/* Header Image/Icon Area */}
                <div className={`flex-1 ${currentSlide.bg} flex items-center justify-center transition-colors duration-500 relative overflow-hidden`}>
                    {/* Decorative Background Circles */}
                    <div className="absolute top-0 left-0 w-64 h-64 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl" />
                    <div className="absolute bottom-0 right-0 w-64 h-64 bg-black/5 rounded-full translate-x-1/2 translate-y-1/2 blur-3xl" />

                    <motion.div
                        key={currentSlide.id}
                        initial={{ opacity: 0, scale: 0.5, rotate: -20 }}
                        animate={{ opacity: 1, scale: 1, rotate: 0 }}
                        transition={{ type: "spring", duration: 0.8 }}
                    >
                        <currentSlide.icon className={`w-32 h-32 ${currentSlide.color} drop-shadow-2xl`} />
                    </motion.div>
                </div>

                {/* Content Area */}
                <div className="flex-1 flex flex-col p-8 space-y-8 bg-background rounded-t-3xl -mt-6 relative z-10 shadow-lg border-t border-white/5">
                    <div className="flex-1 flex flex-col justify-center space-y-4 text-center">
                        <motion.h2
                            key={currentSlide.title}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-4xl font-black tracking-tight leading-none"
                        >
                            {currentSlide.title}
                        </motion.h2>
                        <motion.p
                            key={currentSlide.desc}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.1 }}
                            className="text-lg text-muted-foreground whitespace-pre-line leading-relaxed"
                        >
                            {currentSlide.desc}
                        </motion.p>
                    </div>

                    {/* Indicators */}
                    <div className="flex justify-center gap-2 mb-4">
                        {slides.map((_, idx) => (
                            <div
                                key={idx}
                                className={`h-2 rounded-full transition-all duration-300 ${idx === step ? 'bg-primary w-8' : 'bg-muted w-2'
                                    }`}
                            />
                        ))}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-3 pb-8">
                        {currentSlide.id === 'language' ? (
                            <div className="flex flex-col gap-3 w-full">
                                <Button
                                    size="lg"
                                    className="w-full text-lg h-14 font-bold shadow-lg"
                                    onClick={() => changeLanguage('en')}
                                    variant="outline"
                                >
                                    <span className="text-2xl mr-2">🇬🇧</span> English
                                </Button>
                                <Button
                                    size="lg"
                                    className="w-full text-lg h-14 font-bold shadow-lg"
                                    onClick={() => changeLanguage('fr')}
                                    variant="outline"
                                >
                                    <span className="text-2xl mr-2">🇫🇷</span> Français
                                </Button>
                            </div>
                        ) : (
                            <>
                                <Button
                                    size="lg"
                                    className="w-full text-lg h-14 bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/20 rounded-2xl"
                                    onClick={handleNext}
                                >
                                    {step === slides.length - 1 ? (
                                        <span className="flex items-center gap-2">
                                            {t('tutorial.finish')} <Check className="w-5 h-5" />
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-2">
                                            {t('tutorial.next')} <ChevronRight className="w-5 h-5" />
                                        </span>
                                    )}
                                </Button>

                                {step < slides.length - 1 && (
                                    <Button variant="ghost" className="w-full h-12 text-muted-foreground hover:text-foreground" onClick={completeOnboarding}>
                                        {t('tutorial.skip')}
                                    </Button>
                                )}
                            </>
                        )}

                        {step === slides.length - 1 && (
                            <div className="h-12" />
                        )}
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default OnboardingPage;
