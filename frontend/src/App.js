
import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import MapView from './components/MapView';
import AccessDenied from './components/AccessDenied';
import './App.css';

function App() {
  const [authState, setAuthState] = useState({
    isAuthenticated: localStorage.getItem('isAuthenticated') === 'true',
    role: localStorage.getItem('role')
  });

  useEffect(() => {
    const handleStorage = () => {
      setAuthState({
        isAuthenticated: localStorage.getItem('isAuthenticated') === 'true',
        role: localStorage.getItem('role')
      });
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // También actualiza tras login en la misma pestaña
  useEffect(() => {
    const interval = setInterval(() => {
      setAuthState({
        isAuthenticated: localStorage.getItem('isAuthenticated') === 'true',
        role: localStorage.getItem('role')
      });
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const { isAuthenticated, role } = authState;

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route 
            path="/dashboard" 
            element={
              isAuthenticated && role === 'admin'
                ? <Dashboard />
                : <AccessDenied />
            }
          />
          <Route 
            path="/map" 
            element={
              isAuthenticated && role === 'usuario'
                ? <MapView />
                : <AccessDenied />
            }
          />
          <Route 
            path="/"
            element={
              isAuthenticated
                ? (role === 'admin' ? <Navigate to="/dashboard" replace /> : <Navigate to="/map" replace />)
                : <Navigate to="/login" replace />
            }
          />
          <Route path="*" element={<AccessDenied />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;