import asyncHandler from 'express-async-handler';
import Pedido from '../models/Pedido.js';
import Producto from '../models/Producto.js';
import Carrito from '../models/Carrito.js';
import { sendOrderConfirmationEmail, sendOrderStatusUpdateEmail, sendNewOrderNotificationToAdmin, sendPaymentConfirmationEmail, sendShippingConfirmationEmail } from '../utils/emailService.js';
import Local from '../models/Local.js';
import User from '../models/User.js';
import MercadoPagoService from '../services/mercadoPagoService.js';

/**
 * @desc    Crear nuevo pedido
 * @route   POST /api/pedidos
 * @access  Privado
 */
const crearPedido = asyncHandler(async (req, res) => {
  const {
    productos: productosBody,
    direccionEnvio,
    metodoPago,
    impuestos: impuestosBody,
    costoEnvio: costoEnvioBody,
    subtotal: subtotalBody,
    descuento: descuentoBody,
    total: totalBody,
    notas
  } = req.body;

  let productos = [];
  let subtotal = 0;
  let local = null;
  let impuestosCalculados = 0;
  let costoEnvioCalculado = 0;
  let descuento = 0;
  let total = 0;

  // Si los productos vienen en el body, usarlos directamente
  if (productosBody && Array.isArray(productosBody) && productosBody.length > 0) {
    productos = productosBody.map(item => ({
      producto: item.producto || item.productoId,
      cantidad: item.cantidad,
      variante: item.variante || {},
      precio: item.precio,
      subtotal: item.subtotal
    }));

    // Obtener el local del primer producto y verificar que todos los productos sean del mismo local
    const primerProductoId = productos[0].producto;
    const primerProducto = await Producto.findById(primerProductoId).select('local nombre');
    if (!primerProducto) {
      res.status(404);
      throw new Error(`Producto no encontrado: ${primerProductoId}`);
    }
    if (primerProducto.local) {
      local = primerProducto.local;
      
      // Verificar que todos los productos sean del mismo local
      for (let i = 1; i < productos.length; i++) {
        const productoId = productos[i].producto;
        const producto = await Producto.findById(productoId).select('local nombre');
        if (!producto) {
          res.status(404);
          throw new Error(`Producto no encontrado: ${productoId}`);
        }
        if (!producto.local || producto.local.toString() !== local.toString()) {
          res.status(400);
          throw new Error(`Los productos deben ser del mismo local. El producto ${producto.nombre} pertenece a otro local.`);
        }
      }
    }

    // Usar valores del body si están presentes, sino calcular
    subtotal = subtotalBody || productos.reduce((acc, item) => acc + item.subtotal, 0);
    impuestosCalculados = impuestosBody || (subtotal * 0.10); // 10% por defecto
    costoEnvioCalculado = costoEnvioBody || 0;
    descuento = descuentoBody || 0;
    total = totalBody || (subtotal + impuestosCalculados + costoEnvioCalculado - descuento);
  } else {
    // Si no hay productos en el body, buscar en el carrito (comportamiento original)
    const carrito = await Carrito.findOne({ usuario: req.user._id })
      .populate({
        path: 'productos.producto',
        select: 'nombre precio imagenes stock slug categoria local',
      });

    if (!carrito || carrito.productos.length === 0) {
      res.status(400);
      throw new Error('No hay productos en el carrito');
    }

    // Preparar los productos para el pedido desde el carrito
    productos = carrito.productos.map(item => ({
      producto: item.producto._id,
      cantidad: item.cantidad,
      variante: item.variante || {},
      precio: item.precioUnitario,
      subtotal: item.subtotal
    }));

    // Calcular subtotal
    subtotal = carrito.productos.reduce((acc, item) => acc + item.subtotal, 0);
    
    // Calcular total
    descuento = 0; // Este valor podría venir de un cupón o promoción
    impuestosCalculados = impuestosBody || (subtotal * 0.10); // 10% por defecto o el valor proporcionado
    costoEnvioCalculado = costoEnvioBody || 10; // Valor por defecto o el proporcionado
    total = subtotal + impuestosCalculados + costoEnvioCalculado - descuento;
    local = carrito.local;
  }

  // Verificar stock disponible
  for (const item of productos) {
    const productoId = typeof item.producto === 'object' ? item.producto._id || item.producto : item.producto;
    const producto = await Producto.findById(productoId);
    if (!producto) {
      res.status(404);
      throw new Error(`Producto no encontrado: ${productoId}`);
    }
    if (producto.stock < item.cantidad) {
      res.status(400);
      throw new Error(`Stock insuficiente para ${producto.nombre}`);
    }
  }

  // Actualizar stock
  for (const item of productos) {
    const productoId = typeof item.producto === 'object' ? item.producto._id || item.producto : item.producto;
    await Producto.findByIdAndUpdate(
      productoId,
      { $inc: { stock: -item.cantidad } }
    );
  }

  // Generar código único de pedido
  const codigoPedido = Pedido.generarCodigoPedido();

  // Validar que tenemos un local
  if (!local) {
    res.status(400);
    throw new Error('No se pudo determinar el local del pedido');
  }

  const pedido = new Pedido({
    usuario: req.user._id,
    productos,
    direccionEnvio,
    metodoPago,
    subtotal,
    impuestos: impuestosCalculados,
    costoEnvio: costoEnvioCalculado,
    descuento,
    total,
    notas,
    local,
    codigoPedido
  });

  const pedidoCreado = await pedido.save();
  
  // Vaciar el carrito después de crear el pedido solo si se usó el carrito
  if (!productosBody || !Array.isArray(productosBody) || productosBody.length === 0) {
    const carrito = await Carrito.findOne({ usuario: req.user._id });
    if (carrito) {
      await carrito.vaciar();
    }
  }
  
  // Devolver pedido con relaciones
  const pedidoPopulado = await Pedido.findById(pedidoCreado._id)
    .populate('usuario', 'name email')
    .populate('productos.producto', 'nombre precio imagenes')
    .populate('local', 'nombre direccion configuracionNegocio');

  // Si el método de pago es Mercado Pago, crear la preferencia automáticamente
  let mercadoPagoData = null;
  if (metodoPago === 'mercadopago') {
    try {
      // Verificar que Mercado Pago esté habilitado para este local
      const localConfig = pedidoPopulado.local?.configuracionNegocio?.mercadopago;
      
      if (!localConfig || !localConfig.habilitado) {
        throw new Error('Mercado Pago no está habilitado para este local');
      }

      const mpService = new MercadoPagoService();
      const { preferenceId, initPoint, sandboxInitPoint } = await mpService.crearPreferencia(
        pedidoPopulado,
        pedidoPopulado.local
      );

      // Actualizar el pedido con la preferencia creada
      pedidoPopulado.datosTransaccion = {
        mercadopago: {
          preferenceId,
          externalReference: `PEDIDO-${pedidoPopulado._id.toString()}`,
          status: 'pending'
        }
      };
      await pedidoPopulado.save();

      mercadoPagoData = {
        preferenceId,
        initPoint: process.env.MERCADOPAGO_MODE === 'production' ? initPoint : sandboxInitPoint,
        publicKey: localConfig.publicKey || process.env.MERCADOPAGO_PUBLIC_KEY
      };

    } catch (mpError) {
      console.error('Error creando preferencia de Mercado Pago:', mpError);
      // No fallar la creación del pedido, pero notificar el error
      mercadoPagoData = {
        error: 'No se pudo crear la preferencia de pago. Contacta al administrador.',
        message: mpError.message
      };
    }
  }

  // Enviar email de confirmación de pedido solo para métodos que no sean Mercado Pago
  // Para Mercado Pago, el email se envía cuando se confirme el pago via webhook
  if (metodoPago !== 'mercadopago' && pedidoPopulado.usuario && pedidoPopulado.usuario.email) {
    try {
      await sendOrderConfirmationEmail(
        pedidoPopulado.usuario.email,
        pedidoPopulado.usuario.name,
        pedidoPopulado
      );
    } catch (error) {
      console.error('Error enviando email de confirmación:', error);
      // No fallar la creación del pedido si falla el email
    }
  }

  // Enviar notificación al administrador de la tienda sobre la nueva orden
  try {
    const localCompleto = await Local.findById(local).populate('administrador', 'name email');
    if (localCompleto) {
      // Obtener email del admin: primero intentar email del local, luego email del usuario administrador
      let adminEmail = localCompleto.email;
      let adminName = localCompleto.nombre || 'Administrador';

      if (!adminEmail && localCompleto.administrador) {
        adminEmail = localCompleto.administrador.email;
        adminName = localCompleto.administrador.name || adminName;
      }

      // Si no hay email configurado, usar el email FROM de SendGrid como fallback
      if (!adminEmail) {
        adminEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@remeraslisas.com';
      }

      if (adminEmail) {
        await sendNewOrderNotificationToAdmin(
          adminEmail,
          adminName,
          pedidoPopulado,
          localCompleto
        );
        console.log(`✅ Notificación de nueva orden enviada al admin: ${adminEmail}`);
      } else {
        console.warn('⚠️ No se encontró email del administrador para enviar notificación de nueva orden');
      }
    }
  } catch (error) {
    console.error('Error enviando notificación al admin:', error);
    // No fallar la creación del pedido si falla el email al admin
  }

  // Preparar respuesta
  const response = {
    ...pedidoPopulado.toObject(),
    mercadopago: mercadoPagoData
  };

  res.status(201).json(response);
});

