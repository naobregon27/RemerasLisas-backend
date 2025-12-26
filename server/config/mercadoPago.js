import dotenv from 'dotenv';

dotenv.config();

/**
 * Configuración de Mercado Pago
 * 
 * Variables de entorno necesarias:
 * - MERCADOPAGO_ACCESS_TOKEN: Token de acceso de Mercado Pago
 * - MERCADOPAGO_PUBLIC_KEY: Clave pública para el frontend
 * - MERCADOPAGO_WEBHOOK_SECRET: Secreto para validar webhooks (opcional)
 * - MERCADOPAGO_MODE: 'test' o 'production'
 * - FRONTEND_URL: URL del frontend para redirecciones
 */

export const mercadoPagoConfig = {
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || '',
  publicKey: process.env.MERCADOPAGO_PUBLIC_KEY || '',
  webhookSecret: process.env.MERCADOPAGO_WEBHOOK_SECRET || null,
  mode: process.env.MERCADOPAGO_MODE || 'test',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  
  // URLs de callback y notificación
  getCallbackUrls() {
    return {
      success: `${this.frontendUrl}/pedido/exitoso`,
      failure: `${this.frontendUrl}/pedido/fallido`,
      pending: `${this.frontendUrl}/pedido/pendiente`,
      notification: `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/mercadopago/webhook`
    };
  },
  
  // Validar que la configuración esté completa
  isConfigured() {
    return !!(this.accessToken && this.publicKey);
  },
  
  // Obtener configuración según el modo
  getEnvironment() {
    return this.mode === 'production' ? 'production' : 'sandbox';
  }
};

export default mercadoPagoConfig;

