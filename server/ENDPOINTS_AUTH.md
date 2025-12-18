# Documentación de Endpoints de Autenticación

## Endpoints Existentes (Sin cambios)

### POST /api/auth/register
Registra un nuevo usuario. Ahora envía automáticamente un código de verificación de 6 dígitos al email.

**Body:**
```json
{
  "name": "Juan Pérez",
  "email": "juan@example.com",
  "password": "password123",
  "role": "usuario", // opcional, default: "usuario"
  "localId": "..." // opcional
}
```

**Response:**
```json
{
  "_id": "...",
  "name": "Juan Pérez",
  "email": "juan@example.com",
  "role": "usuario",
  "local": null,
  "emailVerified": false,
  "message": "Usuario registrado. Por favor verifica tu email con el código enviado.",
  "token": "..."
}
```

### POST /api/auth/login
Inicia sesión. Ahora verifica que el email esté verificado y maneja 2FA si está habilitado.

**Body:**
```json
{
  "email": "juan@example.com",
  "password": "password123"
}
```

**Response (sin 2FA):**
```json
{
  "_id": "...",
  "name": "Juan Pérez",
  "email": "juan@example.com",
  "role": "usuario",
  "local": null,
  "lastLogin": "...",
  "loginCount": 1,
  "emailVerified": true,
  "twoFactorEnabled": false,
  "token": "..."
}
```

**Response (con 2FA habilitado):**
```json
{
  "message": "Código de autenticación de dos factores enviado a tu email",
  "requires2FA": true,
  "_id": "..."
}
```

### GET /api/auth/profile
Obtiene el perfil del usuario autenticado.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "_id": "...",
  "name": "Juan Pérez",
  "email": "juan@example.com",
  "role": "usuario",
  "local": null,
  "createdAt": "...",
  "lastLogin": "...",
  "loginCount": 1,
  "passwordChangedAt": null,
  "emailVerified": true,
  "twoFactorEnabled": false
}
```

### PUT /api/auth/profile
Actualiza el perfil del usuario autenticado.

**Headers:**
```
Authorization: Bearer <token>
```

**Body:**
```json
{
  "name": "Juan Pérez Actualizado",
  "email": "nuevo@example.com",
  "password": "nuevapassword123" // opcional
}
```

### POST /api/auth/logout
Cierra sesión del usuario.

**Headers:**
```
Authorization: Bearer <token>
```

---

## Nuevos Endpoints

### POST /api/auth/verify-email
Verifica el código de verificación de email enviado al registrarse.

**Headers:**
```
Authorization: Bearer <token>
```

**Body:**
```json
{
  "code": "123456"
}
```

**Response:**
```json
{
  "message": "Email verificado exitosamente",
  "emailVerified": true
}
```

**Errores posibles:**
- `400`: Código incorrecto o expirado
- `400`: Email ya verificado
- `404`: Usuario no encontrado

---

### POST /api/auth/resend-verification-code
Reenvía el código de verificación de email.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "message": "Código de verificación reenviado a tu email"
}
```

**Errores posibles:**
- `400`: Email ya verificado
- `404`: Usuario no encontrado

---

### POST /api/auth/forgot-password
Solicita recuperación de contraseña. Envía un email con un enlace para restablecer la contraseña.

**Body:**
```json
{
  "email": "juan@example.com"
}
```

**Response:**
```json
{
  "message": "Si el email existe, recibirás un enlace para restablecer tu contraseña"
}
```

**Nota:** Por seguridad, siempre devuelve el mismo mensaje independientemente de si el email existe o no.

---

### POST /api/auth/reset-password
Restablece la contraseña usando el token recibido por email.

**Body:**
```json
{
  "token": "token_recibido_por_email",
  "password": "nuevapassword123"
}
```

**Response:**
```json
{
  "message": "Contraseña restablecida exitosamente"
}
```

**Errores posibles:**
- `400`: Token inválido o expirado
- `400`: Token y contraseña son requeridos

**Nota:** El token expira en 1 hora.

---

### POST /api/auth/verify-2fa
Verifica el código 2FA y completa el login cuando 2FA está habilitado.

**Body:**
```json
{
  "userId": "user_id_del_response_del_login",
  "code": "123456"
}
```

**Response:**
```json
{
  "_id": "...",
  "name": "Juan Pérez",
  "email": "juan@example.com",
  "role": "usuario",
  "local": null,
  "lastLogin": "...",
  "loginCount": 1,
  "emailVerified": true,
  "twoFactorEnabled": true,
  "token": "..."
}
```

**Errores posibles:**
- `400`: Código incorrecto o expirado
- `400`: 2FA no habilitado
- `404`: Usuario no encontrado

