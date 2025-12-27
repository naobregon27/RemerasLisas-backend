import Categoria from '../models/Categoria.js';
import User from '../models/User.js';
import Producto from '../models/Producto.js';

// @desc    Obtener todas las categorías
// @route   GET /api/categorias
// @access  Public
export const getCategorias = async (req, res) => {
  try {
    const { local } = req.query;
    
    let filtro = { isActive: true };
    
    // Si se especifica un local, filtrar por ese local
    if (local) {
      filtro.local = local;
    }
    
    const categorias = await Categoria.find(filtro)
      .populate('categoriaPadre', 'nombre slug')
      .populate('local', 'nombre direccion')
      .sort('nombre');

    res.json(categorias);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error del servidor', error: error.message });
  }
};

// @desc    Obtener una categoría por ID o slug
// @route   GET /api/categorias/:id
// @access  Public
export const getCategoriaById = async (req, res) => {
  try {
    const { id } = req.params;
    let categoria;

    // Comprobar si es ID o slug
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      // Es un ID de MongoDB
      categoria = await Categoria.findById(id)
        .populate('categoriaPadre', 'nombre slug')
        .populate('local', 'nombre direccion');
    } else {
      // Es un slug
      categoria = await Categoria.findOne({ slug: id })
        .populate('categoriaPadre', 'nombre slug')
        .populate('local', 'nombre direccion');
    }

    if (!categoria) {
      return res.status(404).json({ message: 'Categoría no encontrada' });
    }

    res.json(categoria);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error del servidor', error: error.message });
  }
};

// @desc    Crear una nueva categoría
// @route   POST /api/categorias
// @access  Private/Admin/SuperAdmin
export const createCategoria = async (req, res) => {
  try {
    const { nombre, descripcion, categoriaPadreId, localId } = req.body;
    
    console.log("Body recibido:", req.body);
    console.log("Archivo:", req.file);

    // Verificar si el usuario tiene un local asignado
    let idLocal = localId;
    
    // Para administradores, verificar que tengan un local asignado
    if (req.user && req.user.role === 'admin') {
      // Si no tiene local asignado, no puede crear categorías
      if (!req.user.local) {
        return res.status(403).json({ 
          message: 'No tienes un local asignado. No puedes crear categorías.' 
        });
      }
      
      // Si no se especificó un local, usar el local del administrador
      if (!idLocal) {
        idLocal = req.user.local;
      } else if (idLocal.toString() !== req.user.local.toString()) {
        // Si se especificó un local diferente al asignado, rechazar
        return res.status(403).json({ 
          message: 'Solo puedes crear categorías para tu local asignado' 
        });
      }
    } else if (req.user && req.user.role === 'superadmin') {
      // El superadmin debe especificar un local
      if (!idLocal) {
        return res.status(400).json({ 
          message: 'Debes especificar a qué local pertenece esta categoría' 
        });
      }
    } else if (!req.user) {
      // Ruta de prueba - asegurarse de que se especifique un local
      if (!idLocal) {
        return res.status(400).json({ 
          message: 'Debes especificar a qué local pertenece esta categoría' 
        });
      }
    }

    // Verificar si ya existe una categoría con ese nombre en el mismo local
    const categoriaExistente = await Categoria.findOne({ 
      nombre, 
      local: idLocal 
    });
    
    if (categoriaExistente) {
      return res.status(400).json({ 
        message: 'Ya existe una categoría con ese nombre en este local' 
      });
    }

    // Verificar si existe la categoría padre y pertenece al mismo local
    if (categoriaPadreId) {
      const categoriaPadre = await Categoria.findById(categoriaPadreId);
      if (!categoriaPadre) {
        return res.status(404).json({ message: 'Categoría padre no encontrada' });
      }
      
      // Verificar que la categoría padre pertenezca al mismo local
      if (categoriaPadre.local.toString() !== idLocal.toString()) {
        return res.status(400).json({ 
          message: 'La categoría padre debe pertenecer al mismo local' 
        });
      }
    }

    // Procesar imagen si fue subida
    let imagenURL = null;
    if (req.file) {
      imagenURL = `/uploads/${req.file.filename}`;
    }

    // Crear la categoría
    const categoria = await Categoria.create({
      nombre,
      descripcion: descripcion || '',
      imagen: imagenURL,
      local: idLocal,
      categoriaPadre: categoriaPadreId || null,
      createdBy: req.user ? req.user._id : null // Manejar caso de ruta de prueba
    });

    res.status(201).json(categoria);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error del servidor', error: error.message });
  }
};

