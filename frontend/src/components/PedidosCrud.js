import React, { useEffect, useState } from 'react';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://192.168.0.24:8080';

const Pedidos = () => {
  const [list, setList] = useState([]);
  const [detalles, setDetalles] = useState([]);
  const [clienteId, setClienteId] = useState('');
  const [loading, setLoading] = useState(false);

  const fetch = async () => {
    setLoading(true);
    try {
      const r = await axios.get(`${API_BASE}/api/pedidos`);
      setList(r.data.pedidos || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(()=>{ fetch(); }, []);

  const addDetalle = () => setDetalles(d=>[...d, {producto_id:'', cantidad:1, subtotal:0}]);
  const updateDetalle = (i, key, val) => setDetalles(d=>d.map((it,idx)=> idx===i ? {...it, [key]: val} : it));

  const savePedido = async () => {
    const total = detalles.reduce((s,d)=> s + (Number(d.subtotal)||0), 0);
    try {
      await axios.post(`${API_BASE}/api/pedidos`, {
        cliente_id: clienteId,
        estado: 'pendiente',
        prioridad: 'normal',
        total,
        detalles
      });
      setClienteId(''); setDetalles([]); fetch();
    } catch (e) { console.error(e); }
  };

  const remove = async (id) => {
    if (!window.confirm('Eliminar pedido?')) return;
    await axios.delete(`${API_BASE}/api/pedidos/${id}`);
    fetch();
  };

  return (
    <div>
      <h2>Pedidos</h2>
      <div style={{display:'flex',gap:12}}>
        <div style={{flex:1}}>
          <h4>Crear Pedido</h4>
          <input placeholder="Cliente ID" value={clienteId} onChange={e=>setClienteId(e.target.value)} />
          <div>
            <h5>Detalles</h5>
            {detalles.map((d,i)=>(
              <div key={i} style={{display:'flex',gap:8,alignItems:'center',marginBottom:6}}>
                <input placeholder="Producto ID" value={d.producto_id} onChange={e=>updateDetalle(i,'producto_id',e.target.value)} />
                <input placeholder="Cantidad" type="number" value={d.cantidad} onChange={e=>updateDetalle(i,'cantidad',e.target.value)} />
                <input placeholder="Subtotal" value={d.subtotal} onChange={e=>updateDetalle(i,'subtotal',e.target.value)} />
                <button onClick={()=>setDetalles(ds=>ds.filter((_,idx)=>idx!==i))}>Quitar</button>
              </div>
            ))}
            <button onClick={addDetalle}>Agregar detalle</button>
          </div>
          <div style={{marginTop:8}}>
            <button onClick={savePedido}>Crear Pedido</button>
          </div>
        </div>

        <div style={{flex:2}}>
          <h4>Lista de Pedidos</h4>
          {loading ? <p>Cargando...</p> : (
            <table style={{width:'100%'}}>
              <thead><tr><th>ID</th><th>Cliente</th><th>Total</th><th>Estado</th><th>Acción</th></tr></thead>
              <tbody>
                {list.map(p=>(
                  <tr key={p.id}>
                    <td>{p.id}</td>
                    <td>{p.cliente_id}</td>
                    <td>{p.total}</td>
                    <td>{p.estado}</td>
                    <td><button onClick={()=>remove(p.id)}>Eliminar</button></td>
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

export default Pedidos;