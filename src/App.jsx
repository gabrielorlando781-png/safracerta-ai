// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import SatellitePage from './pages/Satellite';

const App = () => {
    return (
        <Router>
            <Routes>
                <Route path="/satellite" element={<SatellitePage />} />
                <Route path="*" element={<Navigate to="/satellite" replace />} />
            </Routes>
        </Router>
    );
};

export default App;