---

### POST /api/auth/enable-2fa
Habilita la autenticación de dos factores para el usuario autenticado.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "message": "2FA habilitado exitosamente",
  "twoFactorEnabled": true,
  "backupCodes": [
    "A1B2C3D4",
    "E5F6G7H8",
    ...
  ]
}
```

**Errores posibles:**
- `400`: Email no verificado
- `400`: 2FA ya habilitado
- `404`: Usuario no encontrado

**Nota:** Los códigos de respaldo se muestran solo una vez. Guárdalos en un lugar seguro.

---

### POST /api/auth/disable-2fa
Deshabilita la autenticación de dos factores. Requiere la contraseña del usuario.

**Headers:**
```
Authorization: Bearer <token>
```

**Body:**
```json
{
  "password": "password123"
}
```

**Response:**
```json
{
  "message": "2FA deshabilitado exitosamente",
  "twoFactorEnabled": false
}
```

**Errores posibles:**
- `400`: Contraseña requerida
- `401`: Contraseña incorrecta
- `404`: Usuario no encontrado

---

## Flujo de Registro y Verificación

1. **Registro:** `POST /api/auth/register`
   - Se crea el usuario
   - Se envía código de 6 dígitos al email
   - El usuario recibe un token pero `emailVerified: false`

2. **Verificación:** `POST /api/auth/verify-email`
   - Usuario ingresa el código recibido
   - Si es correcto, se marca `emailVerified: true`
   - Se envía email de bienvenida

3. **Reenvío de código:** `POST /api/auth/resend-verification-code`
   - Si el código expiró o no llegó, se puede reenviar

---

## Flujo de Login con 2FA

1. **Login:** `POST /api/auth/login`
   - Si 2FA está habilitado, se envía código al email
   - Response incluye `requires2FA: true` y `_id`

2. **Verificación 2FA:** `POST /api/auth/verify-2fa`
   - Usuario ingresa código recibido por email
   - Si es correcto, recibe el token de autenticación

---

## Flujo de Recuperación de Contraseña

1. **Solicitar recuperación:** `POST /api/auth/forgot-password`
   - Se envía email con token de recuperación

2. **Restablecer contraseña:** `POST /api/auth/reset-password`
   - Usuario usa el token del email para establecer nueva contraseña

---

## Notificaciones de Email Automáticas

### Confirmación de Pedido
Cuando se crea un pedido (`POST /api/pedidos`), se envía automáticamente un email de confirmación con los detalles del pedido.

### Cambio de Estado de Pedido
Cuando se actualiza el estado de un pedido (`PUT /api/pedidos/:id/estado`), se envía automáticamente un email al usuario notificando el cambio.

---

## Variables de Entorno Requeridas

Asegúrate de tener estas variables en tu `.env`:

```env
SENDGRID_API_KEY=tu_api_key_de_sendgrid
SENDGRID_FROM_EMAIL=remeraslisas89@gmail.com
SENDGRID_FROM_NAME=Remeras Lisas
FRONTEND_URL=http://localhost:3001
```

---

## Notas Importantes

1. **Códigos de verificación expiran en 10 minutos**
2. **Tokens de recuperación de contraseña expiran en 1 hora**
3. **Los emails se envían de forma asíncrona** - si falla el envío, no afecta la operación principal
4. **Por seguridad, los mensajes de error no revelan si un email existe o no**
5. **2FA requiere email verificado**
6. **Los códigos de respaldo de 2FA se muestran solo una vez**

---

## Ejemplos de Uso con Postman

### 1. Registro y Verificación
```
POST /api/auth/register
Body: { "name": "Test", "email": "test@test.com", "password": "123456" }

POST /api/auth/verify-email
Headers: Authorization: Bearer <token_del_registro>
Body: { "code": "123456" }
```

### 2. Login Normal
```
POST /api/auth/login
Body: { "email": "test@test.com", "password": "123456" }
```

### 3. Login con 2FA
```
POST /api/auth/login
Body: { "email": "test@test.com", "password": "123456" }
// Response: requires2FA: true

POST /api/auth/verify-2fa
Body: { "userId": "...", "code": "123456" }
```

### 4. Recuperación de Contraseña
```
POST /api/auth/forgot-password
Body: { "email": "test@test.com" }

POST /api/auth/reset-password
Body: { "token": "token_del_email", "password": "nuevapassword" }
```

### 5. Habilitar 2FA
```
POST /api/auth/enable-2fa
Headers: Authorization: Bearer <token>
```

### 6. Deshabilitar 2FA
```
POST /api/auth/disable-2fa
Headers: Authorization: Bearer <token>
Body: { "password": "123456" }
```

