import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Local from '../models/Local.js';
import Producto from '../models/Producto.js';
import Categoria from '../models/Categoria.js';

// Cargar variables de entorno
dotenv.config();

// Para __dirname en ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ruta al directorio de uploads
const uploadsDir = path.join(__dirname, '../uploads');

/**
 * Función para obtener todos los archivos de la carpeta uploads
 * @returns {Array} Array con los nombres de archivo completos
 */
const getUploadsFiles = () => {
  try {
    return fs.readdirSync(uploadsDir).map(filename => {
      const stats = fs.statSync(path.join(uploadsDir, filename));
      return {
        filename,
        path: path.join(uploadsDir, filename),
        created: stats.birthtime || stats.ctime // fecha de creación
      };
    });
  } catch (error) {
    console.error('Error al leer directorio de uploads:', error);
    return [];
  }
};

/**
 * Función para obtener todas las URLs de imágenes en uso en la base de datos
 * @returns {Promise<Array>} Array con las URLs de imágenes en uso
 */
const getUsedImageUrls = async () => {
  try {
    // Conectar a la base de datos si no está conectada
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGO_URI);
      console.log('Conectado a MongoDB para limpieza de archivos');
    }

    // Obtener todas las URLs de imágenes usadas en los modelos
    const usedUrls = new Set();

    // Buscar en Locales (logos, banners, carruseles, secciones)
    const locales = await Local.find();
    
    locales.forEach(local => {
      // Logo
      if (local.configuracionTienda?.logo?.url) {
        usedUrls.add(extractFilename(local.configuracionTienda.logo.url));
      }
      
      // Banner
      if (local.configuracionTienda?.bannerPrincipal?.url) {
        usedUrls.add(extractFilename(local.configuracionTienda.bannerPrincipal.url));
      }
      
      // Carrusel
      if (local.configuracionTienda?.carrusel && Array.isArray(local.configuracionTienda.carrusel)) {
        local.configuracionTienda.carrusel.forEach(item => {
          if (item.url) {
            usedUrls.add(extractFilename(item.url));
          }
        });
      }
      
      // Secciones
      if (local.configuracionTienda?.secciones && Array.isArray(local.configuracionTienda.secciones)) {
        local.configuracionTienda.secciones.forEach(seccion => {
          if (seccion.imagen) {
            usedUrls.add(extractFilename(seccion.imagen));
          }
        });
      }
    });
    
    // Buscar en Productos
    const productos = await Producto.find();
    productos.forEach(producto => {
      if (producto.imagenes && Array.isArray(producto.imagenes)) {
        producto.imagenes.forEach(img => {
          usedUrls.add(extractFilename(img));
        });
      }
    });
    
    // Buscar en Categorías
    const categorias = await Categoria.find();
    categorias.forEach(categoria => {
      if (categoria.imagen) {
        usedUrls.add(extractFilename(categoria.imagen));
      }
    });
    
    return Array.from(usedUrls);
  } catch (error) {
    console.error('Error al obtener URLs usadas en BD:', error);
    return [];
  }
};

/**
 * Extrae el nombre del archivo de una URL o ruta
 * @param {string} url URL o ruta del archivo
 * @returns {string} Nombre del archivo extraído
 */
const extractFilename = (url) => {
  if (!url) return '';
  
  // Si es una URL completa o una ruta relativa
  const filename = url.split('/').pop();
  return filename;
};

/**
 * Eliminar archivos no utilizados y más antiguos que una hora
 */
const cleanUnusedFiles = async () => {
  console.log('🧹 Iniciando limpieza de archivos no utilizados...');
  
  // Obtener todos los archivos en uploads
  const allFiles = getUploadsFiles();
  console.log(`📂 Total de archivos en uploads: ${allFiles.length}`);
  
  // Obtener URLs en uso
  const usedUrls = await getUsedImageUrls();
  console.log(`🔗 Total de URLs en uso en la base de datos: ${usedUrls.length}`);
  
  // Tiempo mínimo para mantener archivos (1 hora = 3600000 ms)
  const oneHourAgo = new Date(Date.now() - 3600000);
  
  // Contar archivos eliminados
  let deletedCount = 0;
  
  // Verificar cada archivo
  for (const file of allFiles) {
    const isReferenced = usedUrls.includes(file.filename);
    const isTooOld = file.created < oneHourAgo;
    
    // Si el archivo no está referenciado en la base de datos y tiene más de 1 hora, eliminarlo
    if (!isReferenced && isTooOld) {
      try {
        fs.unlinkSync(file.path);
        console.log(`🗑️ Eliminado: ${file.filename} (creado: ${file.created.toISOString()})`);
        deletedCount++;
      } catch (error) {
        console.error(`❌ Error al eliminar ${file.filename}:`, error.message);
      }
    }
  }
  
  console.log(`✅ Limpieza completada. ${deletedCount} archivos eliminados.`);
  
  // Cerrar conexión a MongoDB si fue abierta por este script
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.close();
    console.log('Conexión a MongoDB cerrada');
  }
};

// Ejecutar la limpieza
cleanUnusedFiles().catch(error => {
  console.error('Error en la limpieza de archivos:', error);
  process.exit(1);
}); 