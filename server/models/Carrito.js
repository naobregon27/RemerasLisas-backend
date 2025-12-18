import mongoose from 'mongoose';

const carritoSchema = new mongoose.Schema({
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
    // Para variantes como talla, color, etc.
    variante: {
      nombre: String,
      valor: String
    },
    precioUnitario: {
      type: Number,
      required: true
    },
    subtotal: {
      type: Number,
      required: true
    },
    // Para rastrear si hay cambios de precio o stock
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  local: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Local'
  },
  subtotal: {
    type: Number,
    default: 0
  },
  descuento: {
    type: Number,
    default: 0
  },
  total: {
    type: Number,
    default: 0
  },
  // Para implementar funcionalidad de "guardar para después"
  guardados: [{
    producto: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Producto'
    },
    variante: {
      nombre: String,
      valor: String
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  // Para comprar como invitado (usuarios no registrados)
  sessionId: {
    type: String,
    default: null
  },
  // Expiración del carrito para invitados (3 días)
  expiraEn: {
    type: Date,
    default: function() {
      const now = new Date();
      return new Date(now.setDate(now.getDate() + 3));
    }
  }
}, {
  timestamps: true
});

// Calcular totales al guardar
carritoSchema.pre('save', function(next) {
  // Calcular subtotal
  let subtotal = 0;
  this.productos.forEach(item => {
    subtotal += item.subtotal;
  });
  this.subtotal = subtotal;
  
  // Calcular total (subtotal - descuento)
  this.total = Math.max(0, subtotal - this.descuento);
  
  next();
});

// Método para actualizar cantidades
carritoSchema.methods.actualizarCantidad = async function(productoId, varianteNombre, varianteValor, cantidad) {
  const productoIndex = this.productos.findIndex(
    item => (
      item.producto.toString() === productoId &&
      item.variante.nombre === varianteNombre &&
      item.variante.valor === varianteValor
    )
  );

  if (productoIndex === -1) {
    throw new Error('Producto no encontrado en el carrito');
  }

  if (cantidad <= 0) {
    // Eliminar producto si cantidad es 0 o negativa
    this.productos.splice(productoIndex, 1);
  } else {
    // Actualizar cantidad y subtotal
    this.productos[productoIndex].cantidad = cantidad;
    this.productos[productoIndex].subtotal = 
      this.productos[productoIndex].precioUnitario * cantidad;
  }

  await this.save();
  return this;
};

// Método para limpiar carrito
carritoSchema.methods.vaciar = async function() {
  this.productos = [];
  this.subtotal = 0;
  this.descuento = 0;
  this.total = 0;
  
  await this.save();
  return this;
};

const Carrito = mongoose.model('Carrito', carritoSchema);

export default Carrito; 