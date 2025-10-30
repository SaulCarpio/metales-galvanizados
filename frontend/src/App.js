import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Importa los componentes de página
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import MapView from './components/MapView';
import AccessDenied from './components/AccessDenied';
import ForgotPassword from './components/ForgotPassword';
import ProtectedRoute from './components/ProtectedRoute';

import './App.css';

// Componente para manejar la redirección inicial del usuario logueado
const InitialRedirect = () => {
  const { auth } = useAuth();
  
  // Si está autenticado, redirige a /dashboard.
  // El Dashboard ya tiene la lógica para mostrar el contenido correcto según el rol.
  return auth.isAuthenticated 
    ? <Navigate to="/dashboard" replace /> 
    : <Navigate to="/login" replace />;
};

function App() {
  return (
    // 1. Envolvemos la App en el AuthProvider
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            {/* --- RUTAS PÚBLICAS --- */}
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/access-denied" element={<AccessDenied />} />

            {/* --- RUTAS PROTEGIDAS --- */}
            {/* Todas las rutas anidadas aquí requerirán autenticación */}
            <Route element={<ProtectedRoute />}>
              <Route 
                path="/dashboard" 
                element={<Dashboard />} 
              />
              {/* Si MapView es una página completamente separada, puedes definirla así: */}
              <Route 
                path="/map" 
                element={<MapView />} 
              />
              {/* Si solo el admin pudiera acceder a una ruta, sería así:
              <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
                  <Route path="/admin-only" element={<AdminPanel />} />
              </Route>
              */}
            </Route>

            {/* --- REDIRECCIONES Y RUTAS POR DEFECTO --- */}
            {/* La ruta raíz decidirá a dónde enviar al usuario */}
            <Route path="/" element={<InitialRedirect />} />
            
            {/* Cualquier otra ruta no encontrada redirige a la raíz */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;