import path from 'path';
import fs from 'fs';

// Usar una ubicación fija y absoluta para las imágenes
const STORAGE_BASE_DIR = path.join(process.cwd(), 'storage');
const IMAGES_DIR = path.join(STORAGE_BASE_DIR, 'images');
const CARRUSEL_DIR = path.join(IMAGES_DIR, 'carrusel');
const LOGOS_DIR = path.join(IMAGES_DIR, 'logos');
const BANNERS_DIR = path.join(IMAGES_DIR, 'banners');
const SECCIONES_DIR = path.join(IMAGES_DIR, 'secciones');

// Crear la estructura de directorios si no existe
const createDirIfNotExists = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Directorio creado: ${dir}`);
  }
};

createDirIfNotExists(STORAGE_BASE_DIR);
createDirIfNotExists(IMAGES_DIR);
createDirIfNotExists(CARRUSEL_DIR);
createDirIfNotExists(LOGOS_DIR);
createDirIfNotExists(BANNERS_DIR);
createDirIfNotExists(SECCIONES_DIR);

// Asegurar los permisos correctos en todos los directorios
try {
  fs.chmodSync(STORAGE_BASE_DIR, 0o755);
  fs.chmodSync(IMAGES_DIR, 0o755);
  fs.chmodSync(CARRUSEL_DIR, 0o755);
  fs.chmodSync(LOGOS_DIR, 0o755);
  fs.chmodSync(BANNERS_DIR, 0o755);
  fs.chmodSync(SECCIONES_DIR, 0o755);
} catch (error) {
  console.error('Error al establecer permisos:', error);
}

export default {
  STORAGE_BASE_DIR,
  IMAGES_DIR,
  CARRUSEL_DIR,
  LOGOS_DIR,
  BANNERS_DIR,
  SECCIONES_DIR,
  getUrl: (tipo, filename) => {
    return `/images/${tipo}/${filename}`;
  }
}; 