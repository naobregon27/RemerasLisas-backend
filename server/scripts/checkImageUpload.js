/**
 * Script para verificar la configuración de imágenes
 * Ejecutar con: node scripts/checkImageUpload.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Para __dirname en ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Función principal
const checkImageUploadConfig = () => {
  console.log('🔍 Verificando configuración para subida de imágenes...\n');
  
  // 1. Verificar que existe el directorio uploads
  const uploadsDir = path.join(__dirname, '../uploads');
  console.log(`Revisando directorio de uploads: ${uploadsDir}`);
  
  if (!fs.existsSync(uploadsDir)) {
    console.error('❌ El directorio de uploads no existe!');
    console.log('Creando directorio...');
    try {
      fs.mkdirSync(uploadsDir, { recursive: true });
      console.log('✅ Directorio de uploads creado exitosamente!');
    } catch (error) {
      console.error('❌ Error al crear directorio:', error.message);
      console.log('Solución: Crea manualmente el directorio "uploads" en la raíz del proyecto');
    }
  } else {
    console.log('✅ El directorio de uploads existe');
    
    // Verificar permisos
    try {
      const testFile = path.join(uploadsDir, 'test_permissions.txt');
      fs.writeFileSync(testFile, 'Testing write permissions');
      fs.unlinkSync(testFile);
      console.log('✅ Permisos de escritura correctos');
    } catch (error) {
      console.error('❌ Error de permisos en el directorio uploads:', error.message);
      console.log('Solución: Verifica que la aplicación tenga permisos de escritura en el directorio uploads');
    }
  }
  
  // 2. Verificar rutas en productoController.js
  const controllerPath = path.join(__dirname, '../controllers/productoController.js');
  console.log(`\nRevisando controlador: ${controllerPath}`);
  
  if (fs.existsSync(controllerPath)) {
    const controller = fs.readFileSync(controllerPath, 'utf8');
    
    // Verificar patrón de URL
    if (controller.includes('/uploads/')) {
      console.log('✅ Patrón de URL de imágenes correcto en el controlador');
    } else {
      console.error('❌ No se encontró el patrón "/uploads/" en el controlador');
      console.log('Solución: Asegúrate de que las URLs de las imágenes empiecen con "/uploads/"');
    }
    
    // Verificar manejo de imágenes
    if (controller.includes('req.file') || controller.includes('req.files')) {
      console.log('✅ Manejo de archivos detectado en el controlador');
    } else {
      console.warn('⚠️ No se detectó manejo de archivos en el controlador');
    }
  } else {
    console.error('❌ No se encontró el archivo del controlador');
  }
  
  // 3. Verificar rutas en productoRoutes.js
  const routesPath = path.join(__dirname, '../routes/productoRoutes.js');
  console.log(`\nRevisando rutas: ${routesPath}`);
  
  if (fs.existsSync(routesPath)) {
    const routes = fs.readFileSync(routesPath, 'utf8');
    
    // Verificar configuración de multer
    if (routes.includes('multer')) {
      console.log('✅ Multer detectado en las rutas');
      
      if (routes.includes('upload.single')) {
        console.log('✅ Configuración para subir una sola imagen detectada');
      } else {
        console.warn('⚠️ No se detectó upload.single en las rutas');
      }
      
      if (routes.includes('upload.array')) {
        console.log('✅ Configuración para subir múltiples imágenes detectada');
      } else {
        console.warn('⚠️ No se detectó upload.array en las rutas');
      }
    } else {
      console.error('❌ No se detectó multer en las rutas');
      console.log('Solución: Asegúrate de usar multer para manejar la subida de archivos');
    }
  } else {
    console.error('❌ No se encontró el archivo de rutas');
  }
  
  // 4. Verificar configuración de Express
  const expressFiles = [
    path.join(__dirname, '../server.js'),
    path.join(__dirname, '../app.js'),
    path.join(__dirname, '../index.js'),
    path.join(__dirname, '../config/express.js')
  ];
  
  console.log('\nBuscando configuración de archivos estáticos en Express...');
  
  let expressConfigFound = false;
  
  for (const file of expressFiles) {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8');
      
      if (content.includes('express.static') && content.includes('/uploads')) {
        console.log(`✅ Configuración de archivos estáticos encontrada en ${path.basename(file)}`);
        expressConfigFound = true;
        break;
      }
    }
  }
  
  if (!expressConfigFound) {
    console.error('❌ No se encontró configuración de archivos estáticos para /uploads');
    console.log('Solución: Agrega app.use("/uploads", express.static("uploads")) en tu archivo principal');
  }
  
  // Conclusión
  console.log('\n📝 RESUMEN:');
  console.log('1. La configuración de subida de imágenes requiere:');
  console.log('   - Un directorio "uploads" con permisos de escritura');
  console.log('   - Configuración correcta de multer en las rutas');
  console.log('   - Manejo adecuado de req.file/req.files en el controlador');
  console.log('   - Configuración de archivos estáticos en Express');
  console.log('\n2. Para probar la subida de imágenes:');
  console.log('   - Usa Postman o similar con tipo form-data');
  console.log('   - Incluye un campo "imagenes" de tipo File');
  console.log('   - Usa la ruta POST /api/productos/test para probar sin autenticación');
  
  console.log('\n¡Buena suerte con tu aplicación! 🚀');
};

// Ejecutar el script
checkImageUploadConfig(); 