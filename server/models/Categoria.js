import mongoose from 'mongoose';

const categoriaSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: [true, 'El nombre de la categoría es obligatorio'],
    trim: true
  },
  descripcion: {
    type: String,
    trim: true
  },
  imagen: {
    type: String,
    default: null
  },
  // Referencia al local al que pertenece esta categoría
  local: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Local',
    required: [true, 'Toda categoría debe pertenecer a un local']
  },
  // Permite categorías anidadas (subcategorías)
  categoriaPadre: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Categoria',
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  slug: {
    type: String,
    lowercase: true
  }
}, {
  timestamps: true
});

// Middleware para generar slug antes de guardar
categoriaSchema.pre('save', function(next) {
  if (!this.isModified('nombre')) return next();
  
  // Crear slug a partir del nombre
  this.slug = this.nombre
    .toLowerCase()
    .replace(/[^\w ]+/g, '')
    .replace(/ +/g, '-');
  
  next();
});

// Índices compuestos únicos: nombre y slug deben ser únicos POR LOCAL
// Esto permite que diferentes locales tengan categorías con el mismo nombre o slug
categoriaSchema.index({ nombre: 1, local: 1 }, { unique: true });
categoriaSchema.index({ slug: 1, local: 1 }, { unique: true });

const Categoria = mongoose.model('Categoria', categoriaSchema);

export default Categoria; 