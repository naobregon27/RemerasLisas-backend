# Integración frontend ↔ backend (tienda, imágenes, videos)

Documento de referencia para alinear el **panel de administración** y la **web pública** con el API actual. Base de rutas: todo cuelga de `/api` (ver `server/routes/index.js`).

Sustituí `BASE_API` por la URL de tu servidor (ej. `https://api.tudominio.com` o `http://localhost:5000`).

---

## 1. Cambio importante: dos fuentes de datos para la tienda

### `GET /api/tiendas/:slug` — información “liviana”

**Público.** Sirve para cabecera, datos de contacto, colores, logo, menú, pie, negocio.

**Ya no incluye** en `configuracionTienda`:

- `bannerPrincipal`
- `carrusel`
- `secciones`
- `videos`

Motivo: esos campos suelen ser muy pesados (imágenes en base64 en MongoDB). Si el front los esperaba aquí, **hay que migrar** a la ruta de configuración pública (siguiente apartado).

**Sí incluye** (entre otros):

- `nombre`, `direccion`, `telefono`, `email`, `horarioAtencion`, `ubicacionGPS`, `isActive`
- `configuracionTienda.colorPrimario`, `colorSecundario`, `colorTexto`
- `configuracionTienda.logo` (objeto `url` + `alt`)
- `configuracionTienda.mensaje`, `metaTitulo`, `metaDescripcion`
- `configuracionTienda.menuPersonalizado`, `piePagina`
- `configuracionNegocio`

### `GET /api/tiendas/:slug/configuracion/publica` — todo lo visual “pesado”

**Público, sin token.** Aquí deben ir banner, carrusel, secciones y videos activos.

**Respuesta** (forma resumida):

```json
{
  "configuracionTienda": {
    "colorPrimario": "...",
    "colorSecundario": "...",
    "colorTexto": "...",
    "mensaje": "...",
    "metaTitulo": "...",
    "metaDescripcion": "...",
    "logo": { "url": "...", "alt": "..." },
    "bannerPrincipal": [ { "url": "...", "alt": "..." } ],
    "carrusel": [ { "url": "...", "alt": "...", "titulo": "", "subtitulo": "", "botonTexto": "", "botonUrl": "", "orden": 0 } ],
    "secciones": [ { "id": "...", "titulo": "...", "contenido": "...", "imagen": "...", "orden": 0 } ],
    "videos": [ { "_id": "...", "url": "/videos/archivo.mp4", "titulo": "", "descripcion": "", "activo": true, "orden": 0, "createdAt": "..." } ]
  }
}
```

**Web pública — checklist:**

1. Primera carga: `GET /api/tiendas/:slug` (rápido).
2. En paralelo o justo después: `GET /api/tiendas/:slug/configuracion/publica` para pintar banner, carrusel, secciones y videos.
3. Si `logo.url` es una ruta relativa (`/images/logos/...`), concatenar `BASE_API + logo.url` en `<img src>` (o configurar proxy en el front).

### `GET /api/tiendas/:slug/configuracion` — panel admin

**Requiere** `Authorization: Bearer <JWT>` y rol `admin` o `superAdmin`.

Devuelve **toda** `configuracionTienda` y `configuracionNegocio` (incluye banners/carrusel/secciones en base64 y todos los videos, activos o no).

---

## 2. Imágenes: cómo vienen y cómo subirlas

### Almacenamiento en backend

- **Banner, carrusel, imágenes de sección:** el servidor **comprime** (JPEG ~75 %, ancho máximo ~1280 / 1200 / 900 px según tipo) y guarda en MongoDB como **data URL** (`data:image/jpeg;base64,...`).
- **Logo subido por archivo:** se guarda la **URL relativa** del archivo estático, ej. `/images/logos/archivo.webp` (no base64 en ese flujo). Si enviás `logoUrl` por JSON, se guarda el string que mandes (puede ser URL externa o data URL).

### Límites útiles

- **Body JSON** del servidor: hasta **50 MB** (`express.json`), para payloads grandes si algún día mandás JSON con base64.
- **Multer (subida por archivo):** hasta **30 MB** por imagen en rutas de tienda (ver `middleware/upload.js`).

### Endpoints de subida (admin, con Bearer)

