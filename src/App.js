// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import LandingPage from './pages/LandingPage';
import ExerciseList from './pages/ExerciseList';
import ExerciseCamera from './pages/ExerciseCamera';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/exercises" element={<ExerciseList />} />
        <Route path="/exercise/:name" element={<ExerciseCamera />} />
      </Routes>
    </Router>
  );
}

export default App;
