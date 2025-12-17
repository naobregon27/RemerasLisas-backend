const Order = require('../models/Order');
const Product = require('../models/Product');
const Cart = require('../models/Cart');
const User = require('../models/User');
const emailService = require('../utils/emailService');
const { ORDER_STATUS, PAYMENT_STATUS } = require('../conf/constants');
const { paginate, calculateTotal } = require('../utils/helpers');

/**
 * @desc    Create order
 * @route   POST /api/orders
 * @access  Private
 */
exports.createOrder = async (req, res, next) => {
  try {
    const { items, shippingAddress, billingAddress, paymentMethod, shippingMethod, shippingCost, notes } = req.body;

    // Validate items
    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'El pedido debe contener al menos un producto',
      });
    }

    // Validate stock and calculate subtotal
    const orderItems = [];
    let subtotal = 0;

    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Producto ${item.product} no encontrado`,
        });
      }

      // Check stock
      if (!product.isInStock(item.size, item.color, item.quantity)) {
        return res.status(400).json({
          success: false,
          message: `Stock insuficiente para ${product.name} (${item.size}, ${item.color})`,
        });
      }

      orderItems.push({
        product: product._id,
        name: product.name,
        price: product.price,
        quantity: item.quantity,
        size: item.size,
        color: item.color,
        image: product.images[0]?.url || '',
      });

      subtotal += product.price * item.quantity;
    }

    // Calculate total
    const total = calculateTotal(orderItems, shippingCost || 0);

    // Create order
    const order = await Order.create({
      user: req.user.id,
      items: orderItems,
      shippingAddress,
      billingAddress: billingAddress || shippingAddress,
      subtotal,
      shippingCost: shippingCost || 0,
      total,
      paymentMethod,
      shippingMethod,
      notes,
    });

    // Decrease stock
    for (const item of items) {
      const product = await Product.findById(item.product);
      product.decreaseStock(item.size, item.color, item.quantity);
      await product.save();
    }

    // Clear cart
    await Cart.findOneAndUpdate(
      { user: req.user.id },
      { $set: { items: [] } }
    );

    // Populate order
    await order.populate([
      { path: 'user', select: 'name email' },
      { path: 'items.product', select: 'name images' }
    ]);

    // Send confirmation email
    const user = await User.findById(req.user.id);
    await emailService.sendOrderConfirmation(order, user);

    res.status(201).json({
      success: true,
      message: 'Pedido creado exitosamente',
      data: { order },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all orders
 * @route   GET /api/orders
 * @access  Private
 */
exports.getOrders = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status, paymentStatus } = req.query;

    const query = {};

    // If customer, only show their orders
    if (req.user.role === 'customer') {
      query.user = req.user.id;
    }

    if (status) {
      query.status = status;
    }

    if (paymentStatus) {
      query.paymentStatus = paymentStatus;
    }

    const { skip, limit: limitNum } = paginate(page, limit);

    const orders = await Order.find(query)
      .populate('user', 'name email')
      .populate('items.product', 'name images')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Order.countDocuments(query);

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
 * @desc    Get single order
 * @route   GET /api/orders/:id
 * @access  Private
 */
exports.getOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'name email phone')
      .populate('items.product', 'name images slug');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Pedido no encontrado',
      });
    }

    // Check if user has access
    if (req.user.role === 'customer' && order.user._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para ver este pedido',
      });
    }

    res.json({
      success: true,
      data: { order },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update order status
 * @route   PUT /api/orders/:id/status
 * @access  Private/Admin
 */
exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { status, adminNotes } = req.body;

    if (!Object.values(ORDER_STATUS).includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Estado inválido',
      });
    }

    const order = await Order.findById(req.params.id).populate('user', 'name email');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Pedido no encontrado',
      });
    }

    const oldStatus = order.status;
    order.status = status;

    if (adminNotes) {
      order.adminNotes = adminNotes;
    }

    // If cancelled, restore stock
    if (status === ORDER_STATUS.CANCELLED && oldStatus !== ORDER_STATUS.CANCELLED) {
      for (const item of order.items) {
        const product = await Product.findById(item.product);
        if (product) {
          product.increaseStock(item.size, item.color, item.quantity);
          await product.save();
        }
      }
    }

    await order.save();

    // Send email notification
    if (oldStatus !== status) {
      await emailService.sendOrderStatusUpdate(order, order.user);
    }

    res.json({
      success: true,
      message: 'Estado del pedido actualizado exitosamente',
      data: { order },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update payment status
 * @route   PUT /api/orders/:id/payment-status
 * @access  Private/Admin
 */
exports.updatePaymentStatus = async (req, res, next) => {
  try {
    const { paymentStatus } = req.body;

    if (!Object.values(PAYMENT_STATUS).includes(paymentStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Estado de pago inválido',
      });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Pedido no encontrado',
      });
    }

    order.paymentStatus = paymentStatus;
    await order.save();

    res.json({
      success: true,
      message: 'Estado de pago actualizado exitosamente',
      data: { order },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Cancel order
 * @route   PUT /api/orders/:id/cancel
 * @access  Private
 */
exports.cancelOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Pedido no encontrado',
      });
    }

    // Check if user has access
    if (req.user.role === 'customer' && order.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para cancelar este pedido',
      });
    }

    // Only allow cancellation if order is pending or confirmed
    if (![ORDER_STATUS.PENDING, ORDER_STATUS.CONFIRMED].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: 'No se puede cancelar un pedido que ya está en proceso',
      });
    }

    // Restore stock
    for (const item of order.items) {
      const product = await Product.findById(item.product);
      if (product) {
        product.increaseStock(item.size, item.color, item.quantity);
        await product.save();
      }
    }

    order.status = ORDER_STATUS.CANCELLED;
    await order.save();

    // Send email
    const user = await User.findById(order.user);
    await emailService.sendOrderStatusUpdate(order, user);

    res.json({
      success: true,
      message: 'Pedido cancelado exitosamente',
      data: { order },
    });
  } catch (error) {
    next(error);
  }
};


