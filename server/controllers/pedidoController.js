import asyncHandler from 'express-async-handler';
import Pedido from '../models/Pedido.js';
import Producto from '../models/Producto.js';
import Carrito from '../models/Carrito.js';
import { sendOrderConfirmationEmail, sendOrderStatusUpdateEmail } from '../utils/emailService.js';

/**
 * @desc    Crear nuevo pedido
 * @route   POST /api/pedidos
 * @access  Privado
 */
const crearPedido = asyncHandler(async (req, res) => {
  const {
    direccionEnvio,
    metodoPago,
    impuestos,
    costoEnvio,
    notas
  } = req.body;

  // Obtener el carrito del usuario
  const carrito = await Carrito.findOne({ usuario: req.user._id })
    .populate({
      path: 'productos.producto',
      select: 'nombre precio imagenes stock slug categoria local',
    });

  if (!carrito || carrito.productos.length === 0) {
    res.status(400);
    throw new Error('No hay productos en el carrito');
  }

  // Preparar los productos para el pedido
  const productos = carrito.productos.map(item => ({
    producto: item.producto._id,
    cantidad: item.cantidad,
    variante: item.variante || {},
    precio: item.precioUnitario,
    subtotal: item.subtotal
  }));

  // Calcular subtotal
  const subtotal = carrito.productos.reduce((acc, item) => acc + item.subtotal, 0);
  
  // Calcular total
  const descuento = 0; // Este valor podría venir de un cupón o promoción
  const impuestosCalculados = impuestos || (subtotal * 0.10); // 10% por defecto o el valor proporcionado
  const costoEnvioCalculado = costoEnvio || 10; // Valor por defecto o el proporcionado
  const total = subtotal + impuestosCalculados + costoEnvioCalculado - descuento;

  // Verificar stock disponible
  for (const item of carrito.productos) {
    const producto = await Producto.findById(item.producto._id);
    if (!producto) {
      res.status(404);
      throw new Error(`Producto no encontrado: ${item.producto._id}`);
    }
    if (producto.stock < item.cantidad) {
      res.status(400);
      throw new Error(`Stock insuficiente para ${producto.nombre}`);
    }
  }

  // Actualizar stock
  for (const item of carrito.productos) {
    await Producto.findByIdAndUpdate(
      item.producto._id,
      { $inc: { stock: -item.cantidad } }
    );
  }

  // Generar código único de pedido
  const codigoPedido = Pedido.generarCodigoPedido();

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
    local: carrito.local,
    codigoPedido
  });

  const pedidoCreado = await pedido.save();
  
  // Vaciar el carrito después de crear el pedido
  await carrito.vaciar();
  
  // Devolver pedido con relaciones
  const pedidoPopulado = await Pedido.findById(pedidoCreado._id)
    .populate('usuario', 'name email')
    .populate('productos.producto', 'nombre precio imagenes')
    .populate('local', 'nombre direccion');

  // Enviar email de confirmación de pedido
  if (pedidoPopulado.usuario && pedidoPopulado.usuario.email) {
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

  res.status(201).json(pedidoPopulado);
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

    // Enviar email de notificación de cambio de estado
    if (pedidoCompleto.usuario && pedidoCompleto.usuario.email) {
      try {
        await sendOrderStatusUpdateEmail(
          pedidoCompleto.usuario.email,
          pedidoCompleto.usuario.name,
          pedidoCompleto,
          estado
        );
      } catch (error) {
        console.error('Error enviando email de cambio de estado:', error);
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