import { useState } from 'react'
import React from 'react';
import Dashboard from './pages/Dashboard';

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
    </Routes>
  </Router>
  );
};

export default App;
