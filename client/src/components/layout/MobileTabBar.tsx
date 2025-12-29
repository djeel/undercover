import { Home, Gamepad2, Settings } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '../../lib/utils';
// I saw "lib" dir earlier.

export function MobileTabBar() {
    const navItems = [
        {
            label: 'Home',
            icon: Home,
            path: '/',
        },
        {
            label: 'Game',
            icon: Gamepad2,
            path: '/game', // Or /setup maybe? The button usually starts a game.
            // But if we use NavLink, it's for navigation.
            // Let's point to /setup for "New Game" flow or /game if active.
            // For now, let's say "Lobby" or "Setup". The request said "improve navigation".
            // Let's point to / which is the dashboard, and maybe a separate 'Play'.
            // Actually, usually bottom bar is Home, Profile, Leaderboard etc.
            // Let's stick to Home, Lobby, and Settings for now.

            // Wait, looking at Duolingo:
            // Learn, Stories, profile, etc.
            // For Undercover:
            // Home (Dashboard), Lobby (Join/Create), Rules/Settings?

            // Let's use:
            // Home (/)
            // Lobby (/lobby or /setup) - Let's use /setup as "Play"
            // Settings (/settings) - We don't have this page yet.
        },
        // For now I'll just put Home and maybe "Play" which leads to setup.
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-t border-border pb-safe">
            <div className="flex justify-around items-center h-16">
                <NavLink
                    to="/"
                    className={({ isActive }) =>
                        cn(
                            "flex flex-col items-center justify-center w-full h-full space-y-1 text-xs font-medium transition-colors",
                            isActive
                                ? "text-primary"
                                : "text-muted-foreground hover:text-foreground"
                        )
                    }
                >
                    <Home className="w-6 h-6" />
                    <span>Home</span>
                </NavLink>

                <NavLink
                    to="/setup"
                    className={({ isActive }) =>
                        cn(
                            "flex flex-col items-center justify-center w-full h-full space-y-1 text-xs font-medium transition-colors",
                            isActive
                                ? "text-primary"
                                : "text-muted-foreground hover:text-foreground"
                        )
                    }
                >
                    <Gamepad2 className="w-6 h-6" />
                    <span>Play</span>
                </NavLink>

                {/* valid path needed for strict router types? No, string is fine. */}
            </div>
        </nav>
    );
}
