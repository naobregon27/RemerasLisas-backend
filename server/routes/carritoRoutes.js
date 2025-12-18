import express from 'express';
import {
  getCarrito,
  agregarProducto,
  actualizarCantidad,
  eliminarProducto,
  vaciarCarrito,
  guardarParaDespues,
  moverAlCarrito
} from '../controllers/carritoController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(protect);

// Rutas del carrito
router.route('/')
  .get(getCarrito)            // Obtener carrito
  .post(agregarProducto)      // Agregar producto
  .delete(vaciarCarrito);     // Vaciar carrito

// Rutas de productos en carrito
router.route('/:productoId')
  .put(actualizarCantidad)    // Actualizar cantidad
  .delete(eliminarProducto);  // Eliminar producto

// Funcionalidad guardar para después
router.post('/guardar/:productoId', guardarParaDespues);   // Guardar para después
router.post('/mover/:productoId', moverAlCarrito);         // Mover al carrito

export default router; 