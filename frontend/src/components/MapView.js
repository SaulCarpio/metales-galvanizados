import React, { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import axios from 'axios';

const API_BASE_URL = 'http://192.168.0.21:8080';

const MapView = ({ initialCoord = null }) => {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersLayer = useRef(null);
  const routeLayer = useRef(null);
  
  // Estado para gestionar múltiples puntos de ruta
  const [waypoints, setWaypoints] = useState([]);
  const [isAddingPoints, setIsAddingPoints] = useState(false); // Para alternar modo de agregar puntos

  // Estado para retroalimentación de la UI
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);

  // Icono personalizado de punto rojo para marcadores
  const redDotIcon = L.divIcon({
    className: 'custom-marker',
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });

  // Efecto para inicializar el mapa
  useEffect(() => {
    if (mapInstance.current) return;

    const startCoord = initialCoord || [-16.5, -68.189];
    mapInstance.current = L.map(mapRef.current).setView(startCoord, 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapInstance.current);

    markersLayer.current = L.layerGroup().addTo(mapInstance.current);

    // Si se proporciona una coordenada inicial, agregarla como primer punto de ruta
    if (initialCoord) {
      const latlng = L.latLng(initialCoord[0], initialCoord[1]);
      setWaypoints([latlng]);
    }

    // Agregar manejador de clics al mapa
    mapInstance.current.on('click', handleMapClick);

    return () => {
      mapInstance.current?.remove();
      mapInstance.current = null;
    };
  }, [initialCoord]);


  // Efecto para actualizar marcadores cuando cambian los puntos de ruta
  useEffect(() => {
    if (!markersLayer.current) return;
    
    // Limpiar marcadores existentes
    markersLayer.current.clearLayers();

    // Agregar un marcador para cada punto de ruta
    waypoints.forEach(point => {
      L.marker(point, { icon: redDotIcon }).addTo(markersLayer.current);
    });
  }, [waypoints, redDotIcon]);


  // Maneja los clics en el mapa para agregar nuevos puntos de ruta
  const handleMapClick = (e) => {
    if (isAddingPoints) {
      setWaypoints(prevWaypoints => [...prevWaypoints, e.latlng]);
    }
  };

  // Alterna el modo para agregar puntos
  const toggleAddPointsMode = () => {
    setIsAddingPoints(!isAddingPoints);
  };

  // Reinicia todos los puntos de ruta y la ruta
  const clearTrip = () => {
    // Mantener solo el primer punto si existe
    if (initialCoord) {
        setWaypoints([L.latLng(initialCoord[0], initialCoord[1])]);
    } else {
        setWaypoints([]);
    }

    if (routeLayer.current) {
      routeLayer.current.remove();
    }
    setRouteInfo(null);
    setError(null);
  };


  // Función para encontrar la ruta óptima
  const findOptimalRoute = async () => {
    if (waypoints.length < 2) {
      setError("Por favor agrega al menos dos puntos para calcular una ruta.");
      return;
    }
    setLoading(true);
    setError(null);
    setRouteInfo(null);
    setIsAddingPoints(false); // Deshabilitar modo de agregar puntos

    const startTime = performance.now();

    // Preparar datos para la API
    const waypointsPayload = waypoints.map(wp => [wp.lat, wp.lng]);

    try {
      // IMPORTANTE: El backend en este endpoint debe poder manejar una lista de puntos de ruta
      // y devolver las coordenadas para la ruta optimizada (TSP).
      const response = await axios.post(`${API_BASE_URL}/api/find-route`, {
        waypoints: waypointsPayload,
      });

      const latency = Math.round(performance.now() - startTime);

      if (!response.data.success) {
        throw new Error(response.data.message || 'La respuesta del servidor no fue exitosa');
      }

      const rawCoords = response.data.route.coordinates;

      if (!rawCoords || rawCoords.length === 0) {
        throw new Error('No se encontraron coordenadas para la ruta');
      }

      const routeCoords = rawCoords.map(coord => [coord[0], coord[1]]);

      if (routeLayer.current) {
        routeLayer.current.remove();
      }

      routeLayer.current = L.polyline(routeCoords, {
        color: 'blue',
        weight: 4,
      }).addTo(mapInstance.current);

      mapInstance.current.fitBounds(routeLayer.current.getBounds(), { padding: [50, 50] });

      const distanceKm = (response.data.route.distance_meters / 1000).toFixed(2);
      const timeMin = Math.round(response.data.route.predicted_time_min);

      setRouteInfo({
        distance: distanceKm,
        time: timeMin,
        latency: latency,
        stops: waypoints.length,
      });

    } catch (err) {
      console.error(err);
      const serverMessage = err.response?.data?.message;
      setError(serverMessage || err.message || 'Error al encontrar la ruta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%' }}>
      <div ref={mapRef} style={{ height: '100%', width: '100%', cursor: isAddingPoints ? 'crosshair' : 'grab' }}></div>
      
      {/* --- Controles de UI --- */}
      <div className="map-controls">
        <button 
          className={`btn ${isAddingPoints ? 'btn-active' : 'btn-primary'}`} 
          onClick={toggleAddPointsMode}
        >
          {isAddingPoints ? 'Dejar de Agregar Puntos' : 'Agregar Punto de Ruta'}
        </button>
        <button 
          className="btn btn-secondary" 
          onClick={findOptimalRoute}
          disabled={waypoints.length < 2 || loading}
        >
          Calcular Ruta Óptima
        </button>
        <button 
          className="btn btn-danger" 
          onClick={clearTrip}
          disabled={loading}
        >
          Limpiar
        </button>
      </div>


      {/* --- Panel de Información de Ruta --- */}
      {routeInfo && (
        <div className="route-info-panel">
          <h3>📍 Información del Viaje</h3>
          <div className="info-row">
            <span className="info-label">Paradas Totales:</span>
            <span className="info-value">{routeInfo.stops}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Distancia:</span>
            <span className="info-value">{routeInfo.distance} km</span>
          </div>
          <div className="info-row">
            <span className="info-label">⏱️ Tiempo Estimado:</span>
            <span className="info-value">{routeInfo.time} min</span>
          </div>
          <div className="info-row">
            <span className="info-label">📡 Latencia Total:</span>
            <span className="info-value">{routeInfo.latency} ms</span>
          </div>
        </div>
      )}

      {error && (
        <div className="map-error">
          <p>❌ {error}</p>
        </div>
      )}

      {loading && (
        <div className="map-loading">
          <div className="spinner"></div>
          <p>🔍 Buscando la mejor ruta...</p>
        </div>
      )}

      <style jsx>{`
        .custom-marker {
          background-color: red;
          border: 2px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 5px rgba(0,0,0,0.3);
        }

        .map-controls {
            position: absolute;
            top: 10px;
            left: 10px;
            background: rgba(255, 255, 255, 0.95);
            padding: 10px;
            border-radius: 8px;
            z-index: 1000;
            display: flex;
            gap: 10px;
        }

        .btn {
          padding: 10px 15px;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          font-weight: bold;
        }

        .btn:disabled {
            background-color: #ccc;
            cursor: not-allowed;
        }

        .btn-primary { background: #007bff; color: white; }
        .btn-active { background: #28a745; color: white; }
        .btn-secondary { background: #6c757d; color: white; }
        .btn-danger { background: #dc3545; color: white; }


        .route-info-panel {
          position: absolute;
          top: 10px;
          right: 10px;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          padding: 15px;
          border-radius: 10px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.2);
          min-width: 280px;
          z-index: 1000;
        }

        .route-info-panel h3 {
          margin: 0 0 15px 0;
          font-size: 16px;
          color: #333;
          border-bottom: 2px solid #4CAF50;
          padding-bottom: 8px;
        }

        .info-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #eee;
        }

        .info-row:last-child {
          border-bottom: none;
        }

        .info-label {
          font-weight: 500;
          color: #666;
        }

        .info-value {
          font-weight: bold;
          color: #2196F3;
        }

        .map-error {
          position: absolute;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          background: #f44336;
          color: white;
          padding: 15px 25px;
          border-radius: 5px;
          box-shadow: 0 4px 10px rgba(0,0,0,0.2);
          z-index: 1000;
        }

        .map-loading {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: rgba(255, 255, 255, 0.95);
          padding: 30px;
          border-radius: 10px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.2);
          text-align: center;
          z-index: 1000;
        }

        .spinner {
          border: 4px solid #f3f3f3;
          border-top: 4px solid #2196F3;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
          margin: 0 auto 15px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default MapView;