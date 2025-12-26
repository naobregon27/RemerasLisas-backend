import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User.js';
import emailService from '../utils/emailService.js';
import { USER_ROLES } from '../config/constants.js';

/**
 * Generate JWT Token
 */
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
};

/**
 * @desc    Register user
 * @route   POST /api/auth/register
 * @access  Public
 */
export const register = async (req, res, next) => {
  try {
    const { name, email, password, phone, role } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'El email ya está registrado',
      });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      phone,
      role: role || USER_ROLES.USUARIO,
    });

    // Generate email verification code (6 dígitos)
    const verificationCode = user.generateEmailVerificationCode();
    await user.save({ validateBeforeSave: false });

    // Send verification email with code
    await emailService.sendVerificationCode(user.email, user.name, verificationCode);

      res.status(201).json({
      success: true,
      message: 'Usuario registrado exitosamente. Te hemos enviado un código de 6 dígitos a tu email. Por favor verifícalo para poder iniciar sesión.',
      data: {
        user: {
          id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
          isEmailVerified: user.isEmailVerified,
        },
        requiresEmailVerification: true,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate email & password
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Por favor ingresa email y contraseña',
      });
    }

    // Check for user
    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas',
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Tu cuenta ha sido desactivada',
      });
    }

    // Verificar que el email esté verificado
    if (!user.isEmailVerified) {
      return res.status(403).json({
        success: false,
        message: 'Debes verificar tu email antes de iniciar sesión. Revisa tu correo o solicita un nuevo código.',
        requiresEmailVerification: true,
      });
    }

    // Generate token
    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Login exitoso',
      data: {
        user: {
          id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
          isEmailVerified: user.isEmailVerified,
        },
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get current logged in user
 * @route   GET /api/auth/me
 * @access  Private
 */
export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('local', 'nombre direccion telefono email slug isActive');

    res.json({
      success: true,
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Verify email with code
 * @route   POST /api/auth/verify-email
 * @access  Public (pero necesita email)
 */
export const verifyEmail = async (req, res, next) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({
        success: false,
        message: 'Email y código de verificación son requeridos',
      });
    }

    // Buscar usuario por email
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado',
      });
    }

    // Verificar si ya está verificado
    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: 'El email ya está verificado',
      });
    }

    // Verificar que existe un código de verificación
    if (!user.emailVerificationCode || !user.emailVerificationCodeExpires) {
      return res.status(400).json({
        success: false,
        message: 'No hay código de verificación pendiente. Por favor solicita uno nuevo.',
      });
    }

    // Verificar que el código no haya expirado
    if (Date.now() > user.emailVerificationCodeExpires) {
      return res.status(400).json({
        success: false,
        message: 'El código de verificación ha expirado. Por favor solicita uno nuevo.',
      });
    }

    // Verificar que el código sea correcto
    if (user.emailVerificationCode !== code) {
      return res.status(400).json({
        success: false,
        message: 'Código de verificación incorrecto',
      });
    }

    // Mark email as verified
    user.isEmailVerified = true;
    user.emailVerificationCode = undefined;
    user.emailVerificationCodeExpires = undefined;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpire = undefined;
    await user.save();

    // Enviar email de bienvenida después de verificar
    try {
      await emailService.sendWelcomeEmailAfterVerification(user.email, user.name);
    } catch (error) {
      console.error('Error enviando email de bienvenida:', error);
      // No fallar la verificación si falla el email
    }

    // Generar token para que pueda hacer login
    const token = generateToken(user._id);

      res.json({
      success: true,
      message: 'Email verificado exitosamente. Ya puedes iniciar sesión.',
      data: {
        user: {
          id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
          isEmailVerified: user.isEmailVerified,
        },
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Resend verification code
 * @route   POST /api/auth/resend-verification
 * @access  Public
 */
export const resendVerification = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email es requerido',
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      // Por seguridad, no revelar si el usuario existe
      return res.json({
        success: true,
        message: 'Si el email existe y no está verificado, recibirás un nuevo código',
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: 'El email ya está verificado',
      });
    }

    // Generar nuevo código de 6 dígitos
    const verificationCode = user.generateEmailVerificationCode();
    await user.save({ validateBeforeSave: false });

    // Enviar nuevo código por email
    await emailService.sendVerificationCode(user.email, user.name, verificationCode);

    res.json({
      success: true,
      message: 'Si el email existe y no está verificado, recibirás un nuevo código',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Forgot password
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email es requerido',
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      // Por seguridad, no revelar si el email existe o no
      return res.json({
        success: true,
        message: 'Si el email existe, recibirás un código de recuperación',
      });
    }

    // Generate reset code (6 dígitos)
    const resetCode = user.generatePasswordResetCode();
    await user.save({ validateBeforeSave: false });

    console.log(`📧 Generando código de recuperación para: ${user.email}`);
    console.log(`📧 Código generado: ${resetCode}`);

    // Send email with code
    const emailSent = await emailService.sendPasswordReset(user, resetCode);
    
    if (!emailSent) {
      console.error('❌ Error: No se pudo enviar el email de recuperación');
    } else {
      console.log(`✅ Email de recuperación enviado a: ${user.email}`);
    }

    res.json({
      success: true,
      message: 'Si el email existe, recibirás un código de recuperación',
    });
  } catch (error) {
    console.error('❌ Error en forgotPassword:', error);
    next(error);
  }
};

/**
 * @desc    Reset password
 * @route   PUT /api/auth/reset-password
 * @access  Public
 */
export const resetPassword = async (req, res, next) => {
  try {
    const { email, code, password } = req.body;

    if (!email || !code || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email, código y nueva contraseña son requeridos',
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado',
      });
    }

    // Verificar código
    if (!user.passwordResetCode || !user.passwordResetCodeExpires) {
      return res.status(400).json({
        success: false,
        message: 'Código de recuperación no encontrado o expirado',
      });
    }

    if (Date.now() > user.passwordResetCodeExpires) {
      return res.status(400).json({
        success: false,
        message: 'Código de recuperación expirado',
      });
    }

    if (user.passwordResetCode !== code) {
      return res.status(400).json({
        success: false,
        message: 'Código de recuperación incorrecto',
      });
    }

    // Set new password
    user.password = password;
    user.passwordResetCode = null;
    user.passwordResetCodeExpires = null;
    user.passwordResetToken = null;
    user.passwordResetExpire = null;
    await user.save();

    // Generate token
    const authToken = generateToken(user._id);

      res.json({
      success: true,
      message: 'Contraseña restablecida exitosamente',
      data: {
        token: authToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update password
 * @route   PUT /api/auth/update-password
 * @access  Private
 */
export const updatePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Contraseña actual y nueva contraseña son requeridas',
      });
    }

    const user = await User.findById(req.user._id).select('+password');

    // Check current password
    if (!(await user.comparePassword(currentPassword))) {
      return res.status(401).json({
        success: false,
        message: 'Contraseña actual incorrecta',
      });
    }

    user.password = newPassword;
      await user.save();

    // Generate token
    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Contraseña actualizada exitosamente',
      data: {
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update user profile
 * @route   PUT /api/auth/profile
 * @access  Private
 */
export const updateUserProfile = async (req, res, next) => {
  try {
    const { name, email, phone } = req.body;

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado',
      });
    }

    // Update fields
    if (name) user.name = name;
    if (email) {
      const originalEmail = user.email;
      // Check if email is already taken by another user
      const existingUser = await User.findOne({ email });
      if (existingUser && existingUser._id.toString() !== user._id.toString()) {
        return res.status(400).json({
          success: false,
          message: 'El email ya está en uso',
        });
      }
      user.email = email;
      // If email changed, mark as unverified
      if (email !== originalEmail) {
        user.isEmailVerified = false;
      }
    }
    if (phone !== undefined) user.phone = phone;

    await user.save();

    res.json({
      success: true,
      message: 'Perfil actualizado exitosamente',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          isEmailVerified: user.isEmailVerified,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Logout user
 * @route   POST /api/auth/logout
 * @access  Private
 */
export const logoutUser = async (req, res, next) => {
  try {
    // Since JWT is stateless, logout is handled client-side by removing the token
    // This endpoint can be used for logging purposes or to invalidate tokens server-side if needed
    res.json({
      success: true,
      message: 'Sesión cerrada exitosamente',
    });
  } catch (error) {
    next(error);
  }
};

// Exportaciones con alias para compatibilidad con rutas
export const registerUser = register;
export const loginUser = login;
export const getUserProfile = getMe;
export const resendVerificationCode = resendVerification;
