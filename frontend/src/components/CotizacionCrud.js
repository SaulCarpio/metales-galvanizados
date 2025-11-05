import React, { useEffect, useState } from 'react';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://192.168.0.24:8080';

const emptyForm = { cliente_id: '', nombre_cliente: '', producto: '', color: '', fecha_expiracion: '', precio_unitario: '', cantidad: '', estado: 'emitida' };

const Cotizaciones = () => {
  const [list, setList] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetch = async () => {
    setLoading(true);
    try {
      const r = await axios.get(`${API_BASE}/api/cotizaciones`);
      setList(r.data.cotizaciones || []);
    } catch (e) {
      console.error(e);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, []);

  const save = async () => {
    try {
      if (editingId) {
        await axios.put(`${API_BASE}/api/cotizaciones/${editingId}`, form);
      } else {
        await axios.post(`${API_BASE}/api/cotizaciones`, form);
      }
      setForm(emptyForm); setEditingId(null); fetch();
    } catch (e) { console.error(e); }
  };

  const edit = (c) => {
    setEditingId(c.id);
    setForm({
      cliente_id: c.cliente_id || '',
      nombre_cliente: c.nombre_cliente || '',
      producto: c.producto || '',
      color: c.color || '',
      fecha_expiracion: c.fecha_expiracion || '',
      precio_unitario: c.precio_unitario || '',
      cantidad: c.cantidad || '',
      estado: c.estado || 'emitida'
    });
  };

  const remove = async (id) => {
    if (!window.confirm('Eliminar cotización?')) return;
    await axios.delete(`${API_BASE}/api/cotizaciones/${id}`);
    fetch();
  };

  return (
    <div>
      <h2>Cotizaciones</h2>
      <div style={{display:'flex',gap:12}}>
        <div style={{flex:1}}>
          <h4>{editingId ? 'Editar' : 'Nueva Cotización'}</h4>
          <input placeholder="Nombre cliente" value={form.nombre_cliente} onChange={e=>setForm({...form,nombre_cliente:e.target.value})} />
          <input placeholder="Producto" value={form.producto} onChange={e=>setForm({...form,producto:e.target.value})} />
          <input placeholder="Color" value={form.color} onChange={e=>setForm({...form,color:e.target.value})} />
          <input placeholder="Precio unitario" value={form.precio_unitario} onChange={e=>setForm({...form,precio_unitario:e.target.value})} />
          <input placeholder="Cantidad" value={form.cantidad} onChange={e=>setForm({...form,cantidad:e.target.value})} />
          <input type="date" value={form.fecha_expiracion} onChange={e=>setForm({...form,fecha_expiracion:e.target.value})} />
          <div style={{marginTop:8}}>
            <button onClick={save}>{editingId ? 'Actualizar' : 'Crear'}</button>
            <button onClick={()=>{setForm(emptyForm); setEditingId(null);}}>Cancelar</button>
          </div>
        </div>

        <div style={{flex:2}}>
          <h4>Lista</h4>
          {loading ? <p>Cargando...</p> : (
            <table style={{width:'100%'}}>
              <thead><tr><th>ID</th><th>Cliente</th><th>Producto</th><th>Cant.</th><th>Precio</th><th>Estado</th><th>Acción</th></tr></thead>
              <tbody>
                {list.map(c=>(
                  <tr key={c.id}>
                    <td>{c.id}</td>
                    <td>{c.nombre_cliente}</td>
                    <td>{c.producto}</td>
                    <td>{c.cantidad}</td>
                    <td>{c.precio_unitario}</td>
                    <td>{c.estado}</td>
                    <td>
                      <button onClick={()=>edit(c)}>Editar</button>
                      <button onClick={()=>remove(c.id)}>Eliminar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default Cotizaciones;