import React from 'react';
import { useNavigate } from 'react-router-dom';

const MapView = () => {
  const username = localStorage.getItem('username');
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('username');
    localStorage.removeItem('role');
    navigate('/login');
  };

  return (
    <div style={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start' }}>
      <div style={{ width: '100%', padding: '20px', background: '#3498db', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Bienvenido, {username}</span>
        <button onClick={handleLogout} style={{ background: '#e74c3c', color: 'white', border: 'none', borderRadius: '6px', padding: '8px 16px', cursor: 'pointer', fontWeight: 'bold' }}>Cerrar sesión</button>
      </div>
      <iframe
        title="OpenStreetMap"
        width="100%"
        height="500"
        frameBorder="0"
        src="https://www.openstreetmap.org/export/embed.html"
        style={{ border: 0 }}
        allowFullScreen
      ></iframe>
    </div>
  );
};

export default MapView;
