const User = require('../models/User');
const Order = require('../models/Order');
const { USER_ROLES } = require('../conf/constants');
const { paginate } = require('../utils/helpers');

/**
 * @desc    Get all users
 * @route   GET /api/users
 * @access  Private/Admin
 */
exports.getUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, role, search } = req.query;

    const query = {};

    if (role) {
      query.role = role;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const { skip, limit: limitNum } = paginate(page, limit);

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      count: users.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limitNum),
      data: { users },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single user
 * @route   GET /api/users/:id
 * @access  Private/Admin
 */
exports.getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado',
      });
    }

    res.json({
      success: true,
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update user
 * @route   PUT /api/users/:id
 * @access  Private
 */
exports.updateUser = async (req, res, next) => {
  try {
    // Check if user is updating themselves or is admin
    if (req.user.id !== req.params.id && req.user.role !== USER_ROLES.ADMIN) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para actualizar este usuario',
      });
    }

    // Don't allow password update here
    delete req.body.password;
    delete req.body.role; // Only admin can change role

    const user = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado',
      });
    }

    res.json({
      success: true,
      message: 'Usuario actualizado exitosamente',
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete user
 * @route   DELETE /api/users/:id
 * @access  Private/Admin
 */
exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado',
      });
    }

    await user.deleteOne();

    res.json({
      success: true,
      message: 'Usuario eliminado exitosamente',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get user orders
 * @route   GET /api/users/:id/orders
 * @access  Private
 */
exports.getUserOrders = async (req, res, next) => {
  try {
    // Check if user is viewing their own orders or is admin
    if (req.user.id !== req.params.id && req.user.role !== USER_ROLES.ADMIN) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para ver estos pedidos',
      });
    }

    const { page = 1, limit = 10 } = req.query;
    const { skip, limit: limitNum } = paginate(page, limit);

    const orders = await Order.find({ user: req.params.id })
      .populate('items.product', 'name images')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Order.countDocuments({ user: req.params.id });

    res.json({
      success: true,
      count: orders.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limitNum),
      data: { orders },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Add address to user
 * @route   POST /api/users/:id/addresses
 * @access  Private
 */
exports.addAddress = async (req, res, next) => {
  try {
    // Check if user is adding to their own account or is admin
    if (req.user.id !== req.params.id && req.user.role !== USER_ROLES.ADMIN) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para agregar direcciones a este usuario',
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado',
      });
    }

    // If this is the first address or marked as default, set others to not default
    if (req.body.isDefault || user.addresses.length === 0) {
      user.addresses.forEach((addr) => {
        addr.isDefault = false;
      });
      req.body.isDefault = true;
    }

    user.addresses.push(req.body);
    await user.save();

    res.json({
      success: true,
      message: 'Dirección agregada exitosamente',
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update address
 * @route   PUT /api/users/:id/addresses/:addressId
 * @access  Private
 */
exports.updateAddress = async (req, res, next) => {
  try {
    // Check if user is updating their own address or is admin
    if (req.user.id !== req.params.id && req.user.role !== USER_ROLES.ADMIN) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para actualizar esta dirección',
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado',
      });
    }

    const address = user.addresses.id(req.params.addressId);
    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Dirección no encontrada',
      });
    }

    // If setting as default, unset others
    if (req.body.isDefault) {
      user.addresses.forEach((addr) => {
        addr.isDefault = addr._id.toString() === req.params.addressId;
      });
    } else {
      Object.assign(address, req.body);
    }

    await user.save();

    res.json({
      success: true,
      message: 'Dirección actualizada exitosamente',
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete address
 * @route   DELETE /api/users/:id/addresses/:addressId
 * @access  Private
 */
exports.deleteAddress = async (req, res, next) => {
  try {
    // Check if user is deleting their own address or is admin
    if (req.user.id !== req.params.id && req.user.role !== USER_ROLES.ADMIN) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para eliminar esta dirección',
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado',
      });
    }

    user.addresses = user.addresses.filter(
      (addr) => addr._id.toString() !== req.params.addressId
    );

    await user.save();

    res.json({
      success: true,
      message: 'Dirección eliminada exitosamente',
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};


