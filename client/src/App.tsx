import { BrowserRouter, HashRouter, Route, Routes } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { AppTheme } from './theme/AppTheme';
import { Layout } from './components/layout/Layout';
import { HomePage, SetupPage, RevealPage, GamePage, ResultsPage, MultiplayerSetupPage, SettingsPage, OnboardingPage } from './pages';

function DestinationShell({ title }: { title: string }) {
    return <section className="space-y-3"><h1 className="text-3xl font-bold">{title}</h1><p className="text-[var(--color-text-secondary)]">This destination is being prepared.</p></section>;
}

function App() {
    const Router = Capacitor.isNativePlatform() ? HashRouter : BrowserRouter;
    const routerProps = Capacitor.isNativePlatform() ? {} : { basename: import.meta.env.BASE_URL };

    return <AppTheme><Router {...routerProps}><Routes>
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/setup" element={<SetupPage />} />
            <Route path="/lobby" element={<MultiplayerSetupPage />} />
            <Route path="/reveal" element={<RevealPage />} />
            <Route path="/game" element={<GamePage />} />
            <Route path="/results" element={<ResultsPage />} />
            <Route path="/friends" element={<DestinationShell title="Friends" />} />
            <Route path="/profile" element={<DestinationShell title="Profile" />} />
            <Route path="/settings" element={<SettingsPage />} />
        </Route>
    </Routes></Router></AppTheme>;
}

export default App;
