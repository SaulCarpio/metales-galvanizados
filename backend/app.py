from flask import Flask, jsonify, request
from flask_cors import CORS
from datetime import datetime, timedelta
import random
import os

app = Flask(__name__)
CORS(app)

# Configuración
app.config['SECRET_KEY'] = ''  # Cambiar en producción

# Datos de ejemplo para simular la base de datos
users = {
    'admin': 'admin',  # En producción usar hash para contraseñas
    'user': 'user'
}

def generate_dashboard_data():
    """Generar datos de ejemplo para el dashboard"""
    return {
        "on_time_delivery": random.randint(85, 98),
        "avg_delivery_time": random.randint(25, 45),
        "fuel_consumption": random.randint(580, 680),
        "mileage_per_route": random.randint(300, 350),
        "weekly_performance": [random.randint(60, 100) for _ in range(7)],
        "route_comparison": [
            {"name": "Ruta A", "efficiency": 85},
            {"name": "Ruta B", "efficiency": 92},
            {"name": "Ruta C", "efficiency": 78},
            {"name": "Ruta D", "efficiency": 88}
        ],
        "delivery_status": [
            {"route": "Ruta Norte", "status": "A tiempo", "time": "09:30 AM"},
            {"route": "Ruta Norte", "status": "Retrasada", "time": "10:45 AM"},
            {"route": "Ruta Norte", "status": "Retrasada", "time": "11:15 AM"},
            {"route": "Ruta Norte", "status": "A tiempo", "time": "09:50 AM"},
            {"route": "Ruta Norte", "status": "A tiempo", "time": "10:20 AM"},
            {"route": "Ruta Norte", "status": "Retrasada", "time": "11:30 AM"}
        ]
    }

@app.route('/api/login', methods=['POST'])
def login():
    """Endpoint para autenticación"""
    try:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        
        if not username or not password:
            return jsonify({
                'success': False,
                'message': 'Usuario y contraseña requeridos'
            }), 400
        
        # Verificar credenciales (en producción usar base de datos con hash)
        if username in users and users[username] == password:
            return jsonify({
                'success': True,
                'message': 'Login exitoso',
                'user': username
            })
        else:
            return jsonify({
                'success': False,
                'message': 'Credenciales inválidas'
            }), 401
            
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error en el servidor: {str(e)}'
        }), 500

@app.route('/api/dashboard', methods=['GET'])
def get_dashboard():
    """Endpoint para obtener datos del dashboard"""
    try:
        data = generate_dashboard_data()
        return jsonify({
            'success': True,
            'data': data
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error al obtener datos: {str(e)}'
        }), 500

@app.route('/api/routes', methods=['GET'])
def get_routes():
    """Endpoint para obtener información de rutas"""
    routes = [
        {"id": 1, "name": "Ruta Norte", "driver": "Juan Pérez", "status": "En camino"},
        {"id": 2, "name": "Ruta Sur", "driver": "María García", "status": "Completada"},
        {"id": 3, "name": "Ruta Este", "driver": "Carlos López", "status": "Pendiente"},
        {"id": 4, "name": "Ruta Oeste", "driver": "Ana Martínez", "status": "En camino"}
    ]
    return jsonify({'success': True, 'routes': routes})

@app.route('/api/health', methods=['GET'])
def health_check():
    """Endpoint para verificar que el API está funcionando"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'service': 'Metales Galvanizados API'
    })

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)