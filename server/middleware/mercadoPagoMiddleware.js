import MercadoPagoService from '../services/mercadoPagoService.js';

/**
 * Middleware para validar webhooks de Mercado Pago
 */
export const validarWebhookMP = (req, res, next) => {
  try {
    const mpService = new MercadoPagoService();
    
    // Validar que el webhook sea legítimo
    const esValido = mpService.validarWebhook(req.headers, req.body);
    
    if (!esValido) {
      console.warn('Webhook inválido recibido:', {
        type: req.body?.type,
        action: req.body?.action,
        dataId: req.body?.data?.id
      });
      // En modo prueba, ser más permisivo y solo loguear la advertencia
      if (process.env.MERCADOPAGO_MODE !== 'production') {
        console.log('Modo prueba: permitiendo webhook a pesar de validación fallida');
        return next();
      }
      return res.status(400).json({ 
        error: 'Webhook inválido' 
      });
    }
    
    // Si es válido, continuar
    next();
  } catch (error) {
    console.error('Error validando webhook:', error);
    // En modo prueba, permitir continuar aunque haya error en la validación
    if (process.env.MERCADOPAGO_MODE !== 'production') {
      console.log('Modo prueba: permitiendo webhook a pesar de error en validación');
      return next();
    }
    return res.status(500).json({ 
      error: 'Error validando webhook' 
    });
  }
};

/**
 * Middleware para prevenir procesamiento duplicado de webhooks
 * Mercado Pago puede enviar el mismo webhook múltiples veces
 */
const webhooksProcessados = new Map();
const TIEMPO_EXPIRACION_CACHE = 60 * 60 * 1000; // 1 hora

export const preveniWebhookDuplicado = (req, res, next) => {
  try {
    const webhookId = req.headers['x-request-id'];
    
    if (!webhookId) {
      // Si no hay ID, permitir continuar (por compatibilidad)
      return next();
    }
    
    // Verificar si ya procesamos este webhook
    if (webhooksProcessados.has(webhookId)) {
      console.log('Webhook duplicado detectado:', webhookId);
      return res.status(200).json({ 
        message: 'Webhook ya procesado' 
      });
    }
    
    // Marcar como procesado
    webhooksProcessados.set(webhookId, Date.now());
    
    // Limpiar webhooks antiguos del cache
    for (const [id, timestamp] of webhooksProcessados.entries()) {
      if (Date.now() - timestamp > TIEMPO_EXPIRACION_CACHE) {
        webhooksProcessados.delete(id);
      }
    }
    
    next();
  } catch (error) {
    console.error('Error verificando webhook duplicado:', error);
    next(); // Permitir continuar en caso de error
  }
};

/**
 * Middleware para loggear webhooks recibidos (útil para debugging)
 */
export const logWebhook = (req, res, next) => {
  console.log('📥 Webhook recibido de Mercado Pago:', {
    timestamp: new Date().toISOString(),
    type: req.body?.type,
    action: req.body?.action,
    dataId: req.body?.data?.id,
    requestId: req.headers['x-request-id']
  });
  
  next();
};

export default {
  validarWebhookMP,
  preveniWebhookDuplicado,
  logWebhook
};

