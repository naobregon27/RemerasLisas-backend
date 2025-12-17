require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const { USER_ROLES } = require('../conf/constants');
const connectDB = require('../conf/database');

/**
 * Initialize default admin user
 * Run this script once to create the default admin user
 */
const initAdmin = async () => {
  try {
    // Connect to database
    await connectDB();

    // Check if admin already exists
    const existingAdmin = await User.findOne({ role: USER_ROLES.ADMIN });
    if (existingAdmin) {
      console.log('✅ Admin user already exists');
      process.exit(0);
    }

    // Create admin user
    const admin = await User.create({
      name: 'Administrador',
      email: process.env.ADMIN_EMAIL || 'admin@remeraslisas.com',
      password: process.env.ADMIN_PASSWORD || 'Admin123!',
      role: USER_ROLES.ADMIN,
      isEmailVerified: true,
      isActive: true,
    });

    console.log('✅ Admin user created successfully!');
    console.log(`📧 Email: ${admin.email}`);
    console.log(`🔑 Password: ${process.env.ADMIN_PASSWORD || 'Admin123!'}`);
    console.log('⚠️  Please change the password after first login!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    process.exit(1);
  }
};

// Run if called directly
if (require.main === module) {
  initAdmin();
}

module.exports = initAdmin;


