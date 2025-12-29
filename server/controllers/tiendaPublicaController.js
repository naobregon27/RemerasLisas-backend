import Local from '../models/Local.js';
import Producto from '../models/Producto.js';
import Categoria from '../models/Categoria.js';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import storageConfig from '../config/storage.js';

// Obtener información básica de la tienda
export const obtenerInfoTienda = async (req, res) => {
  try {
    const { slug } = req.params;
    console.log(`🔍 Buscando tienda con slug: "${slug}"`);
    
    // Buscar la tienda por slug
    const tienda = await Local.findOne({ slug }).select(
      'nombre direccion telefono email horarioAtencion ubicacionGPS configuracionTienda configuracionNegocio isActive'
    );
    
    if (!tienda) {
      console.log(`❌ Tienda no encontrada con slug: "${slug}"`);
      return res.status(404).json({ msg: 'Tienda no encontrada' });
    }
    
    console.log(`✅ Tienda encontrada: "${tienda.nombre}" (${tienda._id})`);
    console.log(`⚡ Estado de la tienda: ${tienda.isActive ? 'Activa' : 'Inactiva'}`);
    
    // Si la tienda existe pero está inactiva, no se muestra
    if (!tienda.isActive) {
      console.log(`🚫 La tienda está inactiva, devolviendo error 403`);
      return res.status(403).json({ msg: 'Esta tienda no está disponible actualmente' });
    }
    
    // Normalizar URLs de imágenes en secciones antes de devolver
    if (tienda.configuracionTienda && tienda.configuracionTienda.secciones && Array.isArray(tienda.configuracionTienda.secciones)) {
      tienda.configuracionTienda.secciones = tienda.configuracionTienda.secciones.map(seccion => ({
        ...seccion.toObject ? seccion.toObject() : seccion,
        imagen: normalizarUrlImagenSeccion(seccion.imagen)
      }));
    }
    
    console.log(`✨ Devolviendo información de la tienda "${tienda.nombre}"`);
    return res.json(tienda);
  } catch (error) {
    console.log(`❌ Error al obtener información de la tienda: ${error.message}`);
    console.log(error);
    return res.status(500).json({ msg: 'Hubo un error al obtener la información de la tienda' });
  }
};

// Obtener productos destacados de la tienda
export const obtenerProductosDestacados = async (req, res) => {
  try {
    const { slug } = req.params;
    
    // Buscar la tienda por slug
    const tienda = await Local.findOne({ slug });
    
    if (!tienda || !tienda.isActive) {
      return res.status(404).json({ msg: 'Tienda no encontrada o inactiva' });
    }
    
    // Obtener productos activos y destacados de esta tienda
    const productos = await Producto.find({
      local: tienda._id,
      isActive: true,
      destacado: true
    })
    .limit(8)
    .select('nombre descripcion precio imagenes slug stock descuento');
    
    return res.json(productos);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ msg: 'Hubo un error al obtener los productos destacados' });
  }
};

// Obtener todas las categorías disponibles para esta tienda
export const obtenerCategorias = async (req, res) => {
  try {
    const { slug } = req.params;
    
    // Buscar la tienda por slug
    const tienda = await Local.findOne({ slug });
    
    if (!tienda || !tienda.isActive) {
      return res.status(404).json({ msg: 'Tienda no encontrada o inactiva' });
    }
    
    // Buscar categorías que tengan productos en esta tienda
    const categoriaIds = await Producto.find({
      local: tienda._id,
      isActive: true
    }).distinct('categoria');
    
    // Obtener las categorías completas
    const categorias = await Categoria.find({
      _id: { $in: categoriaIds },
      isActive: true
    }).select('nombre slug descripcion imagen');
    
    return res.json(categorias);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ msg: 'Hubo un error al obtener las categorías' });
  }
};

