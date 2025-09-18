from flask_sqlalchemy import SQLAlchemy
from flask_mail import Mail
from flask_bcrypt import Bcrypt

db = SQLAlchemy()
mail = Mail()
bcrypt = Bcrypt()

# ========== MODELOS BASE ========== #
class Role(db.Model):
    __tablename__ = 'roles'
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(50), unique=True, nullable=False)
    descripcion = db.Column(db.Text)
    usuarios = db.relationship('User', backref='role', lazy=True)

class User(db.Model):
    __tablename__ = 'usuarios'
    id = db.Column(db.Integer, primary_key=True)
    rol_id = db.Column(db.Integer, db.ForeignKey('roles.id'))
    nombre = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    activo = db.Column(db.Boolean, default=True)
    creado_en = db.Column(db.DateTime, server_default=db.func.now())
    temp_password = db.Column(db.Boolean, default=False)
    # Métodos para bcrypt
    def set_password(self, password):
        self.password_hash = bcrypt.generate_password_hash(password).decode('utf-8')
    def check_password(self, password):
        return bcrypt.check_password_hash(self.password_hash, password)

# ========== HISTORIAL DE CONTRASEÑAS ========== #
class HistorialContrasenas(db.Model):
    __tablename__ = 'historial_contrasenas'
    id = db.Column(db.Integer, primary_key=True)
    usuario_id = db.Column(db.Integer, db.ForeignKey('usuarios.id'))
    password_hash = db.Column(db.String(255), nullable=False)
    fecha_cambio = db.Column(db.DateTime, server_default=db.func.now())

# ========== CÓDIGOS DE VERIFICACIÓN ========== #
class CodigosVerificacion(db.Model):
    __tablename__ = 'codigos_verificacion'
    id = db.Column(db.Integer, primary_key=True)
    usuario_id = db.Column(db.Integer, db.ForeignKey('usuarios.id'))
    codigo = db.Column(db.String(10), nullable=False)
    expiracion = db.Column(db.DateTime, nullable=False)
    usado = db.Column(db.Boolean, default=False)

# ========== AUDITORÍA DE SISTEMA ========== #
class AuditoriaSistema(db.Model):
    __tablename__ = 'auditoria_sistema'
    id = db.Column(db.Integer, primary_key=True)
    usuario_id = db.Column(db.Integer, db.ForeignKey('usuarios.id'))
    accion = db.Column(db.Text, nullable=False)
    fecha_evento = db.Column(db.DateTime, server_default=db.func.now())

# ========== CONFIGURACIÓN DEL SISTEMA ========== #
class ConfiguracionSistema(db.Model):
    __tablename__ = 'configuracion_sistema'
    id = db.Column(db.Integer, primary_key=True)
    clave = db.Column(db.String(100), unique=True, nullable=False)
    valor = db.Column(db.Text)
    actualizado_en = db.Column(db.DateTime, server_default=db.func.now())

# ========== CLIENTES ========== #
class Cliente(db.Model):
    __tablename__ = 'clientes'
    id = db.Column(db.Integer, primary_key=True)
    usuario_id = db.Column(db.Integer, db.ForeignKey('usuarios.id'), unique=True)
    direccion = db.Column(db.Text)
    telefono = db.Column(db.String(20))
    nit = db.Column(db.String(50))

# ========== VEHÍCULOS ========== #
class Vehiculo(db.Model):
    __tablename__ = 'vehiculos'
    id = db.Column(db.Integer, primary_key=True)
    placa = db.Column(db.String(20), unique=True, nullable=False)
    marca = db.Column(db.String(50))
    modelo = db.Column(db.String(50))
    capacidad = db.Column(db.Integer)

# ========== CONDUCTORES ========== #
class Conductor(db.Model):
    __tablename__ = 'conductores'
    id = db.Column(db.Integer, primary_key=True)
    usuario_id = db.Column(db.Integer, db.ForeignKey('usuarios.id'), unique=True)
    licencia = db.Column(db.String(50), unique=True, nullable=False)
    vehiculo_id = db.Column(db.Integer, db.ForeignKey('vehiculos.id'))

# ========== PRODUCTOS ========== #
class Producto(db.Model):
    __tablename__ = 'productos'
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(150), nullable=False)
    descripcion = db.Column(db.Text)
    categoria = db.Column(db.String(100))
    precio = db.Column(db.Numeric(10,2), nullable=False)
    stock = db.Column(db.Integer, default=0)
    activo = db.Column(db.Boolean, default=True)

# ========== PEDIDOS ========== #
class Pedido(db.Model):
    __tablename__ = 'pedidos'
    id = db.Column(db.Integer, primary_key=True)
    cliente_id = db.Column(db.Integer, db.ForeignKey('clientes.id'))
    fecha_pedido = db.Column(db.DateTime, server_default=db.func.now())
    estado = db.Column(db.String(50), default='pendiente')
    prioridad = db.Column(db.String(20), default='normal')
    total = db.Column(db.Numeric(10,2), nullable=False)

# ========== DETALLES DE PEDIDO ========== #
class PedidoDetalle(db.Model):
    __tablename__ = 'pedido_detalles'
    id = db.Column(db.Integer, primary_key=True)
    pedido_id = db.Column(db.Integer, db.ForeignKey('pedidos.id', ondelete='CASCADE'))
    producto_id = db.Column(db.Integer, db.ForeignKey('productos.id'))
    cantidad = db.Column(db.Integer, nullable=False)
    subtotal = db.Column(db.Numeric(10,2), nullable=False)

