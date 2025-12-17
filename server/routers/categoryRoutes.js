const express = require('express');
const {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
} = require('../controllers/categoryController');
const { protect, restrictToAdmin } = require('../middlewares/auth');
const { uploadSingle, handleUploadError } = require('../middlewares/upload');

const router = express.Router();

// Public routes
router.get('/', getCategories);
router.get('/:id', getCategory);

// Admin routes
router.post(
  '/',
  protect,
  restrictToAdmin,
  uploadSingle('image'),
  handleUploadError,
  createCategory
);
router.put(
  '/:id',
  protect,
  restrictToAdmin,
  uploadSingle('image'),
  handleUploadError,
  updateCategory
);
router.delete('/:id', protect, restrictToAdmin, deleteCategory);

module.exports = router;


