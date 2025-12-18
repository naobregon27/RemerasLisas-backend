import express from 'express';
import { 
  createProducto, 
  deleteProducto, 
  getProductoById, 
  getProductos,
  getProductosPorCategoria,
  getProductosPorLocal,
  restoreProducto,
  updateProducto
} from '../controllers/productoController.js';
import { protect, isAdmin, isSuperAdmin } from '../middlewares/authMiddleware.js';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

// Para __dirname en ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configurar multer para subida de archivos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Asegurarse de que la carpeta uploads existe
    const uploadDir = path.join(__dirname, '../uploads/');
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'producto-' + uniqueSuffix + ext);
  }
});

// Filtro para verificar tipos de archivo
const fileFilter = (req, file, cb) => {
  // Aceptar solo imágenes
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten imágenes'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // límite de 5MB
  }
});

const router = express.Router();

// Rutas públicas
router.get('/', getProductos);
router.get('/categoria/:id', getProductosPorCategoria);
router.get('/local/:id', getProductosPorLocal);
router.get('/:id', getProductoById);

// Ruta de prueba sin autenticación
router.post('/test', upload.single('imagenes'), createProducto);
router.put('/test/:id', upload.single('imagenes'), updateProducto);

// Rutas protegidas - Solo admin y superAdmin
// Opción para subir una sola imagen
router.post('/', protect, isAdmin, upload.single('imagenes'), createProducto);
router.put('/:id', protect, isAdmin, upload.single('imagenes'), updateProducto);

// Opción para subir múltiples imágenes (hasta 5)
router.post('/multiple', protect, isAdmin, upload.array('imagenes', 5), createProducto);
router.put('/:id/multiple', protect, isAdmin, upload.array('imagenes', 5), updateProducto);

router.delete('/:id', protect, isAdmin, deleteProducto);
router.patch('/:id/restore', protect, isAdmin, restoreProducto);

export default router; 