import { BrowserRouter, Routes, Route } from 'react-router-dom';

import {
    HomePage,
    SetupPage,
    RevealPage,
    GamePage,
    ResultsPage,
    MultiplayerSetupPage,
} from './pages';

function App() {
    return (
        <BrowserRouter basename="/undercover/">
            <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/setup" element={<SetupPage />} />
                <Route path="/lobby" element={<MultiplayerSetupPage />} />
                <Route path="/reveal" element={<RevealPage />} />
                <Route path="/game" element={<GamePage />} />
                <Route path="/results" element={<ResultsPage />} />

            </Routes>
        </BrowserRouter>
    );
}

export default App;
