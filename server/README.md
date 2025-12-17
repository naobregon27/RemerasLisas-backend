# Remeras Lisas - Backend API

Backend completo para el ecommerce de Remeras Lisas construido con Node.js, Express y MongoDB.

## 🚀 Características

- ✅ Autenticación JWT (Admin y Cliente)
- ✅ Gestión completa de productos con variantes (tallas, colores)
- ✅ Sistema de carrito de compras
- ✅ Gestión de pedidos con estados
- ✅ Sistema de categorías
- ✅ Gestión de usuarios y direcciones
- ✅ Configuración de tienda
- ✅ Estadísticas y reportes
- ✅ Envío de emails con SendGrid
- ✅ Subida de imágenes con Multer
- ✅ Validación de datos con express-validator
- ✅ Manejo de errores robusto

## 📁 Estructura del Proyecto

```
server/
├── conf/              # Configuraciones
│   ├── database.js   # Conexión a MongoDB
│   └── constants.js  # Constantes de la aplicación
├── controllers/       # Lógica de negocio
│   ├── authController.js
│   ├── productController.js
│   ├── categoryController.js
│   ├── orderController.js
│   ├── cartController.js
│   ├── userController.js
│   ├── storeController.js
│   └── statsController.js
├── middlewares/      # Middlewares
│   ├── auth.js       # Autenticación y autorización
│   ├── errorHandler.js
│   ├── notFound.js
│   ├── upload.js     # Manejo de archivos
│   └── validator.js  # Validación de datos
├── models/          # Modelos de MongoDB
│   ├── User.js
│   ├── Product.js
│   ├── Category.js
│   ├── Order.js
│   ├── Cart.js
│   └── StoreConfig.js
├── routers/         # Rutas de la API
│   ├── authRoutes.js
│   ├── productRoutes.js
│   ├── categoryRoutes.js
│   ├── orderRoutes.js
│   ├── cartRoutes.js
│   ├── userRoutes.js
│   ├── storeRoutes.js
│   └── statsRoutes.js
├── utils/          # Utilidades
│   ├── emailService.js  # Servicio de email con SendGrid
│   └── helpers.js      # Funciones auxiliares
├── uploads/        # Archivos subidos
├── docs/           # Documentación
│   └── API_DOCUMENTATION.md
├── server.js       # Punto de entrada
├── package.json
└── .env           # Variables de entorno (crear)
```

## 📦 Instalación

1. Instalar dependencias:
```bash
npm install
```

2. Crear archivo `.env` basado en `.env.example`:
```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/remeras-lisas
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRE=7d
SENDGRID_API_KEY=your-sendgrid-api-key
SENDGRID_FROM_EMAIL=noreply@remeraslisas.com
SENDGRID_FROM_NAME=Remeras Lisas
FRONTEND_URL=http://localhost:3001
CORS_ORIGIN=http://localhost:3001
MAX_FILE_SIZE=5242880
```

3. Iniciar servidor:
```bash
# Desarrollo
npm run dev

# Producción
npm start
```

## 🔐 Autenticación

El sistema usa JWT (JSON Web Tokens) para autenticación. Incluye el token en el header:

```
Authorization: Bearer <token>
```

## 📚 Documentación de API

Ver la documentación completa en: `docs/API_DOCUMENTATION.md`

Incluye:
- Todos los endpoints disponibles
- Ejemplos de peticiones y respuestas
- Códigos de estado HTTP
- Manejo de errores

## 🗄️ Modelos de Datos

### User
- Información de usuario (admin o cliente)
- Direcciones de envío
- Verificación de email

### Product
- Productos con variantes (tallas, colores)
- Gestión de stock por variante
- Múltiples imágenes

### Category
- Categorías de productos
- Slug automático

### Order
- Pedidos con items
- Estados de pedido y pago
- Direcciones de envío y facturación

### Cart
- Carrito de compras por usuario
- Cálculo automático de totales

### StoreConfig
- Configuración de la tienda
- Métodos de pago y envío
- Información de contacto

## 🔒 Roles y Permisos

- **Admin**: Acceso completo a todas las funcionalidades
- **Customer**: Acceso limitado a sus propios recursos

## 📧 Email con SendGrid

El sistema envía emails automáticamente para:
- Verificación de email al registrarse
- Confirmación de pedidos
- Actualizaciones de estado de pedidos
- Recuperación de contraseña

## 📤 Subida de Archivos

Las imágenes se suben usando Multer y se almacenan en `/uploads`. Accesibles en:
```
http://localhost:3000/uploads/<filename>
```

## 🛠️ Tecnologías Utilizadas

- **Node.js** - Runtime de JavaScript
- **Express** - Framework web
- **MongoDB** - Base de datos
- **Mongoose** - ODM para MongoDB
- **JWT** - Autenticación
- **bcryptjs** - Hash de contraseñas
- **SendGrid** - Envío de emails
- **Multer** - Manejo de archivos
- **express-validator** - Validación de datos
- **CORS** - Cross-Origin Resource Sharing

## 📝 Scripts Disponibles

- `npm start` - Inicia el servidor en producción
- `npm run dev` - Inicia el servidor en desarrollo con nodemon

## 🐛 Manejo de Errores

Todos los errores se manejan de forma centralizada y devuelven respuestas consistentes:

```json
{
  "success": false,
  "message": "Mensaje de error descriptivo"
}
```

## 🔄 Estados de Pedido

- `pending` - Pendiente
- `confirmed` - Confirmado
- `preparing` - En preparación
- `shipped` - Enviado
- `delivered` - Entregado
- `cancelled` - Cancelado

## 💳 Métodos de Pago

- `transfer` - Transferencia bancaria
- `credit_card` - Tarjeta de crédito
- `debit_card` - Tarjeta de débito
- `cash` - Efectivo
- `other` - Otro

## 🚚 Métodos de Envío

- `standard` - Envío estándar
- `express` - Envío express
- `pickup` - Retiro en local

## 📊 Estadísticas

El endpoint `/api/stats/dashboard` proporciona:
- Resumen general (pedidos, ingresos, clientes, productos)
- Pedidos por estado
- Pedidos recientes
- Productos más vendidos

## 🔍 Búsqueda y Filtros

Muchos endpoints soportan:
- Búsqueda por texto
- Filtros por categoría, estado, etc.
- Ordenamiento personalizado
- Paginación

## 📄 Licencia

ISC

---

Desarrollado con ❤️ para Remeras Lisas


