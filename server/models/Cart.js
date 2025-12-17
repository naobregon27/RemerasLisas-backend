const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
        size: {
          type: String,
          required: true,
        },
        color: {
          type: String,
          required: true,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Calculate cart total
cartSchema.methods.calculateTotal = async function () {
  await this.populate('items.product');
  return this.items.reduce((total, item) => {
    return total + item.product.price * item.quantity;
  }, 0);
};

module.exports = mongoose.model('Cart', cartSchema);