// @desc    Actualizar una categoría
// @route   PUT /api/categorias/:id
// @access  Private/Admin/SuperAdmin
export const updateCategoria = async (req, res) => {
  try {
    const { nombre, descripcion, categoriaPadreId } = req.body;
    const { id } = req.params;

    console.log("Body de actualización:", req.body);
    console.log("Archivo:", req.file);

    const categoria = await Categoria.findById(id);

    if (!categoria) {
      return res.status(404).json({ message: 'Categoría no encontrada' });
    }

    // Verificar permisos según el rol - solo si el usuario está autenticado
    if (req.user) {
      if (req.user.role === 'admin') {
        // Verificar que el administrador tenga asignado un local
        if (!req.user.local) {
          return res.status(403).json({ 
            message: 'No tienes un local asignado. No puedes modificar categorías.' 
          });
        }
        
        // Verificar que la categoría pertenezca al local del administrador
        if (categoria.local.toString() !== req.user.local.toString()) {
          return res.status(403).json({ 
            message: 'Solo puedes modificar categorías de tu local asignado' 
          });
        }
      }
    }

    // Verificar que no se asigne a sí misma como categoría padre
    if (categoriaPadreId && categoriaPadreId !== '' && categoriaPadreId === id) {
      return res.status(400).json({ 
        message: 'Una categoría no puede ser su propia categoría padre' 
      });
    }

    // Verificar que no se cree un ciclo
    if (categoriaPadreId && categoriaPadreId !== '') {
      let categoriaPadre = await Categoria.findById(categoriaPadreId);
      if (!categoriaPadre) {
        return res.status(404).json({ message: 'Categoría padre no encontrada' });
      }
      
      // Verificar que la categoría padre pertenezca al mismo local
      if (categoriaPadre.local.toString() !== categoria.local.toString()) {
        return res.status(400).json({ 
          message: 'La categoría padre debe pertenecer al mismo local' 
        });
      }

      // Verificar que no se forme un ciclo
      let currentParentId = categoriaPadre.categoriaPadre;
      while (currentParentId) {
        if (currentParentId.toString() === id) {
          return res.status(400).json({ 
            message: 'Esta asignación crearía un ciclo en la jerarquía de categorías' 
          });
        }
        const parent = await Categoria.findById(currentParentId);
        currentParentId = parent ? parent.categoriaPadre : null;
      }
    }

    // Verificar nombre único dentro del mismo local si se está cambiando
    if (nombre && nombre !== categoria.nombre) {
      const categoriaExistente = await Categoria.findOne({ 
        nombre,
        local: categoria.local
      });
      
      if (categoriaExistente) {
        return res.status(400).json({ 
          message: 'Ya existe una categoría con ese nombre en este local' 
        });
      }
    }

    // Procesar imagen si fue subida
    let imagenURL = categoria.imagen;
    if (req.file) {
      imagenURL = `/uploads/${req.file.filename}`;
    }

    // Actualizar la categoría
    categoria.nombre = nombre || categoria.nombre;
    categoria.descripcion = descripcion !== undefined ? descripcion : categoria.descripcion;
    categoria.imagen = imagenURL;
    
    // Manejar el caso de categoriaPadreId vacío o nulo
    if (categoriaPadreId === undefined) {
      // No cambiar el valor actual
    } else if (categoriaPadreId === null || categoriaPadreId === '') {
      categoria.categoriaPadre = null;
    } else {
      categoria.categoriaPadre = categoriaPadreId;
    }

    const updatedCategoria = await categoria.save();

    res.json(updatedCategoria);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error del servidor', error: error.message });
  }
};

// @desc    Eliminar una categoría (desactivar)
// @route   DELETE /api/categorias/:id
// @access  Private/Admin/SuperAdmin
export const deleteCategoria = async (req, res) => {
  try {
    const { id } = req.params;

    const categoria = await Categoria.findById(id);

    if (!categoria) {
      return res.status(404).json({ message: 'Categoría no encontrada' });
    }

    // Verificar permisos según el rol
    if (req.user.role === 'admin') {
      // Verificar que el administrador tenga asignado un local
      if (!req.user.local) {
        return res.status(403).json({ 
          message: 'No tienes un local asignado. No puedes eliminar categorías.' 
        });
      }
      
      // Verificar que la categoría pertenezca al local del administrador
      if (categoria.local.toString() !== req.user.local.toString()) {
        return res.status(403).json({ 
          message: 'Solo puedes eliminar categorías de tu local asignado' 
        });
      }
    }

    // Verificar si hay subcategorías
    const tieneSubcategorias = await Categoria.exists({ 
      categoriaPadre: id, 
      isActive: true 
    });
    
    if (tieneSubcategorias) {
      return res.status(400).json({ 
        message: 'No se puede eliminar la categoría porque tiene subcategorías activas' 
      });
    }

    // No eliminar realmente, solo desactivar
    categoria.isActive = false;
    await categoria.save();

    res.json({ message: 'Categoría desactivada correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error del servidor', error: error.message });
  }
};

