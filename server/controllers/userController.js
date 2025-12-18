import User from '../models/User.js';

// @desc    Obtener todos los usuarios
// @route   GET /api/users
// @access  Private/Admin/SuperAdmin
export const getUsers = async (req, res) => {
  try {
    // Parámetros de paginación
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Parámetros de filtrado
    const role = req.query.role;
    const isActive = req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined;
    const isEmailVerified = req.query.isEmailVerified !== undefined ? req.query.isEmailVerified === 'true' : undefined;
    const search = req.query.search;

    // Construir query de filtrado
    const query = {};
    if (role) query.role = role;
    if (isActive !== undefined) query.isActive = isActive;
    if (isEmailVerified !== undefined) query.isEmailVerified = isEmailVerified;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    // Obtener usuarios con filtros y paginación
    const users = await User.find(query)
      .select('-password -emailVerificationToken -emailVerificationExpire -emailVerificationCode -emailVerificationCodeExpires -passwordResetToken -passwordResetExpire -passwordResetCode -passwordResetCodeExpires')
      .populate('createdBy', 'name email')
      .populate('activatedBy', 'name email')
      .populate('deactivatedBy', 'name email')
      .populate('local', 'nombre direccion')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Obtener totales para estadísticas
    const totalUsers = await User.countDocuments(query);
    const totalActive = await User.countDocuments({ ...query, isActive: true });
    const totalInactive = await User.countDocuments({ ...query, isActive: false });
    const totalByRole = await User.aggregate([
      { $match: query },
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);

    // Obtener estadísticas adicionales
    const verifiedCount = await User.countDocuments({ ...query, isEmailVerified: true });
    const unverifiedCount = await User.countDocuments({ ...query, isEmailVerified: false });
    
    // Calcular usuarios con login reciente (últimos 30 días)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentLoginCount = await User.countDocuments({
      ...query,
      lastLogin: { $gte: thirtyDaysAgo }
    });

    // Enriquecer datos de usuarios con información calculada
    const enrichedUsers = users.map(user => {
      const userObj = { ...user };
      
      // Calcular días desde creación
      if (user.createdAt) {
        const daysSinceCreation = Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24));
        userObj.daysSinceCreation = daysSinceCreation;
      }

      // Calcular días desde último login
      if (user.lastLogin) {
        const daysSinceLastLogin = Math.floor((Date.now() - new Date(user.lastLogin).getTime()) / (1000 * 60 * 60 * 24));
        userObj.daysSinceLastLogin = daysSinceLastLogin;
        userObj.hasRecentLogin = daysSinceLastLogin <= 30;
      } else {
        userObj.daysSinceLastLogin = null;
        userObj.hasRecentLogin = false;
        userObj.hasNeverLoggedIn = true;
      }

      // Información de estado
      userObj.status = user.isActive ? 'active' : 'inactive';
      userObj.isVerified = user.isEmailVerified;

      // Limpiar campos null innecesarios para respuesta más limpia
      Object.keys(userObj).forEach(key => {
        if (userObj[key] === null && !['lastLogin', 'phone', 'local'].includes(key)) {
          delete userObj[key];
        }
      });

      return userObj;
    });

    // Construir respuesta completa
    const response = {
      success: true,
      data: {
        users: enrichedUsers,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalUsers / limit),
          totalItems: totalUsers,
          itemsPerPage: limit,
          hasNextPage: page < Math.ceil(totalUsers / limit),
          hasPreviousPage: page > 1
        },
        statistics: {
          total: totalUsers,
          active: totalActive,
          inactive: totalInactive,
          verified: verifiedCount,
          unverified: unverifiedCount,
          recentLogins: recentLoginCount,
          byRole: totalByRole.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
          }, {})
        },
        filters: {
          role: role || null,
          isActive: isActive !== undefined ? isActive : null,
          isEmailVerified: isEmailVerified !== undefined ? isEmailVerified : null,
          search: search || null
        }
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.id || Date.now().toString()
      }
    };

    res.json(response);
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      success: false,
      message: 'Error del servidor', 
      error: error.message 
    });
  }
};