// Obtener productos por categoría
export const obtenerProductosPorCategoria = async (req, res) => {
  try {
    const { slug, categoriaSlug } = req.params;
    
    // Buscar la tienda por slug
    const tienda = await Local.findOne({ slug });
    
    if (!tienda || !tienda.isActive) {
      return res.status(404).json({ msg: 'Tienda no encontrada o inactiva' });
    }
    
    // Buscar la categoría por slug
    const categoria = await Categoria.findOne({ slug: categoriaSlug });
    
    if (!categoria || !categoria.isActive) {
      return res.status(404).json({ msg: 'Categoría no encontrada o inactiva' });
    }
    
    // Paginación
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;
    
    // Buscar productos de esta tienda en esa categoría
    const productos = await Producto.find({
      local: tienda._id,
      categoria: categoria._id,
      isActive: true
    })
    .select('nombre descripcion precio imagenes slug stock descuento')
    .skip(skip)
    .limit(limit);
    
    // Contar total de productos para la paginación
    const total = await Producto.countDocuments({
      local: tienda._id,
      categoria: categoria._id,
      isActive: true
    });
    
    return res.json({
      productos,
      paginacion: {
        total,
        paginas: Math.ceil(total / limit),
        paginaActual: page,
        porPagina: limit
      }
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ msg: 'Hubo un error al obtener los productos' });
  }
};

// Buscar productos en la tienda
export const buscarProductos = async (req, res) => {
  try {
    const { slug } = req.params;
    const { q } = req.query;
    
    if (!q) {
      return res.status(400).json({ msg: 'Se requiere un término de búsqueda' });
    }
    
    // Buscar la tienda por slug
    const tienda = await Local.findOne({ slug });
    
    if (!tienda || !tienda.isActive) {
      return res.status(404).json({ msg: 'Tienda no encontrada o inactiva' });
    }
    
    // Paginación
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;
    
    // Crear consulta de búsqueda
    const busqueda = {
      local: tienda._id,
      isActive: true,
      $or: [
        { nombre: { $regex: q, $options: 'i' } },
        { descripcion: { $regex: q, $options: 'i' } }
      ]
    };
    
    // Buscar productos que coincidan
    const productos = await Producto.find(busqueda)
      .select('nombre descripcion precio imagenes slug stock descuento')
      .skip(skip)
      .limit(limit);
    
    // Contar total para paginación
    const total = await Producto.countDocuments(busqueda);
    
    return res.json({
      productos,
      paginacion: {
        total,
        paginas: Math.ceil(total / limit),
        paginaActual: page,
        porPagina: limit
      }
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ msg: 'Hubo un error al buscar productos' });
  }
};

// Obtener detalle de un producto
export const obtenerProducto = async (req, res) => {
  try {
    const { slug, productoSlug } = req.params;
    
    // Buscar la tienda por slug
    const tienda = await Local.findOne({ slug });
    
    if (!tienda || !tienda.isActive) {
      return res.status(404).json({ msg: 'Tienda no encontrada o inactiva' });
    }
    
    // Buscar el producto por slug y tienda
    const producto = await Producto.findOne({
      local: tienda._id,
      slug: productoSlug,
      isActive: true
    }).populate('categoria', 'nombre slug');
    
    if (!producto) {
      return res.status(404).json({ msg: 'Producto no encontrado' });
    }
    
    // Obtener productos relacionados (misma categoría)
    const productosRelacionados = await Producto.find({
      local: tienda._id,
      categoria: producto.categoria._id,
      _id: { $ne: producto._id }, // Excluir el producto actual
      isActive: true
    })
    .limit(4)
    .select('nombre precio imagenes slug descuento');
    
    return res.json({
      producto,
      productosRelacionados
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ msg: 'Hubo un error al obtener el producto' });
  }
};

