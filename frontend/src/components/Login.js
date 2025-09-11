import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../utils/api';
import './Login.css';

const Login = () => {
  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  });

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showChangeForm, setShowChangeForm] = useState(false);
  const [changeData, setChangeData] = useState({ new_username: '', new_password: '' });
  const [loginUser, setLoginUser] = useState('');
  const [loginRole, setLoginRole] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    setCredentials({
      ...credentials,
      [e.target.name]: e.target.value
    });
    setError(''); // Limpiar error cuando el usuario escribe
  };



  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await authAPI.login(credentials);
      if (response.data.success) {
        setLoginUser(response.data.user);
        setLoginRole(response.data.role);
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('username', credentials.username);
        localStorage.setItem('role', response.data.role); // Guarda el role tal cual lo envía el backend
        // Log para depuración
        console.log('Login OK:', {
          isAuthenticated: localStorage.getItem('isAuthenticated'),
          username: localStorage.getItem('username'),
          role: localStorage.getItem('role')
        });
        setCredentials({ username: '', password: '' });
        if (response.data.change_required) {
          setShowChangeForm(true);
        } else {
          if (response.data.role === 'admin') {
            navigate('/dashboard', { replace: true });
            window.history.pushState(null, '', '/dashboard');
          } else {
            navigate('/map', { replace: true });
            window.history.pushState(null, '', '/map');
          }
        }
      } else {
        setError(response.data.message || 'Credenciales inválidas');
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Error de conexión con el servidor');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangeForm = (e) => {
    setChangeData({ ...changeData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleChangeSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const response = await authAPI.changePassword({
        username: loginUser,
        new_username: changeData.new_username,
        new_password: changeData.new_password,
      });
      if (response.data.success) {
        localStorage.setItem('username', changeData.new_username);
        setShowChangeForm(false);
        navigate('/dashboard');
      } else {
        setError(response.data.message || 'Error al cambiar usuario/contraseña');
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Error de conexión con el servidor');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-form">
        <div className="login-header">
          <h1>METALES GALVANIZADOS Y ACEROS S.R.L.</h1>
          <p>Sistema de Gestión Logística</p>
        </div>
        {!showChangeForm ? (
          <form onSubmit={handleSubmit} className="login-form-content">
            <div className="form-group">
              <label htmlFor="username">Usuario</label>
              <input
                type="text"
                id="username"
                name="username"
                value={credentials.username}
                onChange={handleChange}
                placeholder="Ingrese su usuario"
                required
                disabled={isLoading}
              />
            </div>
            <div className="form-group">
              <label htmlFor="password">Contraseña</label>
              <input
                type="password"
                id="password"
                name="password"
                value={credentials.password}
                onChange={handleChange}
                placeholder="Ingrese su contraseña"
                required
                disabled={isLoading}
              />
            </div>
            {error && <div className="error-message">{error}</div>}
            <button 
              type="submit" 
              disabled={isLoading}
              className={isLoading ? 'loading' : ''}
            >
              {isLoading ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleChangeSubmit} className="login-form-content">
            <div className="form-group">
              <label htmlFor="new_username">Nuevo usuario</label>
              <input
                type="text"
                id="new_username"
                name="new_username"
                value={changeData.new_username}
                onChange={handleChangeForm}
                placeholder="Ingrese nuevo usuario"
                required
                disabled={isLoading}
              />
            </div>
            <div className="form-group">
              <label htmlFor="new_password">Nueva contraseña</label>
              <input
                type="password"
                id="new_password"
                name="new_password"
                value={changeData.new_password}
                onChange={handleChangeForm}
                placeholder="Ingrese nueva contraseña"
                required
                disabled={isLoading}
              />
            </div>
            {error && <div className="error-message">{error}</div>}
            <button 
              type="submit" 
              disabled={isLoading}
              className={isLoading ? 'loading' : ''}
            >
              {isLoading ? 'Guardando...' : 'Cambiar usuario y contraseña'}
            </button>
          </form>
        )}
        <div className="login-footer">
          <p>¿Necesitas ayuda? Contacta al administrador</p>
        </div>
      </div>
    </div>
  );
};

export default Login;