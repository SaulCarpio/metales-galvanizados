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
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', margin: 0, padding: 0 }}>
      <div style={{ width: '100%', padding: '20px', background: '#3498db', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flex: '0 0 auto' }}>
        <span>Bienvenido, {username}</span>
        <button onClick={handleLogout} style={{ background: '#e74c3c', color: 'white', border: 'none', borderRadius: '6px', padding: '5px 12px', cursor: 'pointer', fontWeight: '600', fontSize: '0.97rem', minWidth: '80px', maxWidth: '120px' }}>Cerrar sesión</button>
      </div>
      <div style={{ flex: 1, width: '100%', height: '100%', minHeight: 0 }}>
        <iframe
          title="OpenStreetMap"
          width="100%"
          height="100%"
          frameBorder="0"
          src="https://www.openstreetmap.org/export/embed.html?bbox=-70.0,-23.0,-57.0,-9.0&layer=mapnik"
          style={{ border: 0, width: '100%', height: '100%' }}
          allowFullScreen
        ></iframe>
      </div>
    </div>
  );
};

export default MapView;
