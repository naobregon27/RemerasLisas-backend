import User from '../models/User.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from '../config/db.js';

// Cargar variables de entorno
dotenv.config();

// Función para crear superAdmin
const createSuperAdmin = async () => {
  try {
    // Conectar a la BD
    await connectDB();

    // Comprobar si ya existe un superAdmin
    const superAdminExists = await User.findOne({ role: 'superAdmin' });

    if (superAdminExists) {
      console.log('Ya existe un Super Administrador');
      process.exit();
    }

    // Crear superAdmin
    const superAdmin = await User.create({
      name: 'Super Administrador',
      email: 'superadmin@ecommerce.com',
      password: 'superadmin123',
      role: 'superAdmin'
    });

    console.log('Super Administrador creado:');
    console.log(`Email: ${superAdmin.email}`);
    console.log('Password: superadmin123');
    process.exit();
  } catch (error) {
    console.error('Error al crear el Super Administrador:', error);
    process.exit(1);
  }
};

// Ejecutar la función
createSuperAdmin(); 