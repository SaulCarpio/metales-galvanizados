import React from 'react';
import './Reportes.css';

const Reportes = () => {
  return (
    <div className="reportes-container">
      <h2>Generador de Reportes</h2>
      <p>Seleccione los filtros para generar un nuevo reporte.</p>
      
      <div className="report-filters">
        <div className="filter-group">
          <label htmlFor="report-type">Tipo de Reporte</label>
          <select id="report-type" className="form-select">
            <option>Reporte de Ventas</option>
            <option>Reporte de Inventario</option>
            <option>Reporte de Clientes</option>
            <option>Reporte de Rutas</option>
          </select>
        </div>
        
        <div className="filter-group">
          <label htmlFor="start-date">Fecha de Inicio</label>
          <input type="date" id="start-date" className="form-input" />
        </div>
        
        <div className="filter-group">
          <label htmlFor="end-date">Fecha de Fin</label>
          <input type="date" id="end-date" className="form-input" />
        </div>
      </div>
      
      <div className="report-actions">
        <button className="btn-generar">Generar Reporte</button>
      </div>
    </div>
  );
};

export default Reportes;