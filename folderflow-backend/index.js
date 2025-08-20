require('dotenv').config();
const Sentry = require('@sentry/node');
Sentry.init({
  dsn: process.env.SENTRY_DSN || '',
  tracesSampleRate: 1.0,
});

const express = require('express');
const cors = require('cors');
const app = express();

app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.errorHandler());
// Configure CORS for testing
app.use(cors({
  origin: '*', // Allow all origins for testing
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '2048mb' })); // Set payload limit to 2GB
app.use(express.urlencoded({ extended: true, limit: '2048mb' })); // Also increase URL-encoded limit

// Add test endpoints
app.get('/', (req, res) => {
  const clientIP = req.ip || req.connection.remoteAddress;
  res.json({
    status: 'FolderFlow backend is running!',
    serverInfo: {
      timestamp: new Date().toISOString(),
      clientIP: clientIP,
      cors: true,
      maxFileSize: '2048MB',
      endpoints: [
        'GET /',
        'GET /api/test',
        'POST /api/auth/register',
        'POST /api/auth/login',
        'POST /api/folder/upload',
        'GET /api/folder/:id/download'
      ]
    }
  });
});

app.get('/api/test', (req, res) => {
  const clientIP = req.ip || req.connection.remoteAddress;
  res.json({
    message: 'Test endpoint is working!',
    yourIP: clientIP,
    timestamp: new Date().toISOString(),
    headers: req.headers
  });
});

const routes = require('./routes');
app.use(routes);

// Start server
const PORT = process.env.PORT || 4000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
  console.log('Access from other devices using your machine\'s IP address');
});

// PM2 logs are automatically captured when running with pm2
// To view logs: pm2 logs folderflow-backend
