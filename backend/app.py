




from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_mail import Mail, Message
from dotenv import load_dotenv
import os
import random
import string
from models import db, User, Role, CodigosVerificacion
from flask_bcrypt import Bcrypt
import datetime


load_dotenv()
app = Flask(__name__)
bcrypt = Bcrypt(app)
CORS(app, resources={r"/api/*": {"origins": "*"}})
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY')
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['MAIL_SERVER'] = os.getenv('MAIL_SERVER')
app.config['MAIL_PORT'] = int(os.getenv('MAIL_PORT'))
app.config['MAIL_USE_TLS'] = os.getenv('MAIL_USE_TLS') == 'True'
app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME')
app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD')

db.init_app(app)
mail = Mail(app)

def generate_temp_password(length=10):
    return ''.join(random.choices(string.ascii_letters + string.digits, k=length))

def send_temp_password(email, temp_password):
    msg = Message('Tu contraseña temporal', sender=app.config['MAIL_USERNAME'], recipients=[email])
    msg.body = f"Tu contraseña temporal es: {temp_password}\nPor favor cámbiala al iniciar sesión."
    mail.send(msg)

def generate_username(email):
    local = email.split('@')[0]
    return local.replace(' ', '').replace('_', '').replace('-', '').replace('.', '')

def create_tables():
    with app.app_context():
        db.create_all()
        # Crear roles y usuarios iniciales si no existen
        if not Role.query.filter_by(nombre='admin').first():
            admin_role = Role(nombre='admin')
            user_role = Role(nombre='usuario')
            db.session.add(admin_role)
            db.session.add(user_role)
            db.session.commit()
        if not User.query.filter_by(nombre='app.megacero').first():
            admin = User(
                nombre='app.megacero',
                email='admin@megacero.com',
                rol_id=Role.query.filter_by(nombre='admin').first().id,
                activo=True
            )
            admin.set_password('qwerty12345')
            db.session.add(admin)
            db.session.commit()
        if not User.query.filter_by(nombre='usuario.megacero').first():
            user = User(
                nombre='usuario.megacero',
                email='usuario@megacero.com',
                rol_id=Role.query.filter_by(nombre='usuario').first().id,
                activo=True
            )
            user.set_password('usuario123')
            db.session.add(user)
            db.session.commit()

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    user = User.query.filter_by(nombre=username).first()
    if not user or not user.activo:
        return jsonify({'success': False, 'message': 'Usuario no existe o está deshabilitado'}), 401
    if user.check_password(password):
        # Si el usuario tiene temp_password, forzar cambio
        return jsonify({
            'success': True,
            'message': 'Login exitoso',
            'user': username,
            'role': user.role.nombre,
            'change_required': getattr(user, 'temp_password', False)
        })
    return jsonify({'success': False, 'message': 'Credenciales inválidas'}), 401

@app.route('/api/change-password', methods=['POST'])
def change_password():
    data = request.get_json()
    username = data.get('username')
    new_username = data.get('new_username')
    new_password = data.get('new_password')
    user = User.query.filter_by(nombre=username).first()
    if not user:
        return jsonify({'success': False, 'message': 'Usuario no encontrado'}), 404
    user.nombre = new_username
    user.set_password(new_password)
    user.temp_password = False
    db.session.commit()
    return jsonify({'success': True, 'message': 'Usuario y contraseña actualizados'})

@app.route('/api/users', methods=['GET'])
def get_users():
    users = User.query.all()
    return jsonify({'success': True, 'users': [
        {
            'id': u.id,
            'username': u.nombre,
            'email': u.email,
            'role': u.role.nombre,
            'is_active': u.activo
        } for u in users
    ]})

