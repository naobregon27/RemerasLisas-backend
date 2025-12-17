const mongoose = require('mongoose');

const storeConfigSchema = new mongoose.Schema(
  {
    storeName: {
      type: String,
      default: 'Remeras Lisas',
    },
    storeDescription: {
      type: String,
    },
    contactEmail: {
      type: String,
    },
    contactPhone: {
      type: String,
    },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: { type: String, default: 'Argentina' },
    },
    socialMedia: {
      facebook: String,
      instagram: String,
      twitter: String,
      whatsapp: String,
    },
    shippingOptions: [
      {
        name: { type: String, required: true },
        method: {
          type: String,
          enum: ['standard', 'express', 'pickup'],
          required: true,
        },
        cost: { type: Number, default: 0 },
        estimatedDays: { type: Number },
        isActive: { type: Boolean, default: true },
      },
    ],
    paymentMethods: [
      {
        name: { type: String, required: true },
        method: {
          type: String,
          enum: ['transfer', 'credit_card', 'debit_card', 'cash', 'other'],
          required: true,
        },
        isActive: { type: Boolean, default: true },
        instructions: String,
      },
    ],
    policies: {
      shipping: String,
      returns: String,
      privacy: String,
      terms: String,
    },
    currency: {
      type: String,
      default: 'ARS',
    },
    taxRate: {
      type: Number,
      default: 0,
    },
    minOrderAmount: {
      type: Number,
      default: 0,
    },
    freeShippingThreshold: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure only one document exists
storeConfigSchema.statics.getConfig = async function () {
  let config = await this.findOne();
  if (!config) {
    config = await this.create({});
  }
  return config;
};

module.exports = mongoose.model('StoreConfig', storeConfigSchema);