| Método | Ruta | Contenido |
|--------|------|------------|
| `PUT` | `/api/tiendas/:slug/configuracion/visual` | JSON: colores, mensaje, meta, etc. |
| `PUT` | `/api/tiendas/:slug/configuracion/logo` | `multipart/form-data` campo `logo` o `logo url`, o JSON con `logoUrl` / `logoAlt` |
| `PUT` | `/api/tiendas/:slug/configuracion/banner` | `multipart/form-data` (`banner`, `banner url`, etc.) o JSON con `bannerImagenes` / `bannerUrl` |
| `PUT` | `/api/tiendas/:slug/configuracion/carrusel` | `multipart/form-data` con campos de imágenes o JSON `imagenes` |
| `POST` | `/api/tiendas/:slug/configuracion/secciones` | `multipart/form-data`: `titulo`, `contenido`, `orden`, archivo `imagen` |
| `DELETE` | `/api/tiendas/:slug/configuracion/secciones/:seccionId` | Sin body |

**Después de guardar:** hacé un `GET` de configuración (admin o pública) para refrescar la UI y evitar desfasajes.

### Actualizar sección existente (admin)

`PUT /api/tiendas/:slug/admin/secciones/:seccionId` — mismo esquema de permisos; puede ir `multipart` con nueva `imagen` (se comprime a base64 como en el alta).

---

## 3. Videos

Los videos **no** van en base64: se guardan en disco y en MongoDB solo la **URL relativa** (`/videos/...`).

### Público (web cliente)

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/tiendas/:slug/videos` | Lista `{ videos: [...] }` solo **activos**, ordenados |

También están incluidos (activos) en `GET .../configuracion/publica` bajo `configuracionTienda.videos`.

**`<video src>`:** usar `BASE_API + video.url` (ej. `https://api.../videos/video-123.mp4`).

### Admin (todas con `checkAuth` + rol admin)

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/tiendas/:slug/admin/videos` | Subida: `multipart/form-data`, campo archivo **`video`**. Opcional: `titulo`, `descripcion` (texto). |
| `GET` | `/api/tiendas/:slug/admin/videos` | Lista todos los videos (incluye `activo: false`). |
| `PUT` | `/api/tiendas/:slug/admin/videos/:videoId` | JSON: `titulo`, `descripcion`, `activo`, `orden` (los que envíes). |
| `DELETE` | `/api/tiendas/:slug/admin/videos/:videoId` | Borra registro y archivo en disco si existe. |

**Tipos MIME aceptados en subida:** mp4, webm, mov, avi (ver `middleware/upload.js`). Tamaño máximo por archivo de video: **100 MB** (recomendación de producto: clips cortos, ej. hasta ~10 s).

---

## 4. Autenticación (admin)

```
Authorization: Bearer <token_jwt>
```

Sin token en rutas protegidas: `401` con `{ msg: 'Token no proporcionado' }` o similar.

---

## 5. Coherencia admin ↔ web

| Acción admin | Refresco recomendado en admin | Lo que debe hacer la web pública |
|--------------|-------------------------------|-----------------------------------|
| Cambiar visual / logo / banner / carrusel / secciones | `GET /api/tiendas/:slug/configuracion` | `GET .../configuracion/publica` (y opcionalmente `GET /api/tiendas/:slug` si solo cambian textos/colores en la respuesta liviana) |
| Subir / editar / borrar video | `GET .../admin/videos` o config completa | `GET .../configuracion/publica` o `GET .../videos` |

Los dos fronts deben usar el **mismo `slug`** de tienda y la **misma `BASE_API`**.

---

## 6. Errores frecuentes a evitar

1. **Seguir leyendo banner/carrusel solo desde `GET /api/tiendas/:slug`** — ya no vienen ahí; usá `configuracion/publica`.
2. **Logo con ruta relativa** — en `<img>` hay que prefijar el host del API si no hay proxy.
3. **Videos** — siempre URL absoluta construida con `BASE_API + url`.
4. **No refrescar** después de `PUT`/`POST` — la base ya está actualizada; el front debe volver a pedir datos.

---

## 7. Otras rutas admin de tienda (referencia)

Montadas bajo `/api` con `checkAuth`:

- `PUT /api/tiendas/:slug/admin/menu`
- `PUT /api/tiendas/:slug/admin/pie-pagina`
- `PUT /api/tiendas/:slug/admin/carrusel/orden`
- `GET|POST /api/tiendas/:slug/admin/exportar` / `importar`
- `POST /api/tiendas/:slug/admin/previsualizar`

---

*Última actualización alineada con el backend en `server/` (tienda pública, tienda admin, `index.js`, `config/storage.js`, `middleware/upload.js`).*
