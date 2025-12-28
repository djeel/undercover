import { BrowserRouter, HashRouter, Routes, Route } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';

import {
    HomePage,
    SetupPage,
    RevealPage,
    GamePage,
    ResultsPage,
    MultiplayerSetupPage,
} from './pages';

function App() {
    const isMobile = Capacitor.isNativePlatform();
    // Mobile apps generally use HashRouter to handle file:// protocols correctly
    // Web app uses BrowserRouter with the /undercover/ basename
    const Router = isMobile ? HashRouter : BrowserRouter;
    const routerProps = isMobile ? {} : { basename: "/undercover/" };

    return (
        <Router {...routerProps}>
            <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/setup" element={<SetupPage />} />
                <Route path="/lobby" element={<MultiplayerSetupPage />} />
                <Route path="/reveal" element={<RevealPage />} />
                <Route path="/game" element={<GamePage />} />
                <Route path="/results" element={<ResultsPage />} />
            </Routes>
        </Router>
    );
}

export default App;
