import Producto from '../models/Producto.js';
import Categoria from '../models/Categoria.js';
import Local from '../models/Local.js';
import mongoose from 'mongoose';
import fs from 'fs';

/**
 * Función helper para normalizar valores booleanos desde el request
 * Maneja: true, false, 'true', 'false', undefined, null, '', 0, 1
 */
const normalizarBooleano = (valor, valorPorDefecto = false) => {
  if (valor === undefined || valor === null || valor === '') {
    return valorPorDefecto;
  }
  if (typeof valor === 'boolean') {
    return valor;
  }
  if (typeof valor === 'string') {
    const lowerValor = valor.toLowerCase().trim();
    if (lowerValor === 'true' || lowerValor === '1') {
      return true;
    }
    if (lowerValor === 'false' || lowerValor === '0') {
      return false;
    }
    return valorPorDefecto;
  }
  if (typeof valor === 'number') {
    return valor !== 0;
  }
  return valorPorDefecto;
};

/**
 * @desc    Obtener todos los productos
 * @route   GET /api/productos
 * @access  Público
 */
export const getProductos = async (req, res) => {
  try {
    const { 
      destacado, 
      enOferta, 
      local,
      sort = '-createdAt',
      limit = 10,
      page = 1,
      search = ''
    } = req.query;

    // Construir filtros
    const filter = { isActive: true };
    
    if (destacado === 'true') filter.destacado = true;
    if (enOferta === 'true') filter.enOferta = true;
    
    // Filtrar por local si se proporciona
    if (local) {
      // Validar que el ID del local sea válido
      if (!mongoose.Types.ObjectId.isValid(local)) {
        return res.status(400).json({ mensaje: 'ID de local inválido' });
      }
      
      // Verificar que el local existe
      const localExiste = await Local.findById(local);
      if (!localExiste) {
        return res.status(404).json({ mensaje: 'Local no encontrado' });
      }
      
      filter.local = local;
    }
    
    // Buscar por nombre o descripción
    if (search) {
      filter.$or = [
        { nombre: { $regex: search, $options: 'i' } },
        { descripcion: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Configurar paginación
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Ejecutar consulta
    const productos = await Producto.find(filter)
      .sort(sort)
      .limit(parseInt(limit))
      .skip(skip)
      .populate('categoria', 'nombre')
      .populate('local', 'nombre direccion');
    
    // Contar total de productos
    const total = await Producto.countDocuments(filter);
    
    res.json({
      productos,
      paginacion: {
        total,
        paginas: Math.ceil(total / parseInt(limit)),
        paginaActual: parseInt(page),
        porPagina: parseInt(limit)
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al obtener productos' });
  }
};

/**
 * @desc    Obtener un producto por ID
 * @route   GET /api/productos/:id
 * @access  Público
 */
export const getProductoById = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ mensaje: 'ID de producto inválido' });
    }
    
    const producto = await Producto.findOne({ _id: id, isActive: true })
      .populate('categoria', 'nombre')
      .populate('local', 'nombre direccion')
      .populate('reviews.usuario', 'nombre email');
    
    if (!producto) {
      return res.status(404).json({ mensaje: 'Producto no encontrado' });
    }
    
    res.json(producto);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al obtener el producto' });
  }
};

/**
 * @desc    Obtener productos por categoría
 * @route   GET /api/productos/categoria/:id
 * @access  Público
 */
export const getProductosPorCategoria = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      sort = '-createdAt',
      limit = 10,
      page = 1
    } = req.query;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ mensaje: 'ID de categoría inválido' });
    }
    
    // Verificar que la categoría existe
    const categoria = await Categoria.findById(id);
    if (!categoria) {
      return res.status(404).json({ mensaje: 'Categoría no encontrada' });
    }
    
    // Configurar paginación
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Ejecutar consulta
    const productos = await Producto.find({ 
      categoria: id,
      isActive: true 
    })
      .sort(sort)
      .limit(parseInt(limit))
      .skip(skip)
      .populate('local', 'nombre direccion');
    
    // Contar total de productos
    const total = await Producto.countDocuments({ 
      categoria: id,
      isActive: true 
    });
    
    res.json({
      categoria: categoria.nombre,
      productos,
      paginacion: {
        total,
        paginas: Math.ceil(total / parseInt(limit)),
        paginaActual: parseInt(page),
        porPagina: parseInt(limit)
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al obtener productos por categoría' });
  }
};

/**
 * @desc    Obtener productos por local
 * @route   GET /api/productos/local/:id
 * @access  Público
 */
export const getProductosPorLocal = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      sort = '-createdAt',
      limit = 10,
      page = 1
    } = req.query;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ mensaje: 'ID de local inválido' });
    }
    
    // Verificar que el local existe
    const local = await Local.findById(id);
    if (!local) {
      return res.status(404).json({ mensaje: 'Local no encontrado' });
    }
    
    // Configurar paginación
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Ejecutar consulta
    const productos = await Producto.find({ 
      local: id,
      isActive: true 
    })
      .sort(sort)
      .limit(parseInt(limit))
      .skip(skip)
      .populate('categoria', 'nombre');
    
    // Contar total de productos
    const total = await Producto.countDocuments({ 
      local: id,
      isActive: true 
    });
    
    res.json({
      local: local.nombre,
      productos,
      paginacion: {
        total,
        paginas: Math.ceil(total / parseInt(limit)),
        paginaActual: parseInt(page),
        porPagina: parseInt(limit)
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al obtener productos por local' });
  }
};

/**
 * @desc    Crear un nuevo producto
 * @route   POST /api/productos
 * @access  Privado (Admin, SuperAdmin)
 */
export const createProducto = async (req, res) => {
  try {
    console.log("Body recibido:", req.body);
    console.log("Archivo:", req.file);
    console.log("Usuario:", req.user);
    
    const {
      nombre,
      descripcion,
      precio,
      precioAnterior,
      stock,
      categoria,
      local,
      etiquetas,
      caracteristicas,
      variantes,
      destacado,
      enOferta,
      porcentajeDescuento
    } = req.body;
    
    // Procesar campos que pueden venir como JSON string
    let etiquetasParsed = [];
    if (etiquetas) {
      try {
        etiquetasParsed = typeof etiquetas === 'string' ? JSON.parse(etiquetas) : etiquetas;
      } catch (e) {
        console.error("Error al parsear etiquetas:", e);
      }
    }
    
    let caracteristicasParsed = [];
    if (caracteristicas) {
      try {
        caracteristicasParsed = typeof caracteristicas === 'string' ? JSON.parse(caracteristicas) : caracteristicas;
      } catch (e) {
        console.error("Error al parsear características:", e);
      }
    }
    
    let variantesParsed = [];
    if (variantes) {
      try {
        variantesParsed = typeof variantes === 'string' ? JSON.parse(variantes) : variantes;
      } catch (e) {
        console.error("Error al parsear variantes:", e);
      }
    }
    
    // Crear array de imágenes con el archivo subido
    let imagenes = [];
    if (req.file) {
      // Convertir la imagen a base64
      const imageBuffer = fs.readFileSync(req.file.path);
      const base64Image = `data:${req.file.mimetype};base64,${imageBuffer.toString('base64')}`;
      
      imagenes.push({
        url: base64Image,
        alt: nombre || req.file.originalname || 'Imagen del producto'
      });
      console.log("Imagen guardada:", imagenes);
    } else {
      console.log("No se detectó ninguna imagen para subir");
    }

    // Manejo de archivos múltiples si usas upload.array
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        const imageBuffer = fs.readFileSync(file.path);
        const base64Image = `data:${file.mimetype};base64,${imageBuffer.toString('base64')}`;
        
        imagenes.push({
          url: base64Image,
          alt: nombre || file.originalname || 'Imagen del producto'
        });
      });
      console.log("Imágenes múltiples guardadas:", imagenes);
    }
    
    // Verificar campos obligatorios
    if (!nombre) {
      return res.status(400).json({ mensaje: 'El nombre del producto es obligatorio' });
    }
    if (!descripcion) {
      return res.status(400).json({ mensaje: 'La descripción del producto es obligatoria' });
    }
    if (!precio) {
      return res.status(400).json({ mensaje: 'El precio del producto es obligatorio' });
    }
    if (!categoria) {
      return res.status(400).json({ mensaje: 'La categoría del producto es obligatoria' });
    }
    
    // Verificar que la categoría existe
    if (categoria && !await Categoria.findById(categoria)) {
      return res.status(400).json({ mensaje: 'La categoría seleccionada no existe' });
    }
    
    // Verificar que el local existe
    if (local && !await Local.findById(local)) {
      return res.status(400).json({ mensaje: 'El local seleccionado no existe' });
    }
    
    // Verificar permisos de admin según el local
    if (req.user && req.user.role === 'admin') {
      // Verificar que el admin tenga un local asignado
      if (!req.user.local) {
        return res.status(403).json({ 
          mensaje: 'No tienes un local asignado. Contacta con un superAdmin para que te asigne un local.'
        });
      }
      
      // Verificar que solo pueda crear productos para su local
      const localAsignado = req.user.local.toString();
      if (local && local.toString() !== localAsignado) {
        return res.status(403).json({ 
          mensaje: 'Solo puedes crear productos para tu local asignado'
        });
      }
      
      // Si no se especificó local, usar el del admin
      if (!local) {
        req.body.local = localAsignado;
      }
    }
    
    // Normalizar valores booleanos
    const destacadoNormalizado = normalizarBooleano(destacado, false);
    const enOfertaNormalizado = normalizarBooleano(enOferta, false);
    
    // Crear el producto
    const nuevoProducto = new Producto({
      nombre,
      descripcion,
      precio: parseFloat(precio),
      precioAnterior: parseFloat(precioAnterior || 0),
      imagenes,
      stock: parseInt(stock || 0),
      categoria,
      local: req.body.local || local,
      etiquetas: etiquetasParsed,
      caracteristicas: caracteristicasParsed,
      variantes: variantesParsed,
      destacado: destacadoNormalizado,
      enOferta: enOfertaNormalizado,
      porcentajeDescuento: parseFloat(porcentajeDescuento || 0),
      createdBy: req.user ? req.user._id : null
    });
    
    console.log("Producto a guardar:", nuevoProducto);
    
    const productoGuardado = await nuevoProducto.save();
    
    res.status(201).json(productoGuardado);
  } catch (error) {
    console.error("Error completo:", error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        mensaje: 'Error de validación', 
        errores: Object.values(error.errors).map(e => e.message) 
      });
    }
    res.status(500).json({ 
      mensaje: 'Error al crear el producto',
      error: error.message
    });
  }
};

