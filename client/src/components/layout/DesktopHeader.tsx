import { Home, Gamepad2, Users, Settings } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/utils';

export function DesktopHeader() {
    const { t } = useTranslation();

    const navItems = [
        {
            label: t('nav.home'),
            icon: Home,
            path: '/',
        },
        {
            label: t('nav.play'),
            icon: Gamepad2,
            path: '/setup',
        },
        {
            label: t('nav.multiplayer'),
            icon: Users,
            path: '/lobby',
        },
        {
            label: t('nav.settings'),
            icon: Settings,
            path: '/settings',
        }
    ];

    return (
        <header className="hidden md:flex items-center justify-between py-4 mb-8 border-b border-border/50">
            <h1 className="text-2xl font-black tracking-tighter text-foreground">
                {t('app.title')}
            </h1>

            <nav className="flex items-center gap-6">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            cn(
                                "flex items-center gap-2 text-sm font-medium transition-colors px-3 py-2 rounded-lg hover:bg-secondary/50",
                                isActive
                                    ? "text-primary bg-secondary/80"
                                    : "text-muted-foreground hover:text-foreground"
                            )
                        }
                    >
                        <item.icon className="w-4 h-4" />
                        <span>{item.label}</span>
                    </NavLink>
                ))}
            </nav>
        </header>
    );
}
