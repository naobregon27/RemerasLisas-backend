import express from 'express';
import {
  actualizarMenuPersonalizado,
  actualizarPiePagina,
  actualizarSeccion,
  ordenarCarrusel,
  exportarConfiguracion,
  importarConfiguracion,
  previsualizarConfiguracion
} from '../controllers/tiendaAdminController.js';
import { checkAuth } from '../middleware/checkAuth.js';
import checkRole from '../middleware/checkRole.js';
import { uploadImagenSeccion, handleMulterError } from '../middleware/upload.js';

const router = express.Router();

// Proteger todas las rutas con autenticación
router.use(checkAuth);

// Middleware para verificar que el usuario sea administrador
const isAdmin = checkRole(['admin', 'superAdmin']);

// Administrar menú personalizado
router.put('/tiendas/:slug/admin/menu', isAdmin, actualizarMenuPersonalizado);

// Administrar pie de página
router.put('/tiendas/:slug/admin/pie-pagina', isAdmin, actualizarPiePagina);

// Administrar secciones
router.put('/tiendas/:slug/admin/secciones/:seccionId', isAdmin, uploadImagenSeccion, handleMulterError, actualizarSeccion);

// Ordenar carrusel
router.put('/tiendas/:slug/admin/carrusel/orden', isAdmin, ordenarCarrusel);

// Exportar configuración de tienda
router.get('/tiendas/:slug/admin/exportar', isAdmin, exportarConfiguracion);

// Importar configuración de tienda
router.post('/tiendas/:slug/admin/importar', isAdmin, importarConfiguracion);

// Previsualizar configuración
router.post('/tiendas/:slug/admin/previsualizar', isAdmin, previsualizarConfiguracion);

export default router; 