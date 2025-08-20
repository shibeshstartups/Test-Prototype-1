const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const { rateLimit } = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const Redis = require('ioredis');
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;
const config = require('./config');
const Sentry = require('@sentry/node');
const { ProfilingIntegration } = require("@sentry/profiling-node");

// Initialize Redis
const redis = new Redis(config.redis.url);

// Configure Sentry
Sentry.init({
  dsn: config.monitoring.sentryDsn,
  environment: config.nodeEnv,
  integrations: [
    new ProfilingIntegration(),
  ],
  tracesSampleRate: config.nodeEnv === 'production' ? 0.1 : 1.0,
  profilesSampleRate: 0.1,
});

// Cluster setup for production
if (cluster.isMaster && config.nodeEnv === 'production') {
  console.log(`Master ${process.pid} is running`);

  // Fork workers
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died`);
    // Replace the dead worker
    cluster.fork();
  });
} else {
  const app = express();

  // Trust proxy if behind reverse proxy
  if (config.security.trustProxy) {
    app.set('trust proxy', 1);
  }

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        connectSrc: ["'self'", ...config.security.corsOrigins],
        imgSrc: ["'self'", 'data:', config.cdn.url].filter(Boolean),
        upgradeInsecureRequests: config.nodeEnv === 'production' ? [] : null,
      },
    },
    crossOriginEmbedderPolicy: { policy: "credentialless" },
    crossOriginOpenerPolicy: { policy: "same-origin" },
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }));

  // Compression
  app.use(compression({
    filter: (req, res) => {
      if (req.headers['x-no-compression']) return false;
      return compression.filter(req, res);
    },
    threshold: 1024,
  }));

  // CORS
  app.use(cors({
    origin: config.security.corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400, // 24 hours
  }));

  // Body parsing
  app.use(express.json({ limit: config.upload.maxFileSize }));
  app.use(express.urlencoded({ extended: true, limit: config.upload.maxFileSize }));

  // Rate limiting with Redis store
  const limiter = rateLimit({
    store: new RedisStore({
      sendCommand: (...args) => redis.call(...args),
    }),
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => config.nodeEnv === 'development',
  });

  // Apply rate limiting to all routes
  app.use(limiter);

  // Sentry request handler
  app.use(Sentry.Handlers.requestHandler());
  app.use(Sentry.Handlers.tracingHandler());

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