// @desc    Obtener un usuario por ID
// @route   GET /api/users/:id
// @access  Private/Admin/SuperAdmin
export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -emailVerificationToken -emailVerificationExpire -emailVerificationCode -emailVerificationCodeExpires -passwordResetToken -passwordResetExpire -passwordResetCode -passwordResetCodeExpires')
      .populate('createdBy', 'name email role')
      .populate('activatedBy', 'name email role')
      .populate('deactivatedBy', 'name email role')
      .populate('local', 'nombre direccion telefono email')
      .lean();

    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'Usuario no encontrado' 
      });
    }

    // Calcular información adicional
    const now = Date.now();
    const createdAt = new Date(user.createdAt).getTime();
    const daysSinceCreation = Math.floor((now - createdAt) / (1000 * 60 * 60 * 24));

    // Información de último login
    let loginInfo = {
      hasLoggedIn: false,
      daysSinceLastLogin: null,
      isRecentLogin: false,
      loginFrequency: null
    };

    if (user.lastLogin) {
      const lastLoginTime = new Date(user.lastLogin).getTime();
      const daysSinceLastLogin = Math.floor((now - lastLoginTime) / (1000 * 60 * 60 * 24));
      loginInfo = {
        hasLoggedIn: true,
        daysSinceLastLogin,
        isRecentLogin: daysSinceLastLogin <= 30,
        loginFrequency: user.loginCount > 0 ? Math.round(daysSinceCreation / user.loginCount) : null
      };
    }

    // Información de cambio de contraseña
    let passwordInfo = {
      hasChangedPassword: false,
      daysSincePasswordChange: null,
      passwordAge: null
    };

    if (user.passwordChangedAt) {
      const passwordChangedTime = new Date(user.passwordChangedAt).getTime();
      const daysSincePasswordChange = Math.floor((now - passwordChangedTime) / (1000 * 60 * 60 * 24));
      passwordInfo = {
        hasChangedPassword: true,
        daysSincePasswordChange,
        passwordAge: daysSincePasswordChange,
        shouldChangePassword: daysSincePasswordChange > 90 // Recomendación: cambiar cada 90 días
      };
    }

    // Información de estado
    const statusInfo = {
      isActive: user.isActive,
      isEmailVerified: user.isEmailVerified,
      status: user.isActive ? 'active' : 'inactive',
      verificationStatus: user.isEmailVerified ? 'verified' : 'unverified'
    };

    // Información de activación/desactivación
    let activationInfo = {};
    if (user.activatedAt) {
      const activatedTime = new Date(user.activatedAt).getTime();
      activationInfo.activatedDaysAgo = Math.floor((now - activatedTime) / (1000 * 60 * 60 * 24));
      activationInfo.activatedBy = user.activatedBy;
    }
    if (user.deactivatedAt) {
      const deactivatedTime = new Date(user.deactivatedAt).getTime();
      activationInfo.deactivatedDaysAgo = Math.floor((now - deactivatedTime) / (1000 * 60 * 60 * 24));
      activationInfo.deactivatedBy = user.deactivatedBy;
    }

    // Limpiar campos null innecesarios
    const cleanedUser = { ...user };
    Object.keys(cleanedUser).forEach(key => {
      if (cleanedUser[key] === null && !['lastLogin', 'phone', 'local', 'activatedBy', 'deactivatedBy', 'createdBy'].includes(key)) {
        delete cleanedUser[key];
      }
    });

    // Construir respuesta completa
    const response = {
      success: true,
      data: {
        user: {
          ...cleanedUser,
          // Información calculada
          accountInfo: {
            daysSinceCreation,
            accountAge: `${daysSinceCreation} días`,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
          },
          loginInfo,
          passwordInfo,
          statusInfo,
          activationInfo,
          // Información de seguridad
          security: {
            isEmailVerified: user.isEmailVerified,
            lastIp: user.lastIp || 'N/A',
            lastUserAgent: user.lastUserAgent || 'N/A',
            loginCount: user.loginCount || 0
          }
        },
        // Información adicional útil
        metadata: {
          role: user.role,
          permissions: {
            canBeDeleted: user.role !== 'superAdmin' || req.user.role === 'superAdmin',
            canBeModified: user.role !== 'superAdmin' || req.user.role === 'superAdmin',
            canChangeRole: req.user.role === 'superAdmin'
          }
        }
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.id || Date.now().toString()
      }
    };

    res.json(response);
  } catch (error) {
    console.error(error);
    if (error.kind === 'ObjectId' || error.name === 'CastError') {
      return res.status(404).json({ 
        success: false,
        message: 'Usuario no encontrado',
        error: 'ID inválido'
      });
    }
    res.status(500).json({ 
      success: false,
      message: 'Error del servidor', 
      error: error.message 
    });
  }
};

// @desc    Crear un nuevo usuario (por admin/superAdmin)
// @route   POST /api/users
// @access  Private/Admin/SuperAdmin
export const createUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Verificar si el email ya existe
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'Usuario ya existe' });
    }

    // Verificar permisos según el rol
    if (req.user.role === 'admin' && role === 'superAdmin') {
      return res.status(403).json({ 
        message: 'Los administradores no pueden crear superadministradores' 
      });
    }

    // Crear usuario
    const user = await User.create({
      name,
      email,
      password,
      role: role || 'usuario',
      createdBy: req.user._id
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        createdBy: req.user._id
      });
    } else {
      res.status(400).json({ message: 'Datos de usuario inválidos' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error del servidor', error: error.message });
  }
};

// @desc    Actualizar usuario
// @route   PUT /api/users/:id
// @access  Private/Admin/SuperAdmin
export const updateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Un administrador no puede cambiar el rol de un superAdmin
    if (req.user.role === 'admin' && user.role === 'superAdmin') {
      return res.status(403).json({ 
        message: 'No tienes permisos para modificar un superadministrador' 
      });
    }

    // Un administrador no puede convertir a otro usuario en superAdmin
    if (req.user.role === 'admin' && req.body.role === 'superAdmin') {
      return res.status(403).json({ 
        message: 'No tienes permisos para crear superadministradores' 
      });
    }

    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;
    user.role = req.body.role || user.role;

    if (req.body.password) {
      user.password = req.body.password;
    }

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      lastLogin: updatedUser.lastLogin,
      loginCount: updatedUser.loginCount,
      isActive: updatedUser.isActive,
      updatedAt: updatedUser.updatedAt
    });
  } catch (error) {
    console.error(error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    res.status(500).json({ message: 'Error del servidor', error: error.message });
  }
};

