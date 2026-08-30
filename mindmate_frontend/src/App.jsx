import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Chat from './pages/Chat';
import AdminDashboard from './pages/AdminDashboard';
import DoctorDashboard from './pages/DoctorDashboard';
import StaffDashboard from './pages/StaffDashboard'; 

document.title = "MindMate | AI Mental Health Support";

function App() {
  const isAuthenticated = () => {
    return localStorage.getItem('token') !== null;
  };

  const getUserRole = () => {
    return localStorage.getItem('role'); 
  };

  return (
    <Router>
      <Routes>
        {/*  Authentication Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/*  Patient Route */}
        <Route 
          path="/chat" 
          element={isAuthenticated() ? <Chat /> : <Navigate to="/login" />} 
        />

        {/*  Admin Route */}
        <Route 
          path="/admin-dashboard" 
          element={isAuthenticated() && getUserRole() === 'Admin' ? <AdminDashboard /> : <Navigate to="/login" />} 
        />

        {/*  Doctor Route */}
        <Route 
          path="/doctor-dashboard" 
          element={isAuthenticated() && getUserRole() === 'Doctor' ? <DoctorDashboard /> : <Navigate to="/login" />} 
        />

        {/*  Staff Route */}
        <Route 
          path="/staff-dashboard" 
          element={isAuthenticated() && getUserRole() === 'Staff' ? <StaffDashboard /> : <Navigate to="/login" />} 
        />

        {/*  Default Route */}
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App;