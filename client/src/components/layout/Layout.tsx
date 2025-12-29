import React from 'react';
import { Outlet } from 'react-router-dom';
import { MobileTabBar } from './MobileTabBar';

export function Layout() {
    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col">
            {/* Main Content Area */}
            <main className="flex-1 w-full max-w-md mx-auto p-4 pb-24 md:pb-4 md:max-w-4xl">
                <Outlet />
            </main>

            {/* Mobile Navigation - Visible only on small screens */}
            <div className="md:hidden">
                <MobileTabBar />
            </div>

            {/* Desktop Message/Sidebar placeholder - if needed later */}
            {/* <aside className="hidden md:block ..."> ... </aside> */}
        </div>
    );
}
