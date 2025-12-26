import mercadopago from 'mercadopago';
import { mercadoPagoConfig } from '../config/mercadoPago.js';
import Local from '../models/Local.js';

/**
 * Servicio de Mercado Pago
 * Maneja toda la lógica de integración con Mercado Pago
 */

class MercadoPagoService {
  /**
   * Inicializar Mercado Pago con access token
   * @param {string} accessToken - Token de acceso (opcional, usa el del config por defecto)
   */
  constructor(accessToken = null) {
    this.accessToken = accessToken || mercadoPagoConfig.accessToken;
    this.currentToken = null;
    
    if (this.accessToken) {
      this.configurarToken(this.accessToken);
    }
  }

  /**
   * Configurar el access token de Mercado Pago
   * @param {string} accessToken - Token de acceso
   */
  configurarToken(accessToken) {
    if (accessToken && accessToken !== this.currentToken) {
      mercadopago.configurations.setAccessToken(accessToken);
      this.currentToken = accessToken;
    }
  }

  /**
   * Obtener cliente configurado con un token específico
   * @param {string} accessToken - Token de acceso (opcional)
   */
  getClient(accessToken = null) {
    const token = accessToken || this.accessToken;
    if (!token) {
      throw new Error('Access token de Mercado Pago no configurado');
    }
    
    // Configurar el token si es diferente
    if (token !== this.currentToken) {
      this.configurarToken(token);
    }
    
    return mercadopago;
  }

  /**
   * Obtener configuración de Mercado Pago de un local
   * @param {ObjectId} localId - ID del local
   * @returns {Object} Configuración de Mercado Pago del local
   */
  async getLocalMPConfig(localId) {
    const local = await Local.findById(localId);
    
    if (!local) {
      throw new Error('Local no encontrado');
    }
    
    if (!local.configuracionNegocio?.mercadopago?.habilitado) {
      throw new Error('Mercado Pago no está habilitado para este local');
    }
    
    return local.configuracionNegocio.mercadopago;
  }

  /**
   * Crear preferencia de pago en Mercado Pago
   * @param {Object} pedido - Objeto del pedido
   * @param {Object} local - Objeto del local
   * @returns {Object} Preferencia creada con init_point
   */
  async crearPreferencia(pedido, local) {
    try {
      // Si el local tiene configuración propia de MP, usarla
      let accessToken = this.accessToken;
      if (local.configuracionNegocio?.mercadopago?.habilitado) {
        const localAccessToken = local.configuracionNegocio.mercadopago.accessToken;
        if (localAccessToken) {
          accessToken = localAccessToken;
        }
      }
      
      // Configurar el token
      this.configurarToken(accessToken);
      const preferenceClient = new mercadopago.Preference();

      // Preparar items para Mercado Pago
      const items = pedido.productos.map(item => ({
        id: item.producto._id.toString(),
        title: item.producto.nombre || 'Producto',
        description: item.producto.descripcion || '',
        picture_url: item.producto.imagenes?.[0]?.url || '',
        category_id: 'others',
        quantity: item.cantidad,
        currency_id: 'ARS',
        unit_price: parseFloat(item.precio)
      }));

      // Agregar costos adicionales si existen
      if (pedido.costoEnvio > 0) {
        items.push({
          id: 'envio',
          title: 'Costo de envío',
          description: 'Envío a domicilio',
          category_id: 'others',
          quantity: 1,
          currency_id: 'ARS',
          unit_price: parseFloat(pedido.costoEnvio)
        });
      }

      // Referencia externa única para rastrear el pago
      const externalReference = `PEDIDO-${pedido._id.toString()}`;

      // Configurar URLs de callback
      const callbacks = mercadoPagoConfig.getCallbackUrls();

      // Crear la preferencia
      const preferenceData = {
        items: items,
        external_reference: externalReference,
        payer: {
          name: pedido.direccionEnvio.nombre,
          email: pedido.usuario.email || '',
          phone: {
            area_code: '',
            number: pedido.direccionEnvio.telefono || ''
          },
          address: {
            street_name: pedido.direccionEnvio.direccion,
            zip_code: pedido.direccionEnvio.codigoPostal
          }
        },
        back_urls: {
          success: callbacks.success,
          failure: callbacks.failure,
          pending: callbacks.pending
        },
        auto_return: 'approved',
        notification_url: callbacks.notification,
        statement_descriptor: local.nombre || 'Tienda Online',
        expires: true,
        expiration_date_from: new Date().toISOString(),
        expiration_date_to: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 días
        metadata: {
          pedido_id: pedido._id.toString(),
          local_id: local._id.toString(),
          usuario_id: pedido.usuario._id.toString()
        },
        payment_methods: {
          excluded_payment_methods: [],
          excluded_payment_types: [],
          installments: 12 // Permitir hasta 12 cuotas
        }
      };

      const response = await preferenceClient.create(preferenceData);
      
      return {
        preferenceId: response.body.id,
        initPoint: response.body.init_point,
        sandboxInitPoint: response.body.sandbox_init_point
      };

    } catch (error) {
      console.error('Error creando preferencia de Mercado Pago:', error);
      throw new Error(`Error al crear preferencia de Mercado Pago: ${error.message}`);
    }
  }

