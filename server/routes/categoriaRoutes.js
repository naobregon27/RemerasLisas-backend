import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  getCategorias,
  getCategoriaById,
  createCategoria,
  updateCategoria,
  deleteCategoria,
  restoreCategoria,
  getSubcategorias,
  getCategoriasByLocal
} from '../controllers/categoriaController.js';
import { protect, isAdmin, isSuperAdmin } from '../middlewares/authMiddleware.js';

// Para __dirname en ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configurar multer para subida de archivos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../uploads/'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'categoria-' + uniqueSuffix + ext);
  }
});

const upload = multer({ storage: storage });

const router = express.Router();

// Rutas públicas
router.get('/', getCategorias);
router.get('/local/:localId', getCategoriasByLocal);
router.get('/:id', getCategoriaById);
router.get('/:id/subcategorias', getSubcategorias);

// RUTA DE PRUEBA - Crear categoría sin autenticación (con soporte para imágenes)
router.post('/test', upload.single('imagen'), createCategoria);

// Rutas protegidas - Solo admin y superAdmin
router.use(protect);
router.use(isAdmin);

router.post('/', upload.single('imagen'), createCategoria);
router.put('/:id', upload.single('imagen'), updateCategoria);
router.delete('/:id', deleteCategoria);
router.patch('/:id/restore', restoreCategoria);

export default router; 