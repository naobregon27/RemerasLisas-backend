# Documentación de API - Remeras Lisas Backend

## Base URL
```
http://localhost:3000/api
```

## Autenticación

La mayoría de los endpoints requieren autenticación mediante JWT. Incluye el token en el header:
```
Authorization: Bearer <token>
```

---

## 1. Autenticación (`/api/auth`)

### 1.1. Registrar Usuario
**POST** `/api/auth/register`

**Body:**
```json
{
  "name": "Juan Pérez",
  "email": "juan@example.com",
  "password": "password123",
  "phone": "+5491123456789",
  "role": "customer"
}
```

**Respuesta Exitosa (201):**
```json
{
  "success": true,
  "message": "Usuario registrado exitosamente. Por favor verifica tu email.",
  "data": {
    "user": {
      "id": "64a1b2c3d4e5f6g7h8i9j0k1",
      "name": "Juan Pérez",
      "email": "juan@example.com",
      "role": "customer",
      "isEmailVerified": false
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### 1.2. Iniciar Sesión
**POST** `/api/auth/login`

**Body:**
```json
{
  "email": "juan@example.com",
  "password": "password123"
}
```

**Respuesta Exitosa (200):**
```json
{
  "success": true,
  "message": "Login exitoso",
  "data": {
    "user": {
      "id": "64a1b2c3d4e5f6g7h8i9j0k1",
      "name": "Juan Pérez",
      "email": "juan@example.com",
      "role": "customer",
      "isEmailVerified": true
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### 1.3. Obtener Usuario Actual
**GET** `/api/auth/me`

**Headers:**
```
Authorization: Bearer <token>
```

**Respuesta Exitosa (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "64a1b2c3d4e5f6g7h8i9j0k1",
      "name": "Juan Pérez",
      "email": "juan@example.com",
      "role": "customer",
      "phone": "+5491123456789",
      "isEmailVerified": true,
      "addresses": [],
      "isActive": true,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

---

### 1.4. Verificar Email
**POST** `/api/auth/verify-email`

**Body:**
```json
{
  "email": "juan@example.com",
  "code": "123456"
}
```

**Respuesta Exitosa (200):**
```json
{
  "success": true,
  "message": "Email verificado exitosamente"
}
```

**Errores comunes:**
```json
// Código inválido
{ "success": false, "message": "Código inválido" }
// Código expirado
{ "success": false, "message": "Código expirado, solicita uno nuevo" }
// No hay código pendiente
{ "success": false, "message": "No hay un código de verificación pendiente" }
```

---

### 1.5. Reenviar Email de Verificación
**POST** `/api/auth/resend-verification`

**Headers:**
```
Authorization: Bearer <token>
```

**Respuesta Exitosa (200):**
```json
{
  "success": true,
  "message": "Email de verificación enviado"
}
```

---

### 1.6. Olvidé mi Contraseña
**POST** `/api/auth/forgot-password`

**Body:**
```json
{
  "email": "juan@example.com"
}
```

**Respuesta Exitosa (200):**
```json
{
  "success": true,
  "message": "Email de recuperación enviado"
}
```

---

### 1.7. Restablecer Contraseña
**PUT** `/api/auth/reset-password`

**Body:**
```json
{
  "token": "<reset_token>",
  "password": "newpassword123"
}
```

**Respuesta Exitosa (200):**
```json
{
  "success": true,
  "message": "Contraseña restablecida exitosamente",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### 1.8. Actualizar Contraseña
**PUT** `/api/auth/update-password`

**Headers:**
```
Authorization: Bearer <token>
```

**Body:**
```json
{
  "currentPassword": "oldpassword123",
  "newPassword": "newpassword123"
}
```

**Respuesta Exitosa (200):**
```json
{
  "success": true,
  "message": "Contraseña actualizada exitosamente",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

## 2. Productos (`/api/products`)

### 2.1. Obtener Todos los Productos
**GET** `/api/products`

**Query Parameters:**
- `page` (opcional): Número de página (default: 1)
- `limit` (opcional): Items por página (default: 10)
- `category` (opcional): ID de categoría
- `status` (opcional): active, inactive, out_of_stock
- `featured` (opcional): true/false
- `search` (opcional): Búsqueda por nombre/descripción
- `sort` (opcional): Campo:orden (ej: price:asc, createdAt:desc)

**Ejemplo:**
```
GET /api/products?page=1&limit=10&status=active&featured=true&sort=price:asc
```

**Respuesta Exitosa (200):**
```json
{
  "success": true,
  "count": 10,
  "total": 50,
  "page": 1,
  "pages": 5,
  "data": {
    "products": [
      {
        "_id": "64a1b2c3d4e5f6g7h8i9j0k1",
        "name": "Remera Básica",
        "slug": "remera-basica",
        "description": "Remera básica de algodón",
        "price": 5000,
        "category": {
          "_id": "64a1b2c3d4e5f6g7h8i9j0k2",
          "name": "Básicas",
          "slug": "basicas"
        },
        "images": [
          {
            "url": "/uploads/image-1234567890.jpg",
            "alt": "Remera Básica"
          }
        ],
        "variants": [
          {
            "size": "M",
            "color": "Blanco",
            "stock": 10,
            "sku": "REM-BAS-M-BLA"
          }
        ],
        "status": "active",
        "featured": true,
        "createdAt": "2024-01-15T10:30:00.000Z"
      }
    ]
  }
}
```

---

### 2.2. Obtener Producto por ID
**GET** `/api/products/:id`

**Respuesta Exitosa (200):**
```json
{
  "success": true,
  "data": {
    "product": {
      "_id": "64a1b2c3d4e5f6g7h8i9j0k1",
      "name": "Remera Básica",
      "slug": "remera-basica",
      "description": "Remera básica de algodón",
      "price": 5000,
      "category": {
        "_id": "64a1b2c3d4e5f6g7h8i9j0k2",
        "name": "Básicas",
        "slug": "basicas"
      },
      "images": [],
      "variants": [],
      "status": "active"
    }
  }
}
```

---

### 2.3. Obtener Producto por Slug
**GET** `/api/products/slug/:slug`

**Ejemplo:**
```
GET /api/products/slug/remera-basica
```

**Respuesta:** Igual que 2.2

---

### 2.4. Crear Producto (Admin)
**POST** `/api/products`

**Headers:**
```
Authorization: Bearer <admin_token>
Content-Type: multipart/form-data
```

**Body (Form Data):**
- `name`: "Remera Básica"
- `description`: "Descripción del producto"
- `shortDescription`: "Descripción corta"
- `price`: 5000
- `comparePrice`: 6000 (opcional)
- `category`: "64a1b2c3d4e5f6g7h8i9j0k2"
- `status`: "active"
- `featured`: true/false
- `images`: [archivos de imagen]
- `variants`: JSON string con variantes

**Ejemplo de variants (JSON string):**
```json
[
  {
    "size": "M",
    "color": "Blanco",
    "stock": 10,
    "sku": "REM-BAS-M-BLA"
  },
  {
    "size": "L",
    "color": "Negro",
    "stock": 5,
    "sku": "REM-BAS-L-NEG"
  }
]
```

**Respuesta Exitosa (201):**
```json
{
  "success": true,
  "message": "Producto creado exitosamente",
  "data": {
    "product": { ... }
  }
}
```

---

### 2.5. Actualizar Producto (Admin)
**PUT** `/api/products/:id`

**Headers:**
```
Authorization: Bearer <admin_token>
Content-Type: multipart/form-data
```

**Body:** Similar a crear producto

**Respuesta Exitosa (200):**
```json
{
  "success": true,
  "message": "Producto actualizado exitosamente",
  "data": {
    "product": { ... }
  }
}
```

---

### 2.6. Eliminar Producto (Admin)
**DELETE** `/api/products/:id`

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Respuesta Exitosa (200):**
```json
{
  "success": true,
  "message": "Producto eliminado exitosamente"
}
```

---

### 2.7. Eliminar Imagen de Producto (Admin)
**DELETE** `/api/products/:id/images/:imageId`

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Respuesta Exitosa (200):**
```json
{
  "success": true,
  "message": "Imagen eliminada exitosamente",
  "data": {
    "product": { ... }
  }
}
```

---

## 3. Categorías (`/api/categories`)

### 3.1. Obtener Todas las Categorías
**GET** `/api/categories`

**Query Parameters:**
- `page` (opcional): Número de página
- `limit` (opcional): Items por página
- `isActive` (opcional): true/false

**Respuesta Exitosa (200):**
```json
{
  "success": true,
  "count": 5,
  "total": 5,
  "data": {
    "categories": [
      {
        "_id": "64a1b2c3d4e5f6g7h8i9j0k2",
        "name": "Básicas",
        "slug": "basicas",
        "description": "Remeras básicas",
        "image": "/uploads/category-123.jpg",
        "isActive": true
      }
    ]
  }
}
```

---

### 3.2. Obtener Categoría por ID
**GET** `/api/categories/:id`

**Respuesta:** Similar a 3.1

---

### 3.3. Crear Categoría (Admin)
**POST** `/api/categories`

**Headers:**
```
Authorization: Bearer <admin_token>
Content-Type: multipart/form-data
```

**Body (Form Data):**
- `name`: "Básicas"
- `description`: "Remeras básicas"
- `image`: [archivo de imagen]
- `isActive`: true

**Respuesta Exitosa (201):**
```json
{
  "success": true,
  "message": "Categoría creada exitosamente",
  "data": {
    "category": { ... }
  }
}
```

---

### 3.4. Actualizar Categoría (Admin)
**PUT** `/api/categories/:id`

**Headers:**
```
Authorization: Bearer <admin_token>
Content-Type: multipart/form-data
```

**Respuesta:** Similar a 3.3

---

### 3.5. Eliminar Categoría (Admin)
**DELETE** `/api/categories/:id`

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Respuesta Exitosa (200):**
```json
{
  "success": true,
  "message": "Categoría eliminada exitosamente"
}
```

---

## 4. Carrito (`/api/cart`)

### 4.1. Obtener Carrito
**GET** `/api/cart`

**Headers:**
```
Authorization: Bearer <token>
```

**Respuesta Exitosa (200):**
```json
{
  "success": true,
  "data": {
    "cart": {
      "_id": "64a1b2c3d4e5f6g7h8i9j0k3",
      "user": "64a1b2c3d4e5f6g7h8i9j0k1",
      "items": [
        {
          "_id": "64a1b2c3d4e5f6g7h8i9j0k4",
          "product": {
            "_id": "64a1b2c3d4e5f6g7h8i9j0k1",
            "name": "Remera Básica",
            "price": 5000,
            "images": []
          },
          "quantity": 2,
          "size": "M",
          "color": "Blanco"
        }
      ]
    },
    "total": 10000
  }
}
```

---

### 4.2. Agregar al Carrito
**POST** `/api/cart/items`

**Headers:**
```
Authorization: Bearer <token>
```

**Body:**
```json
{
  "product": "64a1b2c3d4e5f6g7h8i9j0k1",
  "quantity": 2,
  "size": "M",
  "color": "Blanco"
}
```

**Respuesta Exitosa (200):**
```json
{
  "success": true,
  "message": "Producto agregado al carrito",
  "data": {
    "cart": { ... },
    "total": 10000
  }
}
```

---

### 4.3. Actualizar Item del Carrito
**PUT** `/api/cart/items/:itemId`

**Headers:**
```
Authorization: Bearer <token>
```

**Body:**
```json
{
  "quantity": 3
}
```

**Respuesta Exitosa (200):**
```json
{
  "success": true,
  "message": "Item actualizado",
  "data": {
    "cart": { ... },
    "total": 15000
  }
}
```

---

### 4.4. Eliminar Item del Carrito
**DELETE** `/api/cart/items/:itemId`

**Headers:**
```
Authorization: Bearer <token>
```

**Respuesta Exitosa (200):**
```json
{
  "success": true,
  "message": "Item eliminado del carrito",
  "data": {
    "cart": { ... },
    "total": 0
  }
}
```

---

### 4.5. Vaciar Carrito
**DELETE** `/api/cart`

**Headers:**
```
Authorization: Bearer <token>
```

**Respuesta Exitosa (200):**
```json
{
  "success": true,
  "message": "Carrito vaciado",
  "data": {
    "cart": {
      "items": []
    }
  }
}
```

---

## 5. Pedidos (`/api/orders`)

### 5.1. Crear Pedido
**POST** `/api/orders`

**Headers:**
```
Authorization: Bearer <token>
```

**Body:**
```json
{
  "items": [
    {
      "product": "64a1b2c3d4e5f6g7h8i9j0k1",
      "quantity": 2,
      "size": "M",
      "color": "Blanco"
    }
  ],
  "shippingAddress": {
    "street": "Av. Corrientes 1234",
    "city": "Buenos Aires",
    "state": "CABA",
    "zipCode": "1043",
    "country": "Argentina",
    "phone": "+5491123456789"
  },
  "billingAddress": {
    "street": "Av. Corrientes 1234",
    "city": "Buenos Aires",
    "state": "CABA",
    "zipCode": "1043",
    "country": "Argentina"
  },
  "paymentMethod": "transfer",
  "shippingMethod": "standard",
  "shippingCost": 1000,
  "notes": "Entregar por la mañana"
}
```

**Respuesta Exitosa (201):**
```json
{
  "success": true,
  "message": "Pedido creado exitosamente",
  "data": {
    "order": {
      "_id": "64a1b2c3d4e5f6g7h8i9j0k5",
      "orderNumber": "ORD-ABC123-XYZ",
      "user": {
        "_id": "64a1b2c3d4e5f6g7h8i9j0k1",
        "name": "Juan Pérez",
        "email": "juan@example.com"
      },
      "items": [
        {
          "product": "64a1b2c3d4e5f6g7h8i9j0k1",
          "name": "Remera Básica",
          "price": 5000,
          "quantity": 2,
          "size": "M",
          "color": "Blanco"
        }
      ],
      "subtotal": 10000,
      "shippingCost": 1000,
      "total": 11000,
      "status": "pending",
      "paymentMethod": "transfer",
      "paymentStatus": "pending",
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

---

### 5.2. Obtener Todos los Pedidos
**GET** `/api/orders`

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` (opcional): Número de página
- `limit` (opcional): Items por página
- `status` (opcional): pending, confirmed, preparing, shipped, delivered, cancelled
- `paymentStatus` (opcional): pending, paid, failed, refunded

**Respuesta Exitosa (200):**
```json
{
  "success": true,
  "count": 10,
  "total": 25,
  "page": 1,
  "pages": 3,
  "data": {
    "orders": [
      {
        "_id": "64a1b2c3d4e5f6g7h8i9j0k5",
        "orderNumber": "ORD-ABC123-XYZ",
        "user": {
          "_id": "64a1b2c3d4e5f6g7h8i9j0k1",
          "name": "Juan Pérez",
          "email": "juan@example.com"
        },
        "items": [],
        "total": 11000,
        "status": "pending",
        "createdAt": "2024-01-15T10:30:00.000Z"
      }
    ]
  }
}
```

---

### 5.3. Obtener Pedido por ID
**GET** `/api/orders/:id`

**Headers:**
```
Authorization: Bearer <token>
```

**Respuesta Exitosa (200):**
```json
{
  "success": true,
  "data": {
    "order": {
      "_id": "64a1b2c3d4e5f6g7h8i9j0k5",
      "orderNumber": "ORD-ABC123-XYZ",
      "user": {
        "_id": "64a1b2c3d4e5f6g7h8i9j0k1",
        "name": "Juan Pérez",
        "email": "juan@example.com",
        "phone": "+5491123456789"
      },
      "items": [
        {
          "product": {
            "_id": "64a1b2c3d4e5f6g7h8i9j0k1",
            "name": "Remera Básica",
            "images": [],
            "slug": "remera-basica"
          },
          "name": "Remera Básica",
          "price": 5000,
          "quantity": 2,
          "size": "M",
          "color": "Blanco"
        }
      ],
      "shippingAddress": {},
      "subtotal": 10000,
      "shippingCost": 1000,
      "total": 11000,
      "status": "pending",
      "paymentMethod": "transfer",
      "paymentStatus": "pending",
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

---

### 5.4. Actualizar Estado del Pedido (Admin)
**PUT** `/api/orders/:id/status`

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Body:**
```json
{
  "status": "confirmed",
  "adminNotes": "Pedido confirmado y en preparación"
}
```

**Estados posibles:**
- `pending`
- `confirmed`
- `preparing`
- `shipped`
- `delivered`
- `cancelled`

**Respuesta Exitosa (200):**
```json
{
  "success": true,
  "message": "Estado del pedido actualizado exitosamente",
  "data": {
    "order": { ... }
  }
}
```

---

### 5.5. Actualizar Estado de Pago (Admin)
**PUT** `/api/orders/:id/payment-status`

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Body:**
```json
{
  "paymentStatus": "paid"
}
```

**Estados posibles:**
- `pending`
- `paid`
- `failed`
- `refunded`

**Respuesta Exitosa (200):**
```json
{
  "success": true,
  "message": "Estado de pago actualizado exitosamente",
  "data": {
    "order": { ... }
  }
}
```

---

### 5.6. Cancelar Pedido
**PUT** `/api/orders/:id/cancel`

**Headers:**
```
Authorization: Bearer <token>
```

**Respuesta Exitosa (200):**
```json
{
  "success": true,
  "message": "Pedido cancelado exitosamente",
  "data": {
    "order": { ... }
  }
}
```

---

## 6. Usuarios (`/api/users`)

### 6.1. Obtener Todos los Usuarios (Admin)
**GET** `/api/users`

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Query Parameters:**
- `page` (opcional): Número de página
- `limit` (opcional): Items por página
- `role` (opcional): admin, customer
- `search` (opcional): Búsqueda por nombre/email

**Respuesta Exitosa (200):**
```json
{
  "success": true,
  "count": 10,
  "total": 50,
  "page": 1,
  "pages": 5,
  "data": {
    "users": [
      {
        "_id": "64a1b2c3d4e5f6g7h8i9j0k1",
        "name": "Juan Pérez",
        "email": "juan@example.com",
        "role": "customer",
        "phone": "+5491123456789",
        "isEmailVerified": true,
        "isActive": true,
        "createdAt": "2024-01-15T10:30:00.000Z"
      }
    ]
  }
}
```

---

### 6.2. Obtener Usuario por ID (Admin)
**GET** `/api/users/:id`

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Respuesta:** Similar a 6.1

---

### 6.3. Actualizar Usuario
**PUT** `/api/users/:id`

**Headers:**
```
Authorization: Bearer <token>
```

**Body:**
```json
{
  "name": "Juan Carlos Pérez",
  "phone": "+5491123456789"
}
```

**Respuesta Exitosa (200):**
```json
{
  "success": true,
  "message": "Usuario actualizado exitosamente",
  "data": {
    "user": { ... }
  }
}
```

---

### 6.4. Eliminar Usuario (Admin)
**DELETE** `/api/users/:id`

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Respuesta Exitosa (200):**
```json
{
  "success": true,
  "message": "Usuario eliminado exitosamente"
}
```

---

### 6.5. Obtener Pedidos de Usuario
**GET** `/api/users/:id/orders`

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` (opcional): Número de página
- `limit` (opcional): Items por página

**Respuesta:** Similar a 5.2

---

### 6.6. Agregar Dirección
**POST** `/api/users/:id/addresses`

**Headers:**
```
Authorization: Bearer <token>
```

**Body:**
```json
{
  "street": "Av. Corrientes 1234",
  "city": "Buenos Aires",
  "state": "CABA",
  "zipCode": "1043",
  "country": "Argentina",
  "isDefault": true
}
```

**Respuesta Exitosa (200):**
```json
{
  "success": true,
  "message": "Dirección agregada exitosamente",
  "data": {
    "user": {
      "addresses": [
        {
          "_id": "64a1b2c3d4e5f6g7h8i9j0k6",
          "street": "Av. Corrientes 1234",
          "city": "Buenos Aires",
          "state": "CABA",
          "zipCode": "1043",
          "country": "Argentina",
          "isDefault": true
        }
      ]
    }
  }
}
```

---

### 6.7. Actualizar Dirección
**PUT** `/api/users/:id/addresses/:addressId`

**Headers:**
```
Authorization: Bearer <token>
```

**Body:**
```json
{
  "street": "Av. Corrientes 5678",
  "isDefault": true
}
```

**Respuesta:** Similar a 6.6

---

### 6.8. Eliminar Dirección
**DELETE** `/api/users/:id/addresses/:addressId`

**Headers:**
```
Authorization: Bearer <token>
```

**Respuesta Exitosa (200):**
```json
{
  "success": true,
  "message": "Dirección eliminada exitosamente",
  "data": {
    "user": { ... }
  }
}
```

---

## 7. Configuración de Tienda (`/api/store`)

### 7.1. Obtener Configuración
**GET** `/api/store/config`

**Respuesta Exitosa (200):**
```json
{
  "success": true,
  "data": {
    "config": {
      "_id": "64a1b2c3d4e5f6g7h8i9j0k7",
      "storeName": "Remeras Lisas",
      "storeDescription": "Tu tienda de remeras",
      "contactEmail": "contacto@remeraslisas.com",
      "contactPhone": "+5491123456789",
      "address": {
        "street": "Av. Corrientes 1234",
        "city": "Buenos Aires",
        "state": "CABA",
        "zipCode": "1043",
        "country": "Argentina"
      },
      "socialMedia": {
        "facebook": "https://facebook.com/remeraslisas",
        "instagram": "https://instagram.com/remeraslisas",
        "whatsapp": "+5491123456789"
      },
      "shippingOptions": [
        {
          "name": "Envío Estándar",
          "method": "standard",
          "cost": 1000,
          "estimatedDays": 5,
          "isActive": true
        }
      ],
      "paymentMethods": [
        {
          "name": "Transferencia Bancaria",
          "method": "transfer",
          "isActive": true,
          "instructions": "Transferir a cuenta..."
        }
      ],
      "currency": "ARS",
      "taxRate": 0,
      "minOrderAmount": 0,
      "freeShippingThreshold": 10000
    }
  }
}
```

---

### 7.2. Actualizar Configuración (Admin)
**PUT** `/api/store/config`

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Body:**
```json
{
  "storeName": "Remeras Lisas",
  "contactEmail": "contacto@remeraslisas.com",
  "shippingOptions": [
    {
      "name": "Envío Estándar",
      "method": "standard",
      "cost": 1000,
      "estimatedDays": 5,
      "isActive": true
    }
  ]
}
```

**Respuesta Exitosa (200):**
```json
{
  "success": true,
  "message": "Configuración actualizada exitosamente",
  "data": {
    "config": { ... }
  }
}
```

---

## 8. Estadísticas (`/api/stats`)

### 8.1. Obtener Estadísticas del Dashboard (Admin)
**GET** `/api/stats/dashboard`

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Query Parameters:**
- `startDate` (opcional): Fecha de inicio (ISO format)
- `endDate` (opcional): Fecha de fin (ISO format)

**Respuesta Exitosa (200):**
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalOrders": 150,
      "totalRevenue": 1500000,
      "totalCustomers": 50,
      "totalProducts": 30,
      "lowStockProducts": 5
    },
    "ordersByStatus": {
      "pending": 10,
      "confirmed": 5,
      "preparing": 3,
      "shipped": 20,
      "delivered": 100,
      "cancelled": 12
    },
    "recentOrders": [
      {
        "_id": "64a1b2c3d4e5f6g7h8i9j0k5",
        "orderNumber": "ORD-ABC123-XYZ",
        "user": {
          "_id": "64a1b2c3d4e5f6g7h8i9j0k1",
          "name": "Juan Pérez",
          "email": "juan@example.com"
        },
        "total": 11000,
        "status": "pending",
        "createdAt": "2024-01-15T10:30:00.000Z"
      }
    ],
    "topProducts": [
      {
        "product": {
          "_id": "64a1b2c3d4e5f6g7h8i9j0k1",
          "name": "Remera Básica",
          "images": []
        },
        "totalSold": 50,
        "totalRevenue": 250000
      }
    ]
  }
}
```

---

### 8.2. Obtener Reporte de Ventas (Admin)
**GET** `/api/stats/sales`

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Query Parameters:**
- `startDate` (opcional): Fecha de inicio
- `endDate` (opcional): Fecha de fin
- `groupBy` (opcional): day, month, year (default: day)

**Respuesta Exitosa (200):**
```json
{
  "success": true,
  "data": {
    "sales": [
      {
        "_id": "2024-01-15",
        "totalSales": 50000,
        "orderCount": 5
      },
      {
        "_id": "2024-01-16",
        "totalSales": 75000,
        "orderCount": 8
      }
    ]
  }
}
```

---

## 9. Health Check

### 9.1. Verificar Estado del Servidor
**GET** `/health`

**Respuesta Exitosa (200):**
```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

## Códigos de Estado HTTP

- `200` - OK: Solicitud exitosa
- `201` - Created: Recurso creado exitosamente
- `400` - Bad Request: Error en la solicitud
- `401` - Unauthorized: No autenticado
- `403` - Forbidden: Sin permisos
- `404` - Not Found: Recurso no encontrado
- `500` - Internal Server Error: Error del servidor

---

## Errores

Todas las respuestas de error siguen este formato:

```json
{
  "success": false,
  "message": "Mensaje de error descriptivo"
}
```

Ejemplos:

**Error de validación:**
```json
{
  "success": false,
  "message": "Errores de validación",
  "errors": [
    {
      "msg": "El email es requerido",
      "param": "email",
      "location": "body"
    }
  ]
}
```

**Error de autenticación:**
```json
{
  "success": false,
  "message": "No autorizado. Token no proporcionado."
}
```

---

## Notas Importantes

1. **Autenticación**: La mayoría de los endpoints requieren un token JWT en el header `Authorization: Bearer <token>`

2. **Roles**: 
   - `admin`: Acceso completo
   - `customer`: Acceso limitado a sus propios recursos

3. **Imágenes**: Las imágenes se suben usando `multipart/form-data` y se almacenan en `/uploads`

4. **Paginación**: Los endpoints que devuelven listas soportan paginación con `page` y `limit`

5. **Filtros y Búsqueda**: Muchos endpoints soportan filtros y búsqueda mediante query parameters

6. **Email**: El sistema envía emails automáticamente para:
   - Verificación de email
   - Confirmación de pedidos
   - Actualizaciones de estado de pedidos
   - Recuperación de contraseña

---

## Variables de Entorno Requeridas

Asegúrate de configurar estas variables en tu archivo `.env`:

```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/remeras-lisas
JWT_SECRET=your-secret-key
JWT_EXPIRE=7d
SENDGRID_API_KEY=your-sendgrid-key
SENDGRID_FROM_EMAIL=noreply@remeraslisas.com
FRONTEND_URL=http://localhost:3001
```

---

¡Listo para probar en Postman! 🚀


