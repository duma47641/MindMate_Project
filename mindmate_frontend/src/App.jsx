import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Chat from './pages/Chat';
// 1. උඩින්ම පේජ් එක Import කරගන්න මචං:
import AdminDashboard from './pages/AdminDashboard';

document.title = "MindMate | AI Mental Health Support";

function App() {
  // 🔐 යූසර් ලොග් වෙලාද නැද්ද කියලා බැලීමට (Protected Route Logic)
  const isAuthenticated = () => {
    return localStorage.getItem('token') !== null;
  };

  return (
    <Router>
      <Routes>
        {/* 🔐 Authentication Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* 🧠 Core Chat Route - ලොග් වෙලා නැත්නම් ඔටෝම ලොගින් පේජ් එකට හරවා යවයි */}
        <Route 
          path="/chat" 
          element={isAuthenticated() ? <Chat /> : <Navigate to="/login" />} 
        />

        {/* 🔀 Default Route - ඇප් එකට ආපු ගමන් කෙලින්ම ලොගින් පේජ් එකට යැවීම */}
        <Route path="*" element={<Navigate to="/login" />} />

          <Route 
            path="/admin-dashboard" 
            element={isAuthenticated() && localStorage.getItem('role') === 'Admin' ? <AdminDashboard /> : <Navigate to="/login" />} />


      </Routes>
    </Router>
  );
}

export default App;