// Obtener todos los productos de la tienda (con paginación)
export const obtenerTodosLosProductos = async (req, res) => {
  try {
    const { slug } = req.params;
    
    // Buscar la tienda por slug
    const tienda = await Local.findOne({ slug });
    
    if (!tienda || !tienda.isActive) {
      return res.status(404).json({ msg: 'Tienda no encontrada o inactiva' });
    }
    
    // Paginación
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;
    
    // Opciones de ordenamiento
    const sort = {};
    const { ordenar } = req.query;
    
    if (ordenar === 'precio-asc') {
      sort.precio = 1;
    } else if (ordenar === 'precio-desc') {
      sort.precio = -1;
    } else if (ordenar === 'recientes') {
      sort.createdAt = -1;
    } else {
      // Por defecto, ordenar por más recientes
      sort.createdAt = -1;
    }
    
    // Buscar productos de esta tienda
    const productos = await Producto.find({
      local: tienda._id,
      isActive: true
    })
    .select('nombre descripcion precio imagenes slug stock descuento')
    .sort(sort)
    .skip(skip)
    .limit(limit);
    
    // Contar total para paginación
    const total = await Producto.countDocuments({
      local: tienda._id,
      isActive: true
    });
    
    return res.json({
      productos,
      paginacion: {
        total,
        paginas: Math.ceil(total / limit),
        paginaActual: page,
        porPagina: limit
      }
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ msg: 'Hubo un error al obtener los productos' });
  }
};

// Función helper para verificar permisos sobre una tienda
const verificarPermisosAdmin = (tienda, usuario) => {
  console.log('Verificando permisos para:', {
    usuarioId: usuario._id,
    usuarioRole: usuario.role,
    usuarioLocalId: usuario.local ? usuario.local._id : 'No tiene local asignado',
    tiendaId: tienda._id,
    tiendaAdmin: tienda.administrador,
    tiendaNombre: tienda.nombre
  });

  // SuperAdmin siempre tiene acceso
  if (usuario.role === 'superAdmin') {
    console.log('Es superAdmin, tiene acceso');
    return true;
  }
  
  // Si es admin, verificar relación con la tienda
  if (usuario.role === 'admin') {
    // Si el usuario tiene un local asignado y coincide con esta tienda
    if (usuario.local && usuario.local._id && usuario.local._id.toString() === tienda._id.toString()) {
      console.log('Admin asignado a esta tienda - ACCESO CONCEDIDO');
      return true;
    }
    
    // Verificar si es el administrador asignado
    if (tienda.administrador && tienda.administrador.toString() === usuario._id.toString()) {
      console.log('Es el administrador de la tienda - ACCESO CONCEDIDO');
      return true;
    }
    
    // Verificar si está en la lista de empleados
    if (tienda.empleados && tienda.empleados.length > 0) {
      const esEmpleado = tienda.empleados.some(emp => emp.toString() === usuario._id.toString());
      if (esEmpleado) {
        console.log('Es empleado de la tienda - ACCESO CONCEDIDO');
        return true;
      }
    }
    
    console.log('Admin sin relación con esta tienda - ACCESO DENEGADO');
  }
  
  return false;
};

// Actualizar configuración visual de la tienda
export const actualizarConfiguracionVisual = async (req, res) => {
  try {
    const { slug } = req.params;
    const { 
      colorPrimario, 
      colorSecundario, 
      colorTexto, 
      mensaje, 
      metaTitulo, 
      metaDescripcion 
    } = req.body;
    
    // Buscar la tienda por slug
    const tienda = await Local.findOne({ slug });
    
    if (!tienda) {
      return res.status(404).json({ msg: 'Tienda no encontrada' });
    }
    
    // Verificar permisos de administración
    if (!verificarPermisosAdmin(tienda, req.user)) {
      return res.status(403).json({ msg: 'No tienes permisos para administrar esta tienda' });
    }
    
    // Actualizar configuración visual
    if (colorPrimario) tienda.configuracionTienda.colorPrimario = colorPrimario;
    if (colorSecundario) tienda.configuracionTienda.colorSecundario = colorSecundario;
    if (colorTexto) tienda.configuracionTienda.colorTexto = colorTexto;
    if (mensaje) tienda.configuracionTienda.mensaje = mensaje;
    if (metaTitulo) tienda.configuracionTienda.metaTitulo = metaTitulo;
    if (metaDescripcion) tienda.configuracionTienda.metaDescripcion = metaDescripcion;
    
    await tienda.save();
    
    return res.json({
      msg: 'Configuración visual actualizada correctamente',
      configuracion: tienda.configuracionTienda
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ msg: 'Hubo un error al actualizar la configuración visual' });
  }
};