// @desc    Restaurar una categoría
// @route   PATCH /api/categorias/:id/restore
// @access  Private/Admin/SuperAdmin
export const restoreCategoria = async (req, res) => {
  try {
    const { id } = req.params;

    const categoria = await Categoria.findById(id);

    if (!categoria) {
      return res.status(404).json({ message: 'Categoría no encontrada' });
    }

    // Verificar permisos según el rol
    if (req.user.role === 'admin') {
      // Verificar que el administrador tenga asignado un local
      if (!req.user.local) {
        return res.status(403).json({ 
          message: 'No tienes un local asignado. No puedes restaurar categorías.' 
        });
      }
      
      // Verificar que la categoría pertenezca al local del administrador
      if (categoria.local.toString() !== req.user.local.toString()) {
        return res.status(403).json({ 
          message: 'Solo puedes restaurar categorías de tu local asignado' 
        });
      }
    }

    // Verificar si la categoría padre está activa
    if (categoria.categoriaPadre) {
      const categoriaPadre = await Categoria.findById(categoria.categoriaPadre);
      if (categoriaPadre && !categoriaPadre.isActive) {
        return res.status(400).json({ 
          message: 'No se puede activar la categoría porque su categoría padre está desactivada' 
        });
      }
    }

    // Activar la categoría
    categoria.isActive = true;
    await categoria.save();

    res.json({ message: 'Categoría activada correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error del servidor', error: error.message });
  }
};

// @desc    Obtener subcategorías de una categoría
// @route   GET /api/categorias/:id/subcategorias
// @access  Public
export const getSubcategorias = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar si existe la categoría
    const categoriaExiste = await Categoria.exists({ _id: id });
    if (!categoriaExiste) {
      return res.status(404).json({ message: 'Categoría no encontrada' });
    }

    const subcategorias = await Categoria.find({ 
      categoriaPadre: id,
      isActive: true 
    }).sort('nombre');

    res.json(subcategorias);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error del servidor', error: error.message });
  }
};

// @desc    Obtener categorías por local
// @route   GET /api/categorias/local/:localId
// @access  Public
export const getCategoriasByLocal = async (req, res) => {
  try {
    const { localId } = req.params;

    const categorias = await Categoria.find({ 
      local: localId,
      isActive: true 
    })
      .populate('categoriaPadre', 'nombre slug')
      .sort('nombre');

    res.json(categorias);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error del servidor', error: error.message });
  }
};

// @desc    Obtener cantidad de productos por categoría
// @route   GET /api/categorias/productos/cantidad
// @access  Public
export const getCantidadProductosPorCategoria = async (req, res) => {
  try {
    const { local } = req.query;
    
    // Construir filtro para categorías
    let filtroCategoria = { isActive: true };
    if (local) {
      filtroCategoria.local = local;
    }

    // Obtener todas las categorías activas
    const categorias = await Categoria.find(filtroCategoria)
      .populate('local', 'nombre direccion')
      .populate('categoriaPadre', 'nombre slug')
      .sort('nombre');

    // Para cada categoría, contar los productos activos
    const categoriasConCantidad = await Promise.all(
      categorias.map(async (categoria) => {
        const cantidadProductos = await Producto.countDocuments({
          categoria: categoria._id,
          isActive: true
        });

        return {
          _id: categoria._id,
          nombre: categoria.nombre,
          descripcion: categoria.descripcion,
          imagen: categoria.imagen,
          slug: categoria.slug,
          local: categoria.local,
          categoriaPadre: categoria.categoriaPadre,
          cantidadProductos: cantidadProductos,
          isActive: categoria.isActive,
          createdAt: categoria.createdAt,
          updatedAt: categoria.updatedAt
        };
      })
    );

    res.json(categoriasConCantidad);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error del servidor', error: error.message });
  }
}; 