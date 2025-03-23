import { useState } from 'react'
import React from 'react';
import Dashboard from './pages/Dashboard';
import NotesDetailsPage from './pages/NotesDetailsPage';
import Sidebar from './components/Sidebar';
import SignIn from './pages/SignIn';
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import NotesPage from './pages/NotesPage';
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
    </Routes>
  </Router>
  );
};

export default App;
