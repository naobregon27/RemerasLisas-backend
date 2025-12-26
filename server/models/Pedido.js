import mongoose from 'mongoose';

const pedidoSchema = new mongoose.Schema({
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'El usuario es obligatorio']
  },
  productos: [{
    producto: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Producto',
      required: true
    },
    cantidad: {
      type: Number,
      required: true,
      min: [1, 'La cantidad mínima es 1']
    },
    precio: {
      type: Number,
      required: true
    },
    // Para variantes como talla, color, etc.
    variante: {
      nombre: String,
      valor: String
    },
    subtotal: {
      type: Number,
      required: true
    }
  }],
  estadoPedido: {
    type: String,
    enum: ['pendiente', 'procesando', 'enviado', 'entregado', 'cancelado'],
    default: 'pendiente'
  },
  fechaEntrega: {
    type: Date,
    default: null
  },
  metodoPago: {
    type: String,
    enum: ['tarjeta', 'efectivo', 'transferencia', 'mercadopago', 'otro'],
    required: [true, 'El método de pago es obligatorio obligatorio']
  },
  estadoPago: {
    type: String,
    enum: ['pendiente', 'procesando', 'completado', 'fallido', 'reembolsado'],
    default: 'pendiente'
  },
  datosTransaccion: {
    idTransaccion: String,
    fechaTransaccion: Date,
    proveedor: String,
    detalles: Object,
    // Campos específicos de Mercado Pago
    mercadopago: {
      preferenceId: String,
      paymentId: String,
      status: String,
      statusDetail: String,
      paymentType: String,
      merchantOrderId: String,
      externalReference: String,
      installments: Number,
      transactionAmount: Number
    }
  },
  direccionEnvio: {
    nombre: {
      type: String,
      required: [true, 'El nombre es obligatorio']
    },
    direccion: {
      type: String,
      required: [true, 'La dirección es obligatoria']
    },
    ciudad: {
      type: String,
      required: [true, 'La ciudad es obligatoria']
    },
    codigoPostal: {
      type: String,
      required: [true, 'El código postal es obligatorio']
    },
    pais: {
      type: String,
      required: [true, 'El país es obligatorio']
    },
    telefono: {
      type: String,
      required: [true, 'El teléfono es obligatorio']
    }
  },
  local: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Local',
    required: [true, 'El local es obligatorio']
  },
  subtotal: {
    type: Number,
    required: [true, 'El subtotal es obligatorio']
  },
  impuestos: {
    type: Number,
    default: 0
  },
  costoEnvio: {
    type: Number,
    default: 0
  },
  descuento: {
    type: Number,
    default: 0
  },
  total: {
    type: Number,
    required: [true, 'El total es obligatorio']
  },
  notas: {
    type: String,
    trim: true
  },
  // Seguimiento de cambios de estado
  historialEstados: [{
    estado: {
      type: String,
      enum: ['pendiente', 'procesando', 'enviado', 'entregado', 'cancelado']
    },
    fecha: {
      type: Date,
      default: Date.now
    },
    usuario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    notas: String
  }],
  // Seguimiento de cambios de pago
  historialPagos: [{
    estado: {
      type: String,
      enum: ['pendiente', 'procesando', 'completado', 'fallido', 'reembolsado']
    },
    fecha: {
      type: Date,
      default: Date.now
    },
    monto: Number,
    idTransaccion: String,
    notas: String
  }]
}, {
  timestamps: true
});

// Middleware para actualizar historial de estados
pedidoSchema.pre('save', function(next) {
  if (this.isModified('estadoPedido')) {
    this.historialEstados.push({
      estado: this.estadoPedido,
      fecha: new Date(),
      usuario: this.usuario
    });
  }
  
  if (this.isModified('estadoPago')) {
    this.historialPagos.push({
      estado: this.estadoPago,
      fecha: new Date(),
      monto: this.total
    });
  }
  
  next();
});

// Para generar códigos de pedido únicos
pedidoSchema.statics.generarCodigoPedido = function() {
  const fecha = new Date();
  const año = fecha.getFullYear().toString().slice(-2);
  const mes = ('0' + (fecha.getMonth() + 1)).slice(-2);
  const dia = ('0' + fecha.getDate()).slice(-2);
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  
  return `P${año}${mes}${dia}-${random}`;
};

const Pedido = mongoose.model('Pedido', pedidoSchema);

export default Pedido; 