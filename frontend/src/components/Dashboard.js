import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardAPI, authAPI } from '../utils/api';
import UserCrud from './UserCrud';
import './Dashboard.css';

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('inicio');
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const username = localStorage.getItem('username');
      const response = await dashboardAPI.getData(username);
      if (response.data.success && response.data.data) {
        setDashboardData(response.data.data);
      } else {
        setError('Error al cargar los datos');
      }
    } catch (error) {
      setError('Error de conexión con el servidor');
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

  const getStatusClass = (status) => {
    return status === 'A tiempo' ? 'status-on-time' : 'status-delayed';
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Cargando datos del dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <div className="error-icon">⚠️</div>
        <h3>Error al cargar el dashboard</h3>
        <p>{error}</p>
        <button onClick={fetchDashboardData} className="retry-button">
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-content">
          <h1>METALES GALVANIZADOS Y ACEROS S.R.L.</h1>
          <div className="header-actions">
            <span className="welcome-text">
              Bienvenido, {localStorage.getItem('username')}
            </span>
            <button onClick={handleLogout} className="logout-button">
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>
      <nav className="dashboard-nav">
        <a href="#inicio" className={`nav-item${activeTab === 'inicio' ? ' active' : ''}`} onClick={() => setActiveTab('inicio')}>Inicio</a>
        <a href="#usuarios" className={`nav-item${activeTab === 'usuarios' ? ' active' : ''}`} onClick={() => setActiveTab('usuarios')}>Usuarios</a>
        <a href="#rutas" className={`nav-item${activeTab === 'rutas' ? ' active' : ''}`} onClick={() => setActiveTab('rutas')}>Rutas</a>
        <a href="#pedidos" className="nav-item">Pedidos</a>
        <a href="#inventario" className="nav-item">Inventario</a>
        <a href="#indicadores" className="nav-item">Indicadores (KPIs)</a>
        <a href="#configuracion" className="nav-item">Configuración</a>
      </nav>
      {/* Main Content */}
      <main className="dashboard-content">
        {activeTab === 'usuarios' ? (
          <UserCrud />
        ) : (
          <>
            {/* Metrics Grid */}
            <div className="metrics-grid">
              <div className="metric-card">
                <div className="metric-icon">🚚</div>
                <div className="metric-info">
                  <h3>Entregas a tiempo</h3>
                  <div className="metric-value">{dashboardData.on_time_delivery}%</div>
                </div>
              </div>
              <div className="metric-card">
                <div className="metric-icon">⏱️</div>
                <div className="metric-info">
                  <h3>Promedio de entrega</h3>
                  <div className="metric-value">{dashboardData.avg_delivery_time} min</div>
                </div>
              </div>
              <div className="metric-card">
                <div className="metric-icon">⛽</div>
                <div className="metric-info">
                  <h3>Consumo de combustible</h3>
                  <div className="metric-value">{dashboardData.fuel_consumption}L</div>
                </div>
              </div>
              <div className="metric-card">
                <div className="metric-icon">📊</div>
                <div className="metric-info">
                  <h3>Kilometraje por ruta</h3>
                  <div className="metric-value">{dashboardData.mileage_per_route} km</div>
                </div>
              </div>
            </div>
            {/* Charts Section */}
            <div className="charts-section">
              <div className="chart-card">
                <h3>Rendimiento semanal</h3>
                <div className="bar-chart">
                  {dashboardData.weekly_performance.map((value, index) => (
                    <div key={index} className="bar-container">
                      <div 
                        className="bar" 
                        style={{ height: `${value}%` }}
                        title={`${value}%`}
                      ></div>
                      <span className="bar-label">
                        {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'][index]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="chart-card">
                <h3>Comparación de rutas</h3>
                <div className="routes-comparison">
                  {dashboardData.route_comparison.map((route, index) => (
                    <div key={index} className="route-item">
                      <span className="route-name">{route.name}</span>
                      <div className="efficiency-bar">
                        <div 
                          className="efficiency-fill"
                          style={{ width: `${route.efficiency}%` }}
                        ></div>
                      </div>
                      <span className="efficiency-value">{route.efficiency}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {/* Delivery Status */}
            <div className="delivery-status-card">
              <h3>Estado de entregas</h3>
              <div className="delivery-table-container">
                <table className="delivery-table">
                  <thead>
                    <tr>
                      <th>Ruta</th>
                      <th>Estado</th>
                      <th>Hora</th>
                      <th>Ruta</th>
                      <th>Estado</th>
                      <th>Hora</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardData.delivery_status.map((delivery, index) => (
                      <tr key={index}>
                        <td>{delivery.route}</td>
                        <td>
                          <span className={getStatusClass(delivery.status)}>
                            {delivery.status}
                          </span>
                        </td>
                        <td>{delivery.time}</td>
                        {/* Segunda columna con datos similares */}
                        <td>{delivery.route}</td>
                        <td>
                          <span className={getStatusClass(delivery.status)}>
                            {delivery.status}
                          </span>
                        </td>
                        <td>{delivery.time}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default Dashboard;