# 🛒 CONFIGURACIÓN DE MERCADO PAGO - GUÍA COMPLETA

Esta guía te ayudará a configurar Mercado Pago en tu backend para procesar pagos.

---

## 📋 TABLA DE CONTENIDOS

1. [Obtener Credenciales de Mercado Pago](#1-obtener-credenciales-de-mercado-pago)
2. [Configurar el Backend](#2-configurar-el-backend)
3. [Configurar el Local con Mercado Pago](#3-configurar-el-local-con-mercado-pago)
4. [Configurar el Webhook](#4-configurar-el-webhook)
5. [Probar la Integración](#5-probar-la-integración)

---

## 1️⃣ OBTENER CREDENCIALES DE MERCADO PAGO

### Paso 1.1: Crear/Iniciar sesión en Mercado Pago

1. Ve a [Mercado Pago Developers](https://www.mercadopago.com.ar/developers)
2. Inicia sesión con tu cuenta de Mercado Pago (o crea una)

### Paso 1.2: Crear una Aplicación

1. En el panel de Mercado Pago, ve a **"Tus integraciones"**
2. Haz clic en **"Crear aplicación"**
3. Selecciona **"Pagos online"**
4. Completa los datos:
   - **Nombre de la aplicación:** Ej. "Mi Tienda Online"
   - **URL del sitio:** Tu dominio o `http://localhost:3000` para desarrollo

### Paso 1.3: Obtener las Credenciales

Una vez creada la aplicación:

1. Ve a **"Credenciales"** en el menú lateral
2. Verás dos secciones:
   - **Credenciales de prueba** (para desarrollo)
   - **Credenciales de producción** (para cuando vayas en vivo)

**Para desarrollo, necesitas:**

```
Public Key de prueba: TEST-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
Access Token de prueba: TEST-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

**Para producción, necesitas:**

```
Public Key de producción: APP_USR-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
Access Token de producción: APP_USR-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

⚠️ **IMPORTANTE:** Nunca compartas tu Access Token. Es como una contraseña.

---

## 2️⃣ CONFIGURAR EL BACKEND

### Paso 2.1: Variables de Entorno

Crea o edita el archivo `.env` en la raíz del proyecto `server/`:

```env
# Mercado Pago - Credenciales
MERCADOPAGO_ACCESS_TOKEN=TEST-1234567890123456-123456-abcdefghijklmn1234567890-12345678
MERCADOPAGO_PUBLIC_KEY=TEST-abcd1234-5678-90ab-cdef-1234567890ab
MERCADOPAGO_MODE=test

# URLs del proyecto
BACKEND_URL=https://tu-dominio-backend.onrender.com
FRONTEND_URL=https://tu-dominio-frontend.netlify.app

# O para desarrollo local:
# BACKEND_URL=http://localhost:5000
# FRONTEND_URL=http://localhost:3000
```

**Notas:**
- `MERCADOPAGO_MODE`: puede ser `test` o `production`
- Usa credenciales de **prueba** para desarrollo
- Cambia a credenciales de **producción** cuando vayas en vivo

### Paso 2.2: Reiniciar el Servidor

```bash
npm start
```

---

## 3️⃣ CONFIGURAR EL LOCAL CON MERCADO PAGO

Una vez que tienes las credenciales, necesitas **habilitarlas en tu local específico**.

### Endpoint de Configuración

```http
PATCH /api/locales/:localId/configurar-mercadopago
```

**Headers:**
```
Authorization: Bearer <tu_token_jwt>
Content-Type: application/json
```

**Body:**
```json
{
  "habilitado": true,
  "accessToken": "TEST-1234567890123456-123456-abcdefghijklmn1234567890-12345678",
  "publicKey": "TEST-abcd1234-5678-90ab-cdef-1234567890ab"
}
```

### Ejemplo con cURL

```bash
curl -X PATCH http://localhost:5000/api/locales/TU_LOCAL_ID/configurar-mercadopago \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN_JWT" \
  -d '{
    "habilitado": true,
    "accessToken": "TEST-1234567890123456-123456-abcdefghijklmn1234567890-12345678",
    "publicKey": "TEST-abcd1234-5678-90ab-cdef-1234567890ab"
  }'
```

### Ejemplo con JavaScript/Fetch

```javascript
const configurarMP = async (localId, token) => {
  const response = await fetch(`/api/locales/${localId}/configurar-mercadopago`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      habilitado: true,
      accessToken: 'TEST-1234567890123456-123456-abcdefghijklmn1234567890-12345678',
      publicKey: 'TEST-abcd1234-5678-90ab-cdef-1234567890ab'
    })
  });
  
  const data = await response.json();
  console.log('Mercado Pago configurado:', data);
};
```

### Respuesta Exitosa

```json
{
  "message": "Configuración de Mercado Pago actualizada correctamente",
  "local": {
    "_id": "60d5ec49eb7b45001f3d8e5a",
    "nombre": "Remeras Lisas"
  },
  "mercadopago": {
    "habilitado": true,
    "publicKey": "TEST-abcd1234-5678-90ab-cdef-1234567890ab"
  }
}
```

---

## 4️⃣ CONFIGURAR EL WEBHOOK

El webhook permite que Mercado Pago notifique automáticamente a tu backend cuando cambia el estado de un pago.

### Paso 4.1: URL del Webhook

Tu webhook estará en:

```
https://tu-dominio-backend.onrender.com/api/mercadopago/webhook
```

⚠️ **IMPORTANTE:** 
- El webhook **NO** lleva el slug del local
- Es una URL única para toda la aplicación
- El sistema identifica automáticamente a qué pedido pertenece cada pago

### Paso 4.2: Configurar en Mercado Pago

1. Ve al [Panel de Desarrolladores de Mercado Pago](https://www.mercadopago.com.ar/developers)
2. Selecciona tu aplicación
3. Ve a **"Webhooks"** en el menú lateral
4. Haz clic en **"Configurar notificaciones"**
5. Ingresa tu URL del webhook:
   ```
   https://tu-dominio-backend.onrender.com/api/mercadopago/webhook
   ```
6. Selecciona los eventos:
   - ✅ **Pagos** (payment)
7. Guarda la configuración

### Paso 4.3: Verificar el Webhook

Mercado Pago enviará notificaciones a esta URL cuando:
- Se crea un pago
- Se aprueba un pago
- Se rechaza un pago
- Se reembolsa un pago

Puedes ver los logs en tu consola del servidor:

```
🔔 Webhook recibido: { type: 'payment', data: { id: 12345678 } }
💳 Detalles del pago: { status: 'approved', ... }
📦 Pedido encontrado: 60d5ec49eb7b45001f3d8e5a
✅ Pedido actualizado: pendiente → completado
📧 Email de confirmación enviado
```

---

## 5️⃣ PROBAR LA INTEGRACIÓN

### Paso 5.1: Crear un Pedido de Prueba

1. **Agrega productos al carrito**
2. **Crea un pedido** con método de pago `mercadopago`

```javascript
const crearPedido = async () => {
  const response = await fetch('/api/pedidos', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      direccionEnvio: {
        nombre: "Juan Pérez",
        direccion: "Av. Corrientes 1234",
        ciudad: "Buenos Aires",
        codigoPostal: "1043",
        pais: "Argentina",
        telefono: "1122334455"
      },
      metodoPago: "mercadopago",
      subtotal: 1000,
      impuestos: 210,
      costoEnvio: 0,
      total: 1210
    })
  });
  
  const data = await response.json();
  console.log('Pedido creado:', data);
  
  // El response incluye el initPoint de Mercado Pago
  const { mercadopago } = data;
  window.location.href = mercadopago.initPoint; // Redirigir al pago
};
```

### Paso 5.2: Completar el Pago

1. Serás redirigido a Mercado Pago
2. **Usa tarjetas de prueba** (solo en modo TEST)

**Tarjetas de prueba de Mercado Pago:**

| Tarjeta | Número | CVV | Vencimiento | Resultado |
|---------|--------|-----|-------------|-----------|
| Mastercard | 5031 7557 3453 0604 | 123 | 11/25 | Aprobado |
| Visa | 4509 9535 6623 3704 | 123 | 11/25 | Aprobado |
| Visa | 4074 5957 4325 5787 | 123 | 11/25 | Rechazado |

**Datos del titular (pueden ser ficticios en modo test):**
- DNI: 12345678
- Nombre: APRO (para aprobación) o OTHE (para rechazo)

### Paso 5.3: Verificar el Estado

Después del pago, Mercado Pago:
1. Redirige al usuario a la URL de éxito/fracaso
2. Envía una notificación al webhook
3. Tu backend actualiza automáticamente el estado del pedido

Verifica el estado del pedido:

```javascript
const verificarEstado = async (pedidoId) => {
  const response = await fetch(`/api/mercadopago/pedido/${pedidoId}/estado`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  const data = await response.json();
  console.log('Estado del pedido:', data.estadoPago); // 'completado', 'pendiente', 'fallido', etc.
};
```

---

## ✅ CHECKLIST DE CONFIGURACIÓN

Antes de ir a producción, verifica:

- [ ] Credenciales de Mercado Pago configuradas en `.env`
- [ ] Local configurado con `habilitado: true`
- [ ] Webhook configurado en Mercado Pago
- [ ] URL del webhook accesible públicamente (no localhost)
- [ ] Probado con tarjetas de prueba en modo TEST
- [ ] Variables de entorno apuntan a las URLs correctas
- [ ] Para producción: cambiar a credenciales de producción
- [ ] Para producción: cambiar `MERCADOPAGO_MODE=production`

---

## 🐛 SOLUCIÓN DE PROBLEMAS

### Error: "Mercado Pago no está habilitado para este local"

**Causa:** El local no tiene Mercado Pago configurado.

**Solución:** 
1. Verifica que configuraste el local con el endpoint `/api/locales/:id/configurar-mercadopago`
2. Asegúrate de enviar `habilitado: true` en el body

### Error: "Error al crear preferencia de Mercado Pago"

**Causa:** Credenciales inválidas o mal configuradas.

**Solución:**
1. Verifica que el `accessToken` y `publicKey` sean correctos
2. Verifica que estés usando credenciales de prueba si estás en modo `test`
3. Revisa los logs del servidor para más detalles

### El webhook no se está ejecutando

**Causa:** El webhook no está configurado correctamente en Mercado Pago.

**Solución:**
1. Verifica que la URL del webhook sea accesible públicamente (no `localhost`)
2. Usa herramientas como [ngrok](https://ngrok.com/) para desarrollo local
3. Verifica en el panel de Mercado Pago que el webhook esté configurado
4. Revisa los logs del webhook en Mercado Pago

---

## 📚 RECURSOS ADICIONALES

- [Documentación oficial de Mercado Pago](https://www.mercadopago.com.ar/developers/es/docs)
- [Tarjetas de prueba](https://www.mercadopago.com.ar/developers/es/docs/checkout-api/testing)
- [Webhooks de Mercado Pago](https://www.mercadopago.com.ar/developers/es/docs/checkout-api/additional-content/notifications/webhooks)

---

## 🆘 SOPORTE

Si tienes problemas, revisa:
1. Los logs del servidor
2. Los logs del webhook en el panel de Mercado Pago
3. La documentación oficial

---

**¡Listo! Ahora tu tienda puede aceptar pagos con Mercado Pago** 🎉

