import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import routes from './routes/index.js';
import logger from './middlewares/loggerMiddleware.js';
import path from 'path';
import { fileURLToPath } from 'url';
import setupCronJobs from './utils/setupCronJobs.js';
import fs from 'fs';
import storageConfig from './config/storage.js';

// Para __dirname en ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar variables de entorno PRIMERO
dotenv.config();

// Conectar a la base de datos
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Crear directorio para uploads si no existe
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Servir archivos estáticos
app.use('/uploads', express.static(uploadsDir));

// Configurar rutas estáticas para servir imágenes desde los directorios de almacenamiento permanente
app.use('/images/carrusel', express.static(storageConfig.CARRUSEL_DIR));
app.use('/images/logos', express.static(storageConfig.LOGOS_DIR));
app.use('/images/banners', express.static(storageConfig.BANNERS_DIR));
app.use('/images/secciones', express.static(storageConfig.SECCIONES_DIR));

// Servir videos (con soporte para range requests para streaming)
app.use('/videos', express.static(storageConfig.VIDEOS_DIR, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.mp4')) res.set('Content-Type', 'video/mp4');
    else if (filePath.endsWith('.webm')) res.set('Content-Type', 'video/webm');
    else if (filePath.endsWith('.mov')) res.set('Content-Type', 'video/quicktime');
    res.set('Accept-Ranges', 'bytes');
  }
}));

// Middleware de logging para todas las peticiones
app.use(logger);

// Rutas
app.use(routes);

// Ruta base
app.get('/', (req, res) => {
  res.send('API funcionando');
});

// Error handling middleware
app.use((err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode);
  res.json({
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack
  });
});

// Definir puerto
const PORT = process.env.PORT || 5000;

// Iniciar servidor
app.listen(PORT, async () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
  
  // Configurar SendGrid después de cargar dotenv
  const emailService = await import('./utils/emailService.js');
  emailService.configureSendGrid();
  
  // Iniciar tareas programadas
  setupCronJobs();
}); 