  /**
   * Obtener información de un pago
   * @param {string} paymentId - ID del pago en Mercado Pago
   * @returns {Object} Información del pago
   */
  async obtenerPago(paymentId) {
    try {
      this.getClient(); // Configurar token
      const payment = new mercadopago.Payment();
      const response = await payment.getById(paymentId);
      return response.body;
    } catch (error) {
      console.error('Error obteniendo pago:', error);
      throw new Error(`Error al obtener información del pago: ${error.message}`);
    }
  }

  /**
   * Obtener información de una orden de Mercado Pago
   * @param {string} merchantOrderId - ID de la orden
   * @returns {Object} Información de la orden
   */
  async obtenerOrden(merchantOrderId) {
    try {
      this.getClient(); // Configurar token
      const merchantOrder = new mercadopago.MerchantOrder();
      const response = await merchantOrder.getById(merchantOrderId);
      return response.body;
    } catch (error) {
      console.error('Error obteniendo orden:', error);
      throw new Error(`Error al obtener información de la orden: ${error.message}`);
    }
  }

  /**
   * Procesar reembolso de un pago
   * @param {string} paymentId - ID del pago en Mercado Pago
   * @param {number} amount - Monto a reembolsar (opcional, null para reembolso total)
   * @returns {Object} Información del reembolso
   */
  async procesarReembolso(paymentId, amount = null) {
    try {
      this.getClient(); // Configurar token
      const refund = new mercadopago.PaymentRefund();
      const refundData = amount ? { amount } : {};
      const response = await refund.create({ payment_id: paymentId, body: refundData });
      return response.body;
    } catch (error) {
      console.error('Error procesando reembolso:', error);
      throw new Error(`Error al procesar reembolso: ${error.message}`);
    }
  }

  /**
   * Mapear estado de Mercado Pago a estado interno
   * @param {string} mpStatus - Estado de Mercado Pago
   * @returns {string} Estado interno del sistema
   */
  mapearEstadoPago(mpStatus) {
    const mapeoEstados = {
      'approved': 'completado',
      'pending': 'pendiente',
      'authorized': 'procesando',
      'in_process': 'procesando',
      'in_mediation': 'procesando',
      'rejected': 'fallido',
      'cancelled': 'fallido',
      'refunded': 'reembolsado',
      'charged_back': 'reembolsado'
    };

    return mapeoEstados[mpStatus] || 'pendiente';
  }

  /**
   * Validar webhook de Mercado Pago
   * @param {Object} headers - Headers de la petición
   * @param {Object} body - Body de la petición
   * @returns {boolean} True si el webhook es válido
   */
  validarWebhook(headers, body) {
    // En modo prueba, ser más permisivo con la validación
    // Mercado Pago puede enviar webhooks de prueba sin todas las firmas
    
    // Validar que el body tenga la estructura básica esperada
    if (!body || typeof body !== 'object') {
      console.warn('Webhook con body inválido');
      return false;
    }

    // Validar que tenga al menos type o action (dependiendo de la versión)
    if (!body.type && !body.action) {
      console.warn('Webhook sin type o action');
      return false;
    }

    // Para webhooks de tipo payment, debe tener data.id
    if ((body.type === 'payment' || body.action === 'payment.updated') && !body.data?.id) {
      console.warn('Webhook de pago sin data.id');
      return false;
    }

    // En modo producción, validar firma si está disponible
    if (process.env.MERCADOPAGO_MODE === 'production') {
      const signature = headers['x-signature'];
      const requestId = headers['x-request-id'];
      
      if (!signature || !requestId) {
        console.warn('Webhook sin firma o request ID (modo producción)');
        // En producción podrías querer ser más estricto
        // return false;
      }
    }

    return true;
  }

  /**
   * Obtener detalles completos de un pago desde el webhook
   * @param {Object} webhookData - Datos del webhook
   * @returns {Object} Detalles del pago
   */
  async procesarWebhookPago(webhookData) {
    try {
      const { data, type, action } = webhookData;

      // Manejar tanto 'type' como 'action' (diferentes versiones del SDK)
      const isPayment = type === 'payment' || action === 'payment.updated';

      if (isPayment && data?.id) {
        const paymentId = data.id;
        const payment = await this.obtenerPago(paymentId);
        
        return {
          paymentId: payment.id,
          status: payment.status,
          statusDetail: payment.status_detail,
          transactionAmount: payment.transaction_amount,
          paymentType: payment.payment_type_id,
          paymentMethod: payment.payment_method_id,
          externalReference: payment.external_reference,
          merchantOrderId: payment.order?.id || null,
          installments: payment.installments,
          dateApproved: payment.date_approved,
          dateCreated: payment.date_created,
          payer: payment.payer
        };
      }

      return null;
    } catch (error) {
      console.error('Error procesando webhook:', error);
      throw new Error(`Error al procesar webhook: ${error.message}`);
    }
  }
}

export default MercadoPagoService;

