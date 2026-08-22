import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { Text } from '@astryxdesign/core/Text';
import { ShieldAlert, VenetianMask, MessageSquare } from 'lucide-react';

const OnboardingPage = () => {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const [step, setStep] = useState(0);
    const slides = [
        [ShieldAlert, 'tutorial.conceptTitle', 'tutorial.conceptDesc'],
        [VenetianMask, 'tutorial.rolesTitle', 'tutorial.rolesDesc'],
        [MessageSquare, 'tutorial.gameTitle', 'tutorial.gameDesc'],
    ] as const;
    const [Icon, title, description] = slides[step];
    const finish = () => { localStorage.setItem('hasSeenTutorial', 'true'); navigate('/', { replace: true }); };
    const next = () => { if (step === slides.length - 1) finish(); else setStep(step + 1); };

    return <main className="flex min-h-dvh items-center justify-center p-5"><section className="w-full max-w-lg space-y-6 text-center"><Card><div className="space-y-6 p-8"><Icon className="mx-auto text-[var(--color-accent)]" size={44} aria-hidden="true" /><h1 className="text-3xl font-bold">{t(title)}</h1><Text as="p" type="body" color="secondary">{t(description)}</Text></div></Card><div className="grid grid-cols-2 gap-3"><Button variant="secondary" label="English" onClick={() => { i18n.changeLanguage('en'); localStorage.setItem('language', 'en'); }} width="100%" /><Button variant="secondary" label="Français" onClick={() => { i18n.changeLanguage('fr'); localStorage.setItem('language', 'fr'); }} width="100%" /></div><Button variant="primary" label={step === slides.length - 1 ? t('tutorial.finish') : t('tutorial.next')} onClick={next} width="100%" /></section></main>;
};

export default OnboardingPage;
