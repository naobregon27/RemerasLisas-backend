import mongoose from 'mongoose';

const categoriaSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: [true, 'El nombre de la categoría es obligatorio'],
    trim: true,
    unique: true
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
    unique: true,
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

const Categoria = mongoose.model('Categoria', categoriaSchema);

export default Categoria; 