import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import './index.css';
import { default as MainPage } from './pages/App';
import { default as GamePage } from './pages/game/App';
import { default as RoomsPage } from './pages/rooms/App';

createRoot(document.getElementById('root')!).render(
    <BrowserRouter>
        <Routes>
            <Route element={<MainPage />} path="/" />
            <Route element={<GamePage />} path="/game" />
            <Route element={<RoomsPage />} path="/rooms" />
        </Routes>
    </BrowserRouter>,
);