// Subir logo de la tienda
export const subirLogo = async (req, res) => {
  try {
    const { slug } = req.params;
    
    // Verificar si es form-data con un archivo o JSON con una URL
    let logoUrl, logoAlt;
    
    if (req.file) {
      // Si se subió un archivo mediante form-data
      // Aquí asumimos que ya hay un middleware multer configurado
      logoUrl = req.file.path || req.file.location || `/uploads/${req.file.filename}`;
      
      // Manejar diferentes formatos de nombres de campo
      logoAlt = req.body.logoAlt || req.body['logo alt'] || 'Logo de la tienda';
      
      console.log('Se recibió un archivo:', req.file);
      console.log('Body completo:', req.body);
    } else {
      // Si se envió una URL en JSON
      logoUrl = req.body.logoUrl;
      logoAlt = req.body.logoAlt;
      console.log('Se recibió JSON:', req.body);
    }
    
    // Verificar que tengamos una URL
    if (!logoUrl) {
      console.log('Error: La URL del logo es obligatoria. Body:', req.body);
      return res.status(400).json({ msg: 'La URL del logo es obligatoria' });
    }
    
    // Buscar la tienda por slug
    const tienda = await Local.findOne({ slug });
    
    if (!tienda) {
      return res.status(404).json({ msg: 'Tienda no encontrada' });
    }
    
    // Verificar permisos de administración
    if (!verificarPermisosAdmin(tienda, req.user)) {
      return res.status(403).json({ msg: 'No tienes permisos para administrar esta tienda' });
    }
    
    // Actualizar logo
    tienda.configuracionTienda.logo.url = logoUrl;
    if (logoAlt) tienda.configuracionTienda.logo.alt = logoAlt;
    
    await tienda.save();
    
    return res.json({
      msg: 'Logo actualizado correctamente',
      logo: tienda.configuracionTienda.logo
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ msg: 'Hubo un error al actualizar el logo' });
  }
};

