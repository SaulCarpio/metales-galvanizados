import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const API_BASE_URL = 'http://192.168.0.24:8080';

const MapView = () => {
  const navigate = useNavigate();
  const username = localStorage.getItem('username');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const routeLayer = useRef(null);
  const markersLayer = useRef(null);

  useEffect(() => {
    // Inicializar mapa centrado en El Alto
    mapInstance.current = L.map(mapRef.current).setView([-16.5, -68.189], 13);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapInstance.current);
    
    markersLayer.current = L.layerGroup().addTo(mapInstance.current);
    
    // Permitir seleccionar puntos en el mapa
    let points = [];
    mapInstance.current.on('click', (e) => {
      if (points.length >= 2) {
        points = [];
        markersLayer.current.clearLayers();
        if (routeLayer.current) {
          routeLayer.current.remove();
        }
      }
      
      points.push([e.latlng.lat, e.latlng.lng]);
      L.marker(e.latlng).addTo(markersLayer.current);

      if (points.length === 2) {
        findRoute(points[0], points[1]);
      }
    });

    return () => mapInstance.current.remove();
  }, []);

  const findRoute = async (origin, destination) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/find-route`, {
        origin,
        destination
      }, {
        timeout: 60000, // Aumentar timeout a 60 segundos
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (!response.data) {
        throw new Error('No se recibió respuesta del servidor');
      }

      if (!response.data.success) {
        throw new Error(response.data.message || 'Error al procesar la ruta');
      }

      // Dibujar ruta
      if (routeLayer.current) {
        routeLayer.current.remove();
      }
      
      if (!response.data.route?.coordinates?.length) {
        throw new Error('No se encontraron coordenadas para la ruta');
      }

      routeLayer.current = L.polyline(response.data.route.coordinates, {
        color: 'blue',
        weight: 4
      }).addTo(mapInstance.current);

      // Mostrar info
      setRouteInfo({
        distance: (response.data.route.distance_meters / 1000).toFixed(2),
        predictedTime: response.data.route.predicted_time_min.toFixed(2),
        processingTime: response.data.processing_time_ms
      });

      // Ajustar vista
      mapInstance.current.fitBounds(routeLayer.current.getBounds());

    } catch (err) {
      console.error('Error detallado:', err);
      let errorMessage = 'Error al buscar ruta. ';
      
      if (err.response) {
        // Error de respuesta del servidor
        console.error('Error del servidor:', err.response.data);
        errorMessage += err.response.data.message || 
                       `Error ${err.response.status}: ${err.response.statusText}`;
      } else if (err.request) {
        // Error de conexión
        errorMessage += 'No se pudo conectar con el servidor. Verifique su conexión.';
      } else {
        // Otro tipo de error
        errorMessage += err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('username');
    localStorage.removeItem('role');
    navigate('/login');
  };

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ 
        padding: '10px 20px',
        background: '#3498db',
        color: 'white',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <span style={{ marginRight: '20px' }}>Bienvenido, {username}</span>
          {routeInfo && (
            <span>
              Distancia: {routeInfo.distance} km | 
              Tiempo estimado: {routeInfo.predictedTime} min |
              Tiempo de búsqueda: {routeInfo.processingTime} ms
            </span>
          )}
        </div>
        <button onClick={handleLogout} style={{
          background: '#e74c3c',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          padding: '8px 16px',
          cursor: 'pointer'
        }}>
          Cerrar sesión
        </button>
      </div>
      
      {error && (
        <div style={{
          padding: '10px',
          background: '#f8d7da',
          color: '#721c24',
          textAlign: 'center'
        }}>
          {error}
        </div>
      )}
      
      {loading && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(255,255,255,0.8)',
          padding: '20px',
          borderRadius: '8px',
          zIndex: 1000
        }}>
          Buscando mejor ruta...
        </div>
      )}
      
      <div ref={mapRef} style={{ flex: 1 }}></div>
    </div>
  );
};

export default MapView;
