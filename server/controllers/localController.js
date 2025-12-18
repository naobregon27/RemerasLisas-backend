import Local from '../models/Local.js';
import User from '../models/User.js';

// @desc    Obtener todos los locales
// @route   GET /api/locales
// @access  Private/SuperAdmin
export const getLocales = async (req, res) => {
  try {
    const locales = await Local.find({})
      .populate('administrador', 'name email role')
      .populate('createdBy', 'name email')
      .populate('empleados', 'name email');

    res.json(locales);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error del servidor', error: error.message });
  }
};

// @desc    Obtener un local por ID
// @route   GET /api/locales/:id
// @access  Private/SuperAdmin/Admin
export const getLocalById = async (req, res) => {
  try {
    const local = await Local.findById(req.params.id)
      .populate('administrador', 'name email role')
      .populate('createdBy', 'name email')
      .populate('empleados', 'name email');

    if (local) {
      // Si es admin, verificar que sea el administrador de este local
      if (req.user.role === 'admin' && local.administrador?._id.toString() !== req.user._id.toString()) {
        return res.status(403).json({ 
          message: 'No tienes permisos para ver este local' 
        });
      }

      res.json(local);
    } else {
      res.status(404).json({ message: 'Local no encontrado' });
    }
  } catch (error) {
    console.error(error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Local no encontrado' });
    }
    res.status(500).json({ message: 'Error del servidor', error: error.message });
  }
};

// @desc    Crear un nuevo local
// @route   POST /api/locales
// @access  Private/SuperAdmin
export const createLocal = async (req, res) => {
  try {
    const { nombre, direccion, telefono, email, horarioAtencion, ubicacionGPS, administradorId } = req.body;

    // Verificar si existe un administrador
    let administrador = null;
    if (administradorId) {
      administrador = await User.findById(administradorId);
      if (!administrador) {
        return res.status(404).json({ message: 'Administrador no encontrado' });
      }
      if (administrador.role !== 'admin') {
        return res.status(400).json({ message: 'El usuario debe tener rol de administrador' });
      }
    }

    // Crear el local
    const local = await Local.create({
      nombre,
      direccion,
      telefono: telefono || '',
      email: email || '',
      administrador: administradorId || null,
      horarioAtencion: horarioAtencion || 'Lunes a Viernes 9:00 - 18:00',
      ubicacionGPS: ubicacionGPS || { lat: null, lng: null },
      createdBy: req.user._id
    });

    // Si hay administrador asignado, actualizar su referencia al local
    if (administrador) {
      administrador.local = local._id;
      await administrador.save();
    }

    res.status(201).json(local);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error del servidor', error: error.message });
  }
};

// @desc    Actualizar un local
// @route   PUT /api/locales/:id
// @access  Private/SuperAdmin
export const updateLocal = async (req, res) => {
  try {
    const local = await Local.findById(req.params.id);

    if (!local) {
      return res.status(404).json({ message: 'Local no encontrado' });
    }

    const { nombre, direccion, telefono, email, horarioAtencion, ubicacionGPS, administradorId } = req.body;

    // Actualizar campos
    local.nombre = nombre || local.nombre;
    local.direccion = direccion || local.direccion;
    local.telefono = telefono !== undefined ? telefono : local.telefono;
    local.email = email !== undefined ? email : local.email;
    local.horarioAtencion = horarioAtencion || local.horarioAtencion;
    
    if (ubicacionGPS) {
      local.ubicacionGPS = {
        lat: ubicacionGPS.lat !== undefined ? ubicacionGPS.lat : local.ubicacionGPS.lat,
        lng: ubicacionGPS.lng !== undefined ? ubicacionGPS.lng : local.ubicacionGPS.lng
      };
    }

    // Si hay cambio de administrador
    if (administradorId && administradorId !== local.administrador?.toString()) {
      // Verificar si existe el nuevo administrador
      const nuevoAdministrador = await User.findById(administradorId);
      if (!nuevoAdministrador) {
        return res.status(404).json({ message: 'Administrador no encontrado' });
      }
      if (nuevoAdministrador.role !== 'admin') {
        return res.status(400).json({ message: 'El usuario debe tener rol de administrador' });
      }

      // Quitar referencia del administrador anterior si existe
      if (local.administrador) {
        const adminAnterior = await User.findById(local.administrador);
        if (adminAnterior) {
          adminAnterior.local = null;
          await adminAnterior.save();
        }
      }

      // Asignar nuevo administrador
      local.administrador = administradorId;
      nuevoAdministrador.local = local._id;
      await nuevoAdministrador.save();
    } else if (administradorId === null && local.administrador) {
      // Quitar administrador del local
      const adminAnterior = await User.findById(local.administrador);
      if (adminAnterior) {
        adminAnterior.local = null;
        await adminAnterior.save();
      }
      local.administrador = null;
    }

    const updatedLocal = await local.save();
    res.json(updatedLocal);
  } catch (error) {
    console.error(error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Local no encontrado' });
    }
    res.status(500).json({ message: 'Error del servidor', error: error.message });
  }
};