/**
 * @desc    Actualizar un producto
 * @route   PUT /api/productos/:id
 * @access  Privado (Admin, SuperAdmin)
 */
export const updateProducto = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ mensaje: 'ID de producto inválido' });
    }
    
    // Verificar que el producto existe
    const producto = await Producto.findById(id);
    if (!producto) {
      return res.status(404).json({ mensaje: 'Producto no encontrado' });
    }
    
    // Verificar permisos de admin según el local
    if (req.user && req.user.role === 'admin') {
      // Verificar que el admin tenga un local asignado
      if (!req.user.local) {
        return res.status(403).json({ 
          mensaje: 'No tienes un local asignado. Contacta con un superAdmin para que te asigne un local.'
        });
      }
      
      // Verificar que el producto pertenezca al local del admin
      if (producto.local.toString() !== req.user.local.toString()) {
        return res.status(403).json({ 
          mensaje: 'No puedes modificar productos de otros locales'
        });
      }
      
      // No permitir cambiar el local del producto
      if (req.body.local && req.body.local.toString() !== req.user.local.toString()) {
        return res.status(403).json({ 
          mensaje: 'No puedes mover un producto a otro local'
        });
      }
    }
    
    // Verificar categoría y local si se están actualizando
    if (req.body.categoria && !await Categoria.findById(req.body.categoria)) {
      return res.status(400).json({ mensaje: 'La categoría seleccionada no existe' });
    }
    
    if (req.body.local && !await Local.findById(req.body.local)) {
      return res.status(400).json({ mensaje: 'El local seleccionado no existe' });
    }
    
    // Procesar campos que pueden venir como JSON string
    const updateData = { ...req.body };
    
    // Normalizar valores booleanos si están presentes en el request
    if ('destacado' in req.body) {
      updateData.destacado = normalizarBooleano(req.body.destacado, false);
    }
    if ('enOferta' in req.body) {
      updateData.enOferta = normalizarBooleano(req.body.enOferta, false);
    }
    
    // Procesar etiquetas si vienen como string
    if (typeof updateData.etiquetas === 'string') {
      try {
        updateData.etiquetas = JSON.parse(updateData.etiquetas.trim());
      } catch (e) {
        console.error("Error al parsear etiquetas:", e);
        return res.status(400).json({ 
          mensaje: 'Formato de etiquetas inválido. Debe ser un array JSON válido' 
        });
      }
    }
    
    // Procesar características si vienen como string
    if (typeof updateData.caracteristicas === 'string') {
      try {
        updateData.caracteristicas = JSON.parse(updateData.caracteristicas.trim());
      } catch (e) {
        console.error("Error al parsear características:", e);
        return res.status(400).json({ 
          mensaje: 'Formato de características inválido. Debe ser un array JSON válido' 
        });
      }
    }
    
    // Procesar variantes si vienen como string
    if (typeof updateData.variantes === 'string') {
      try {
        updateData.variantes = JSON.parse(updateData.variantes.trim());
      } catch (e) {
        console.error("Error al parsear variantes:", e);
        return res.status(400).json({ 
          mensaje: 'Formato de variantes inválido. Debe ser un array JSON válido' 
        });
      }
    }
    
    // Procesar imagen si fue subida
    if (req.file) {
      const imageBuffer = fs.readFileSync(req.file.path);
      const base64Image = `data:${req.file.mimetype};base64,${imageBuffer.toString('base64')}`;
      
      const nuevaImagen = {
        url: base64Image,
        alt: updateData.nombre || req.file.originalname || 'Imagen del producto'
      };
      
      // Verificar si hay que preservar imágenes existentes o reemplazarlas
      if (updateData.mantenerImagenesExistentes === 'true' && producto.imagenes && producto.imagenes.length > 0) {
        // Agregar la nueva imagen al array existente
        updateData.imagenes = [...producto.imagenes, nuevaImagen];
      } else {
        // Reemplazar con la nueva imagen
        updateData.imagenes = [nuevaImagen];
      }
      console.log("Imágenes a guardar:", updateData.imagenes);
    }
    
    // Manejo de archivos múltiples si usas upload.array
    if (req.files && req.files.length > 0) {
      // Inicializar array de imágenes si es necesario preservar las existentes
      if (updateData.mantenerImagenesExistentes === 'true' && producto.imagenes && producto.imagenes.length > 0) {
        updateData.imagenes = [...producto.imagenes];
      } else {
        updateData.imagenes = [];
      }
      
      // Añadir nuevas imágenes
      req.files.forEach(file => {
        const imageBuffer = fs.readFileSync(file.path);
        const base64Image = `data:${file.mimetype};base64,${imageBuffer.toString('base64')}`;
        
        updateData.imagenes.push({
          url: base64Image,
          alt: updateData.nombre || file.originalname || 'Imagen del producto'
        });
      });
      console.log("Imágenes múltiples a guardar:", updateData.imagenes);
    }
    
    console.log('Datos a actualizar:', updateData);
    
    // Actualizar producto
    const productoActualizado = await Producto.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );
    
    res.json(productoActualizado);
  } catch (error) {
    console.error('Error completo:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        mensaje: 'Error de validación', 
        errores: Object.values(error.errors).map(e => e.message) 
      });
    }
    res.status(500).json({ 
      mensaje: 'Error al actualizar el producto',
      error: error.message
    });
  }
};

