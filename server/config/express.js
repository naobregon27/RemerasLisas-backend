import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Para __dirname en ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuración de Express
const configureExpress = (app) => {
  // Middlewares básicos
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(morgan('dev'));
  
  // Seguridad con helmet (configurado para permitir imágenes)
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          ...helmet.contentSecurityPolicy.getDefaultDirectives(),
          "img-src": ["'self'", "data:", "blob:"]
        }
      },
      crossOriginResourcePolicy: { policy: "cross-origin" }
    })
  );

  // Crear directorio de uploads si no existe
  const uploadsDir = path.join(__dirname, '../uploads');
  if (!fs.existsSync(uploadsDir)) {
    console.log('Creando directorio de uploads...');
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Configurar ruta estática para servir archivos de uploads
  app.use('/uploads', express.static(uploadsDir));
  
  // Configurar ruta estática para archivos públicos (si existe)
  const publicDir = path.join(__dirname, '../public');
  if (fs.existsSync(publicDir)) {
    app.use(express.static(publicDir));
  }

  console.log('Express configurado correctamente con soporte para archivos estáticos');
  console.log(`Directorio de uploads: ${uploadsDir}`);

  return app;
};

export default configureExpress; 