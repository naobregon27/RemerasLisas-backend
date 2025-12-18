import express from 'express';
import {
  getLocales,
  getLocalById,
  createLocal,
  updateLocal,
  deleteLocal,
  restoreLocal,
  asignarAdminLocal,
  agregarEmpleadoLocal,
  quitarEmpleadoLocal
} from '../controllers/localController.js';
import { protect, isSuperAdmin, isAdmin } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(protect);

// Rutas accesibles solo para SuperAdmin
router.route('/')
  .get(isSuperAdmin, getLocales)
  .post(isSuperAdmin, createLocal);

router.route('/:id')
  .get(isAdmin, getLocalById) // También accesible para Admin asignado
  .put(isSuperAdmin, updateLocal)
  .delete(isSuperAdmin, deleteLocal);

router.patch('/:id/restore', isSuperAdmin, restoreLocal);
router.patch('/:id/asignar-admin/:userId', isSuperAdmin, asignarAdminLocal);

// Rutas que pueden usar tanto SuperAdmin como Admin asignado
router.patch('/:id/agregar-empleado/:userId', isAdmin, agregarEmpleadoLocal);
router.patch('/:id/quitar-empleado/:userId', isAdmin, quitarEmpleadoLocal);

export default router; 