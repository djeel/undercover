
import { Outlet } from 'react-router-dom';
import { MobileTabBar } from './MobileTabBar';
import { DesktopHeader } from './DesktopHeader';

export function Layout() {
    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col">
            {/* Main Content Area */}
            <main className="flex-1 w-full max-w-md mx-auto p-4 pb-24 md:pb-8 md:max-w-4xl relative z-10">
                <DesktopHeader />
                <Outlet />
            </main>

            {/* Gradient Halo */}
            <div className="pointer-events-none fixed inset-x-0 bottom-0 h-44 bg-gradient-to-t from-primary/20 via-primary/5 to-transparent z-0" />

            {/* Mobile Navigation - Visible only on small screens */}
            <div className="md:hidden">
                <MobileTabBar />
            </div>

            {/* Desktop Message/Sidebar placeholder - if needed later */}
            {/* <aside className="hidden md:block ..."> ... </aside> */}
        </div>
    );
}
