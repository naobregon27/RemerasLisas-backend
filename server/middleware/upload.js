import multer from 'multer';
import path from 'path';
import fs from 'fs';
import storageConfig from '../config/storage.js';
import sharp from 'sharp';

// Asegurarse de que exista el directorio para subir archivos
const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Filtrar archivos para aceptar solo imágenes
const fileFilter = (req, file, cb) => {
  // Aceptar cualquier tipo de imagen
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten archivos de imagen.'), false);
  }
};

// Crear configuración de almacenamiento para imágenes de carrusel
const carruselStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, storageConfig.CARRUSEL_DIR);
  },
  filename: function (req, file, cb) {
    // Crear un nombre de archivo único
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname.replace(/\s+/g, '') + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Crear configuración de almacenamiento para logos
const logoStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, storageConfig.LOGOS_DIR);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname.replace(/\s+/g, '') + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Crear configuración de almacenamiento para banners
const bannerStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, storageConfig.BANNERS_DIR);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname.replace(/\s+/g, '') + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Crear configuración de almacenamiento para secciones
const seccionStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, storageConfig.SECCIONES_DIR);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname.replace(/\s+/g, '') + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Configurar multer para cada tipo de carga
// Límite aumentado a 30MB para soportar imágenes de alta calidad
const MAX_FILE_SIZE = 30 * 1024 * 1024; // 30MB máximo

const uploadLogo = multer({
  storage: logoStorage,
  limits: {
    fileSize: MAX_FILE_SIZE
  },
  fileFilter: fileFilter
});

const uploadBannerMulter = multer({
  storage: bannerStorage,
  limits: {
    fileSize: MAX_FILE_SIZE
  },
  fileFilter: fileFilter
});

const uploadCarrusel = multer({
  storage: carruselStorage,
  limits: {
    fileSize: MAX_FILE_SIZE
  },
  fileFilter: fileFilter
});

const uploadSeccion = multer({
  storage: seccionStorage,
  limits: {
    fileSize: MAX_FILE_SIZE
  },
  fileFilter: fileFilter
});

// Función para optimizar imágenes con compresión mejorada
const optimizarImagen = async (file, width = 1200) => {
  try {
    // Verificar que el archivo existe
    if (!file || !file.path) {
      console.log('No hay archivo para optimizar');
      return file;
    }

    // Obtener metadatos de la imagen original para determinar mejor estrategia
    const metadata = await sharp(file.path).metadata();
    const originalSize = fs.statSync(file.path).size;
    
    // Convertir a webp para mejor compresión
    const outputPath = file.path.replace(/\.[^/.]+$/, '.webp');
    
    // Configuración de optimización mejorada
    let sharpInstance = sharp(file.path);
    
    // Redimensionar si es necesario
    if (metadata.width && metadata.width > width) {
      sharpInstance = sharpInstance.resize({ 
        width: width, 
        withoutEnlargement: true,
        fit: 'inside' // Mantener proporción
      });
    }
    
    // Aplicar optimizaciones según el tamaño original
    // Para imágenes muy grandes, usar compresión más agresiva
    let quality = 75; // Calidad base
    if (originalSize > 10 * 1024 * 1024) { // Si es mayor a 10MB
      quality = 70; // Compresión más agresiva
    } else if (originalSize > 5 * 1024 * 1024) { // Si es mayor a 5MB
      quality = 72;
    }
    
    // Convertir a WebP con optimizaciones
    await sharpInstance
      .webp({ 
        quality: quality,
        effort: 6, // Mayor esfuerzo de compresión (0-6)
        smartSubsample: true // Mejor calidad en áreas importantes
      })
      .toFile(outputPath);
    
    // Verificar el tamaño del archivo optimizado
    const optimizedSize = fs.statSync(outputPath).size;
    const compressionRatio = ((1 - optimizedSize / originalSize) * 100).toFixed(1);
    
    console.log(`Imagen optimizada: ${(originalSize / 1024 / 1024).toFixed(2)}MB -> ${(optimizedSize / 1024 / 1024).toFixed(2)}MB (${compressionRatio}% reducción)`);
    
    // Eliminar archivo original
    try {
      fs.unlinkSync(file.path);
    } catch (err) {
      console.error('Error al eliminar archivo original:', err);
    }
    
    // Actualizar información del archivo
    file.path = outputPath;
    file.destination = path.dirname(outputPath);
    file.filename = path.basename(outputPath);
    file.mimetype = 'image/webp';
    
    return file;
  } catch (error) {
    console.error('Error al optimizar imagen:', error);
    return file; // Devolver archivo original en caso de error
  }
};

// Middleware para subir logo
export const uploadSingleImage = (req, res, next) => {
  const logoUpload = uploadLogo.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'logo url', maxCount: 1 }
  ]);
  
  logoUpload(req, res, async (err) => {
    if (err) return handleMulterError(err, req, res, next);
    
    // Procesar resultado para que sea compatible con req.file
    if (req.files) {
      if (req.files['logo'] && req.files['logo'][0]) {
        req.file = req.files['logo'][0];
        // Optimizar logo (tamaño más pequeño)
        req.file = await optimizarImagen(req.file, 500);
      } else if (req.files['logo url'] && req.files['logo url'][0]) {
        req.file = req.files['logo url'][0];
        req.file = await optimizarImagen(req.file, 500);
      }
    }
    
    next();
  });
};