// @desc    Eliminar usuario (desactivar)
// @route   DELETE /api/users/:id
// @access  Private/Admin/SuperAdmin
export const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Verificar permisos especiales
    if (req.user.role === 'admin' && user.role === 'superAdmin') {
      return res.status(403).json({ 
        message: 'Los administradores no pueden eliminar superadministradores' 
      });
    }

    // No eliminar realmente, solo desactivar
    user.isActive = false;
    
    // Guardar quién desactivó al usuario y cuándo
    user.deactivatedBy = req.user._id;
    user.deactivatedAt = new Date();
    
    await user.save();

    res.json({ 
      message: 'Usuario desactivado',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        isActive: user.isActive,
        deactivatedAt: user.deactivatedAt,
        deactivatedBy: req.user._id
      }
    });
  } catch (error) {
    console.error(error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    res.status(500).json({ message: 'Error del servidor', error: error.message });
  }
};

// @desc    Restaurar usuario (activar)
// @route   PATCH /api/users/:id/restore
// @access  Private/Admin/SuperAdmin
export const restoreUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Verificar permisos especiales
    if (req.user.role === 'admin' && user.role === 'superAdmin') {
      return res.status(403).json({ 
        message: 'Los administradores no pueden restaurar superadministradores' 
      });
    }

    // Activar usuario
    user.isActive = true;
    
    // Guardar quién activó al usuario y cuándo
    user.activatedBy = req.user._id;
    user.activatedAt = new Date();
    
    // Si había fecha de desactivación, la eliminamos
    user.deactivatedAt = undefined;
    user.deactivatedBy = undefined;
    
    await user.save();

    res.json({ 
      message: 'Usuario activado',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        isActive: user.isActive,
        activatedAt: user.activatedAt,
        activatedBy: req.user._id
      }
    });
  } catch (error) {
    console.error(error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    res.status(500).json({ message: 'Error del servidor', error: error.message });
  }
};

// @desc    Obtener usuarios desactivados
// @route   GET /api/users/inactive
// @access  Private/Admin/SuperAdmin
export const getInactiveUsers = async (req, res) => {
  try {
    const inactiveUsers = await User.find({ isActive: false })
      .select('-password')
      .populate('createdBy', 'name email')
      .populate('deactivatedBy', 'name email');

    res.json(inactiveUsers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error del servidor', error: error.message });
  }
};

// @desc    Cambiar estado de activación de usuario
// @route   PATCH /api/users/:id/toggle-status
// @access  Private/Admin/SuperAdmin
export const toggleUserStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Verificar permisos especiales
    if (req.user.role === 'admin' && user.role === 'superAdmin') {
      return res.status(403).json({ 
        message: 'Los administradores no pueden modificar superadministradores' 
      });
    }

    // Cambiar estado
    const newStatus = !user.isActive;
    user.isActive = newStatus;
    
    // Registrar quién hizo el cambio y cuándo
    if (newStatus) {
      // Activando
      user.activatedBy = req.user._id;
      user.activatedAt = new Date();
      user.deactivatedAt = undefined;
      user.deactivatedBy = undefined;
    } else {
      // Desactivando
      user.deactivatedBy = req.user._id;
      user.deactivatedAt = new Date();
      user.activatedAt = undefined;
      user.activatedBy = undefined;
    }
    
    await user.save();

    res.json({ 
      message: newStatus ? 'Usuario activado' : 'Usuario desactivado',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        isActive: user.isActive,
        statusChangedAt: new Date(),
        statusChangedBy: req.user._id
      }
    });
  } catch (error) {
    console.error(error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    res.status(500).json({ message: 'Error del servidor', error: error.message });
  }
};

// @desc    Obtener usuarios por local
// @route   GET /api/users/local
// @access  Private/Admin
export const getUsersByLocal = async (req, res) => {
  try {
    // Verificar que el usuario es administrador y tiene un local asignado
    if (req.user.role !== 'admin' && req.user.role !== 'superAdmin') {
      return res.status(403).json({ message: 'No tienes permisos para esta acción' });
    }

    if (!req.user.local) {
      return res.status(400).json({ message: 'No tienes un local asignado para realizar esta consulta' });
    }

    // Buscar usuarios que pertenecen al mismo local que el administrador
    const users = await User.find({ local: req.user.local })
      .select('-password')
      .populate('createdBy', 'name email')
      .populate('local', 'nombre direccion');

    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error del servidor', error: error.message });
  }
}; 