import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './ui/Button';
import { ChevronRight, Check, X, ShieldAlert, VenetianMask, MessageSquare } from 'lucide-react';
import { Card, CardContent } from './ui/Card';

interface OnboardingModalProps {
    open: boolean;
    onClose: () => void;
}

const OnboardingModal = ({ open, onClose }: OnboardingModalProps) => {
    const { t } = useTranslation();
    const [step, setStep] = useState(0);

    if (!open) return null;

    const slides = [
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

    const handleNext = () => {
        if (step < slides.length - 1) {
            setStep(step + 1);
        } else {
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-sm relative"
            >
                <Card className="border-border shadow-2xl overflow-hidden">
                    <CardContent className="p-0">
                        {/* Header Image/Icon Area */}
                        <div className={`h-40 ${currentSlide.bg} flex items-center justify-center transition-colors duration-500`}>
                            <motion.div
                                key={currentSlide.id}
                                initial={{ opacity: 0, scale: 0.5, rotate: -20 }}
                                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                                transition={{ type: "spring" }}
                            >
                                <currentSlide.icon className={`w-20 h-20 ${currentSlide.color}`} />
                            </motion.div>
                        </div>

                        {/* Content Area */}
                        <div className="p-6 space-y-6">
                            <div className="space-y-2 text-center h-32">
                                <motion.h2
                                    key={currentSlide.title}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="text-2xl font-black tracking-tight"
                                >
                                    {currentSlide.title}
                                </motion.h2>
                                <motion.p
                                    key={currentSlide.desc}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.1 }}
                                    className="text-muted-foreground whitespace-pre-line leading-relaxed"
                                >
                                    {currentSlide.desc}
                                </motion.p>
                            </div>

                            {/* Indicators */}
                            <div className="flex justify-center gap-2">
                                {slides.map((_, idx) => (
                                    <div
                                        key={idx}
                                        className={`w-2 h-2 rounded-full transition-all duration-300 ${idx === step ? 'bg-primary w-6' : 'bg-muted'
                                            }`}
                                    />
                                ))}
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3">
                                {step < slides.length - 1 && (
                                    <Button variant="ghost" className="flex-1" onClick={onClose}>
                                        {t('tutorial.skip')}
                                    </Button>
                                )}
                                <Button className="flex-1 bg-primary text-primary-foreground font-bold" onClick={handleNext}>
                                    {step === slides.length - 1 ? (
                                        <>
                                            {t('tutorial.finish')} <Check className="ml-2 w-4 h-4" />
                                        </>
                                    ) : (
                                        <>
                                            {t('tutorial.next')} <ChevronRight className="ml-2 w-4 h-4" />
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
};

export default OnboardingModal;