// Middleware para subir banner
export const uploadBanner = (req, res, next) => {
  const bannerUpload = uploadBannerMulter.fields([
    { name: 'banner', maxCount: 5 },  // Permitir hasta 5 imágenes
    { name: 'banner url', maxCount: 5 }
  ]);
  
  bannerUpload(req, res, async (err) => {
    if (err) return handleMulterError(err, req, res, next);
    
    // Procesar resultado para hacerlo compatible con el controlador
    if (req.files) {
      const files = [];
      
      // Procesar las imágenes de banner
      if (req.files['banner'] && req.files['banner'].length > 0) {
        for (const file of req.files['banner']) {
          // Optimizar banner
          const optimizedFile = await optimizarImagen(file, 1600);
          files.push(optimizedFile);
        }
      } 
      
      // Procesar las imágenes de banner url si existen
      if (req.files['banner url'] && req.files['banner url'].length > 0) {
        for (const file of req.files['banner url']) {
          const optimizedFile = await optimizarImagen(file, 1600);
          files.push(optimizedFile);
        }
      }
      
      // Si hay al menos un archivo, mantenemos compatibilidad con req.file
      if (files.length > 0) {
        req.file = files[0];  // Para compatibilidad con código existente
      }
      
      // Guardar todos los archivos para permitir múltiples banners
      req.files = files;
      
      console.log(`Procesados ${files.length} archivos para el banner`);
    }
    
    next();
  });
};

// Middleware para subir imágenes de carrusel
export const uploadCarruselImages = (req, res, next) => {
  // Crear una lista con todos los posibles nombres de campos para las imágenes
  const fieldOptions = [];
  
  // Añadir variaciones básicas
  fieldOptions.push({ name: 'imagenes', maxCount: 10 });
  fieldOptions.push({ name: 'imagenes[]', maxCount: 10 });
  
  // Añadir variaciones con índices específicos
  for (let i = 0; i < 10; i++) {
    fieldOptions.push({ name: `imagenes[${i}]`, maxCount: 1 });
  }
  
  console.log('Configurando campos para carrusel:', fieldOptions.map(f => f.name).join(', '));
  
  const carruselUpload = uploadCarrusel.fields(fieldOptions);
  
  carruselUpload(req, res, async (err) => {
    if (err) {
      console.error('Error al cargar imágenes del carrusel:', err);
      return handleMulterError(err, req, res, next);
    }
    
    // Procesar resultado para que sea compatible con req.files
    if (req.files) {
      console.log('Campos recibidos:', Object.keys(req.files).join(', '));
      
      const files = [];
      
      // Recopilar archivos de todos los posibles campos
      for (const fieldName of Object.keys(req.files)) {
        const fieldFiles = req.files[fieldName];
        if (Array.isArray(fieldFiles) && fieldFiles.length > 0) {
          // Extraer el índice del nombre del campo si existe (para imagenes[0], imagenes[1], etc.)
          let index = 0;
          const indexMatch = fieldName.match(/\[(\d+)\]$/);
          if (indexMatch) {
            index = parseInt(indexMatch[1]);
          }
          
          // Optimizar cada imagen antes de añadirla al array
          for (const file of fieldFiles) {
            file.index = index;
            // Optimizar imagen
            const optimizedFile = await optimizarImagen(file, 1200);
            files.push(optimizedFile);
          }
        }
      }
      
      // Ordenar los archivos por su índice
      files.sort((a, b) => a.index - b.index);
      
      req.files = files;
      console.log(`Procesados ${files.length} archivos para el carrusel`);
    }
    
    next();
  });
};

// Middleware para subir imágenes de secciones personalizadas
export const uploadImagenSeccion = (req, res, next) => {
  const seccionUpload = uploadSeccion.fields([
    { name: 'imagen', maxCount: 1 }
  ]);
  
  seccionUpload(req, res, async (err) => {
    if (err) {
      console.error('Error al cargar imagen de sección:', err);
      return handleMulterError(err, req, res, next);
    }
    
    // Procesar resultado para que sea compatible con req.file
    if (req.files && req.files['imagen'] && req.files['imagen'][0]) {
      req.file = req.files['imagen'][0];
      // Optimizar imagen
      req.file = await optimizarImagen(req.file, 1000);
      console.log('Imagen de sección procesada:', req.file.filename);
    }
    
    next();
  });
};

// Middleware para manejar errores de multer
export const handleMulterError = (err, req, res, next) => {
  console.error('Error de Multer:', err);
  
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ msg: 'El archivo es demasiado grande. El tamaño máximo permitido es 30MB por imagen.' });
    }
    return res.status(400).json({ msg: `Error en la carga del archivo: ${err.message}` });
  } else if (err) {
    return res.status(400).json({ msg: err.message });
  }
  next();
}; 