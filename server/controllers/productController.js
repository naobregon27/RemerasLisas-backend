const Product = require('../models/Product');
const Category = require('../models/Category');
const { paginate } = require('../utils/helpers');

/**
 * @desc    Get all products
 * @route   GET /api/products
 * @access  Public
 */
exports.getProducts = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, category, status, featured, search, sort } = req.query;

    // Build query
    const query = {};

    if (category) {
      query.category = category;
    }

    if (status) {
      query.status = status;
    }

    if (featured !== undefined) {
      query.featured = featured === 'true';
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } },
      ];
    }

    // Pagination
    const { skip, limit: limitNum } = paginate(page, limit);

    // Sort
    let sortBy = {};
    if (sort) {
      const parts = sort.split(':');
      sortBy[parts[0]] = parts[1] === 'desc' ? -1 : 1;
    } else {
      sortBy = { createdAt: -1 };
    }

    const products = await Product.find(query)
      .populate('category', 'name slug')
      .sort(sortBy)
      .skip(skip)
      .limit(limitNum);

    const total = await Product.countDocuments(query);

    res.json({
      success: true,
      count: products.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limitNum),
      data: { products },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single product
 * @route   GET /api/products/:id
 * @access  Public
 */
exports.getProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id).populate('category', 'name slug');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado',
      });
    }

    res.json({
      success: true,
      data: { product },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get product by slug
 * @route   GET /api/products/slug/:slug
 * @access  Public
 */
exports.getProductBySlug = async (req, res, next) => {
  try {
    const product = await Product.findOne({ slug: req.params.slug }).populate('category', 'name slug');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado',
      });
    }

    res.json({
      success: true,
      data: { product },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create product
 * @route   POST /api/products
 * @access  Private/Admin
 */
exports.createProduct = async (req, res, next) => {
  try {
    // Handle images
    let images = [];
    if (req.files && req.files.length > 0) {
      images = req.files.map((file) => ({
        url: `/uploads/${file.filename}`,
        alt: file.originalname,
      }));
    } else if (req.body.images) {
      // If images are sent as JSON
      images = Array.isArray(req.body.images) ? req.body.images : JSON.parse(req.body.images);
    }

    // Parse form-data fields (they come as strings)
    // Ensure required fields are present
    if (!req.body.name) {
      return res.status(400).json({
        success: false,
        message: 'El nombre del producto es requerido',
      });
    }

    if (!req.body.category) {
      return res.status(400).json({
        success: false,
        message: 'La categoría es requerida',
      });
    }

    // Parse and normalize variants (ensure stock is a number)
    let variants = undefined;
    console.log('req.body.variants:', req.body.variants);
    console.log('typeof req.body.variants:', typeof req.body.variants);
    if (req.body.variants && req.body.variants !== '' && req.body.variants !== '[]') {
      try {
        if (Array.isArray(req.body.variants)) {
          variants = req.body.variants;
        } else if (typeof req.body.variants === 'string') {
          // Parse JSON string from form-data
          variants = JSON.parse(req.body.variants);
        } else {
          variants = req.body.variants;
        }
        
        // Validate that variants is an array
        if (!Array.isArray(variants)) {
          return res.status(400).json({
            success: false,
            message: 'Las variantes deben ser un array',
          });
        }
        
        // Ensure stock is a number and normalize size/color in each variant
        variants = variants.map(variant => ({
          ...variant,
          size: variant.size ? variant.size.trim().toUpperCase() : variant.size,
          color: variant.color ? variant.color.trim() : variant.color,
          stock: typeof variant.stock === 'string' ? parseInt(variant.stock, 10) : (variant.stock || 0),
        }));
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: 'Error al parsear las variantes. Asegúrate de enviar un JSON válido.',
          error: error.message,
        });
      }
    }
    
    // Validate that variants is provided and not empty
    if (!variants || variants.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'El producto debe tener al menos una variante (talla, color y stock)',
      });
    }

    const productData = {
      name: req.body.name,
      description: req.body.description,
      shortDescription: req.body.shortDescription,
      price: req.body.price ? parseFloat(req.body.price) : undefined,
      comparePrice: req.body.comparePrice ? parseFloat(req.body.comparePrice) : undefined,
      category: req.body.category,
      status: req.body.status || 'active',
      featured: req.body.featured === 'true' || req.body.featured === true,
      tags: req.body.tags ? (Array.isArray(req.body.tags) ? req.body.tags : JSON.parse(req.body.tags)) : undefined,
      metaTitle: req.body.metaTitle,
      metaDescription: req.body.metaDescription,
      variants,
      images,
    };

    // Remove undefined fields (except required ones and variants)
    Object.keys(productData).forEach(key => {
      if (productData[key] === undefined && key !== 'name' && key !== 'category' && key !== 'description' && key !== 'variants') {
        delete productData[key];
      }
    });

    const product = await Product.create(productData);

    await product.populate('category', 'name slug');

    res.status(201).json({
      success: true,
      message: 'Producto creado exitosamente',
      data: { product },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update product
 * @route   PUT /api/products/:id
 * @access  Private/Admin
 */
exports.updateProduct = async (req, res, next) => {
  try {
    let product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado',
      });
    }

    // Handle images
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map((file) => ({
        url: `/uploads/${file.filename}`,
        alt: file.originalname,
      }));
      req.body.images = [...(product.images || []), ...newImages];
    } else if (req.body.images) {
      req.body.images = Array.isArray(req.body.images) ? req.body.images : JSON.parse(req.body.images);
    }

    // Parse form-data fields (they come as strings)
    const updateData = {};
    if (req.body.name !== undefined) updateData.name = req.body.name;
    if (req.body.description !== undefined) updateData.description = req.body.description;
    if (req.body.shortDescription !== undefined) updateData.shortDescription = req.body.shortDescription;
    if (req.body.price !== undefined) updateData.price = parseFloat(req.body.price);
    if (req.body.comparePrice !== undefined) updateData.comparePrice = req.body.comparePrice ? parseFloat(req.body.comparePrice) : null;
    if (req.body.category !== undefined) updateData.category = req.body.category;
    if (req.body.status !== undefined) updateData.status = req.body.status;
    if (req.body.featured !== undefined) updateData.featured = req.body.featured === 'true' || req.body.featured === true;
    if (req.body.tags !== undefined) updateData.tags = Array.isArray(req.body.tags) ? req.body.tags : JSON.parse(req.body.tags);
    if (req.body.metaTitle !== undefined) updateData.metaTitle = req.body.metaTitle;
    if (req.body.metaDescription !== undefined) updateData.metaDescription = req.body.metaDescription;
    if (req.body.variants !== undefined) {
      // Parse and normalize variants (ensure stock is a number and normalize size/color)
      let variants = Array.isArray(req.body.variants) ? req.body.variants : JSON.parse(req.body.variants);
      variants = variants.map(variant => ({
        ...variant,
        size: variant.size ? variant.size.trim().toUpperCase() : variant.size,
        color: variant.color ? variant.color.trim() : variant.color,
        stock: typeof variant.stock === 'string' ? parseInt(variant.stock, 10) : variant.stock,
      }));
      updateData.variants = variants;
    }
    if (req.body.images !== undefined) updateData.images = req.body.images;

    product = await Product.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    }).populate('category', 'name slug');

    res.json({
      success: true,
      message: 'Producto actualizado exitosamente',
      data: { product },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete product
 * @route   DELETE /api/products/:id
 * @access  Private/Admin
 */
exports.deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado',
      });
    }

    await product.deleteOne();

    res.json({
      success: true,
      message: 'Producto eliminado exitosamente',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete product image
 * @route   DELETE /api/products/:id/images/:imageId
 * @access  Private/Admin
 */
exports.deleteProductImage = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado',
      });
    }

    product.images = product.images.filter(
      (img) => img._id.toString() !== req.params.imageId
    );

    await product.save();

    res.json({
      success: true,
      message: 'Imagen eliminada exitosamente',
      data: { product },
    });
  } catch (error) {
    next(error);
  }
};


