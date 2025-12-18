import express from 'express';
import {
  obtenerInfoTienda,
  obtenerProductosDestacados,
  obtenerCategorias,
  obtenerProductosPorCategoria,
  buscarProductos,
  obtenerProducto,
  obtenerTodosLosProductos,
  actualizarConfiguracionVisual,
  subirLogo,
  subirBanner,
  actualizarCarrusel,
  agregarSeccionPersonalizada,
  eliminarSeccionPersonalizada,
  obtenerConfiguracionCompleta
} from '../controllers/tiendaPublicaController.js';
import { checkAuth } from '../middleware/checkAuth.js';
import checkRole from '../middleware/checkRole.js';
import { uploadSingleImage, uploadBanner, uploadCarruselImages, handleMulterError, uploadImagenSeccion } from '../middleware/upload.js';

const router = express.Router();

// Middleware para verificar que el usuario sea administrador
const isAdmin = checkRole(['admin', 'superAdmin']);

// ----- RUTAS PÚBLICAS (sin autenticación) -----

// Obtener información básica de la tienda
router.get('/tiendas/:slug', obtenerInfoTienda);

// Obtener productos destacados
router.get('/tiendas/:slug/destacados', obtenerProductosDestacados);

// Obtener categorías de la tienda
router.get('/tiendas/:slug/categorias', obtenerCategorias);

// Obtener productos por categoría
router.get('/tiendas/:slug/categorias/:categoriaSlug', obtenerProductosPorCategoria);

// Buscar productos en la tienda
router.get('/tiendas/:slug/buscar', buscarProductos);

// Obtener detalle de un producto
router.get('/tiendas/:slug/productos/:productoSlug', obtenerProducto);

// Obtener todos los productos
router.get('/tiendas/:slug/productos', obtenerTodosLosProductos);

// Obtener configuración completa para clientes (público)
router.get('/tiendas/:slug/configuracion/publica', obtenerConfiguracionCompleta);

// ----- RUTAS PARA PERSONALIZACIÓN DE TIENDA (requieren autenticación y rol admin) -----

// Obtener configuración completa para el panel de administración
router.get('/tiendas/:slug/configuracion', checkAuth, isAdmin, obtenerConfiguracionCompleta);

// Actualizar configuración visual (colores, textos, etc)
router.put('/tiendas/:slug/configuracion/visual', checkAuth, isAdmin, actualizarConfiguracionVisual);

// Actualizar logo de la tienda (acepta form-data con archivo o JSON con URL)
router.put('/tiendas/:slug/configuracion/logo', checkAuth, isAdmin, uploadSingleImage, handleMulterError, subirLogo);

// Actualizar banner principal (acepta form-data con archivo o JSON con URL)
router.put('/tiendas/:slug/configuracion/banner', checkAuth, isAdmin, uploadBanner, handleMulterError, subirBanner);

// Gestionar carrusel de imágenes (acepta form-data con archivos o JSON con URLs)
router.put('/tiendas/:slug/configuracion/carrusel', checkAuth, isAdmin, uploadCarruselImages, handleMulterError, actualizarCarrusel);

// Gestionar secciones personalizadas
router.post('/tiendas/:slug/configuracion/secciones', checkAuth, isAdmin, uploadImagenSeccion, handleMulterError, agregarSeccionPersonalizada);
router.delete('/tiendas/:slug/configuracion/secciones/:seccionId', checkAuth, isAdmin, eliminarSeccionPersonalizada);

export default router; 