const express = require('express');
const { body } = require('express-validator');
const {
  register,
  login,
  getMe,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  updatePassword,
} = require('../controllers/authController');
const { protect } = require('../middlewares/auth');
const { validate } = require('../middlewares/validator');

const router = express.Router();

// Validation rules
const registerValidation = [
  body('name').trim().notEmpty().withMessage('El nombre es requerido'),
  body('email').isEmail().withMessage('Email inválido'),
  body('password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
];

const verifyEmailValidation = [
  body('email').isEmail().withMessage('Email inválido'),
  body('code').isLength({ min: 6, max: 6 }).withMessage('El código debe tener 6 dígitos'),
];

const loginValidation = [
  body('email').isEmail().withMessage('Email inválido'),
  body('password').notEmpty().withMessage('La contraseña es requerida'),
];

const forgotPasswordValidation = [
  body('email').isEmail().withMessage('Email inválido'),
];

const resendVerificationValidation = [
  body('email').isEmail().withMessage('Email inválido'),
];

const resetPasswordValidation = [
  body('token').notEmpty().withMessage('Token es requerido'),
  body('password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
];

const updatePasswordValidation = [
  body('currentPassword').notEmpty().withMessage('La contraseña actual es requerida'),
  body('newPassword').isLength({ min: 6 }).withMessage('La nueva contraseña debe tener al menos 6 caracteres'),
];

// Routes
router.post('/register', registerValidation, validate, register);
router.post('/login', loginValidation, validate, login);
router.get('/me', protect, getMe);
router.post('/verify-email', verifyEmailValidation, validate, verifyEmail);
router.post('/resend-verification', resendVerificationValidation, validate, resendVerification);
router.post('/forgot-password', forgotPasswordValidation, validate, forgotPassword);
router.put('/reset-password', resetPasswordValidation, validate, resetPassword);
router.put('/update-password', protect, updatePasswordValidation, validate, updatePassword);

module.exports = router;


