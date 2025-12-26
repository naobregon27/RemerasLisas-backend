import asyncHandler from 'express-async-handler';
import MercadoPagoService from '../services/mercadoPagoService.js';
import Pedido from '../models/Pedido.js';
import Local from '../models/Local.js';
import { sendOrderStatusUpdateEmail } from '../utils/emailService.js';

/**
 * @desc    Crear preferencia de pago para un pedido
 * @route   POST /api/mercadopago/preferencia
 * @access  Privado
 */
export const crearPreferencia = asyncHandler(async (req, res) => {
  const { pedidoId } = req.body;

  if (!pedidoId) {
    res.status(400);
    throw new Error('El ID del pedido es requerido');
  }

  // Buscar el pedido con toda la información necesaria
  const pedido = await Pedido.findById(pedidoId)
    .populate('usuario', 'name email')
    .populate('productos.producto', 'nombre descripcion precio imagenes')
    .populate('local', 'nombre configuracionNegocio');

  if (!pedido) {
    res.status(404);
    throw new Error('Pedido no encontrado');
  }

  // Verificar que el pedido pertenezca al usuario logueado
  if (pedido.usuario._id.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('No autorizado para acceder a este pedido');
  }

  // Verificar que el método de pago sea Mercado Pago
  if (pedido.metodoPago !== 'mercadopago') {
    res.status(400);
    throw new Error('El método de pago del pedido no es Mercado Pago');
  }

  // Verificar que el pedido no haya sido pagado ya
  if (pedido.estadoPago === 'completado') {
    res.status(400);
    throw new Error('Este pedido ya fue pagado');
  }

  const local = pedido.local;

  // Verificar que Mercado Pago esté habilitado para este local
  if (!local.configuracionNegocio?.mercadopago?.habilitado) {
    res.status(400);
    throw new Error('Mercado Pago no está habilitado para este local');
  }

  try {
    // Crear servicio de Mercado Pago
    const mpService = new MercadoPagoService();
    
    // Crear preferencia
    const { preferenceId, initPoint, sandboxInitPoint } = await mpService.crearPreferencia(pedido, local);

    // Actualizar el pedido con el ID de preferencia
    pedido.datosTransaccion = {
      ...pedido.datosTransaccion,
      mercadopago: {
        preferenceId,
        externalReference: `PEDIDO-${pedido._id.toString()}`,
        status: 'pending'
      }
    };
    
    pedido.estadoPago = 'pendiente';
    await pedido.save();

    res.status(200).json({
      success: true,
      preferenceId,
      initPoint: process.env.MERCADOPAGO_MODE === 'production' ? initPoint : sandboxInitPoint,
      pedidoId: pedido._id
    });

  } catch (error) {
    console.error('Error creando preferencia:', error);
    res.status(500);
    throw new Error('Error al crear la preferencia de pago: ' + error.message);
  }
});

/**
 * @desc    Webhook de Mercado Pago
 * @route   POST /api/mercadopago/webhook
 * @access  Público (validado por middleware)
 */
