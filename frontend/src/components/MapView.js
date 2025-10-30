import React, { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import axios from 'axios';

const API_BASE_URL = 'http://192.168.0.15:8080';

const MapView = ({ singlePoint = false, initialCoord = null }) => {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersLayer = useRef(null);
  const routeLayer = useRef(null);
  const [showModal, setShowModal] = useState(false);
  const [tripInfo, setTripInfo] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [originCoord, setOriginCoord] = useState(initialCoord);
  const [destinationCoord, setDestinationCoord] = useState(null);

  useEffect(() => {
    if (mapInstance.current) return;

    const startCoord = initialCoord || [-16.5, -68.189];
    mapInstance.current = L.map(mapRef.current).setView(startCoord, 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapInstance.current);

    markersLayer.current = L.layerGroup().addTo(mapInstance.current);

    const redDotIcon = L.divIcon({
      className: 'custom-marker',
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });

    if (initialCoord) {
      const latlng = L.latLng(initialCoord[0], initialCoord[1]);
      L.marker(latlng, { icon: redDotIcon }).addTo(markersLayer.current);
      setOriginCoord(latlng);
    }

    mapInstance.current.on('click', (e) => handleDestinationClick(e));

    return () => {
      mapInstance.current?.remove();
      mapInstance.current = null;
    };
  }, []);

  const handleDestinationClick = (e) => {
    if (!originCoord) return;
    setDestinationCoord(e.latlng);
    setShowModal(true);
  };

  const startTrip = () => {
    if (!originCoord || !destinationCoord) return;

    const redDotIcon = L.divIcon({
      className: 'custom-marker',
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });

    if (markersLayer.current.getLayers().length > 1) {
      markersLayer.current.clearLayers();
      L.marker(originCoord, { icon: redDotIcon }).addTo(markersLayer.current);
    }

    L.marker(destinationCoord, { icon: redDotIcon }).addTo(markersLayer.current);

    findRoute(originCoord, destinationCoord);

    setTripInfo({
      start: originCoord,
      destination: destinationCoord,
      startedAt: new Date().toLocaleString(),
    });

    setShowModal(false);
  };

  const findRoute = async (origin, destination) => {
    setLoading(true);
    setError(null);
    setRouteInfo(null);

    const startTime = performance.now(); // ⏱️ Iniciar contador

    const originPayload = [origin.lat, origin.lng];
    const destinationPayload = [destination.lat, destination.lng];

    try {
      const response = await axios.post(`${API_BASE_URL}/api/find-route`, {
        origin: originPayload,
        destination: destinationPayload,
      });

      const latency = Math.round(performance.now() - startTime); // ⏱️ Calcular latencia

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

      // 📊 Guardar información de la ruta
      const distanceKm = (response.data.route.distance_meters / 1000).toFixed(2);
      const timeMin = Math.round(response.data.route.predicted_time_min);
      const serverLatency = response.data.processing_time_ms || 0;

      setRouteInfo({
        distance: distanceKm,
        time: timeMin,
        latency: latency,
        serverProcessing: serverLatency
      });

    } catch (err) {
      console.error(err);
      const serverMessage = err.response?.data?.message;
      setError(serverMessage || err.message || 'Error al buscar ruta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%' }}>
      <div ref={mapRef} style={{ height: '100%', width: '100%' }}></div>

      {/* 📊 Panel de información de la ruta */}
      {routeInfo && (
        <div className="route-info-panel">
          <h3>📍 Información del Viaje</h3>
          <div className="info-row">
            <span className="info-label">Distancia:</span>
            <span className="info-value">{routeInfo.distance} km</span>
          </div>
          <div className="info-row">
            <span className="info-label">⏱️ Tiempo estimado:</span>
            <span className="info-value">{routeInfo.time} min</span>
          </div>
          <div className="info-row">
            <span className="info-label">📡 Latencia total:</span>
            <span className="info-value">{routeInfo.latency} ms</span>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3>¿Quieres iniciar viaje?</h3>
            <p>Origen: {originCoord?.lat.toFixed(5)}, {originCoord?.lng.toFixed(5)}</p>
            <p>Destino: {destinationCoord?.lat.toFixed(5)}, {destinationCoord?.lng.toFixed(5)}</p>
            <div className="modal-actions">
              <button className="btn btn-primary" onClick={startTrip}>Sí</button>
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>No</button>
            </div>
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
          <p>🔍 Buscando mejor ruta...</p>
        </div>
      )}

      <style jsx>{`
        .custom-marker {
          background-color: red;
          border: 2px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 5px rgba(0,0,0,0.3);
        }

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

        .modal-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 2000;
        }

        .modal-card {
          background: white;
          padding: 25px;
          border-radius: 10px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.3);
          max-width: 400px;
        }

        .modal-card h3 {
          margin: 0 0 15px 0;
        }

        .modal-actions {
          display: flex;
          gap: 10px;
          margin-top: 20px;
        }

        .btn {
          padding: 10px 20px;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          flex: 1;
          font-weight: bold;
        }

        .btn-primary {
          background: #4CAF50;
          color: white;
        }

        .btn-secondary {
          background: #f44336;
          color: white;
        }

        .map-error {
          position: absolute;
          top: 10px;
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