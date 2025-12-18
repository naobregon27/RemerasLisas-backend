import mongoose from 'mongoose';
import slugify from 'slugify';

const productoSchema = mongoose.Schema(
  {
    nombre: {
      type: String,
      required: [true, 'El nombre del producto es obligatorio'],
      trim: true
    },
    slug: {
      type: String,
      unique: true
    },
    descripcion: {
      type: String,
      required: [true, 'La descripción del producto es obligatoria']
    },
    precio: {
      type: Number,
      required: [true, 'El precio del producto es obligatorio'],
      min: [0, 'El precio no puede ser negativo']
    },
    precioAnterior: {
      type: Number,
      default: 0
    },
    imagenes: [
      {
        url: String,
        alt: String
      }
    ],
    stock: {
      type: Number,
      default: 0,
      min: 0
    },
    categoria: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Categoria',
      required: [true, 'La categoría del producto es obligatoria']
    },
    local: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Local',
      required: [true, 'El local del producto es obligatorio']
    },
    etiquetas: [String],
    caracteristicas: [
      {
        nombre: String,
        valor: String
      }
    ],
    variantes: [
      {
        nombre: String,
        opciones: [
          {
            valor: String,
            precio: Number,
            stock: Number
          }
        ]
      }
    ],
    destacado: {
      type: Boolean,
      default: false
    },
    enOferta: {
      type: Boolean,
      default: false
    },
    porcentajeDescuento: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    calificacion: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    numeroReviews: {
      type: Number,
      default: 0
    },
    reviews: [
      {
        usuario: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        nombre: String,
        calificacion: {
          type: Number,
          required: true,
          min: 1,
          max: 5
        },
        comentario: String,
        createdAt: {
          type: Date,
          default: Date.now
        }
      }
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

// Crear índices para búsqueda
productoSchema.index({ nombre: 'text', descripcion: 'text' });
productoSchema.index({ precio: 1 });
productoSchema.index({ categoria: 1 });
productoSchema.index({ local: 1 });
productoSchema.index({ createdAt: -1 });
productoSchema.index({ destacado: 1 });
productoSchema.index({ enOferta: 1 });

// Middleware pre-save para generar el slug
productoSchema.pre('save', async function (next) {
  if (this.isModified('nombre')) {
    // Generar slug base
    let slug = slugify(this.nombre, {
      lower: true,
      strict: true
    });

    // Verificar si el slug ya existe y agregar un sufijo único si es necesario
    const existeSlug = await this.constructor.findOne({ slug, _id: { $ne: this._id } });
    if (existeSlug) {
      // Agregar un timestamp para hacer único el slug
      slug = `${slug}-${Date.now().toString().slice(-6)}`;
    }
    
    this.slug = slug;
  }

  // Calcular precio con descuento si está en oferta
  if (this.isModified('enOferta') || this.isModified('porcentajeDescuento') || this.isModified('precio')) {
    if (this.enOferta && this.porcentajeDescuento > 0) {
      // Guardar precio anterior si es necesario
      if (this.isModified('precio') && !this.isModified('enOferta') && this.enOferta) {
        this.precioAnterior = this.precio;
      } else if (this.isModified('enOferta') && this.enOferta) {
        this.precioAnterior = this.precio;
      }
    } else {
      // Si ya no está en oferta, reiniciar precio anterior
      if (this.isModified('enOferta') && !this.enOferta) {
        this.precioAnterior = 0;
      }
    }
  }

  next();
});

// Método para calcular el precio con descuento
productoSchema.methods.getPrecioConDescuento = function () {
  if (this.enOferta && this.porcentajeDescuento > 0) {
    return this.precio - (this.precio * (this.porcentajeDescuento / 100));
  }
  return this.precio;
};

// Método virtual para obtener el precio con descuento
productoSchema.virtual('precioFinal').get(function () {
  return this.getPrecioConDescuento();
});

// Configurar para incluir virtuals al convertir a JSON y Object
productoSchema.set('toJSON', { virtuals: true });
productoSchema.set('toObject', { virtuals: true });

const Producto = mongoose.model('Producto', productoSchema);

export default Producto; 