@app.route('/api/users', methods=['POST'])
def create_user():
    data = request.get_json()
    email = data.get('email')
    role_name = data.get('role')
    role = Role.query.filter_by(nombre=role_name).first()
    if not role:
        return jsonify({'success': False, 'message': 'Rol no válido'}), 400
    username = generate_username(email)
    temp_password = generate_temp_password()
    # Guardar email normalizado
    clean_email = email.strip().lower()
    user = User(nombre=username, email=clean_email, rol_id=role.id, activo=True)
    user.set_password(temp_password)
    # Flag para forzar cambio de contraseña en el primer login
    user.temp_password = True
    db.session.add(user)
    db.session.commit()
    try:
        send_temp_password(clean_email, temp_password)
        return jsonify({'success': True, 'message': 'Usuario creado y contraseña enviada', 'username': username, 'change_required': True})
    except Exception as e:
        return jsonify({'success': True, 'message': f'Usuario creado pero no se pudo enviar el correo: {str(e)}', 'username': username, 'change_required': True}), 200
# --- Endpoint para solicitar recuperación de contraseña ---
@app.route('/api/request-password-reset', methods=['POST'])
def request_password_reset():
    data = request.get_json()
    email = data.get('email', '').strip().lower()
    user = User.query.filter(db.func.lower(db.func.trim(User.email)) == email).first()
    if not user:
        return jsonify({'success': False, 'message': 'No existe un usuario con ese email'}), 404
    # Generar código de 6 dígitos
    code = ''.join(random.choices(string.digits, k=6))
    expiracion = datetime.datetime.utcnow() + datetime.timedelta(minutes=10)
    codigo = CodigosVerificacion(usuario_id=user.id, codigo=code, expiracion=expiracion)
    db.session.add(codigo)
    db.session.commit()
    # Enviar email
    try:
        msg = Message('Código de recuperación de contraseña', sender=app.config['MAIL_USERNAME'], recipients=[email])
        msg.body = f"Tu código de recuperación es: {code}\nEste código expira en 10 minutos."
        mail.send(msg)
        return jsonify({'success': True, 'message': 'Código enviado al correo'})
    except Exception as e:
        return jsonify({'success': False, 'message': f'No se pudo enviar el correo: {str(e)}'}), 500

# --- Endpoint para cambiar contraseña con código ---
@app.route('/api/reset-password', methods=['POST'])
def reset_password():
    data = request.get_json()
    email = data.get('email', '').strip().lower()
    code = data.get('code')
    new_password = data.get('new_password')
    user = User.query.filter(db.func.lower(db.func.trim(User.email)) == email).first()
    if not user:
        return jsonify({'success': False, 'message': 'No existe un usuario con ese email'}), 404
    codigo = CodigosVerificacion.query.filter_by(usuario_id=user.id, codigo=code, usado=False).first()
    if not codigo:
        return jsonify({'success': False, 'message': 'Código inválido'}), 400
    if codigo.expiracion < datetime.datetime.utcnow():
        return jsonify({'success': False, 'message': 'Código expirado'}), 400
    # Cambiar contraseña
    user.set_password(new_password)
    db.session.commit()
    codigo.usado = True
    db.session.commit()
    return jsonify({'success': True, 'message': 'Contraseña restablecida correctamente'})

@app.route('/api/users/<int:user_id>/toggle', methods=['POST'])
def toggle_user(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({'success': False, 'message': 'Usuario no encontrado'}), 404
    user.activo = not user.activo
    db.session.commit()
    return jsonify({'success': True, 'activo': user.activo})

@app.route('/api/users/<int:user_id>', methods=['DELETE'])
def delete_user(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({'success': False, 'message': 'Usuario no encontrado'}), 404
    db.session.delete(user)
    db.session.commit()
    return jsonify({'success': True, 'message': 'Usuario eliminado'})



@app.route('/api/dashboard', methods=['POST'])
def get_dashboard():
    """Endpoint para obtener datos del dashboard o mapa"""
    data = request.get_json()
    username = data.get('username')
    user = User.query.filter_by(nombre=username).first()
    if not user:
        return jsonify({'success': False, 'message': 'Usuario no encontrado'}), 404
    if user.role.nombre == 'admin':
        dashboard_data = {
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
        return jsonify({'success': True, 'data': dashboard_data, 'show_map': False})
    else:
        return jsonify({'success': True, 'show_map': True})

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
    create_tables()  # <-- Esto crea las tablas antes de iniciar el servidor
    app.run(debug=True, host='0.0.0.0', port=5000)