/**
 * Validation middleware using express-validator
 */
const { validationResult } = require('express-validator');

/**
 * Check validation results
 */
exports.validate = (req, res, next) => {
  // Skip validation for OPTIONS requests (CORS preflight)
  if (req.method === 'OPTIONS') {
    return next();
  }
  
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Errores de validación',
      errors: errors.array(),
    });
  }
  next();
};


