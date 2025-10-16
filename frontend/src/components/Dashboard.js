import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardAPI } from '../utils/api';
import UserCrud from './UserCrud';
import './Dashboard.css';

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('inicio');
  const [openModule, setOpenModule] = useState(null);
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
    } catch {
      setError('Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const toggleModule = (module) => {
    setOpenModule(openModule === module ? null : module);
  };

  const getStatusClass = (status) =>
    status === 'A tiempo' ? 'status-on-time' : 'status-delayed';

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
      {/* Sidebar */}
      <aside className="sidebar">
        <h2 className="sidebar-title">Menú</h2>

        <button
          className={`sidebar-item ${activeTab === 'inicio' ? 'active' : ''}`}
          onClick={() => setActiveTab('inicio')}
        >
          🏠 Inicio
        </button>

        <button
          className={`sidebar-item ${activeTab === 'usuarios' ? 'active' : ''}`}
          onClick={() => setActiveTab('usuarios')}
        >
          👥 Usuarios
        </button>

        <div className="sidebar-section">
          <button 
            className="sidebar-item" 
            onClick={() => navigate('/map')}
          >
            🚗 Planificador de Rutas
          </button>
        </div>

        <div className="sidebar-section">
          <button className="sidebar-item" onClick={() => toggleModule('pedidos')}>
            📦 Pedidos
          </button>
          {openModule === 'pedidos' && (
            <div className="sidebar-submenu">
              <button onClick={() => setActiveTab('pedidos-activos')}>Activos</button>
              <button onClick={() => setActiveTab('historial-pedidos')}>Historial</button>
            </div>
          )}
        </div>

        <div className="sidebar-section">
          <button className="sidebar-item" onClick={() => toggleModule('inventario')}>
            🏭 Inventario
          </button>
          {openModule === 'inventario' && (
            <div className="sidebar-submenu">
              <button onClick={() => setActiveTab('productos')}>Productos</button>
              <button onClick={() => setActiveTab('proveedores')}>Proveedores</button>
            </div>
          )}
        </div>

        <div className="sidebar-section">
          <button className="sidebar-item" onClick={() => toggleModule('indicadores')}>
            📊 Indicadores
          </button>
          {openModule === 'indicadores' && (
            <div className="sidebar-submenu">
              <button onClick={() => setActiveTab('rendimiento')}>Rendimiento</button>
              <button onClick={() => setActiveTab('eficiencia')}>Eficiencia</button>
            </div>
          )}
        </div>

        <div className="sidebar-section">
          <button className="sidebar-item" onClick={() => toggleModule('configuracion')}>
            ⚙️ Configuración
          </button>
          {openModule === 'configuracion' && (
            <div className="sidebar-submenu">
              <button onClick={() => setActiveTab('preferencias')}>Preferencias</button>
              <button onClick={() => setActiveTab('seguridad')}>Seguridad</button>
            </div>
          )}
        </div>

        <button className="logout-button" onClick={handleLogout}>
          🚪 Cerrar sesión
        </button>
      </aside>

      {/* Contenido principal */}
      <main className="dashboard-content">
        <header className="dashboard-header">
          <h1>METALES GALVANIZADOS Y ACEROS S.R.L.</h1>
          <span className="welcome-text">
            Bienvenido, {localStorage.getItem('username')}
          </span>
        </header>

        {activeTab === 'usuarios' ? (
          <UserCrud />
        ) : activeTab === 'inicio' ? (
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
                  <h3>Consumo combustible</h3>
                  <div className="metric-value">{dashboardData.fuel_consumption} L</div>
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

            {/* Charts */}
            <div className="charts-section">
              <div className="chart-card">
                <h3>Rendimiento semanal</h3>
                <div className="bar-chart">
                  {dashboardData.weekly_performance.map((value, index) => (
                    <div key={index} className="bar-container">
                      <div className="bar" style={{ height: `${value}%` }}></div>
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

            {/* Delivery Table */}
            <div className="delivery-status-card">
              <h3>Estado de entregas</h3>
              <div className="delivery-table-container">
                <table className="delivery-table">
                  <thead>
                    <tr>
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <div className="placeholder">
            <h2>{activeTab}</h2>
            <p>Contenido del módulo seleccionado.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
