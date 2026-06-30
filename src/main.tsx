import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import './index.css';
import { default as MainPage } from './pages/App';
import { default as RoomsPage } from './pages/rooms/App';
import { default as RoomPage } from './pages/rooms/id/App';

createRoot(document.getElementById('root')!).render(
    <BrowserRouter>
        <Routes>
            <Route element={<MainPage />} path="/" />
            <Route element={<RoomsPage />} path="/rooms" />
            <Route element={<RoomPage />} path="/rooms/:id" />
        </Routes>
    </BrowserRouter>,
);
