const express = require('express');
const { getConfig, updateConfig } = require('../controllers/storeController');
const { protect, restrictToAdmin } = require('../middlewares/auth');

const router = express.Router();

// Public route
router.get('/config', getConfig);

// Admin route
router.put('/config', protect, restrictToAdmin, updateConfig);

module.exports = router;


