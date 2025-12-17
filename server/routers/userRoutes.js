const express = require('express');
const {
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  getUserOrders,
  addAddress,
  updateAddress,
  deleteAddress,
} = require('../controllers/userController');
const { protect, restrictToAdmin } = require('../middlewares/auth');

const router = express.Router();

// All routes require authentication
router.use(protect);

// Admin routes
router.get('/', restrictToAdmin, getUsers);
router.get('/:id', restrictToAdmin, getUser);
router.delete('/:id', restrictToAdmin, deleteUser);

// User routes
router.put('/:id', updateUser);
router.get('/:id/orders', getUserOrders);
router.post('/:id/addresses', addAddress);
router.put('/:id/addresses/:addressId', updateAddress);
router.delete('/:id/addresses/:addressId', deleteAddress);

module.exports = router;


