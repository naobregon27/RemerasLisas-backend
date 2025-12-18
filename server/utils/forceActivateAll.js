import mongoose from 'mongoose';
import dotenv from 'dotenv';
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

const forceActivateAllStores = async () => {
  try {
    console.log('🔍 Actualizando directamente en la base de datos...'.blue);
    
    // Usar updateMany para activar todas las tiendas de una vez
    const resultado = await mongoose.connection.db.collection('locals').updateMany(
      {}, // Sin filtro, afecta a todos los documentos
      { 
        $set: { 
          isActive: true,
          activatedAt: new Date()
        },
        $unset: {
          deactivatedAt: "",
          deactivatedBy: ""
        }
      }
    );
    
    console.log(`\n✅ Operación completada`.green.bold);
    console.log(`📊 Documentos encontrados: ${resultado.matchedCount}`);
    console.log(`🔄 Documentos modificados: ${resultado.modifiedCount}`);
    
    // Mostrar todas las tiendas actualizadas
    const tiendas = await mongoose.connection.db.collection('locals').find({}).toArray();
    
    console.log(`\n=== TIENDAS ACTIVADAS ===`.yellow);
    tiendas.forEach(tienda => {
      console.log(`🏪 ${tienda.nombre} (${tienda.slug || 'sin slug'}) - Estado: ${tienda.isActive ? '✅ ACTIVA'.green : '❌ INACTIVA'.red}`);
    });
    
    console.log(`\n💡 Para verificar en detalle el estado de las tiendas, ejecuta: node utils/checkStores.js`.cyan);
    process.exit(0);
  } catch (error) {
    console.error(`❌ Error al forzar activación: ${error.message}`.red.bold);
    process.exit(1);
  }
};

// Ejecutar la función
forceActivateAllStores(); 