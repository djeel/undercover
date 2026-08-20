import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card } from '@astryxdesign/core/Card';
import { Text } from '@astryxdesign/core/Text';
import { User, VenetianMask, UserX, Ghost, Shield } from 'lucide-react';

const roles = [
    ['civilian', User, 'role-civilian'],
    ['undercover', VenetianMask, 'role-undercover'],
    ['mrWhite', UserX, 'role-mr-white'],
    ['jester', Ghost, 'role-jester'],
    ['bodyguard', Shield, 'role-bodyguard'],
] as const;

const HomePage = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    useEffect(() => {
        if (!localStorage.getItem('hasSeenTutorial') || searchParams.get('tutorial')) navigate('/onboarding');
    }, [navigate, searchParams]);

    return <section className="space-y-8"><header className="max-w-2xl space-y-3"><h1 className="text-4xl font-bold tracking-tight">{t('app.title')}</h1><Text as="p" type="large" color="secondary">{t('home.subtitle').split('\n')[0]}</Text></header><div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">{roles.map(([id, Icon, color]) => <Card key={id}><div className="flex gap-4 p-5"><Icon className={color} size={26} aria-hidden="true" /><div><h2 className="text-lg font-bold">{t(`roles.${id}`)}</h2><Text as="p" type="supporting">{t(`roleDescriptions.${id}`)}</Text></div></div></Card>)}</div><Text as="p" type="supporting" justify="center">{t('home.selectMode')}</Text></section>;
};

export default HomePage;
