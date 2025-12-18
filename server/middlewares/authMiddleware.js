import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Middleware para verificar token y proteger rutas
export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Obtener token del header
      token = req.headers.authorization.split(' ')[1];

      // Verificar token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Buscar usuario por id y excluir la contraseña
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        return res.status(401).json({ message: 'Usuario no encontrado' });
      }

      if (!req.user.isActive) {
        return res.status(401).json({ message: 'Usuario desactivado' });
      }

      next();
    } catch (error) {
      console.error(error);
      res.status(401).json({ message: 'No autorizado, token inválido' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'No autorizado, no hay token' });
  }
};

// Middleware para verificar roles
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: `El rol ${req.user.role} no está autorizado para acceder a este recurso` 
      });
    }
    next();
  };
};

// Middleware para verificar si es superAdmin
export const isSuperAdmin = (req, res, next) => {
  if (req.user.role !== 'superAdmin') {
    return res.status(403).json({ 
      message: 'Solo superadministradores pueden realizar esta acción' 
    });
  }
  next();
};

// Middleware para verificar si es admin o superAdmin
export const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'superAdmin') {
    return res.status(403).json({ 
      message: 'Solo administradores pueden realizar esta acción' 
    });
  }
  next();
};

// Middleware para verificar que el email esté verificado
export const requireEmailVerified = (req, res, next) => {
  if (!req.user.emailVerified) {
    return res.status(403).json({ 
      message: 'Debes verificar tu email para acceder a este recurso',
      emailVerified: false
    });
  }
  next();
}; 