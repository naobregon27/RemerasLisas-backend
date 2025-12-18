import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Local from '../models/Local.js';
import colors from 'colors';

// Cargar variables de entorno
dotenv.config();

// Conectar a la base de datos
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Conexión a MongoDB establecida con éxito'.green.bold))
  .catch(err => {
    console.error(`❌ Error al conectar a MongoDB: ${err.message}`.red.bold);
    process.exit(1);
  });

const checkStores = async () => {
  try {
    // Buscar todas las tiendas
    const tiendas = await Local.find({});
    console.log(`📋 Se encontraron ${tiendas.length} tiendas`.blue);

    // Mostrar información de cada tienda
    console.log('\n=== ESTADO DE LAS TIENDAS ==='.yellow);
    for (const tienda of tiendas) {
      console.log(`
🏪 Tienda: ${tienda.nombre}
🔑 ID: ${tienda._id}
🔗 Slug: ${tienda.slug || 'No tiene slug'}
⚡ Estado: ${tienda.isActive ? '✅ ACTIVA'.green : '❌ INACTIVA'.red}
🕒 Creada: ${tienda.createdAt}
${!tienda.isActive ? `🚫 Desactivada el: ${tienda.deactivatedAt || 'Fecha desconocida'}` : ''}
      `);
    }

    // Preguntar si quiere activar las tiendas inactivas
    const tiendasInactivas = tiendas.filter(t => !t.isActive);
    
    if (tiendasInactivas.length > 0) {
      console.log(`\n⚠️ Hay ${tiendasInactivas.length} tiendas inactivas`.yellow);
      console.log('\nPara activar todas las tiendas, ejecuta: node utils/activateStores.js');
    } else {
      console.log('\n✅ Todas las tiendas están activas'.green.bold);
    }

    process.exit(0);
  } catch (error) {
    console.error(`❌ Error al verificar tiendas: ${error.message}`.red.bold);
    process.exit(1);
  }
};

// Ejecutar la función
checkStores(); 