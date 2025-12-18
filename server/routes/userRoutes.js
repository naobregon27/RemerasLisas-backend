import express from 'express';
import { 
  getUsers, 
  getUserById, 
  createUser, 
  updateUser, 
  deleteUser, 
  restoreUser,
  getInactiveUsers,
  toggleUserStatus,
  getUsersByLocal
} from '../controllers/userController.js';
import { protect, isAdmin } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Todas las rutas protegidas por autenticación y rol
router.use(protect);
router.use(isAdmin);

// Ruta para obtener usuarios inactivos
router.get('/inactive', getInactiveUsers);

// Ruta para obtener usuarios del local asignado al administrador
router.get('/local', getUsersByLocal);

router.route('/')
  .get(getUsers)
  .post(createUser);

router.route('/:id')
  .get(getUserById)
  .put(updateUser)
  .delete(deleteUser);

router.patch('/:id/restore', restoreUser);
router.patch('/:id/toggle-status', toggleUserStatus);

export default router; 