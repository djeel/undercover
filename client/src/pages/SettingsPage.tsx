import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { Text } from '@astryxdesign/core/Text';
import { useThemePreference, type ThemePreference } from '../theme/AppTheme';

const SettingsPage = () => {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const [theme, setTheme] = useThemePreference();
    const setLanguage = (language: 'en' | 'fr') => { i18n.changeLanguage(language); localStorage.setItem('language', language); };

    return <section className="space-y-7"><header><h1 className="text-3xl font-bold">{t('nav.settings')}</h1></header><Card><div className="space-y-4 p-5"><h2 className="text-lg font-bold">{t('settings.language')}</h2><div className="grid grid-cols-2 gap-3"><Button variant={i18n.language.startsWith('en') ? 'primary' : 'secondary'} label="English" onClick={() => setLanguage('en')} width="100%" /><Button variant={i18n.language.startsWith('fr') ? 'primary' : 'secondary'} label="Français" onClick={() => setLanguage('fr')} width="100%" /></div></div></Card><Card><div className="space-y-4 p-5"><h2 className="text-lg font-bold">{t('settings.theme')}</h2><div className="grid grid-cols-3 gap-3">{(['dark', 'light', 'system'] as ThemePreference[]).map((preference) => <Button key={preference} variant={theme === preference ? 'primary' : 'secondary'} label={t(`settings.${preference}`)} onClick={() => setTheme(preference)} width="100%" />)}</div></div></Card><Card className="settings-help-card"><div className="settings-help-card__content"><div className="space-y-2"><h2 className="text-lg font-bold">{t('settings.help')}</h2><Text as="p" type="supporting">{t('settings.helpDesc')}</Text></div><Button variant="secondary" label={t('settings.restartTutorial')} onClick={() => { localStorage.removeItem('hasSeenTutorial'); navigate('/onboarding'); }} /></div></Card></section>;
};

export default SettingsPage;
