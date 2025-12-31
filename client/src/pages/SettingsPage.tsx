import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Moon, Sun, Monitor, Languages, Settings as SettingsIcon, BookOpen } from 'lucide-react';
import { useTheme } from '../components/theme-provider';
import { useNavigate } from 'react-router-dom';

const SettingsPage = () => {
    const { t, i18n } = useTranslation();
    const { setTheme, theme } = useTheme();
    const navigate = useNavigate();

    const changeLanguage = (lang: string) => {
        i18n.changeLanguage(lang);
        localStorage.setItem('language', lang);
    };

    const handleResetTutorial = () => {
        localStorage.removeItem('hasSeenTutorial');
        navigate('/?tutorial=true');
    };

    return (
        <div className="flex flex-col gap-6 animate-in fade-in duration-500">
            <header className="flex items-center gap-3 py-4">
                <SettingsIcon className="w-8 h-8 text-primary" />
                <h1 className="text-3xl font-black text-foreground tracking-tight">{t('nav.settings')}</h1>
            </header>

            <div className="grid gap-6">
                {/* Language Settings */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Languages className="w-5 h-5 text-primary" />
                            {t('settings.language')}
                        </CardTitle>
                        <CardDescription>{t('settings.languageDesc')}</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4">
                        <Button
                            variant={i18n.language === 'en' ? 'default' : 'outline'}
                            onClick={() => changeLanguage('en')}
                            className="h-20 flex flex-col gap-2"
                        >
                            <span className="text-2xl">🇬🇧</span>
                            English
                        </Button>
                        <Button
                            variant={i18n.language === 'fr' ? 'default' : 'outline'}
                            onClick={() => changeLanguage('fr')}
                            className="h-20 flex flex-col gap-2"
                        >
                            <span className="text-2xl">🇫🇷</span>
                            Français
                        </Button>
                    </CardContent>
                </Card>

                {/* Theme Settings */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Monitor className="w-5 h-5 text-primary" />
                            {t('settings.theme')}
                        </CardTitle>
                        <CardDescription>{t('settings.themeDesc')}</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-3 gap-3">
                        <Button
                            variant={theme === 'light' ? 'default' : 'outline'}
                            onClick={() => setTheme('light')}
                            className="h-20 flex flex-col gap-2"
                        >
                            <Sun className="w-6 h-6" />
                            {t('settings.light')}
                        </Button>
                        <Button
                            variant={theme === 'dark' ? 'default' : 'outline'}
                            onClick={() => setTheme('dark')}
                            className="h-20 flex flex-col gap-2"
                        >
                            <Moon className="w-6 h-6" />
                            {t('settings.dark')}
                        </Button>
                        <Button
                            variant={theme === 'system' ? 'default' : 'outline'}
                            onClick={() => setTheme('system')}
                            className="h-20 flex flex-col gap-2"
                        >
                            <Monitor className="w-6 h-6" />
                            {t('settings.system')}
                        </Button>
                    </CardContent>
                </Card>

                {/* Help / Tutorial */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BookOpen className="w-5 h-5 text-primary" />
                            {t('tutorial.welcome')}
                        </CardTitle>
                        <CardDescription>{t('home.howToPlay')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button
                            variant="secondary"
                            className="w-full h-12"
                            onClick={handleResetTutorial}
                        >
                            {t('home.howToPlay')}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default SettingsPage;