/**
 * @desc    Obtener pedidos del usuario logueado
 * @route   GET /api/pedidos/mispedidos
 * @access  Privado
 */
const getPedidosUsuario = asyncHandler(async (req, res) => {
  const pedidos = await Pedido.find({ usuario: req.user._id })
    .sort({ createdAt: -1 })
    .populate('productos.producto', 'nombre precio imagenes')
    .populate('local', 'nombre direccion');
  res.json(pedidos);
});

/**
 * @desc    Obtener pedido por ID
 * @route   GET /api/pedidos/:id
 * @access  Privado
 */
const getPedidoById = asyncHandler(async (req, res) => {
  const pedido = await Pedido.findById(req.params.id)
    .populate('usuario', 'name email')
    .populate('productos.producto', 'nombre precio imagenes slug')
    .populate('local', 'nombre direccion')
    .populate('historialEstados.usuario', 'name');

  if (pedido) {
    // Solo el dueño del pedido o un admin puede ver el pedido
    if (pedido.usuario._id.toString() === req.user._id.toString() || 
        req.user.role === 'admin' || req.user.role === 'superAdmin') {
      res.json(pedido);
    } else {
      res.status(403);
      throw new Error('No autorizado para ver este pedido');
    }
  } else {
    res.status(404);
    throw new Error('Pedido no encontrado');
  }
});

