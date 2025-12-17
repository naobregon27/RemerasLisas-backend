const express = require('express');
const { getDashboardStats, getSalesReport } = require('../controllers/statsController');
const { protect, restrictToAdmin } = require('../middlewares/auth');

const router = express.Router();

// All routes require admin authentication
router.use(protect);
router.use(restrictToAdmin);

router.get('/dashboard', getDashboardStats);
router.get('/sales', getSalesReport);

module.exports = router;


