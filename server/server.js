require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./conf/database');
const errorHandler = require('./middlewares/errorHandler');
const notFound = require('./middlewares/notFound');

// Import routes
const authRoutes = require('./routers/authRoutes');
const productRoutes = require('./routers/productRoutes');
const categoryRoutes = require('./routers/categoryRoutes');
const orderRoutes = require('./routers/orderRoutes');
const cartRoutes = require('./routers/cartRoutes');
const userRoutes = require('./routers/userRoutes');
const storeRoutes = require('./routers/storeRoutes');
const statsRoutes = require('./routers/statsRoutes');

// Connect to database
connectDB();

// Initialize app
const app = express();

// Request logger (logs every request with status and duration)
app.use((req, res, next) => {
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
    const status = res.statusCode;
    const outcome = status >= 400 ? 'ERROR' : 'OK';
    const logLevel = status >= 400 ? 'error' : 'log';
    const origin = req.headers.origin || 'no-origin';
    console[logLevel](
      `[${new Date().toISOString()}] ${outcome} ${req.method} ${req.originalUrl} ${status} ${durationMs.toFixed(1)}ms [Origin: ${origin}]`
    );
  });
  next();
});

// CORS Configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = process.env.CORS_ORIGIN 
      ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
      : ['*'];
    
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Authorization'],
  preflightContinue: false,
  optionsSuccessStatus: 204,
  maxAge: 86400, // 24 hours
};

// Middlewares
app.use(cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (uploads)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/users', userRoutes);
app.use('/api/store', storeRoutes);
app.use('/api/stats', statsRoutes);

// Error handling
app.use(notFound);
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err);
  server.close(() => {
    process.exit(1);
  });
});

module.exports = app;


