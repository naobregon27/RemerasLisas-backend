const mongoose = require('mongoose');
const { PRODUCT_STATUS } = require('../conf/constants');

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'El nombre del producto es requerido'],
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
    },
    description: {
      type: String,
      required: [true, 'La descripción es requerida'],
    },
    shortDescription: {
      type: String,
      maxlength: [200, 'La descripción corta no puede exceder 200 caracteres'],
    },
    price: {
      type: Number,
      required: [true, 'El precio es requerido'],
      min: [0, 'El precio no puede ser negativo'],
    },
    comparePrice: {
      type: Number,
      min: [0, 'El precio de comparación no puede ser negativo'],
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'La categoría es requerida'],
    },
    images: [
      {
        url: { type: String, required: true },
        alt: { type: String },
      },
    ],
    variants: [
      {
        size: {
          type: String,
          required: true,
          enum: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
        },
        color: {
          type: String,
          required: true,
        },
        stock: {
          type: Number,
          required: true,
          min: [0, 'El stock no puede ser negativo'],
          default: 0,
        },
        sku: {
          type: String,
          unique: true,
          sparse: true,
        },
      },
    ],
    status: {
      type: String,
      enum: Object.values(PRODUCT_STATUS),
      default: PRODUCT_STATUS.ACTIVE,
    },
    featured: {
      type: Boolean,
      default: false,
    },
    tags: [String],
    metaTitle: {
      type: String,
    },
    metaDescription: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Generate slug from name
productSchema.pre('save', function (next) {
  if (this.isModified('name') && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  next();
});

// Calculate total stock
productSchema.virtual('totalStock').get(function () {
  return this.variants.reduce((sum, variant) => sum + variant.stock, 0);
});

// Check if product is in stock
productSchema.methods.isInStock = function (size, color, quantity = 1) {
  const variant = this.variants.find(
    (v) => v.size === size && v.color === color
  );
  return variant && variant.stock >= quantity;
};

// Decrease stock
productSchema.methods.decreaseStock = function (size, color, quantity) {
  const variant = this.variants.find(
    (v) => v.size === size && v.color === color
  );
  if (variant && variant.stock >= quantity) {
    variant.stock -= quantity;
    return true;
  }
  return false;
};

// Increase stock
productSchema.methods.increaseStock = function (size, color, quantity) {
  const variant = this.variants.find(
    (v) => v.size === size && v.color === color
  );
  if (variant) {
    variant.stock += quantity;
    return true;
  }
  return false;
};

module.exports = mongoose.model('Product', productSchema);