// Subir banner principal
export const subirBanner = async (req, res) => {
  try {
    const { slug } = req.params;
    
    // Buscar la tienda por slug
    const tienda = await Local.findOne({ slug });
    
    if (!tienda) {
      return res.status(404).json({ msg: 'Tienda no encontrada' });
    }
    
    // Verificar permisos de administración
    if (!verificarPermisosAdmin(tienda, req.user)) {
      return res.status(403).json({ msg: 'No tienes permisos para administrar esta tienda' });
    }
    
    // Array para almacenar las imágenes del banner
    let bannerImagenes = [];
    
    // Si no existe el array de banners, inicializarlo
    if (!Array.isArray(tienda.configuracionTienda.bannerPrincipal)) {
      tienda.configuracionTienda.bannerPrincipal = [];
    } else {
      // Mantener las imágenes existentes si existe el campo mantenerImagenes
      if (req.body.mantenerImagenes === 'true') {
        bannerImagenes = [...tienda.configuracionTienda.bannerPrincipal];
      }
    }
    
    // Verificar si es form-data con archivos o JSON con URLs
    if (req.files && req.files.length > 0) {
      // Procesamos cada archivo subido
      for (const file of req.files) {
        // Convertir la imagen a base64
        const imageBuffer = fs.readFileSync(file.path);
        const base64Image = `data:${file.mimetype};base64,${imageBuffer.toString('base64')}`;
        
        // Buscar si hay un alt específico para este archivo
        const bannerAlt = req.body[`bannerAlt_${file.fieldname}`] || 
                       req.body[`alt_${file.fieldname}`] || 
                       'Banner de la tienda';
        
        bannerImagenes.push({
          url: base64Image,
          alt: bannerAlt
        });
        
        // Eliminar el archivo temporal después de convertirlo a base64
        try {
          fs.unlinkSync(file.path);
        } catch (err) {
          console.error('Error al eliminar archivo temporal:', err);
        }
      }
      console.log('Se recibieron archivos para banner:', req.files.length);
    } else if (req.file) {
      // Si se subió un solo archivo
      // Convertir la imagen a base64
      const imageBuffer = fs.readFileSync(req.file.path);
      const base64Image = `data:${req.file.mimetype};base64,${imageBuffer.toString('base64')}`;
      
      const bannerAlt = req.body.bannerAlt || req.body['banner alt'] || 'Banner principal de la tienda';
      
      bannerImagenes.push({
        url: base64Image,
        alt: bannerAlt
      });
      
      // Eliminar el archivo temporal después de convertirlo a base64
      try {
        fs.unlinkSync(req.file.path);
      } catch (err) {
        console.error('Error al eliminar archivo temporal:', err);
      }
      
      console.log('Se recibió un archivo para banner:', req.file);
    } else if (req.body.bannerImagenes) {
      // Si se envió un array de URLs en JSON
      try {
        let nuevasImagenes;
        if (typeof req.body.bannerImagenes === 'string') {
          nuevasImagenes = JSON.parse(req.body.bannerImagenes);
        } else {
          nuevasImagenes = req.body.bannerImagenes;
        }
        
        if (Array.isArray(nuevasImagenes)) {
          for (const imagen of nuevasImagenes) {
            if (imagen.url) {
              bannerImagenes.push({
                url: imagen.url,
                alt: imagen.alt || 'Banner de la tienda'
              });
            }
          }
        }
        console.log('Se recibió JSON para banners:', nuevasImagenes.length);
      } catch (error) {
        console.log('Error al parsear JSON de bannerImagenes:', error);
        return res.status(400).json({ msg: 'El formato de las imágenes es inválido' });
      }
    } else if (req.body.bannerUrl) {
      // Si se envió una sola URL en JSON
      bannerImagenes.push({
        url: req.body.bannerUrl,
        alt: req.body.bannerAlt || 'Banner principal de la tienda'
      });
      console.log('Se recibió una URL para banner:', req.body.bannerUrl);
    }
    
    // Verificar que tengamos al menos una imagen
    if (bannerImagenes.length === 0) {
      console.log('Error: No hay imágenes para el banner. Body:', req.body);
      return res.status(400).json({ msg: 'Se requiere al menos una imagen para el banner' });
    }
    
    // Limitar a 5 imágenes como máximo
    if (bannerImagenes.length > 5) {
      console.log(`Limitando imágenes de banner a 5. Recibidas: ${bannerImagenes.length}`);
      bannerImagenes = bannerImagenes.slice(0, 5);
    }
    
    // Actualizar banner
    tienda.configuracionTienda.bannerPrincipal = bannerImagenes;
    
    await tienda.save();
    
    return res.json({
      msg: 'Banner actualizado correctamente',
      banner: tienda.configuracionTienda.bannerPrincipal,
      cantidad: bannerImagenes.length
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ msg: 'Hubo un error al actualizar el banner' });
  }
};

