import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const checkAuth = async (req, res, next) => {
  let token;
  
  // Verificar si se proporcionó un token en el header Authorization
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Obtener el token del header
      token = req.headers.authorization.split(' ')[1];
      
      // Verificar el token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Buscar al usuario y agregar los datos al request
      // Incluir populate de local para facilitar verificación de permisos
      req.user = await User.findById(decoded.id)
        .select('-password -confirmado -token -createdAt -updatedAt -__v')
        .populate('local');
      
      // Continuar con el siguiente middleware o controller
      return next();
      
    } catch (error) {
      console.error(error);
      return res.status(401).json({ msg: 'Token no válido' });
    }
  }
  
  // Si no hay token
  if (!token) {
    const error = new Error('Token no proporcionado');
    return res.status(401).json({ msg: 'Token no proporcionado' });
  }
  
  next();
};

export { checkAuth }; 