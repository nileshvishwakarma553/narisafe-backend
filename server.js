import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import morgan from 'morgan';

import { connectDB, getDbStatus } from './config/db.js';
import { initSocket } from './services/socketService.js';
import { errorHandler } from './middleware/errorHandler.js';
import { apiLimiter } from './middleware/rateLimiter.js';

// Route Imports
import authRoutes from './routes/authRoutes.js';
import contactRoutes from './routes/contactRoutes.js';
import guardianRoutes from './routes/guardianRoutes.js';
import locationRoutes from './routes/locationRoutes.js';
import emergencyRoutes from './routes/emergencyRoutes.js';
import incidentRoutes from './routes/incidentRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import safePlacesRoutes from './routes/safePlacesRoutes.js';
import routeRoutes from './routes/routeRoutes.js';
import helplineRoutes from './routes/helplineRoutes.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

// Socket.IO configuration
const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',').map(u => u.trim())
  : ['*'];

const io = new Server(server, {
  cors: {
    origin: allowedOrigins.length === 1 && allowedOrigins[0] === '*'
      ? '*'
      : allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  },
});

initSocket(io);

// Security and standard middlewares
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Rate limiter for general API
app.use('/api', apiLimiter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    system: 'NariSafe API',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    database: getDbStatus(),
  });
});

// Mount API Endpoints
app.use('/api/auth', authRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/guardian', guardianRoutes);
app.use('/api/location', locationRoutes);
app.use('/api/emergency', emergencyRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/safe-places', safePlacesRoutes);
app.use('/api/routes', routeRoutes);
app.use('/api/helplines', helplineRoutes);

// Catch-all 404 for undefined API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API route '${req.originalUrl}' does not exist.`,
  });
});

// Centralized error handling
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Connect Database & Start Server
connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🛡️  NariSafe Backend Server running on port ${PORT}`);
    console.log(`🔗 Health Check: http://localhost:${PORT}/api/health`);
    console.log(`📡 Socket.IO Real-Time Dispatcher initialized`);
    console.log(`=======================================================`);
  });
});

export default app;
