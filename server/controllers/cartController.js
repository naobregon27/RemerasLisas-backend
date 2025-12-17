const Cart = require('../models/Cart');
const Product = require('../models/Product');

/**
 * @desc    Get user cart
 * @route   GET /api/cart
 * @access  Private
 */
exports.getCart = async (req, res, next) => {
  try {
    let cart = await Cart.findOne({ user: req.user._id || req.user.id }).populate('items.product');

    if (!cart) {
      cart = await Cart.create({ user: req.user._id || req.user.id, items: [] });
    }

    // Calculate total
    const total = await cart.calculateTotal();

    res.json({
      success: true,
      data: { cart, total },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Add item to cart
 * @route   POST /api/cart/items
 * @access  Private
 */
exports.addToCart = async (req, res, next) => {
  try {
    let { product, quantity, size, color } = req.body;
    
    // Normalize size and color to match how they're stored
    size = size ? size.trim().toUpperCase() : size;
    color = color ? color.trim() : color;

    // Validate product
    const productDoc = await Product.findById(product);
    if (!productDoc) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado',
      });
    }

    // Check if product has variants
    if (!productDoc.variants || productDoc.variants.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'El producto no tiene variantes disponibles',
      });
    }

    // Find the specific variant (values are already normalized)
    const variant = productDoc.variants.find(
      (v) => v.size === size && v.color === color
    );

    if (!variant) {
      const availableSizes = [...new Set(productDoc.variants.map(v => v.size))];
      const availableColors = [...new Set(productDoc.variants.map(v => v.color))];
      return res.status(400).json({
        success: false,
        message: `Variante no encontrada. Buscaste: Talla "${size}", Color "${color}". Tallas disponibles: ${availableSizes.join(', ')}. Colores disponibles: ${availableColors.join(', ')}`,
        debug: {
          requested: { size, color },
          availableVariants: productDoc.variants.map(v => ({ size: v.size, color: v.color, stock: v.stock })),
        },
      });
    }

    // Check stock
    if (variant.stock < quantity) {
      return res.status(400).json({
        success: false,
        message: `Stock insuficiente. Stock disponible: ${variant.stock}, solicitado: ${quantity}`,
      });
    }

    // Get or create cart
    let cart = await Cart.findOne({ user: req.user._id || req.user.id });

    if (!cart) {
      cart = await Cart.create({ user: req.user._id || req.user.id, items: [] });
    }

    // Check if item already exists
    const existingItemIndex = cart.items.findIndex(
      (item) =>
        item.product.toString() === product &&
        item.size === size &&
        item.color === color
    );

    if (existingItemIndex > -1) {
      // Update quantity
      const newQuantity = cart.items[existingItemIndex].quantity + quantity;

      // Check stock again with the variant we already found
      if (variant.stock < newQuantity) {
        return res.status(400).json({
          success: false,
          message: `Stock insuficiente para la cantidad solicitada. Stock disponible: ${variant.stock}, solicitado: ${newQuantity}`,
        });
      }

      cart.items[existingItemIndex].quantity = newQuantity;
    } else {
      // Add new item
      cart.items.push({ product, quantity, size, color });
    }

    await cart.save();
    await cart.populate('items.product');

    const total = await cart.calculateTotal();

    res.json({
      success: true,
      message: 'Producto agregado al carrito',
      data: { cart, total },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update cart item
 * @route   PUT /api/cart/items/:itemId
 * @access  Private
 */
exports.updateCartItem = async (req, res, next) => {
  try {
    const { quantity } = req.body;

    if (!quantity || quantity < 1) {
      return res.status(400).json({
        success: false,
        message: 'La cantidad debe ser mayor a 0',
      });
    }

    const cart = await Cart.findOne({ user: req.user._id || req.user.id });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Carrito no encontrado',
        debug: {
          userId: req.user._id?.toString() || req.user.id,
          userName: req.user.name,
        }
      });
    }

    const item = cart.items.id(req.params.itemId);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: `Item no encontrado en el carrito. ID proporcionado: ${req.params.itemId}. Items disponibles: ${cart.items.map(i => i._id.toString()).join(', ')}`,
      });
    }

    // Validate stock
    const product = await Product.findById(item.product);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado',
      });
    }

    // Find the specific variant (case-insensitive comparison)
    const variant = product.variants.find(
      (v) => v.size.toLowerCase().trim() === item.size.toLowerCase().trim() && 
             v.color.toLowerCase().trim() === item.color.toLowerCase().trim()
    );

    if (!variant) {
      return res.status(400).json({
        success: false,
        message: 'Variante no encontrada',
      });
    }

    // Check stock
    if (variant.stock < quantity) {
      return res.status(400).json({
        success: false,
        message: `Stock insuficiente. Stock disponible: ${variant.stock}, solicitado: ${quantity}`,
      });
    }

    item.quantity = quantity;
    await cart.save();
    await cart.populate('items.product');

    const total = await cart.calculateTotal();

    res.json({
      success: true,
      message: 'Item actualizado',
      data: { cart, total },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Remove item from cart
 * @route   DELETE /api/cart/items/:itemId
 * @access  Private
 */
exports.removeFromCart = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id || req.user.id });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Carrito no encontrado',
      });
    }

    cart.items = cart.items.filter(
      (item) => item._id.toString() !== req.params.itemId
    );

    await cart.save();
    await cart.populate('items.product');

    const total = await cart.calculateTotal();

    res.json({
      success: true,
      message: 'Item eliminado del carrito',
      data: { cart, total },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Clear cart
 * @route   DELETE /api/cart
 * @access  Private
 */
exports.clearCart = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id || req.user.id });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Carrito no encontrado',
      });
    }

    cart.items = [];
    await cart.save();

    res.json({
      success: true,
      message: 'Carrito vaciado',
      data: { cart },
    });
  } catch (error) {
    next(error);
  }
};


