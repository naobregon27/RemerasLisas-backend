import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Local from '../models/Local.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import readline from 'readline';

// Configurar __dirname para ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar variables de entorno desde el directorio server/
dotenv.config({ path: join(__dirname, '..', '.env') });

// Crear interfaz para leer entrada del usuario
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Función para hacer preguntas al usuario
const pregunta = (pregunta) => {
  return new Promise((resolve) => {
    rl.question(pregunta, (respuesta) => {
      resolve(respuesta);
    });
  });
};

// Conectar a MongoDB
const conectarDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI o MONGO_URI no está definida en las variables de entorno. Por favor, crea un archivo .env con la variable de conexión.');
    }
    await mongoose.connect(mongoUri);
    console.log('✅ Conectado a MongoDB');
  } catch (error) {
    console.error('❌ Error conectando a MongoDB:', error.message);
    process.exit(1);
  }
};

// Listar todos los locales
const listarLocales = async () => {
  try {
    const locales = await Local.find({}).select('_id nombre slug configuracionNegocio.mercadopago.habilitado');
    
    if (locales.length === 0) {
      console.log('⚠️  No hay locales en la base de datos.');
      return null;
    }
    
    console.log('\n📍 LOCALES DISPONIBLES:\n');
    locales.forEach((local, index) => {
      const mpEstado = local.configuracionNegocio?.mercadopago?.habilitado ? '✅ Habilitado' : '❌ Deshabilitado';
      console.log(`${index + 1}. ${local.nombre} (${local.slug})`);
      console.log(`   ID: ${local._id}`);
      console.log(`   Mercado Pago: ${mpEstado}\n`);
    });
    
    return locales;
  } catch (error) {
    console.error('❌ Error obteniendo locales:', error.message);
    return null;
  }
};

// Configurar Mercado Pago para un local
const configurarMP = async () => {
  console.log('\n🛒 CONFIGURACIÓN DE MERCADO PAGO\n');
  console.log('Este script te ayudará a configurar Mercado Pago para un local.\n');
  
  // Listar locales
  const locales = await listarLocales();
  if (!locales || locales.length === 0) {
    console.log('❌ No se puede continuar sin locales.');
    return;
  }
  
  // Seleccionar local
  const seleccion = await pregunta('Ingresa el número del local a configurar: ');
  const index = parseInt(seleccion) - 1;
  
  if (index < 0 || index >= locales.length) {
    console.log('❌ Selección inválida.');
    return;
  }
  
  const localSeleccionado = locales[index];
  console.log(`\n✅ Local seleccionado: ${localSeleccionado.nombre}\n`);
  
  // Preguntar si quiere habilitar o deshabilitar
  const accion = await pregunta('¿Quieres HABILITAR o DESHABILITAR Mercado Pago? (h/d): ');
  
  if (accion.toLowerCase() === 'd') {
    // Deshabilitar Mercado Pago
    const local = await Local.findById(localSeleccionado._id);
    
    if (!local.configuracionNegocio) {
      local.configuracionNegocio = {};
    }
    
    local.configuracionNegocio.mercadopago = {
      habilitado: false,
      accessToken: null,
      publicKey: null,
      webhookSecret: null
    };
    
    await local.save();
    console.log('\n✅ Mercado Pago DESHABILITADO correctamente.\n');
    return;
  }
  
  if (accion.toLowerCase() !== 'h') {
    console.log('❌ Opción inválida. Usa "h" para habilitar o "d" para deshabilitar.');
    return;
  }
  
  // Pedir credenciales
  console.log('\n📝 Ingresa las credenciales de Mercado Pago:\n');
  console.log('   Puedes obtenerlas en: https://www.mercadopago.com.ar/developers\n');
  
  const accessToken = await pregunta('Access Token: ');
  const publicKey = await pregunta('Public Key: ');
  
  if (!accessToken || !publicKey) {
    console.log('❌ Debes proporcionar ambas credenciales.');
    return;
  }
  
  // Validar formato básico
  if (!accessToken.startsWith('TEST-') && !accessToken.startsWith('APP_USR-')) {
    console.log('⚠️  Advertencia: El Access Token no tiene el formato esperado.');
    const continuar = await pregunta('¿Deseas continuar de todos modos? (s/n): ');
    if (continuar.toLowerCase() !== 's') {
      console.log('❌ Configuración cancelada.');
      return;
    }
  }
  
  // Guardar configuración
  try {
    const local = await Local.findById(localSeleccionado._id);
    
    if (!local.configuracionNegocio) {
      local.configuracionNegocio = {};
    }
    
    local.configuracionNegocio.mercadopago = {
      habilitado: true,
      accessToken: accessToken,
      publicKey: publicKey,
      webhookSecret: local.configuracionNegocio.mercadopago?.webhookSecret || null
    };
    
    await local.save();
    
    console.log('\n✅ ¡MERCADO PAGO CONFIGURADO CORRECTAMENTE!\n');
    console.log('📋 RESUMEN DE CONFIGURACIÓN:\n');
    console.log(`   Local: ${local.nombre}`);
    console.log(`   Slug: ${local.slug}`);
    console.log(`   Estado: ✅ Habilitado`);
    console.log(`   Public Key: ${publicKey.substring(0, 20)}...`);
    console.log(`   Modo: ${accessToken.startsWith('TEST-') ? 'TEST (Pruebas)' : 'PRODUCCIÓN'}\n`);
    
    console.log('🔔 IMPORTANTE: Configurar Webhook en Mercado Pago:\n');
    console.log(`   URL del Webhook: ${process.env.BACKEND_URL || 'http://localhost:5000'}/api/mercadopago/webhook\n`);
    console.log('   Configúralo en: https://www.mercadopago.com.ar/developers\n');
    
  } catch (error) {
    console.error('❌ Error guardando configuración:', error.message);
  }
};

// Ejecutar el script
const main = async () => {
  await conectarDB();
  await configurarMP();
  rl.close();
  mongoose.connection.close();
  console.log('\n👋 ¡Hasta luego!\n');
  process.exit(0);
};

// Manejar cierre
rl.on('close', () => {
  mongoose.connection.close();
  process.exit(0);
});

main();

