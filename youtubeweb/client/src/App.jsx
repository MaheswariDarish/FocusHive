import { useState } from 'react'
import React from 'react';
import Dashboard from './pages/Dashboard';
import NotesDetailsPage from './pages/NotesDetailsPage';
import Sidebar from './components/Sidebar';
import SignIn from './pages/SignIn';
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import NotesPage from './pages/NotesPage';
import WatchHistory from './pages/Analytics';
const App = () => {
  return (
    // <div>
    // <Sidebar />
    // <Dashboard /></div>
    <Router>
    <Routes>
      <Route path="/" element={<SignIn />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/notes" element={<NotesPage />} />
      <Route path="/notes/:videoId" element={<NotesDetailsPage />} />
      <Route path="/analytics" element={<WatchHistory />} />
    </Routes>
  </Router>
  );
};

export default App;