# ========== RUTAS ========== #
class Ruta(db.Model):
    __tablename__ = 'rutas'
    id = db.Column(db.Integer, primary_key=True)
    pedido_id = db.Column(db.Integer, db.ForeignKey('pedidos.id'))
    conductor_id = db.Column(db.Integer, db.ForeignKey('conductores.id'))
    fecha_programada = db.Column(db.DateTime)
    estado = db.Column(db.String(50), default='pendiente')

# ========== DETALLES DE RUTA ========== #
class RutaDetalle(db.Model):
    __tablename__ = 'ruta_detalles'
    id = db.Column(db.Integer, primary_key=True)
    ruta_id = db.Column(db.Integer, db.ForeignKey('rutas.id', ondelete='CASCADE'))
    lat = db.Column(db.Numeric(9,6))
    lon = db.Column(db.Numeric(9,6))
    orden = db.Column(db.Integer)

# ========== MOVIMIENTOS DE INVENTARIO ========== #
class InventarioMovimiento(db.Model):
    __tablename__ = 'inventario_movimientos'
    id = db.Column(db.Integer, primary_key=True)
    producto_id = db.Column(db.Integer, db.ForeignKey('productos.id'))
    cantidad = db.Column(db.Integer, nullable=False)
    tipo = db.Column(db.String(20), nullable=False) # entrada / salida
    fecha = db.Column(db.DateTime, server_default=db.func.now())

# ========== MÉTRICAS DE ENTREGAS ========== #
class MetricaEntrega(db.Model):
    __tablename__ = 'metricas_entregas'
    id = db.Column(db.Integer, primary_key=True)
    ruta_id = db.Column(db.Integer, db.ForeignKey('rutas.id'))
    tiempo_entrega = db.Column(db.Integer)
    retraso = db.Column(db.Boolean)
    combustible_usado = db.Column(db.Numeric(10,2))

# ========== MÉTODOS DE PAGO ========== #
class MetodoPago(db.Model):
    __tablename__ = 'metodos_pago'
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(50), unique=True, nullable=False)
    descripcion = db.Column(db.Text)
    activo = db.Column(db.Boolean, default=True)

# ========== PAGOS ========== #
class Pago(db.Model):
    __tablename__ = 'pagos'
    id = db.Column(db.Integer, primary_key=True)
    pedido_id = db.Column(db.Integer, db.ForeignKey('pedidos.id'))
    metodo_id = db.Column(db.Integer, db.ForeignKey('metodos_pago.id'))
    monto = db.Column(db.Numeric(10,2), nullable=False)
    fecha = db.Column(db.DateTime, server_default=db.func.now())
    estado = db.Column(db.String(50), default='pendiente')

# ========== UBICACIONES DE EMPLEADOS ========== #
class UbicacionEmpleado(db.Model):
    __tablename__ = 'ubicaciones_empleados'
    id = db.Column(db.Integer, primary_key=True)
    empleado_id = db.Column(db.Integer, db.ForeignKey('usuarios.id'))
    lat = db.Column(db.Numeric(10,6), nullable=False)
    lon = db.Column(db.Numeric(10,6), nullable=False)
    fecha = db.Column(db.DateTime, server_default=db.func.now())

# ========== NODOS (GRAFO VIAL) ========== #
class Nodo(db.Model):
    __tablename__ = 'nodos'
    id = db.Column(db.Integer, primary_key=True)
    osmid = db.Column(db.BigInteger)
    lat = db.Column(db.Numeric(9,6), nullable=False)
    lon = db.Column(db.Numeric(9,6), nullable=False)
    descripcion = db.Column(db.Text)

# ========== ARISTAS (GRAFO VIAL) ========== #
class Arista(db.Model):
    __tablename__ = 'aristas'
    id = db.Column(db.Integer, primary_key=True)
    osmid = db.Column(db.BigInteger)
    origen_id = db.Column(db.Integer, db.ForeignKey('nodos.id'), nullable=False)
    destino_id = db.Column(db.Integer, db.ForeignKey('nodos.id'), nullable=False)
    longitud_m = db.Column(db.Numeric(9,2))
    velocidad_max_kmh = db.Column(db.Numeric(5,2))
    restriccion = db.Column(db.Boolean, default=False)
    dia_restriccion = db.Column(db.String(20))
    motivo_restriccion = db.Column(db.Text)
    atributos = db.Column(db.JSON)

# ========== NOTA DE VENTA (PROFORMAS) ========== #
class NotaVenta(db.Model):
    __tablename__ = 'nota_venta'
    id = db.Column(db.Integer, primary_key=True)
    nro_proforma = db.Column(db.String(20), unique=True, nullable=False)
    cliente = db.Column(db.String(150), nullable=False)
    cel = db.Column(db.String(20))
    vendedor = db.Column(db.String(100), nullable=False)
    fecha = db.Column(db.DateTime, server_default=db.func.now(), nullable=False)
    producto = db.Column(db.String(100), nullable=False)
    color = db.Column(db.String(50))
    cantidad = db.Column(db.Integer, nullable=False)
    longitud = db.Column(db.Numeric(10,2))
    precio_unitario = db.Column(db.Numeric(10,2), nullable=False)
    importe = db.Column(db.Numeric(10,2), nullable=False)
    subtotal = db.Column(db.Numeric(10,2), nullable=False)
    anticipo = db.Column(db.Numeric(10,2))
    saldo = db.Column(db.Numeric(10,2))
    total = db.Column(db.Numeric(10,2), nullable=False)
    fecha_entrega = db.Column(db.DateTime)
    nombre_cliente = db.Column(db.String(150))
    nit = db.Column(db.String(50))
    firma_caja = db.Column(db.String(100))
    firma_cliente = db.Column(db.String(100))
