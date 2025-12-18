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

const generateSlugs = async () => {
  try {
    // Buscar todas las tiendas
    const tiendas = await Local.find({});
    console.log(`📋 Se encontraron ${tiendas.length} tiendas`.blue);

    let actualizadas = 0;

    // Procesar cada tienda
    for (const tienda of tiendas) {
      if (!tienda.slug) {
        // Generar slug a partir del nombre
        const slug = tienda.nombre
          .toLowerCase()
          .replace(/[^\w ]+/g, '')
          .replace(/ +/g, '-');
        
        // Verificar si el slug ya existe
        const existeSlug = await Local.findOne({ slug });
        
        if (existeSlug && existeSlug._id.toString() !== tienda._id.toString()) {
          // Si existe, añadir un identificador único (los últimos 4 caracteres del ID)
          const idSufijo = tienda._id.toString().slice(-4);
          tienda.slug = `${slug}-${idSufijo}`;
        } else {
          tienda.slug = slug;
        }
        
        // Guardar la tienda con el nuevo slug
        await tienda.save();
        actualizadas++;
        
        console.log(`✅ Tienda "${tienda.nombre}" actualizada con slug: ${tienda.slug}`.green);
      } else {
        console.log(`ℹ️ La tienda "${tienda.nombre}" ya tiene slug: ${tienda.slug}`.yellow);
      }
    }

    console.log(`\n🎉 Proceso completado. ${actualizadas} tiendas actualizadas con slugs.`.green.bold);
    process.exit(0);
  } catch (error) {
    console.error(`❌ Error al generar slugs: ${error.message}`.red.bold);
    process.exit(1);
  }
};

// Ejecutar la función
generateSlugs(); 