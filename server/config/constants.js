/**
 * Constantes de la aplicación
 */

// Roles de usuario
export const USER_ROLES = {
  USUARIO: 'usuario',
  ADMIN: 'admin',
  SUPER_ADMIN: 'superAdmin',
};

// Estados de pedidos
export const ORDER_STATES = {
  PENDING: 'pendiente',
  CONFIRMED: 'confirmado',
  IN_PROGRESS: 'en proceso',
  READY: 'listo',
  DELIVERED: 'entregado',
  CANCELLED: 'cancelado',
};

// Tiempos de expiración
export const TOKEN_EXPIRATION = {
  EMAIL_VERIFICATION: 24 * 60 * 60 * 1000, // 24 horas en milisegundos
  PASSWORD_RESET: 60 * 60 * 1000, // 1 hora en milisegundos
};

export default {
  USER_ROLES,
  ORDER_STATES,
  TOKEN_EXPIRATION,
};

