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

const activateStores = async () => {
  try {
    // Buscar todas las tiendas inactivas
    const tiendasInactivas = await Local.find({ isActive: false });
    console.log(`📋 Se encontraron ${tiendasInactivas.length} tiendas inactivas`.blue);

    if (tiendasInactivas.length === 0) {
      console.log('✅ No hay tiendas para activar. Todas están activas.'.green);
      process.exit(0);
    }

    let activadas = 0;

    // Activar cada tienda
    for (const tienda of tiendasInactivas) {
      tienda.isActive = true;
      tienda.activatedAt = new Date();
      tienda.deactivatedAt = null;
      tienda.deactivatedBy = null;
      
      await tienda.save();
      activadas++;
      
      console.log(`✅ Tienda "${tienda.nombre}" (${tienda.slug}) ha sido activada`.green);
    }

    console.log(`\n🎉 Proceso completado. ${activadas} tiendas han sido activadas.`.green.bold);
    process.exit(0);
  } catch (error) {
    console.error(`❌ Error al activar tiendas: ${error.message}`.red.bold);
    process.exit(1);
  }
};

// Ejecutar la función
activateStores(); 