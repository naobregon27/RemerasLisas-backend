import mongoose from 'mongoose';

const localSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: [true, 'El nombre del local es obligatorio'],
    trim: true
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true
  },
  direccion: {
    type: String,
    required: [true, 'La dirección es obligatoria'],
    trim: true
  },
  telefono: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  administrador: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  empleados: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // Campos para seguimiento de activación/desactivación
  activatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  activatedAt: {
    type: Date,
    default: null
  },
  deactivatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  deactivatedAt: {
    type: Date,
    default: null
  },
  // Otros campos útiles para información del local
  horarioAtencion: {
    type: String,
    default: 'Lunes a Viernes 9:00 - 18:00'
  },
  ubicacionGPS: {
    lat: {
      type: Number,
      default: null
    },
    lng: {
      type: Number,
      default: null
    }
  },
  // Configuración visual y personalización de tienda
  configuracionTienda: {
    colorPrimario: {
      type: String,
      default: '#3498db' // Color azul por defecto
    },
    colorSecundario: {
      type: String,
      default: '#2ecc71' // Color verde por defecto
    },
    colorTexto: {
      type: String,
      default: '#333333' // Gris oscuro por defecto
    },
    logo: {
      url: {
        type: String,
        default: null
      },
      alt: {
        type: String,
        default: 'Logo de la tienda'
      }
    },
    bannerPrincipal: [{
      url: {
        type: String,
        required: true
      },
      alt: {
        type: String,
        default: 'Banner de la tiendas'
      }
    }],
    mensaje: {
      type: String,
      default: 'Bienvenidos a nuestra tienda en línea'
    },
    metaTitulo: {
      type: String,
      default: ''
    },
    metaDescripcion: {
      type: String,
      default: ''
    },
    // Nuevos campos para carrusel y secciones personalizadas
    carrusel: [{
      url: {
        type: String,
        required: true
      },
      alt: {
        type: String,
        default: 'Imagen del carrusel'
      },
      titulo: String,
      subtitulo: String,
      botonTexto: String,
      botonUrl: String,
      orden: {
        type: Number,
        default: 0
      }
    }],
    secciones: [{
      id: mongoose.Schema.Types.ObjectId,
      titulo: {
        type: String,
        required: true
      },
      contenido: {
        type: String,
        required: true
      },
      imagen: String,
      orden: {
        type: Number,
        default: 0
      }
    }],
    // Configuración para navegación personalizada
    menuPersonalizado: [{
      titulo: String,
      url: String,
      icono: String,
      orden: Number
    }],
    // Configuración para pie de página
    piePagina: {
      columnas: [{
        titulo: String,
        enlaces: [{
          texto: String,
          url: String
        }]
      }],
      textoCopyright: {
        type: String,
        default: '© 2024 Mi Tienda. Todos los derechos reservados.'
      }
    }
  },
  // Configuración de negocio
  configuracionNegocio: {
    moneda: {
      type: String,
      default: 'ARS'
    },
    impuestos: {
      type: Number,
      default: 21 // IVA en Argentina
    },
    costoEnvio: {
      type: Number,
      default: 0
    },
    envioGratis: {
      activo: {
        type: Boolean,
        default: false
      },
      montoMinimo: {
        type: Number,
        default: 0
      }
    },
    metodosContacto: {
      whatsapp: {
        type: String,
        default: null
      },
      instagram: {
        type: String,
        default: null
      },
      facebook: {
        type: String,
        default: null
      },
      twitter: {
        type: String,
        default: null
      }
    }
  }
}, {
  timestamps: true
});

// Middleware para generar slug antes de guardar
localSchema.pre('save', function(next) {
  if (!this.isModified('nombre')) return next();
  
  // Crear slug a partir del nombre
  this.slug = this.nombre
    .toLowerCase()
    .replace(/[^\w ]+/g, '')
    .replace(/ +/g, '-');
  
  next();
});

// Método para buscar por slug o ID
localSchema.statics.findByIdOrSlug = async function(idOrSlug) {
  let local;
  
  if (mongoose.Types.ObjectId.isValid(idOrSlug)) {
    local = await this.findById(idOrSlug);
  } else {
    local = await this.findOne({ slug: idOrSlug });
  }
  
  return local;
};

const Local = mongoose.model('Local', localSchema);

export default Local; 