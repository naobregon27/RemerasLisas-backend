const express = require('express');
const {
  getProducts,
  getProduct,
  getProductBySlug,
  createProduct,
  updateProduct,
  deleteProduct,
  deleteProductImage,
} = require('../controllers/productController');
const { protect, restrictToAdmin } = require('../middlewares/auth');
const { uploadMultiple, handleUploadError } = require('../middlewares/upload');

const router = express.Router();

// Public routes
router.get('/', getProducts);
router.get('/:id', getProduct);
router.get('/slug/:slug', getProductBySlug);

// Admin routes
router.post(
  '/',
  protect,
  restrictToAdmin,
  uploadMultiple('images', 10),
  handleUploadError,
  createProduct
);
router.put(
  '/:id',
  protect,
  restrictToAdmin,
  uploadMultiple('images', 10),
  handleUploadError,
  updateProduct
);
router.delete('/:id', protect, restrictToAdmin, deleteProduct);
router.delete('/:id/images/:imageId', protect, restrictToAdmin, deleteProductImage);

module.exports = router;