// Gestionar imágenes del carrusel
export const actualizarCarrusel = async (req, res) => {
  try {
    const { slug } = req.params;
    let imagenes = [];
    
    console.log('Body en actualizarCarrusel:', req.body);
    
    // Comprobar si tenemos archivos cargados por form-data o JSON
    if (req.files && req.files.length > 0) {
      // Archivos cargados por form-data
      console.log('Se recibieron archivos para carrusel:', req.files.length);
      
      // Procesamos cada archivo y obtenemos los metadatos correspondientes
      imagenes = req.files.map((file, fileIndex) => {
        const index = file.index || fileIndex;
        
        // Obtener el valor de orden y validar que sea un número
        let orden = parseInt(req.body[`orden_${index}`]);
        if (isNaN(orden)) {
          orden = index; // Usar el índice como valor por defecto si no es un número válido
        }

        // Convertir la imagen a base64
        const imageBuffer = fs.readFileSync(file.path);
        const base64Image = `data:${file.mimetype};base64,${imageBuffer.toString('base64')}`;
        
        return {
          url: base64Image,
          alt: req.body[`alt_${index}`] || `Imagen ${index + 1} del carrusel`,
          titulo: req.body[`titulo_${index}`] || '',
          subtitulo: req.body[`subtitulo_${index}`] || '',
          botonTexto: req.body[`botonTexto_${index}`] || '',
          botonUrl: req.body[`botonUrl_${index}`] || '',
          orden: orden
        };
      });
      
      console.log('Imágenes procesadas:', imagenes);
    } else if (req.body.imagenes) {
      // Si se envió un arreglo de imágenes en JSON
      if (typeof req.body.imagenes === 'string') {
        try {
          // Si el cliente envió un string JSON
          imagenes = JSON.parse(req.body.imagenes);
          console.log('Se recibió JSON (string) para carrusel:', imagenes.length);
        } catch (error) {
          console.log('Error al parsear JSON de imagenes:', error);
          return res.status(400).json({ msg: 'El formato de las imágenes es inválido' });
        }
      } else {
        // Si el cliente envió un objeto JSON directamente
        imagenes = req.body.imagenes;
        console.log('Se recibió JSON (objeto) para carrusel:', imagenes.length);
      }
    } else {
      // Intentar reconstruir el array de imágenes desde los campos individuales
      console.log('Intentando reconstruir array de imágenes desde campos individuales');
      
      const camposIndice = {};
      Object.keys(req.body).forEach(key => {
        // Buscar índices en los nombres de los campos (titulo_0, subtitulo_1, etc.)
        const match = key.match(/^(.+)_(\d+)$/);
        if (match) {
          const [, campo, indice] = match;
          if (!camposIndice[indice]) {
            camposIndice[indice] = {};
          }
          camposIndice[indice][campo] = req.body[key];
        }
      });
      
      // Convertir el objeto a array
      const indices = Object.keys(camposIndice).sort();
      if (indices.length > 0) {
        imagenes = indices.map(indice => {
          const datos = camposIndice[indice];
          
          // Validar que orden sea un número válido
          let orden = parseInt(datos.orden || indice);
          if (isNaN(orden)) {
            orden = parseInt(indice);
          }
          
          return {
            url: datos.url || '',
            alt: datos.alt || `Imagen ${parseInt(indice) + 1}`,
            titulo: datos.titulo || '',
            subtitulo: datos.subtitulo || '',
            botonTexto: datos.botonTexto || '',
            botonUrl: datos.botonUrl || '',
            orden: orden
          };
        });
        
        console.log('Imágenes reconstruidas desde campos:', imagenes);
      } else {
        console.log('Error: No hay imágenes para el carrusel. Body:', req.body);
        return res.status(400).json({ msg: 'Se requiere al menos una imagen para el carrusel' });
      }
    }
    
    // Verificar que tengamos imágenes
    if (!Array.isArray(imagenes) || imagenes.length === 0) {
      return res.status(400).json({ msg: 'Se requiere un array de imágenes' });
    }
    
    // Buscar la tienda por slug
    const tienda = await Local.findOne({ slug });
    
    if (!tienda) {
      return res.status(404).json({ msg: 'Tienda no encontrada' });
    }
    
    // Verificar permisos de administración
    if (!verificarPermisosAdmin(tienda, req.user)) {
      return res.status(403).json({ msg: 'No tienes permisos para administrar esta tienda' });
    }
    
    // Si no existe el campo carrusel en configuracionTienda, lo creamos
    if (!tienda.configuracionTienda.carrusel) {
      tienda.configuracionTienda.carrusel = [];
    }
    
    // Actualizar imágenes del carrusel
    tienda.configuracionTienda.carrusel = imagenes;
    
    await tienda.save();
    
    return res.json({
      msg: 'Carrusel actualizado correctamente',
      carrusel: tienda.configuracionTienda.carrusel
    });
  } catch (error) {
    console.log('Error en actualizarCarrusel:', error);
    return res.status(500).json({ msg: 'Hubo un error al actualizar el carrusel', error: error.message });
  }
};

