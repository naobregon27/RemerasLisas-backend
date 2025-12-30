# Backend E-commerce Multi-Tienda - Resumen Técnico

## 🚀 Stack Tecnológico

### Core
- **Node.js** con **Express.js** - Framework web RESTful
- **MongoDB** con **Mongoose** - Base de datos NoSQL y ODM
- **ES Modules** - Sistema de módulos moderno

### Seguridad y Autenticación
- **JWT (JSON Web Tokens)** - Autenticación stateless
- **bcryptjs** - Encriptación de contraseñas
- Middleware de autorización por roles (superAdmin, admin, usuario)

### Integraciones
- **MercadoPago** - Procesamiento de pagos
- **SendGrid** - Servicio de envío de emails transaccionales

### Procesamiento de Imágenes
- **Multer** - Manejo de uploads de archivos
- **Sharp** - Optimización y procesamiento de imágenes (conversión a WebP)

### Utilidades
- **node-cron** - Tareas programadas automáticas
- **slugify** - Generación de URLs amigables
- **express-async-handler** - Manejo de errores asíncronos
- **morgan** - Logging de peticiones HTTP
- **CORS** - Configuración de políticas de origen cruzado

---

## 📐 Arquitectura

### Estructura del Proyecto
```
server/
├── config/          # Configuraciones (DB, MercadoPago, storage)
├── controllers/     # Lógica de negocio
├── models/          # Esquemas de MongoDB (User, Producto, Local, etc.)
├── routes/          # Definición de endpoints
├── middlewares/     # Autenticación, autorización, logging
├── services/        # Servicios externos (MercadoPago)
├── utils/           # Utilidades (email, tokens, cron jobs)
└── storage/         # Almacenamiento de imágenes
```

### Patrón de Diseño
- **MVC (Model-View-Controller)** - Separación de responsabilidades
- **RESTful API** - Endpoints organizados por recursos
- **Middleware Chain** - Pipeline de procesamiento de peticiones

---

## 🔑 Funcionalidades Principales

### 1. Sistema Multi-Tienda
- Cada tienda (Local) tiene su propia configuración personalizable
- Slugs únicos para URLs amigables por tienda
- Sistema de permisos granular (superAdmin, admin por tienda, empleados)

### 2. Gestión de Productos
- CRUD completo de productos con variantes
- Sistema de categorías jerárquico
- Control de stock y precios
- Sistema de ofertas y descuentos
- Búsqueda full-text con índices de MongoDB
- Reviews y calificaciones

### 3. Carrito y Pedidos
- Carrito de compras persistente por usuario
- Gestión completa del ciclo de vida de pedidos
- Integración con MercadoPago para pagos

### 4. Personalización de Tiendas
- **Carrusel de imágenes** - Configurable y ordenable
- **Banners** - Gestión de banners promocionales
- **Secciones personalizadas** - Contenido HTML/rich text
- **Menú personalizado** - Navegación configurable
- **Pie de página** - Columnas y copyright personalizables
- **Logos** - Gestión de branding

### 5. Autenticación y Usuarios
- Registro y login con JWT
- Verificación de email
- Roles: superAdmin, admin, usuario
- Asignación de administradores y empleados por tienda
- Gestión de permisos granular

### 6. Procesamiento de Imágenes
- Upload de imágenes con validación
- Conversión automática a WebP para optimización
- Almacenamiento organizado por tipo (carrusel, banners, logos, secciones)
- Servicio de archivos estáticos

### 7. Tareas Automatizadas
- **Cron Jobs** - Tareas programadas (limpieza, activación de tiendas, etc.)
- Monitoreo y mantenimiento automático

### 8. Sistema de Emails
- Integración con SendGrid
- Emails transaccionales (confirmaciones, notificaciones)

---

## 🔒 Seguridad

- Autenticación basada en JWT
- Encriptación de contraseñas con bcrypt
- Middleware de protección de rutas
- Validación de roles y permisos
- Variables de entorno para datos sensibles
- Manejo centralizado de errores

---

## 📊 Modelos de Datos Principales

- **User** - Usuarios con roles y permisos
- **Local** - Tiendas con configuración personalizada
- **Producto** - Productos con variantes, stock, precios
- **Categoria** - Categorías de productos
- **Carrito** - Carritos de compra por usuario
- **Pedido** - Órdenes de compra con estados

---

## 🛠️ Endpoints Principales

- `/api/auth` - Autenticación (login, registro, verificación)
- `/api/users` - Gestión de usuarios
- `/api/locales` - Gestión de tiendas
- `/api/productos` - CRUD de productos
- `/api/categorias` - Gestión de categorías
- `/api/carrito` - Operaciones del carrito
- `/api/pedidos` - Gestión de pedidos
- `/api/mercadopago` - Webhooks y pagos
- `/api/tienda-admin` - Configuración de tiendas (admin)
- `/api/tienda-publica` - Endpoints públicos de tiendas

---

## 🎯 Características Destacadas

✅ **Multi-tenancy** - Soporte para múltiples tiendas independientes  
✅ **Escalable** - Arquitectura modular y extensible  
✅ **Seguro** - Autenticación robusta y control de acceso  
✅ **Optimizado** - Procesamiento de imágenes y índices de búsqueda  
✅ **Completo** - Sistema de e-commerce end-to-end  
✅ **Mantenible** - Código organizado y separación de responsabilidades  

---

## 📝 Notas Técnicas

- Uso de **async/await** para manejo asíncrono
- Validación de datos con Mongoose schemas
- Generación automática de slugs únicos
- Middleware de logging para debugging
- Manejo de errores centralizado
- Configuración mediante variables de entorno

---

*Backend desarrollado con Node.js y Express para plataforma e-commerce multi-tienda*

