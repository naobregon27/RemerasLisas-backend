# Especificación de API para Frontend
## RemerasLisas - Backend API

**Versión:** 1.0  
**Fecha:** 2024  
**Última actualización:** Después de correcciones de categorías y productos destacados/ofertas

---

## 📋 Índice

1. [Panel de Administración](#panel-de-administración)
2. [Ecommerce / Tienda Pública](#ecommerce--tienda-pública)
3. [Formato de Datos](#formato-de-datos)
4. [Validaciones Importantes](#validaciones-importantes)
5. [Ejemplos de Requests/Responses](#ejemplos-de-requestsresponses)

---

## 🛠️ Panel de Administración

### Crear Producto

**Endpoint:** `POST /api/productos`

**Headers:**
```
Authorization: Bearer {token}
Content-Type: multipart/form-data
```

**Campos del Formulario:**

| Campo | Tipo | Requerido | Descripción | Valores Válidos |
|-------|------|-----------|-------------|-----------------|
| `nombre` | string | ✅ Sí | Nombre del producto | Texto, máx 200 caracteres |
| `descripcion` | string | ✅ Sí | Descripción del producto | Texto |
| `precio` | number | ✅ Sí | Precio del producto | Número positivo |
| `precioAnterior` | number | ❌ No | Precio anterior (para mostrar descuento) | Número positivo o 0 |
| `stock` | number | ❌ No | Cantidad en stock | Entero positivo, default: 0 |
| `categoria` | string (ObjectId) | ✅ Sí | ID de la categoría | Debe existir y pertenecer al mismo local |
| `local` | string (ObjectId) | ⚠️ Condicional | ID del local | Para admin: se asigna automáticamente |
| `destacado` | boolean/string | ❌ No | Si el producto es destacado | `true`, `false`, `"true"`, `"false"`, `1`, `0` |
| `enOferta` | boolean/string | ❌ No | Si el producto está en oferta | `true`, `false`, `"true"`, `"false"`, `1`, `0` |
| `porcentajeDescuento` | number | ❌ No | Porcentaje de descuento | 0-100, default: 0 |
| `etiquetas` | string (JSON) | ❌ No | Array de etiquetas | JSON string: `["tag1", "tag2"]` |
| `caracteristicas` | string (JSON) | ❌ No | Array de características | JSON string: `[{"nombre": "Color", "valor": "Rojo"}]` |
| `variantes` | string (JSON) | ❌ No | Array de variantes | JSON string: Ver ejemplo abajo |
| `imagen` | file | ❌ No | Imagen principal del producto | JPG, PNG, WEBP |

**⚠️ IMPORTANTE - Campos Booleanos (`destacado` y `enOferta`):**

El backend acepta múltiples formatos y los normaliza automáticamente:

✅ **Valores Válidos:**
- `true` (boolean)
- `false` (boolean)
- `"true"` (string)
- `"false"` (string)
- `"1"` (string) → se convierte a `true`
- `"0"` (string) → se convierte a `false`
- `1` (number) → se convierte a `true`
- `0` (number) → se convierte a `false`

❌ **Valores que se interpretan como `false`:**
- `undefined`
- `null`
- `""` (string vacío)
- Cualquier otro valor no reconocido

**Ejemplo de Request (FormData):**
```javascript
const formData = new FormData();
formData.append('nombre', 'Remera Oversize Dama');
formData.append('descripcion', 'Remera de algodón oversize para dama');
formData.append('precio', '15000');
formData.append('categoria', '507f1f77bcf86cd799439011'); // ID de categoría
formData.append('destacado', 'true'); // ✅ CORRECTO
formData.append('enOferta', 'false'); // ✅ CORRECTO
formData.append('imagen', fileInput.files[0]);

// ❌ INCORRECTO - No enviar si es false, o enviar explícitamente 'false'
// formData.append('destacado', ''); // Esto se interpreta como false
// formData.append('enOferta', undefined); // Esto se interpreta como false
```

**Ejemplo de Request (JSON - sin imagen):**
```json
{
  "nombre": "Remera Oversize Dama",
  "descripcion": "Remera de algodón oversize para dama",
  "precio": 15000,
  "categoria": "507f1f77bcf86cd799439011",
  "destacado": true,
  "enOferta": false,
  "stock": 50
}
```

**Response Exitosa (201):**
```json
{
  "_id": "507f1f77bcf86cd799439012",
  "nombre": "Remera Oversize Dama",
  "descripcion": "Remera de algodón oversize para dama",
  "precio": 15000,
  "precioAnterior": 0,
  "stock": 50,
  "categoria": "507f1f77bcf86cd799439011",
  "local": "507f1f77bcf86cd799439010",
  "destacado": true,
  "enOferta": false,
  "porcentajeDescuento": 0,
  "imagenes": [
    {
      "url": "data:image/jpeg;base64,...",
      "alt": "Remera Oversize Dama"
    }
  ],
  "isActive": true,
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

---

### Actualizar Producto

**Endpoint:** `PUT /api/productos/:id`

**Headers:**
```
Authorization: Bearer {token}
Content-Type: multipart/form-data
```

**⚠️ IMPORTANTE - Actualización de Campos Booleanos:**

Cuando actualizas un producto, **SIEMPRE debes enviar explícitamente** los valores de `destacado` y `enOferta`, incluso si quieres establecerlos en `false`.

**❌ INCORRECTO - No enviar el campo:**
```javascript
// Si no envías el campo, el valor anterior se mantiene
const formData = new FormData();
formData.append('nombre', 'Nuevo nombre');
// destacado y enOferta NO se envían → se mantienen los valores anteriores
```

**✅ CORRECTO - Enviar explícitamente:**
```javascript
const formData = new FormData();
formData.append('nombre', 'Nuevo nombre');
formData.append('destacado', 'false'); // ✅ Enviar explícitamente
formData.append('enOferta', 'false'); // ✅ Enviar explícitamente
```

**Campos que se pueden actualizar:**
- Todos los campos del producto (mismos que en creación)
- Si no envías un campo, se mantiene el valor anterior (excepto para booleanos que debes enviar explícitamente)

---

### Crear Categoría

**Endpoint:** `POST /api/categorias`

**Headers:**
```
Authorization: Bearer {token}
Content-Type: multipart/form-data
```

**Campos del Formulario:**

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `nombre` | string | ✅ Sí | Nombre de la categoría (único por local) |
| `descripcion` | string | ❌ No | Descripción de la categoría |
| `localId` | string (ObjectId) | ⚠️ Condicional | ID del local | Para admin: se asigna automáticamente |
| `categoriaPadreId` | string (ObjectId) | ❌ No | ID de categoría padre (para subcategorías) |
| `imagen` | file | ❌ No | Imagen de la categoría |

**⚠️ IMPORTANTE - Categorías por Local:**

- Cada local tiene sus propias categorías
- El nombre de categoría puede repetirse entre diferentes locales
- Al crear un producto, la categoría DEBE pertenecer al mismo local que el producto
- Si eres admin, el `localId` se asigna automáticamente a tu local asignado

**Ejemplo de Request:**
```javascript
const formData = new FormData();
formData.append('nombre', 'Remeras Oversize');
formData.append('descripcion', 'Categoría de remeras oversize');
formData.append('imagen', fileInput.files[0]);
```

---

## 🛒 Ecommerce / Tienda Pública

### Obtener Productos por Categoría

**Endpoint:** `GET /api/tiendas/:slug/categorias/:categoriaSlug`

**Parámetros:**
- `slug` (URL): Slug de la tienda (ej: `"mi-tienda"`)
- `categoriaSlug` (URL): Slug de la categoría (ej: `"remeras-oversize"`)

**Query Parameters:**
- `page` (number, opcional): Número de página, default: 1
- `limit` (number, opcional): Productos por página, default: 12

**⚠️ IMPORTANTE - Validación de Categorías:**

El backend ahora valida que:
1. La categoría existe
2. La categoría pertenece al mismo local que la tienda
3. Si la categoría no pertenece al local, retorna 404

**Ejemplo de Request:**
```
GET /api/tiendas/mi-tienda/categorias/remeras-oversize?page=1&limit=12
```

**Response Exitosa (200):**
```json
{
  "productos": [
    {
      "_id": "507f1f77bcf86cd799439012",
      "nombre": "Remera Oversize Dama",
      "descripcion": "Remera de algodón oversize para dama",
      "precio": 15000,
      "imagenes": [
        {
          "url": "data:image/jpeg;base64,...",
          "alt": "Remera Oversize Dama"
        }
      ],
      "slug": "remera-oversize-dama",
      "stock": 50,
      "descuento": 0
    }
  ],
  "paginacion": {
    "total": 1,
    "paginas": 1,
    "paginaActual": 1,
    "porPagina": 12
  }
}
```

**Response Error (404):**
```json
{
  "msg": "Categoría no encontrada o inactiva"
}
```

---

### Obtener Categorías de una Tienda

**Endpoint:** `GET /api/tiendas/:slug/categorias`

**⚠️ IMPORTANTE:**

- Solo devuelve categorías que:
  1. Tienen productos activos en esa tienda
  2. Pertenecen al mismo local que la tienda
  3. Están activas (`isActive: true`)

**Response:**
```json
[
  {
    "_id": "507f1f77bcf86cd799439011",
    "nombre": "Remeras Oversize",
    "slug": "remeras-oversize",
    "descripcion": "Categoría de remeras oversize",
    "imagen": "/uploads/categoria-123.jpg"
  }
]
```

---

### Obtener Productos Destacados

**Endpoint:** `GET /api/tiendas/:slug/destacados`

**Response:**
```json
[
  {
    "_id": "507f1f77bcf86cd799439012",
    "nombre": "Remera Oversize Dama",
    "descripcion": "Remera de algodón oversize para dama",
    "precio": 15000,
    "imagenes": [...],
    "slug": "remera-oversize-dama",
    "stock": 50,
    "descuento": 0
  }
]
```

**⚠️ IMPORTANTE:**

- Solo devuelve productos donde `destacado: true`
- Solo productos activos (`isActive: true`)
- Solo productos del local de la tienda

---

### Obtener Productos en Oferta

**Endpoint:** `GET /api/productos?enOferta=true&local={localId}`

**Query Parameters:**
- `enOferta`: `"true"` (string)
- `local`: ID del local (opcional, pero recomendado)

**⚠️ IMPORTANTE:**

- Solo devuelve productos donde `enOferta: true`
- Solo productos activos (`isActive: true`)

---

## 📊 Formato de Datos

### Estructura de Producto Completa

```json
{
  "_id": "507f1f77bcf86cd799439012",
  "nombre": "Remera Oversize Dama",
  "slug": "remera-oversize-dama",
  "descripcion": "Remera de algodón oversize para dama",
  "precio": 15000,
  "precioAnterior": 18000,
  "stock": 50,
  "categoria": {
    "_id": "507f1f77bcf86cd799439011",
    "nombre": "Remeras Oversize"
  },
  "local": {
    "_id": "507f1f77bcf86cd799439010",
    "nombre": "Mi Tienda"
  },
  "imagenes": [
    {
      "url": "data:image/jpeg;base64,...",
      "alt": "Remera Oversize Dama"
    }
  ],
  "etiquetas": ["oversize", "dama", "algodón"],
  "caracteristicas": [
    {
      "nombre": "Material",
      "valor": "Algodón 100%"
    }
  ],
  "variantes": [
    {
      "nombre": "Talle",
      "opciones": [
        {
          "valor": "S",
          "precio": 15000,
          "stock": 10
        },
        {
          "valor": "M",
          "precio": 15000,
          "stock": 20
        }
      ]
    }
  ],
  "destacado": true,
  "enOferta": true,
  "porcentajeDescuento": 15,
  "calificacion": 4.5,
  "numeroReviews": 10,
  "isActive": true,
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

---

## ✅ Validaciones Importantes

### 1. Categorías y Locales

✅ **CORRECTO:**
- Crear categoría para tu local asignado
- Asignar producto a categoría del mismo local
- Buscar productos por categoría del mismo local

❌ **INCORRECTO:**
- Asignar producto a categoría de otro local
- Buscar categoría de otro local en una tienda

**Código de Error:**
```json
{
  "mensaje": "La categoría seleccionada no existe"
}
```

---

### 2. Campos Booleanos (destacado, enOferta)

✅ **CORRECTO:**
```javascript
// Crear producto
formData.append('destacado', 'true');
formData.append('enOferta', 'false');

// Actualizar producto (SIEMPRE enviar explícitamente)
formData.append('destacado', producto.destacado ? 'true' : 'false');
formData.append('enOferta', producto.enOferta ? 'true' : 'false');
```

❌ **INCORRECTO:**
```javascript
// No enviar el campo en actualización
// El valor anterior se mantiene, causando inconsistencias
```

---

### 3. Validación de Categoría en Tienda Pública

El backend valida automáticamente que:
1. La categoría existe
2. La categoría pertenece al mismo local que la tienda
3. La categoría está activa

Si alguna validación falla, retorna 404.

---

## 🔄 Flujo Recomendado para Frontend

### Crear Producto (Admin)

```javascript
async function crearProducto(productoData, imagen) {
  const formData = new FormData();
  
  // Campos obligatorios
  formData.append('nombre', productoData.nombre);
  formData.append('descripcion', productoData.descripcion);
  formData.append('precio', productoData.precio);
  formData.append('categoria', productoData.categoriaId);
  
  // Campos opcionales - SIEMPRE enviar booleanos explícitamente
  if (productoData.stock !== undefined) {
    formData.append('stock', productoData.stock);
  }
  
  // ⚠️ IMPORTANTE: Enviar booleanos explícitamente
  formData.append('destacado', productoData.destacado ? 'true' : 'false');
  formData.append('enOferta', productoData.enOferta ? 'true' : 'false');
  
  if (productoData.enOferta && productoData.porcentajeDescuento) {
    formData.append('porcentajeDescuento', productoData.porcentajeDescuento);
  }
  
  if (imagen) {
    formData.append('imagen', imagen);
  }
  
  const response = await fetch('/api/productos', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });
  
  return await response.json();
}
```

### Actualizar Producto (Admin)

```javascript
async function actualizarProducto(productoId, productoData, imagen) {
  const formData = new FormData();
  
  // Solo enviar campos que se actualizan
  if (productoData.nombre) formData.append('nombre', productoData.nombre);
  if (productoData.descripcion) formData.append('descripcion', productoData.descripcion);
  if (productoData.precio) formData.append('precio', productoData.precio);
  if (productoData.categoriaId) formData.append('categoria', productoData.categoriaId);
  
  // ⚠️ CRÍTICO: SIEMPRE enviar booleanos explícitamente
  // No importa si cambian o no, siempre enviar el valor actual
  formData.append('destacado', productoData.destacado ? 'true' : 'false');
  formData.append('enOferta', productoData.enOferta ? 'true' : 'false');
  
  if (imagen) {
    formData.append('imagen', imagen);
  }
  
  const response = await fetch(`/api/productos/${productoId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });
  
  return await response.json();
}
```

### Obtener Productos por Categoría (Ecommerce)

```javascript
async function obtenerProductosPorCategoria(tiendaSlug, categoriaSlug, page = 1) {
  const response = await fetch(
    `/api/tiendas/${tiendaSlug}/categorias/${categoriaSlug}?page=${page}&limit=12`
  );
  
  if (response.status === 404) {
    // Categoría no encontrada o no pertenece a esta tienda
    return { productos: [], paginacion: { total: 0 } };
  }
  
  return await response.json();
}
```

---

## 🐛 Errores Comunes y Soluciones

### Error: "Categoría no encontrada o inactiva"

**Causa:** La categoría no existe o no pertenece al mismo local que la tienda.

**Solución:**
- Verificar que la categoría existe
- Verificar que la categoría pertenece al mismo local
- Verificar que la categoría está activa (`isActive: true`)

---

### Error: Producto aparece como destacado/oferta cuando no debería

**Causa:** No se envió explícitamente el valor `false` al actualizar.

**Solución:**
```javascript
// ❌ INCORRECTO
const formData = new FormData();
formData.append('nombre', 'Nuevo nombre');
// No se envía destacado/enOferta → se mantiene valor anterior

// ✅ CORRECTO
const formData = new FormData();
formData.append('nombre', 'Nuevo nombre');
formData.append('destacado', 'false'); // Enviar explícitamente
formData.append('enOferta', 'false'); // Enviar explícitamente
```

---

### Error: Productos aparecen en categoría incorrecta

**Causa:** La categoría no pertenece al mismo local que el producto.

**Solución:**
- Al crear producto, verificar que la categoría pertenece al mismo local
- Al buscar productos por categoría, el backend ahora valida automáticamente

---

## 📝 Notas Finales

1. **Siempre enviar booleanos explícitamente** en actualizaciones de productos
2. **Validar que categorías pertenezcan al mismo local** antes de asignarlas a productos
3. **El backend ahora valida automáticamente** las relaciones local-categoría en búsquedas públicas
4. **Usar los valores normalizados** que acepta el backend para booleanos (ver tabla arriba)

---

## 📞 Soporte

Si encuentras inconsistencias o errores, verificar:
1. Que los valores booleanos se envían explícitamente
2. Que las categorías pertenecen al mismo local
3. Que los productos están activos (`isActive: true`)
4. Que las categorías están activas (`isActive: true`)

---

**Última actualización:** Después de correcciones de validación de categorías y normalización de booleanos.