// @desc    Eliminar un local (desactivar)
// @route   DELETE /api/locales/:id
// @access  Private/SuperAdmin
export const deleteLocal = async (req, res) => {
  try {
    const local = await Local.findById(req.params.id);

    if (!local) {
      return res.status(404).json({ message: 'Local no encontrado' });
    }

    // Desactivar el local
    local.isActive = false;
    local.deactivatedBy = req.user._id;
    local.deactivatedAt = new Date();
    
    await local.save();

    res.json({ 
      message: 'Local desactivado',
      local: {
        _id: local._id,
        nombre: local.nombre,
        isActive: local.isActive,
        deactivatedAt: local.deactivatedAt
      }
    });
  } catch (error) {
    console.error(error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Local no encontrado' });
    }
    res.status(500).json({ message: 'Error del servidor', error: error.message });
  }
};

// @desc    Reactivar un local
// @route   PATCH /api/locales/:id/restore
// @access  Private/SuperAdmin
export const restoreLocal = async (req, res) => {
  try {
    const local = await Local.findById(req.params.id);

    if (!local) {
      return res.status(404).json({ message: 'Local no encontrado' });
    }

    // Activar el local
    local.isActive = true;
    local.activatedBy = req.user._id;
    local.activatedAt = new Date();
    local.deactivatedAt = undefined;
    local.deactivatedBy = undefined;
    
    await local.save();

    res.json({ 
      message: 'Local activado',
      local: {
        _id: local._id,
        nombre: local.nombre,
        isActive: local.isActive,
        activatedAt: local.activatedAt
      }
    });
  } catch (error) {
    console.error(error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Local no encontrado' });
    }
    res.status(500).json({ message: 'Error del servidor', error: error.message });
  }
};

// @desc    Asignar administrador a un local
// @route   PATCH /api/locales/:id/asignar-admin/:userId
// @access  Private/SuperAdmin
export const asignarAdminLocal = async (req, res) => {
  try {
    const local = await Local.findById(req.params.id);
    if (!local) {
      return res.status(404).json({ message: 'Local no encontrado' });
    }

    const usuario = await User.findById(req.params.userId);
    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Verificar que el usuario sea admin
    if (usuario.role !== 'admin') {
      return res.status(400).json({ message: 'Solo se pueden asignar usuarios con rol administrador' });
    }

    // Si ya hay un administrador, quitar la referencia
    if (local.administrador) {
      const adminAnterior = await User.findById(local.administrador);
      if (adminAnterior) {
        adminAnterior.local = null;
        await adminAnterior.save();
      }
    }

    // Asignar nuevo administrador
    local.administrador = usuario._id;
    await local.save();

    // Actualizar referencia en el usuario
    usuario.local = local._id;
    await usuario.save();

    res.json({
      message: 'Administrador asignado correctamente',
      local: {
        _id: local._id,
        nombre: local.nombre
      },
      administrador: {
        _id: usuario._id,
        name: usuario.name,
        email: usuario.email
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error del servidor', error: error.message });
  }
};

// @desc    Agregar empleado a un local
// @route   PATCH /api/locales/:id/agregar-empleado/:userId
// @access  Private/SuperAdmin/Admin
export const agregarEmpleadoLocal = async (req, res) => {
  try {
    const local = await Local.findById(req.params.id);
    if (!local) {
      return res.status(404).json({ message: 'Local no encontrado' });
    }

    // Si es admin, verificar que sea el administrador de este local
    if (req.user.role === 'admin' && local.administrador?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        message: 'No tienes permisos para modificar este local' 
      });
    }

    const usuario = await User.findById(req.params.userId);
    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Verificar que el usuario sea de tipo usuario normal
    if (usuario.role !== 'usuario') {
      return res.status(400).json({ message: 'Solo se pueden agregar usuarios con rol normal' });
    }

    // Verificar que no esté ya en la lista de empleados
    if (local.empleados.includes(usuario._id)) {
      return res.status(400).json({ message: 'El usuario ya está asignado a este local' });
    }

    // Agregar empleado
    local.empleados.push(usuario._id);
    await local.save();

    // Actualizar referencia en el usuario
    usuario.local = local._id;
    await usuario.save();

    res.json({
      message: 'Empleado agregado correctamente',
      local: {
        _id: local._id,
        nombre: local.nombre
      },
      empleado: {
        _id: usuario._id,
        name: usuario.name,
        email: usuario.email
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error del servidor', error: error.message });
  }
};

// @desc    Quitar empleado de un local
// @route   PATCH /api/locales/:id/quitar-empleado/:userId
// @access  Private/SuperAdmin/Admin
export const quitarEmpleadoLocal = async (req, res) => {
  try {
    const local = await Local.findById(req.params.id);
    if (!local) {
      return res.status(404).json({ message: 'Local no encontrado' });
    }

    // Si es admin, verificar que sea el administrador de este local
    if (req.user.role === 'admin' && local.administrador?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        message: 'No tienes permisos para modificar este local' 
      });
    }

    const usuario = await User.findById(req.params.userId);
    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Verificar que el usuario esté en la lista de empleados
    if (!local.empleados.includes(usuario._id)) {
      return res.status(400).json({ message: 'El usuario no está asignado a este local' });
    }

    // Quitar empleado
    local.empleados = local.empleados.filter(
      empleadoId => empleadoId.toString() !== usuario._id.toString()
    );
    await local.save();

    // Quitar referencia en el usuario
    usuario.local = null;
    await usuario.save();

    res.json({
      message: 'Empleado quitado correctamente',
      local: {
        _id: local._id,
        nombre: local.nombre
      },
      empleado: {
        _id: usuario._id,
        name: usuario.name,
        email: usuario.email
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error del servidor', error: error.message });
  }
}; 