// Agregar sección personalizada a la tienda
export const agregarSeccionPersonalizada = async (req, res) => {
  try {
    const { slug } = req.params;
    // Extraer campos del cuerpo de la solicitud
    let { titulo, contenido, imagen, orden } = req.body;
    
    console.log('Body recibido en agregarSeccionPersonalizada:', req.body);
    
    // Si hay un archivo adjunto, usarlo como imagen
    if (req.file) {
      console.log('Archivo recibido:', req.file);
      // Convertir la ruta absoluta a una URL relativa accesible
      if (req.file.path) {
        // Si la ruta contiene el directorio de secciones, convertirla a URL
        if (req.file.path.includes('secciones')) {
          const filename = path.basename(req.file.path);
          imagen = `/images/secciones/${filename}`;
        } else {
          // Si es una URL ya formateada, usarla directamente
          imagen = req.file.path.startsWith('/') ? req.file.path : `/images/secciones/${req.file.filename}`;
        }
      } else if (req.file.location) {
        imagen = req.file.location;
      } else if (req.file.filename) {
        imagen = `/images/secciones/${req.file.filename}`;
      } else {
        imagen = `/uploads/${req.file.filename}`;
      }
      console.log('URL de imagen generada:', imagen);
    }
    
    // Validar que tengamos los campos obligatorios
    if (!titulo || !contenido) {
      console.log('Error: Faltan campos obligatorios:', { 
        titulo: titulo || 'falta', 
        contenido: contenido || 'falta' 
      });
      return res.status(400).json({ msg: 'El título y contenido son obligatorios' });
    }
    
    // Buscar la tienda por slug
    const tienda = await Local.findOne({ slug });
    
    if (!tienda) {
      return res.status(404).json({ msg: 'Tienda no encontrada' });
    }
    
    // Verificar permisos de administración
    if (!verificarPermisosAdmin(tienda, req.user)) {
      return res.status(403).json({ msg: 'No tienes permisos para administrar esta tienda' });
    }
    
    // Si no existe el campo secciones en configuracionTienda, lo creamos
    if (!tienda.configuracionTienda.secciones) {
      tienda.configuracionTienda.secciones = [];
    }
    
    // Convertir orden a número si existe
    let ordenNum = 0;
    if (orden) {
      ordenNum = parseInt(orden);
      if (isNaN(ordenNum)) {
        ordenNum = tienda.configuracionTienda.secciones.length;
      }
    } else {
      ordenNum = tienda.configuracionTienda.secciones.length;
    }
    
    // Crear nueva sección
    const nuevaSeccion = {
      id: new mongoose.Types.ObjectId(),
      titulo,
      contenido,
      imagen: imagen || null,
      orden: ordenNum
    };
    
    console.log('Nueva sección a agregar:', nuevaSeccion);
    
    // Agregar sección
    tienda.configuracionTienda.secciones.push(nuevaSeccion);
    
    // Ordenar secciones por el campo orden
    tienda.configuracionTienda.secciones.sort((a, b) => a.orden - b.orden);
    
    await tienda.save();
    
    return res.json({
      msg: 'Sección agregada correctamente',
      seccion: nuevaSeccion
    });
  } catch (error) {
    console.log('Error en agregarSeccionPersonalizada:', error);
    return res.status(500).json({ msg: 'Hubo un error al agregar la sección', error: error.message });
  }
};

// Eliminar sección personalizada
export const eliminarSeccionPersonalizada = async (req, res) => {
  try {
    const { slug, seccionId } = req.params;
    
    // Buscar la tienda por slug
    const tienda = await Local.findOne({ slug });
    
    if (!tienda) {
      return res.status(404).json({ msg: 'Tienda no encontrada' });
    }
    
    // Verificar permisos de administración
    if (!verificarPermisosAdmin(tienda, req.user)) {
      return res.status(403).json({ msg: 'No tienes permisos para administrar esta tienda' });
    }
    
    // Verificar si existen secciones
    if (!tienda.configuracionTienda.secciones || tienda.configuracionTienda.secciones.length === 0) {
      return res.status(404).json({ msg: 'No hay secciones para eliminar' });
    }
    
    // Encontrar el índice de la sección
    const seccionIndex = tienda.configuracionTienda.secciones.findIndex(
      s => s.id.toString() === seccionId
    );
    
    if (seccionIndex === -1) {
      return res.status(404).json({ msg: 'Sección no encontrada' });
    }
    
    // Eliminar la sección
    tienda.configuracionTienda.secciones.splice(seccionIndex, 1);
    
    await tienda.save();
    
    return res.json({
      msg: 'Sección eliminada correctamente'
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ msg: 'Hubo un error al eliminar la sección' });
  }
};

