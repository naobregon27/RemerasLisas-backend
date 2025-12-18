// Middleware para verificar roles de usuario
// Recibe un array de roles permitidos y verifica si el usuario actual tiene alguno de ellos

const checkRole = (roles) => {
  return (req, res, next) => {
    // El usuario debe estar autenticado (esto debería estar garantizado por checkAuth)
    if (!req.user) {
      return res.status(401).json({ msg: 'Usuario no autenticado' });
    }

    // Verificar si el rol del usuario está en la lista de roles permitidos
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        msg: 'No tienes permisos para realizar esta acción',
        requiredRoles: roles,
        userRole: req.user.role
      });
    }

    // Si el usuario tiene un rol permitido, continuar
    next();
  };
};

export default checkRole; 