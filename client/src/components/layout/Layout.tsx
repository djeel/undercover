import { Home, Gamepad2, Users, UserRound, Settings, UsersRound } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const destinations = [
    ['/', 'nav.home', Home],
    ['/setup', 'nav.play', Gamepad2],
    ['/lobby', 'nav.multiplayer', Users],
    ['/friends', 'nav.friends', UsersRound],
    ['/profile', 'nav.profile', UserRound],
    ['/settings', 'nav.settings', Settings],
] as const;

export function Layout() {
    const { t } = useTranslation();

    return (
        <div className="app-frame">
            <header className="hidden md:flex mx-auto w-[min(100%-2rem,72rem)] items-center justify-between border-b border-[var(--color-border)] py-4">
                <NavLink to="/" className="font-[Syne] text-xl font-bold tracking-tight">{t('app.title')}</NavLink>
                <nav aria-label={t('nav.primary', 'Primary navigation')} className="flex items-center gap-1">
                    {destinations.map(([path, label, Icon]) => <NavLink key={path} to={path} className={({ isActive }) => `flex items-center gap-2 rounded-[var(--radius-element)] px-3 py-2 text-sm font-semibold ${isActive ? 'bg-[var(--color-background-muted)] text-[var(--color-accent)]' : 'text-[var(--color-text-secondary)]'}`}><Icon size={16} aria-hidden="true" />{t(label)}</NavLink>)}
                </nav>
            </header>
            <main className="app-main"><Outlet /></main>
            <nav aria-label={t('nav.primary', 'Primary navigation')} className="fixed inset-x-0 bottom-0 z-20 border-t border-[var(--color-border)] bg-[var(--color-background-surface)] pb-[env(safe-area-inset-bottom)] md:hidden">
                <div className="grid grid-cols-6">
                    {destinations.map(([path, label, Icon]) => <NavLink key={path} to={path} className={({ isActive }) => `flex min-h-16 flex-col items-center justify-center gap-1 text-[10px] font-semibold ${isActive ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-secondary)]'}`}><Icon size={19} aria-hidden="true" /><span>{t(label)}</span></NavLink>)}
                </div>
            </nav>
        </div>
    );
}
