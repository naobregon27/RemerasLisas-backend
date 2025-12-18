import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'El nombre es obligatorio'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'El email es obligatorio'],
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: [true, 'La contraseña es obligatoria'],
    minlength: 6
  },
  phone: {
    type: String,
    trim: true,
    default: null
  },
  role: {
    type: String,
    enum: ['usuario', 'admin', 'superAdmin'],
    default: 'usuario'
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: {
    type: String,
    default: null
  },
  emailVerificationExpire: {
    type: Date,
    default: null
  },
  emailVerificationCode: {
    type: String,
    default: null
  },
  emailVerificationCodeExpires: {
    type: Date,
    default: null
  },
  passwordResetToken: {
    type: String,
    default: null
  },
  passwordResetExpire: {
    type: Date,
    default: null
  },
  passwordResetCode: {
    type: String,
    default: null
  },
  passwordResetCodeExpires: {
    type: Date,
    default: null
  },
  local: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Local',
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Campos para seguimiento de activación/desactivación
  activatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  activatedAt: {
    type: Date,
    default: null
  },
  deactivatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  deactivatedAt: {
    type: Date,
    default: null
  },
  lastLogin: {
    type: Date,
    default: null
  },
  loginCount: {
    type: Number,
    default: 0
  },
  lastIp: {
    type: String,
    default: null
  },
  lastUserAgent: {
    type: String,
    default: null
  },
  passwordChangedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Método para no devolver la contraseña en respuestas JSON
userSchema.methods.toJSON = function() {
  const userObject = this.toObject();
  delete userObject.password;
  return userObject;
};

// Middleware para hashear la contraseña antes de guardar
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  
  // Actualiza la fecha de cambio de contraseña
  this.passwordChangedAt = Date.now();
  next();
});

// Método para comparar contraseñas
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Método para registrar el login
userSchema.methods.registerLogin = function(ip, userAgent) {
  this.lastLogin = Date.now();
  this.loginCount += 1;
  if (ip) this.lastIp = ip;
  if (userAgent) this.lastUserAgent = userAgent;
  return this.save();
};

// Método para generar código de verificación de email (6 dígitos)
userSchema.methods.generateEmailVerificationCode = function() {
  // Generar código de 6 dígitos
  const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
  
  // Guardar el código directamente
  this.emailVerificationCode = verificationCode;
  
  // Establecer fecha de expiración (10 minutos)
  this.emailVerificationCodeExpires = Date.now() + 10 * 60 * 1000;
  
  // Limpiar token antiguo si existe
  this.emailVerificationToken = null;
  this.emailVerificationExpire = null;
  
  // Retornar el código (se enviará por email)
  return verificationCode;
};

// Método para generar token de verificación de email (mantener para compatibilidad)
userSchema.methods.generateEmailVerificationToken = function() {
  // Generar token aleatorio
  const verificationToken = crypto.randomBytes(32).toString('hex');
  
  // Hashear el token y guardarlo en la base de datos
  this.emailVerificationToken = crypto
    .createHash('sha256')
    .update(verificationToken)
    .digest('hex');
  
  // Establecer fecha de expiración (24 horas)
  this.emailVerificationExpire = Date.now() + 24 * 60 * 60 * 1000;
  
  // Limpiar código si existe
  this.emailVerificationCode = null;
  this.emailVerificationCodeExpires = null;
  
  // Retornar el token sin hashear (se enviará por email)
  return verificationToken;
};

// Método para generar código de recuperación de contraseña (6 dígitos)
userSchema.methods.generatePasswordResetCode = function() {
  // Generar código de 6 dígitos
  const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
  
  // Guardar el código directamente (no se hashea porque es corto y expira rápido)
  this.passwordResetCode = resetCode;
  
  // Establecer fecha de expiración (10 minutos)
  this.passwordResetCodeExpires = Date.now() + 10 * 60 * 1000;
  
  // Limpiar el token antiguo si existe
  this.passwordResetToken = null;
  this.passwordResetExpire = null;
  
  // Retornar el código (se enviará por email)
  return resetCode;
};

const User = mongoose.model('User', userSchema);

export default User; 