export const webhookMercadoPago = asyncHandler(async (req, res) => {
  try {
    const webhookData = req.body;
    
    console.log('🔔 Webhook recibido:', JSON.stringify(webhookData, null, 2));

    // Solo procesamos notificaciones de pago (puede venir como type='payment' o action='payment.updated')
    const isPayment = webhookData.type === 'payment' || webhookData.action === 'payment.updated';
    if (!isPayment) {
      console.log('Tipo de notificación ignorada:', webhookData.type || webhookData.action);
      return res.status(200).json({ message: 'Notificación ignorada' });
    }

    const mpService = new MercadoPagoService();
    
    // Procesar el webhook y obtener detalles del pago
    const paymentDetails = await mpService.procesarWebhookPago(webhookData);

    if (!paymentDetails) {
      console.log('No se pudieron obtener detalles del pago');
      return res.status(200).json({ message: 'Sin detalles de pago' });
    }

    console.log('💳 Detalles del pago:', paymentDetails);

    // Extraer el ID del pedido desde la referencia externa
    const externalReference = paymentDetails.externalReference;
    const pedidoId = externalReference ? externalReference.replace('PEDIDO-', '') : null;

    if (!pedidoId) {
      console.error('No se pudo extraer el ID del pedido de la referencia externa');
      return res.status(200).json({ message: 'Referencia externa inválida' });
    }

    // Buscar el pedido
    const pedido = await Pedido.findById(pedidoId)
      .populate('usuario', 'name email');

    if (!pedido) {
      console.error('Pedido no encontrado:', pedidoId);
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    console.log('📦 Pedido encontrado:', pedido._id);

    // Mapear el estado de Mercado Pago al estado interno
    const nuevoEstado = mpService.mapearEstadoPago(paymentDetails.status);
    const estadoAnterior = pedido.estadoPago;

    // Actualizar el pedido solo si el estado cambió
    if (estadoAnterior !== nuevoEstado) {
      pedido.estadoPago = nuevoEstado;
      
      // Actualizar datos de la transacción
      pedido.datosTransaccion = {
        idTransaccion: paymentDetails.paymentId.toString(),
        fechaTransaccion: paymentDetails.dateApproved || paymentDetails.dateCreated,
        proveedor: 'Mercado Pago',
        mercadopago: {
          preferenceId: pedido.datosTransaccion?.mercadopago?.preferenceId || null,
          paymentId: paymentDetails.paymentId.toString(),
          status: paymentDetails.status,
          statusDetail: paymentDetails.statusDetail,
          paymentType: paymentDetails.paymentType,
          merchantOrderId: paymentDetails.merchantOrderId,
          externalReference: paymentDetails.externalReference,
          installments: paymentDetails.installments,
          transactionAmount: paymentDetails.transactionAmount
        }
      };

      // Agregar entrada al historial de pagos
      pedido.historialPagos.push({
        estado: nuevoEstado,
        monto: paymentDetails.transactionAmount,
        idTransaccion: paymentDetails.paymentId.toString(),
        notas: `Estado de Mercado Pago: ${paymentDetails.status} - ${paymentDetails.statusDetail}`
      });

      await pedido.save();

      console.log(`✅ Pedido actualizado: ${estadoAnterior} → ${nuevoEstado}`);

      // Si el pago fue aprobado, enviar email de confirmación
      if (nuevoEstado === 'completado' && pedido.usuario?.email) {
        try {
          await sendOrderStatusUpdateEmail(
            pedido.usuario.email,
            pedido.usuario.name,
            pedido,
            'completado'
          );
          console.log('📧 Email de confirmación enviado');
        } catch (emailError) {
          console.error('Error enviando email:', emailError);
          // No fallar el webhook si falla el email
        }
      }
    } else {
      console.log('Estado sin cambios, no se actualiza el pedido');
    }

    // Siempre responder 200 a Mercado Pago para confirmar recepción
    res.status(200).json({ 
      success: true,
      message: 'Webhook procesado correctamente',
      pedidoId: pedido._id,
      estadoPago: pedido.estadoPago
    });

  } catch (error) {
    console.error('❌ Error procesando webhook:', error);
    
    // Aún en caso de error, responder 200 para evitar reenvíos
    // pero logueamos el error para investigación
    res.status(200).json({ 
      error: 'Error procesando webhook',
      message: error.message 
    });
  }
});

/**
 * @desc    Consultar estado de pago
 * @route   GET /api/mercadopago/pago/:paymentId
 * @access  Privado
 */
export const consultarPago = asyncHandler(async (req, res) => {
  const { paymentId } = req.params;

  if (!paymentId) {
    res.status(400);
    throw new Error('El ID del pago es requerido');
  }

  try {
    const mpService = new MercadoPagoService();
    const paymentInfo = await mpService.obtenerPago(paymentId);

    res.status(200).json({
      success: true,
      payment: paymentInfo
    });

  } catch (error) {
    console.error('Error consultando pago:', error);
    res.status(500);
    throw new Error('Error al consultar el estado del pago');
  }
});

/**
 * @desc    Verificar estado de pago de un pedido
 * @route   GET /api/mercadopago/pedido/:pedidoId/estado
 * @access  Privado
 */
export const verificarEstadoPedido = asyncHandler(async (req, res) => {
  const { pedidoId } = req.params;

  const pedido = await Pedido.findById(pedidoId);

  if (!pedido) {
    res.status(404);
    throw new Error('Pedido no encontrado');
  }

  // Verificar que el pedido pertenezca al usuario logueado o sea admin
  if (
    pedido.usuario.toString() !== req.user._id.toString() &&
    req.user.role !== 'admin' &&
    req.user.role !== 'superAdmin'
  ) {
    res.status(403);
    throw new Error('No autorizado para ver este pedido');
  }

  res.status(200).json({
    success: true,
    pedidoId: pedido._id,
    estadoPago: pedido.estadoPago,
    estadoPedido: pedido.estadoPedido,
    datosTransaccion: pedido.datosTransaccion,
    historialPagos: pedido.historialPagos
  });
});

/**
 * @desc    Procesar reembolso (solo admin)
 * @route   POST /api/mercadopago/reembolso/:pedidoId
 * @access  Privado/Admin
 */
export const procesarReembolso = asyncHandler(async (req, res) => {
  const { pedidoId } = req.params;
  const { monto } = req.body; // Monto opcional, si no se envía se reembolsa todo

  const pedido = await Pedido.findById(pedidoId).populate('local');

  if (!pedido) {
    res.status(404);
    throw new Error('Pedido no encontrado');
  }

  // Verificar permisos
  if (req.user.role === 'admin' && 
      pedido.local && 
      req.user.local && 
      pedido.local._id.toString() !== req.user.local.toString()) {
    res.status(403);
    throw new Error('No tienes permiso para procesar reembolsos de este pedido');
  }

  // Verificar que el pago esté completado
  if (pedido.estadoPago !== 'completado') {
    res.status(400);
    throw new Error('Solo se pueden reembolsar pagos completados');
  }

  // Verificar que el método de pago sea Mercado Pago
  if (pedido.metodoPago !== 'mercadopago') {
    res.status(400);
    throw new Error('Este pedido no fue pagado con Mercado Pago');
  }

  const paymentId = pedido.datosTransaccion?.mercadopago?.paymentId;

  if (!paymentId) {
    res.status(400);
    throw new Error('No se encontró el ID de pago de Mercado Pago');
  }

  try {
    const mpService = new MercadoPagoService();
    const refund = await mpService.procesarReembolso(paymentId, monto);

    // Actualizar el pedido
    pedido.estadoPago = 'reembolsado';
    pedido.historialPagos.push({
      estado: 'reembolsado',
      monto: refund.amount || pedido.total,
      idTransaccion: refund.id.toString(),
      notas: `Reembolso procesado por ${req.user.name || req.user.email}`
    });

    await pedido.save();

    res.status(200).json({
      success: true,
      message: 'Reembolso procesado correctamente',
      refund: refund,
      pedido: pedido
    });

  } catch (error) {
    console.error('Error procesando reembolso:', error);
    res.status(500);
    throw new Error('Error al procesar el reembolso: ' + error.message);
  }
});

/**
 * @desc    Obtener configuración pública de Mercado Pago del local
 * @route   GET /api/mercadopago/config/:localId
 * @access  Público
 */
export const obtenerConfigPublica = asyncHandler(async (req, res) => {
  const { localId } = req.params;

  const local = await Local.findById(localId);

  if (!local) {
    res.status(404);
    throw new Error('Local no encontrado');
  }

  const mpConfig = local.configuracionNegocio?.mercadopago;

  if (!mpConfig || !mpConfig.habilitado) {
    res.status(404);
    throw new Error('Mercado Pago no está habilitado para este local');
  }

  // Solo enviamos la clave pública, nunca el access token
  res.status(200).json({
    success: true,
    habilitado: mpConfig.habilitado,
    publicKey: mpConfig.publicKey || process.env.MERCADOPAGO_PUBLIC_KEY
  });
});

export default {
  crearPreferencia,
  webhookMercadoPago,
  consultarPago,
  verificarEstadoPedido,
  procesarReembolso,
  obtenerConfigPublica
};

