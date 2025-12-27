import express from 'express';
import {
  crearPreferencia,
  webhookMercadoPago,
  consultarPago,
  verificarEstadoPedido,
  procesarReembolso,
  obtenerConfigPublica
} from '../controllers/mercadoPagoController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';
import { 
  validarWebhookMP, 
  preveniWebhookDuplicado, 
  logWebhook 
} from '../middleware/mercadoPagoMiddleware.js';

const router = express.Router();

/**
 * Rutas públicas (sin autenticación)
 */

// Webhook de Mercado Pago - DEBE SER PÚBLICO
router.post(
  '/webhook',
  logWebhook,
  preveniWebhookDuplicado,
  validarWebhookMP,
  webhookMercadoPago
);

// Obtener configuración pública de MP de un local
router.get('/config/:localId', obtenerConfigPublica);

/**
 * Rutas protegidas (requieren autenticación)
 */

// Crear preferencia de pago para un pedido
router.post('/preferencia', protect, crearPreferencia);

// Consultar estado de un pago específico
router.get('/pago/:paymentId', protect, consultarPago);

// Verificar estado de pago de un pedido
router.get('/pedido/:pedidoId/estado', protect, verificarEstadoPedido);

/**
 * Rutas de administración (requieren rol admin o superAdmin)
 */

// Procesar reembolso
router.post(
  '/reembolso/:pedidoId',
  protect,
  authorize('admin', 'superAdmin'),
  procesarReembolso
);

export default router;