/**
 * @desc    Obtener todos los pedidos (admin)
 * @route   GET /api/pedidos/admin/pedidos
 * @access  Privado/Admin
 */
const getPedidosAdmin = asyncHandler(async (req, res) => {
  // Filtros
  let filtro = {};
  
  // Si es admin, solo ver pedidos de su local
  if (req.user.role === 'admin' && req.user.local) {
    filtro.local = req.user.local;
  }
  
  // Filtros por estados, fechas, etc.
  if (req.query.estadoPedido) {
    filtro.estadoPedido = req.query.estadoPedido;
  }
  
  if (req.query.estadoPago) {
    filtro.estadoPago = req.query.estadoPago;
  }
  
  // Paginación
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  
  const pedidos = await Pedido.find(filtro)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('usuario', 'name email')
    .populate('productos.producto', 'nombre precio')
    .populate('local', 'nombre');
  
  // Contar total
  const total = await Pedido.countDocuments(filtro);
  
  res.json({
    pedidos,
    paginacion: {
      total,
      paginas: Math.ceil(total / limit),
      paginaActual: page,
      porPagina: limit
    }
  });
});

/**
 * @desc    Actualizar estado del pedido
 * @route   PUT /api/pedidos/:id/estado
 * @access  Privado/Admin
 */
const actualizarEstadoPedido = asyncHandler(async (req, res) => {
  const { estado, notas } = req.body;
  
  // Validar estado
  const estadosValidos = ['pendiente', 'procesando', 'enviado', 'entregado', 'cancelado'];
  if (!estadosValidos.includes(estado)) {
    res.status(400);
    throw new Error('Estado de pedido inválido');
  }

  const pedido = await Pedido.findById(req.params.id);

  if (pedido) {
    // Verificar permisos para admin (solo puede modificar pedidos de su local)
    if (req.user.role === 'admin' && 
        pedido.local && 
        req.user.local && 
        pedido.local.toString() !== req.user.local.toString()) {
      res.status(403);
      throw new Error('No tienes permiso para modificar pedidos de otro local');
    }
    
    pedido.estadoPedido = estado;
    
    if (estado === 'entregado') {
      pedido.fechaEntrega = Date.now();
    }
    
    // Agregar entrada al historial con notas y usuario
    pedido.historialEstados.push({
      estado,
      usuario: req.user._id,
      notas: notas || ''
    });
    
    // Si se cancela el pedido, restaurar stock
    if (estado === 'cancelado') {
      for (const item of pedido.productos) {
        const producto = await Producto.findById(item.producto);
        if (producto) {
          producto.stock += item.cantidad;
          await producto.save();
        }
      }
    }

    const pedidoActualizado = await pedido.save();
    
    // Devolver pedido actualizado con relaciones
    const pedidoCompleto = await Pedido.findById(pedidoActualizado._id)
      .populate('usuario', 'name email')
      .populate('productos.producto', 'nombre precio imagenes')
      .populate('local', 'nombre direccion')
      .populate('historialEstados.usuario', 'name');

    // Enviar email de notificación de cambio de estado al cliente
    if (pedidoCompleto.usuario && pedidoCompleto.usuario.email) {
      try {
        await sendOrderStatusUpdateEmail(
          pedidoCompleto.usuario.email,
          pedidoCompleto.usuario.name,
          pedidoCompleto,
          estado,
          notas || ''
        );
      } catch (error) {
        console.error('Error enviando email de cambio de estado:', error);
        // No fallar la actualización si falla el email
      }
    }

    // Si el estado es "enviado", enviar email de confirmación de envío con tracking
    if (estado === 'enviado' && pedidoCompleto.usuario && pedidoCompleto.usuario.email) {
      try {
        // Aquí puedes agregar información de tracking si está disponible
        const trackingInfo = {
          codigoSeguimiento: pedidoCompleto.datosTransaccion?.trackingCode || null,
          urlSeguimiento: pedidoCompleto.datosTransaccion?.trackingUrl || null,
          empresaEnvio: pedidoCompleto.datosTransaccion?.shippingCompany || null,
          tiempoEstimado: pedidoCompleto.datosTransaccion?.estimatedDelivery || '3-5 días hábiles',
          instrucciones: notas || ''
        };

        await sendShippingConfirmationEmail(
          pedidoCompleto.usuario.email,
          pedidoCompleto.usuario.name,
          pedidoCompleto,
          trackingInfo
        );
        console.log(`✅ Email de envío enviado al cliente: ${pedidoCompleto.usuario.email}`);
      } catch (error) {
        console.error('Error enviando email de envío:', error);
        // No fallar la actualización si falla el email
      }
    }
      
    res.json(pedidoCompleto);
  } else {
    res.status(404);
    throw new Error('Pedido no encontrado');
  }
});

