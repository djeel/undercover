import { BrowserRouter, HashRouter, Route, Routes } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { AuthProvider, AuthCallbackPage, AuthPage, RequireSession } from './features/auth';
import { AppTheme } from './theme/AppTheme';
import { Layout } from './components/layout/Layout';
import { AccountPage, FriendsPage, GamePage, HomePage, MultiplayerSetupPage, OnboardingPage, PlayPage, ProfilePage, ResultsPage, RevealPage, SettingsPage, SetupPage } from './pages';


function App() {
    const Router = Capacitor.isNativePlatform() ? HashRouter : BrowserRouter;
    const routerProps = Capacitor.isNativePlatform() ? {} : { basename: import.meta.env.BASE_URL };

    return <AppTheme><AuthProvider><Router {...routerProps}><Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/play" element={<PlayPage />} />
            <Route path="/setup" element={<SetupPage />} />
            <Route path="/lobby" element={<MultiplayerSetupPage />} />
            <Route path="/reveal" element={<RevealPage />} />
            <Route path="/game" element={<GamePage />} />
            <Route path="/results" element={<ResultsPage />} />
            <Route path="/friends" element={<RequireSession><FriendsPage /></RequireSession>} />
            <Route path="/account" element={<AccountPage />} />
            <Route path="/profile" element={<RequireSession><ProfilePage /></RequireSession>} />
            <Route path="/settings" element={<SettingsPage />} />
        </Route>
    </Routes></Router></AuthProvider></AppTheme>;
}

export default App;