// Función helper para normalizar URLs de imágenes en secciones
const normalizarUrlImagenSeccion = (imagenUrl) => {
  if (!imagenUrl) return null;
  
  // Si ya es una URL relativa que comienza con /images, devolverla tal cual
  if (imagenUrl.startsWith('/images/secciones/')) {
    return imagenUrl;
  }
  
  // Si es una ruta absoluta que contiene 'secciones', extraer el nombre del archivo
  if (imagenUrl.includes('secciones')) {
    const filename = path.basename(imagenUrl);
    return `/images/secciones/${filename}`;
  }
  
  // Si es una URL completa (http/https), devolverla tal cual
  if (imagenUrl.startsWith('http://') || imagenUrl.startsWith('https://')) {
    return imagenUrl;
  }
  
  // Si es una ruta relativa que no comienza con /, agregar el prefijo
  if (!imagenUrl.startsWith('/')) {
    return `/images/secciones/${imagenUrl}`;
  }
  
  // Devolver tal cual si ya es una URL relativa válida
  return imagenUrl;
};

// Obtener configuración completa de la tienda para edición
export const obtenerConfiguracionCompleta = async (req, res) => {
  try {
    const { slug } = req.params;
    
    // Buscar la tienda por slug y seleccionar solo los campos de configuración
    const tienda = await Local.findOne({ slug }).select(
      'configuracionTienda configuracionNegocio'
    );
    
    if (!tienda) {
      return res.status(404).json({ msg: 'Tienda no encontrada' });
    }
    
    // Comprobar si la ruta incluye "publica", lo que significa que es acceso público
    const esAccesoPublico = req.path.includes('/publica') || req.originalUrl.includes('/publica');
    
    // Normalizar URLs de imágenes en secciones antes de devolver
    if (tienda.configuracionTienda.secciones && Array.isArray(tienda.configuracionTienda.secciones)) {
      tienda.configuracionTienda.secciones = tienda.configuracionTienda.secciones.map(seccion => ({
        ...seccion.toObject ? seccion.toObject() : seccion,
        imagen: normalizarUrlImagenSeccion(seccion.imagen)
      }));
    }
    
    // Si es administrador, verificar permisos solo si NO es acceso público
    if (!esAccesoPublico && req.user) {
      // Verificar permisos de administración
      if (!verificarPermisosAdmin(tienda, req.user)) {
        return res.status(403).json({ msg: 'No tienes permisos para administrar esta tienda' });
      }
      
      // Si es administrador, devolver configuración completa
      return res.json({
        configuracionTienda: tienda.configuracionTienda,
        configuracionNegocio: tienda.configuracionNegocio
      });
    }
    
    // Para acceso público (frontend de tienda), solo devolvemos la configuración visual
    return res.json({
      configuracionTienda: {
        colorPrimario: tienda.configuracionTienda.colorPrimario,
        colorSecundario: tienda.configuracionTienda.colorSecundario,
        colorTexto: tienda.configuracionTienda.colorTexto,
        mensaje: tienda.configuracionTienda.mensaje,
        metaTitulo: tienda.configuracionTienda.metaTitulo,
        metaDescripcion: tienda.configuracionTienda.metaDescripcion,
        logo: tienda.configuracionTienda.logo,
        bannerPrincipal: tienda.configuracionTienda.bannerPrincipal,
        carrusel: tienda.configuracionTienda.carrusel,
        secciones: tienda.configuracionTienda.secciones
      }
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ msg: 'Hubo un error al obtener la configuración' });
  }
}; 