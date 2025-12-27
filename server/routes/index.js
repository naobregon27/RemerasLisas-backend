import express from 'express';
import authRoutes from './authRoutes.js';
import userRoutes from './userRoutes.js';
import localRoutes from './localRoutes.js';
import categoriaRoutes from './categoriaRoutes.js';
import productoRoutes from './productoRoutes.js';
import pedidoRoutes from './pedidoRoutes.js';
import carritoRoutes from './carritoRoutes.js';
import tiendaPublicaRoutes from './tiendaPublicaRoutes.js';
import tiendaAdminRoutes from './tiendaAdminRoutes.js';
import mercadoPagoRoutes from './mercadoPagoRoutes.js';

const router = express.Router();

// Definir rutas principales
router.use('/api/auth', authRoutes);
router.use('/api/users', userRoutes);
router.use('/api/locales', localRoutes);
router.use('/api/categorias', categoriaRoutes);
router.use('/api/productos', productoRoutes);
router.use('/api/pedidos', pedidoRoutes);
router.use('/api/carrito', carritoRoutes);
router.use('/api/mercadopago', mercadoPagoRoutes);
router.use('/api', tiendaPublicaRoutes);
router.use('/api', tiendaAdminRoutes);

export default router; 