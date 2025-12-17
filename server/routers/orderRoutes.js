const express = require('express');
const {
  createOrder,
  getOrders,
  getOrder,
  updateOrderStatus,
  updatePaymentStatus,
  cancelOrder,
} = require('../controllers/orderController');
const { protect, restrictToAdmin } = require('../middlewares/auth');

const router = express.Router();

// All routes require authentication
router.use(protect);

// Customer and Admin routes
router.post('/', createOrder);
router.get('/', getOrders);
router.get('/:id', getOrder);
router.put('/:id/cancel', cancelOrder);

// Admin only routes
router.put('/:id/status', restrictToAdmin, updateOrderStatus);
router.put('/:id/payment-status', restrictToAdmin, updatePaymentStatus);

module.exports = router;


