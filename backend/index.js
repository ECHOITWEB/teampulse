const functions = require('firebase-functions');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const admin = require('firebase-admin');

// Initialize Firebase Admin
admin.initializeApp();

// Import routes
const authRoutes = require('./src/routes/authRoutes');
const workspaceRoutes = require('./src/routes/workspaceRoutes');
const workspaceAdminRoutes = require('./src/routes/workspaceAdminRoutes');
const chatRoutes = require('./src/routes/chatRoutes');
const userRoutes = require('./src/routes/userRoutes');
const historyRoutes = require('./src/routes/historyRoutes');
const meetingRoutes = require('./src/routes/meetingRoutes');
const teamRoutes = require('./src/routes/teamRoutes');
const objectiveRoutes = require('./src/routes/objectiveRoutes');
const taskRoutes = require('./src/routes/taskRoutes');
const analyticsRoutes = require('./src/routes/analyticsRoutes');
const aiRoutes = require('./src/routes/aiRoutes');
const notificationRoutes = require('./src/routes/notificationRoutes');
const capacityRoutes = require('./src/routes/capacityRoutes');

// Create Express app
const app = express();

// CORS allowed origins
const allowedOrigins = [
  'http://localhost:3000',
  'https://teampulse-61474.web.app',
  'https://teampulse-61474.firebaseapp.com'
];

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Compression middleware
app.use(compression());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API routes
app.use('/auth', authRoutes);
app.use('/workspaces', workspaceRoutes);
app.use('/admin', workspaceAdminRoutes);
app.use('/chat', chatRoutes);
app.use('/users', userRoutes);
app.use('/history', historyRoutes);
app.use('/meetings', meetingRoutes);
app.use('/teams', teamRoutes);
app.use('/objectives', objectiveRoutes);
app.use('/tasks', taskRoutes);
app.use('/analytics', analyticsRoutes);
app.use('/ai', aiRoutes);
app.use('/notifications', notificationRoutes);
app.use('/capacity', capacityRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
      status: err.status || 500
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// Export the Express app as a Firebase Function
exports.api = functions.https.onRequest(app);