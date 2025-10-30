import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardAPI } from '../utils/api';
import UserCrud from './UserCrud';
import MapView from './MapView';
import './Dashboard.css';

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('inicio');
  const [openModule, setOpenModule] = useState(null);
  const navigate = useNavigate();
  
  // Obtiene el rol del localStorage, si no existe, asume 'usuario'
  // Nota: Si usaras AuthContext, esta línea se eliminaría y se usaría auth.role del contexto.
  const role = localStorage.getItem('role') || 'usuario'; 

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const username = localStorage.getItem('username');
      const response = await dashboardAPI.getData(username);
      
      if (response.data.success) {
        // Si la API devuelve datos, úsalos. Si no, usa un fallback para evitar errores.
        setDashboardData(response.data.data || { on_time_delivery: 95, history: [] });
      } else {
        setError('Error al cargar los datos');
        setDashboardData({ on_time_delivery: 95, history: [] }); // Fallback si la API falla pero devuelve éxito sin datos
      }
    } catch (e) {
      setError('Error de conexión con el servidor');
      console.error("Error fetching dashboard data:", e);
      setDashboardData({ on_time_delivery: 95, history: [] }); // Fallback si hay un error de red
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear(); // Limpia toda la información de autenticación
    // --- MODIFICACIÓN CLAVE ---
    // Ahora redirige explícitamente al login después de cerrar sesión
    navigate('/login', { replace: true }); 
  };

  const toggleModule = (module) => {
    setOpenModule(openModule === module ? null : module);
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
      {/* Sidebar izquierdo */}
      <aside className="sidebar">
        <h2 className="sidebar-title">Menú</h2>

        <button
          className={`sidebar-item ${activeTab === 'inicio' ? 'active' : ''}`}
          onClick={() => setActiveTab('inicio')}
        >
          🏠 Inicio
        </button>

        {/* El rol 'admin' puede ver la gestión de usuarios */}
        <button
          className={`sidebar-item ${activeTab === 'usuarios' ? 'active' : ''}`}
          onClick={() => setActiveTab('usuarios')}
          style={{ display: role === 'admin' ? 'block' : 'none' }} // Solo admin puede ver Usuarios
        >
          👥 Usuarios
        </button>

        {/* LOGÍSTICA Y DISTRIBUCIÓN es visible para todos los roles */}
        <div className="sidebar-section">
          <button className="sidebar-item" onClick={() => { toggleModule('logistica'); }}>
            🚚 Logística y Distribución
          </button>
          {openModule === 'logistica' && (
            <div className="sidebar-submenu">
              {/* Al hacer click abrimos la vista de mapa dentro del dashboard */}
              <button onClick={() => setActiveTab('map')}>Rutas</button>
            </div>
          )}
        </div>

        {/* Las demás secciones solo son visibles para el rol 'admin' */}
        <div className="sidebar-section" style={{ display: role === 'admin' ? 'block' : 'none' }}>
          <button className="sidebar-item" onClick={() => toggleModule('finanzas')}>
            💰 Finanzas y Contabilidad
          </button>
          {openModule === 'finanzas' && (
            <div className="sidebar-submenu">
              <button onClick={() => setActiveTab('cuentas')}>Gestión Cuentas</button>
              <button onClick={() => setActiveTab('presupuesto')}>Control Presupuesto</button>
            </div>
          )}
        </div>

        <div className="sidebar-section" style={{ display: role === 'admin' ? 'block' : 'none' }}>
          <button className="sidebar-item" onClick={() => toggleModule('inventario')}>
            🏭 Gestión de Inventario
          </button>
          {openModule === 'inventario' && (
            <div className="sidebar-submenu">
              <button onClick={() => setActiveTab('existencias')}>Control Existencias</button>
              <button onClick={() => setActiveTab('almacenes')}>Gestión Almacenes</button>
            </div>
          )}
        </div>

        <div className="sidebar-section" style={{ display: role === 'admin' ? 'block' : 'none' }}>
          <button className="sidebar-item" onClick={() => toggleModule('compras')}>
            🛒 Compras y Proveedores
          </button>
          {openModule === 'compras' && (
            <div className="sidebar-submenu">
              <button onClick={() => setActiveTab('ordenes')}>Órdenes de Compra</button>
              <button onClick={() => setActiveTab('precios')}>Control de Precios</button>
            </div>
          )}
        </div>

        <div className="sidebar-section" style={{ display: role === 'admin' ? 'block' : 'none' }}>
          <button className="sidebar-item" onClick={() => toggleModule('ventas')}>
            🧾 Ventas
          </button>
          {openModule === 'ventas' && (
            <div className="sidebar-submenu">
              <button onClick={() => setActiveTab('cotizaciones')}>Cotizaciones</button>
              <button onClick={() => setActiveTab('pedidos')}>Pedidos</button>
            </div>
          )}
        </div>

        <div className="sidebar-section" style={{ display: role === 'admin' ? 'block' : 'none' }}>
          <button className="sidebar-item" onClick={() => setActiveTab('reportes')}>
            📈 Reportes
          </button>
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

        {/* Renderizado condicional del contenido principal */}
        {activeTab === 'map' ? (
          <div className="map-layout">
            <div className="map-main">
              {/* singlePoint=true fuerza comportamiento de un único marcador inicial y modal */}
              <MapView singlePoint={true} initialCoord={[-16.482392, -68.242340]} />
            </div>
            <aside className="map-history">
              <h3>Historial de Viajes</h3>
              <ul className="history-list">
                {dashboardData?.history?.length ? (
                  dashboardData.history.map((h, i) => (
                    <li key={i}>
                      <div className="hist-title">{h.title}</div>
                      <div className="hist-meta">{h.date} — {h.status}</div>
                    </li>
                  ))
                ) : (
                  <>
                    <li>No hay viajes recientes</li>
                    {/* opcional: mostrar mock historial */}
                    <li>Ruta A — 2025-10-20 — Completado</li>
                    <li>Ruta B — 2025-10-18 — En curso</li>
                  </>
                )}
              </ul>
            </aside>
          </div>
        ) : activeTab === 'usuarios' && role === 'admin' ? (
          <UserCrud />
        ) : activeTab === 'inicio' ? (
          <>
            {/* Metrics Grid (mantener tu código existente) */}
            <div className="metrics-grid">
              <div className="metric-card">
                <div className="metric-icon">🚚</div>
                <div className="metric-info">
                  <h3>Entregas a tiempo</h3>
                  <div className="metric-value">{dashboardData?.on_time_delivery}%</div>
                </div>
              </div>
              {/* ...rest of metrics... */}
            </div>
            {/* ...rest of content ... */}
             {/* Contenido por defecto si no hay otra pestaña activa o para la pestaña 'inicio' */}
             <div className="placeholder">
                <h2>Inicio del Sistema</h2>
                <p>Selecciona una opción del menú para navegar.</p>
             </div>
          </>
        ) : (
          // Contenido genérico para otras pestañas que no son 'map', 'usuarios' o 'inicio'
          <div className="placeholder">
            <h2>Módulo: {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h2>
            <p>Contenido del módulo seleccionado.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;