/**
 * @desc    Actualizar estado de pago
 * @route   PUT /api/pedidos/:id/pago
 * @access  Privado/Admin
 */
const actualizarEstadoPago = asyncHandler(async (req, res) => {
  const { estadoPago, idTransaccion, notas } = req.body;
  
  // Validar estado
  const estadosValidos = ['pendiente', 'procesando', 'completado', 'fallido', 'reembolsado'];
  if (!estadosValidos.includes(estadoPago)) {
    res.status(400);
    throw new Error('Estado de pago inválido');
  }

  const pedido = await Pedido.findById(req.params.id);

  if (pedido) {
    // Verificar permisos para admin (solo puede modificar pedidos de su local)
    if (req.user.role === 'admin' && 
        pedido.local && 
        req.user.local && 
        pedido.local.toString() !== req.user.local.toString()) {
      res.status(403);
      throw new Error('No tienes permiso para modificar pedidos de otro local');
    }
    
    pedido.estadoPago = estadoPago;
    
    // Actualizar datos de transacción
    if (idTransaccion) {
      pedido.datosTransaccion = {
        ...pedido.datosTransaccion,
        idTransaccion,
        fechaTransaccion: new Date()
      };
    }
    
    // Agregar entrada al historial de pagos
    pedido.historialPagos.push({
      estado: estadoPago,
      monto: pedido.total,
      idTransaccion,
      notas: notas || ''
    });

    const pedidoActualizado = await pedido.save();
    
    // Devolver pedido actualizado con relaciones
    const pedidoCompleto = await Pedido.findById(pedidoActualizado._id)
      .populate('usuario', 'name email')
      .populate('productos.producto', 'nombre precio imagenes')
      .populate('local', 'nombre direccion');
      
    res.json(pedidoCompleto);
  } else {
    res.status(404);
    throw new Error('Pedido no encontrado');
  }
});

/**
 * @desc    Eliminar pedido permanentemente de la base de datos
 * @route   DELETE /api/pedidos/:id
 * @access  Privado/Admin
 */
const eliminarPedido = asyncHandler(async (req, res) => {
  const pedido = await Pedido.findById(req.params.id);

  if (!pedido) {
    res.status(404);
    throw new Error('Pedido no encontrado');
  }

  // Verificar permisos: solo superadmin o admin del mismo local pueden eliminar
  if (req.user.role !== 'superAdmin') {
    if (req.user.role !== 'admin' || 
        !pedido.local || 
        !req.user.local || 
        pedido.local.toString() !== req.user.local.toString()) {
      res.status(403);
      throw new Error('No tienes permiso para eliminar este pedido');
    }
  }

  // Si el pedido está en estado diferente a cancelado, restaurar stock de productos
  if (pedido.estadoPedido !== 'cancelado') {
    for (const item of pedido.productos) {
      const producto = await Producto.findById(item.producto);
      if (producto) {
        producto.stock += item.cantidad;
        await producto.save();
      }
    }
  }

  // Eliminar el pedido permanentemente
  await Pedido.findByIdAndDelete(req.params.id);

  res.json({ mensaje: 'Pedido eliminado permanentemente' });
});

export {
  crearPedido,
  getPedidosUsuario,
  getPedidoById,
  getPedidosAdmin,
  actualizarEstadoPedido,
  actualizarEstadoPago,
  eliminarPedido,
}; 