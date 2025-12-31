import { Home, Gamepad2, Settings, Users } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/utils';
// I saw "lib" dir earlier.

export function MobileTabBar() {
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
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-t border-border pb-safe">
            <div className="flex justify-around items-center h-20">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            cn(
                                "flex flex-col items-center justify-center w-full h-full space-y-1 text-xs font-medium transition-colors",
                                isActive
                                    ? "text-primary"
                                    : "text-muted-foreground hover:text-foreground"
                            )
                        }
                    >
                        <item.icon className="w-6 h-6" />
                        <span>{item.label}</span>
                    </NavLink>
                ))}
            </div>
        </nav>
    );
}
