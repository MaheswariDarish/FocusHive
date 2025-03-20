import { useState } from 'react'
import React from 'react';
import Dashboard from './pages/Dashboard';
import Sidebar from './components/Sidebar';
import SignIn from './pages/SignIn';
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Notsum from './components/Notsum';

const App = () => {
  return (
    // <div>
    // <Sidebar />
    // <Dashboard /></div>
    // <Notsum></Notsum>
    // <ProfileCard></ProfileCard>
    <Router>
    <Routes>
      {/* <Route path="/" element={<SignIn />} /> */}
      <Route path="/" element={<Notsum />} />
    </Routes>
  </Router>
  );
};

export default App;
