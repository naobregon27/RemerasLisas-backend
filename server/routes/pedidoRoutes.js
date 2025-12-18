import express from 'express';
import {
  crearPedido,
  getPedidosUsuario,
  getPedidoById,
  getPedidosAdmin,
  actualizarEstadoPedido,
  actualizarEstadoPago,
  eliminarPedido,
} from '../controllers/pedidoController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Rutas públicas
// Ninguna

// Rutas protegidas para usuarios
router.route('/').post(protect, crearPedido);
router.route('/mispedidos').get(protect, getPedidosUsuario);
router.route('/:id').get(protect, getPedidoById);

// Rutas protegidas para administradores
router.route('/admin/pedidos').get(protect, authorize('admin', 'superAdmin'), getPedidosAdmin);
router.route('/:id/estado').put(protect, authorize('admin', 'superAdmin'), actualizarEstadoPedido);
router.route('/:id/pago').put(protect, authorize('admin', 'superAdmin'), actualizarEstadoPago);
router.route('/:id').delete(protect, authorize('admin', 'superAdmin'), eliminarPedido);

export default router; 