/**
 * @desc    Eliminar un producto (soft delete)
 * @route   DELETE /api/productos/:id
 * @access  Privado (Admin, SuperAdmin)
 */
export const deleteProducto = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ mensaje: 'ID de producto inválido' });
    }
    
    // Verificar que el producto existe
    const producto = await Producto.findById(id);
    if (!producto) {
      return res.status(404).json({ mensaje: 'Producto no encontrado' });
    }
    
    // Verificar permisos de admin según el local
    if (req.user.role === 'admin') {
      // Verificar que el admin tenga un local asignado
      if (!req.user.local) {
        return res.status(403).json({ 
          mensaje: 'No tienes un local asignado. Contacta con un superAdmin para que te asigne un local.'
        });
      }
      
      // Verificar que el producto pertenezca al local del admin
      if (producto.local.toString() !== req.user.local.toString()) {
        return res.status(403).json({ 
          mensaje: 'No puedes eliminar productos de otros locales'
        });
      }
    }
    
    // Soft delete
    producto.isActive = false;
    await producto.save();
    
    res.json({ mensaje: 'Producto eliminado correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al eliminar el producto' });
  }
};

/**
 * @desc    Restaurar un producto eliminado
 * @route   PATCH /api/productos/:id/restore
 * @access  Privado (Admin, SuperAdmin)
 */
export const restoreProducto = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ mensaje: 'ID de producto inválido' });
    }
    
    // Verificar que el producto existe
    const producto = await Producto.findById(id);
    if (!producto) {
      return res.status(404).json({ mensaje: 'Producto no encontrado' });
    }
    
    // Verificar permisos de admin según el local
    if (req.user.role === 'admin') {
      // Verificar que el admin tenga un local asignado
      if (!req.user.local) {
        return res.status(403).json({ 
          mensaje: 'No tienes un local asignado. Contacta con un superAdmin para que te asigne un local.'
        });
      }
      
      // Verificar que el producto pertenezca al local del admin
      if (producto.local.toString() !== req.user.local.toString()) {
        return res.status(403).json({ 
          mensaje: 'No puedes restaurar productos de otros locales'
        });
      }
    }
    
    // Restaurar producto
    producto.isActive = true;
    await producto.save();
    
    res.json({ mensaje: 'Producto restaurado correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al restaurar el producto' });
  }
}; 