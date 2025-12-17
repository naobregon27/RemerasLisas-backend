/**
 * Application Constants
 */

// Order Status
const ORDER_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  PREPARING: 'preparing',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
};

// Payment Methods
const PAYMENT_METHODS = {
  TRANSFER: 'transfer',
  CREDIT_CARD: 'credit_card',
  DEBIT_CARD: 'debit_card',
  CASH: 'cash',
  OTHER: 'other',
};

// Payment Status
const PAYMENT_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  FAILED: 'failed',
  REFUNDED: 'refunded',
};

// Shipping Methods
const SHIPPING_METHODS = {
  STANDARD: 'standard',
  EXPRESS: 'express',
  PICKUP: 'pickup',
};

// User Roles
const USER_ROLES = {
  ADMIN: 'admin',
  CUSTOMER: 'customer',
};

// Product Status
const PRODUCT_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  OUT_OF_STOCK: 'out_of_stock',
};

// Email Templates
const EMAIL_TEMPLATES = {
  WELCOME: 'welcome',
  ORDER_CONFIRMATION: 'order_confirmation',
  ORDER_STATUS_UPDATE: 'order_status_update',
  PASSWORD_RESET: 'password_reset',
  EMAIL_VERIFICATION: 'email_verification',
};

module.exports = {
  ORDER_STATUS,
  PAYMENT_METHODS,
  PAYMENT_STATUS,
  SHIPPING_METHODS,
  USER_ROLES,
  PRODUCT_STATUS,
  EMAIL_TEMPLATES,
};


