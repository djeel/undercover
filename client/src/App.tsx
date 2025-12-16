import { BrowserRouter, Routes, Route } from 'react-router-dom';

import {
    HomePage,
    SetupPage,
    RevealPage,
    GamePage,
    ResultsPage,
    HistoryPage,
} from './pages';

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/setup" element={<SetupPage />} />
                <Route path="/reveal" element={<RevealPage />} />
                <Route path="/game" element={<GamePage />} />
                <Route path="/results" element={<ResultsPage />} />
                <Route path="/history" element={<HistoryPage />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
