const joi = require('joi');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Define environment variable validation schema
const envSchema = joi.object({
  // Node environment
  NODE_ENV: joi.string().valid('development', 'production', 'test').required(),
  PORT: joi.number().default(4000),

  // PostgreSQL
  PGHOST: joi.string().required(),
  PGUSER: joi.string().required(),
  PGPASSWORD: joi.string().required(),
  PGDATABASE: joi.string().required(),
  PGPORT: joi.number().default(5432),
  
  // JWT
  JWT_SECRET: joi.string().min(32).required(),
  JWT_EXPIRY: joi.string().default('7d'),
  
  // B2 Storage
  B2_KEY_ID: joi.string().required(),
  B2_APPLICATION_KEY: joi.string().required(),
  B2_BUCKET_ID: joi.string().required(),
  B2_BUCKET_NAME: joi.string().required(),
  
  // Rate Limiting
  RATE_LIMIT_WINDOW: joi.number().default(900000), // 15 minutes in milliseconds
  RATE_LIMIT_MAX: joi.number().default(100),
  
  // File Upload
  MAX_FILE_SIZE: joi.number().default(2147483648), // 2GB in bytes
  MAX_FILES: joi.number().default(100000),
  UPLOAD_TEMP_DIR: joi.string().default('temp-uploads'),
  
  // Security
  CORS_ORIGINS: joi.string().required(), // comma-separated list of allowed origins
  TRUST_PROXY: joi.boolean().default(true),
  
  // Monitoring
  SENTRY_DSN: joi.string().uri().required(),
  
  // CDN
  CDN_URL: joi.string().uri(),
  
  // Redis (for rate limiting and caching)
  REDIS_URL: joi.string().uri().required(),
}).unknown();

// Validate environment variables
const { error, value: env } = envSchema.validate(process.env);

if (error) {
  throw new Error(`Environment validation error: ${error.message}`);
}

module.exports = {
  nodeEnv: env.NODE_ENV,
  port: env.PORT,
  db: {
    host: env.PGHOST,
    user: env.PGUSER,
    password: env.PGPASSWORD,
    database: env.PGDATABASE,
    port: env.PGPORT,
  },
  jwt: {
    secret: env.JWT_SECRET,
    expiry: env.JWT_EXPIRY,
  },
  b2: {
    keyId: env.B2_KEY_ID,
    applicationKey: env.B2_APPLICATION_KEY,
    bucketId: env.B2_BUCKET_ID,
    bucketName: env.B2_BUCKET_NAME,
  },
  rateLimit: {
    windowMs: env.RATE_LIMIT_WINDOW,
    max: env.RATE_LIMIT_MAX,
  },
  upload: {
    maxFileSize: env.MAX_FILE_SIZE,
    maxFiles: env.MAX_FILES,
    tempDir: env.UPLOAD_TEMP_DIR,
  },
  security: {
    corsOrigins: env.CORS_ORIGINS.split(','),
    trustProxy: env.TRUST_PROXY,
  },
  monitoring: {
    sentryDsn: env.SENTRY_DSN,
  },
  cdn: {
    url: env.CDN_URL,
  },
  redis: {
    url: env.REDIS_URL,
  },
};
