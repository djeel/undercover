import { useTranslation } from 'react-i18next';
import { ThemeToggle } from '../components/ThemeToggle';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Globe, Moon, Sun, Monitor, Languages, Settings as SettingsIcon } from 'lucide-react';
import { useTheme } from '../components/theme-provider';

const SettingsPage = () => {
    const { t, i18n } = useTranslation();
    const { setTheme, theme } = useTheme();

    const changeLanguage = (lang: string) => {
        i18n.changeLanguage(lang);
        localStorage.setItem('language', lang);
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
                            Language
                        </CardTitle>
                        <CardDescription>Choose your preferred language</CardDescription>
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
                            Theme
                        </CardTitle>
                        <CardDescription>Customize interface appearance</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-3 gap-3">
                        <Button
                            variant={theme === 'light' ? 'default' : 'outline'}
                            onClick={() => setTheme('light')}
                            className="h-20 flex flex-col gap-2"
                        >
                            <Sun className="w-6 h-6" />
                            Light
                        </Button>
                        <Button
                            variant={theme === 'dark' ? 'default' : 'outline'}
                            onClick={() => setTheme('dark')}
                            className="h-20 flex flex-col gap-2"
                        >
                            <Moon className="w-6 h-6" />
                            Dark
                        </Button>
                        <Button
                            variant={theme === 'system' ? 'default' : 'outline'}
                            onClick={() => setTheme('system')}
                            className="h-20 flex flex-col gap-2"
                        >
                            <Monitor className="w-6 h-6" />
                            System
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default SettingsPage;
