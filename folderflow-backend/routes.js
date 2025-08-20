const express = require('express');
const router = express.Router();
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const { pipeline } = require('stream/promises');

// Configure multer for memory storage
const upload = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      const uploadDir = path.join(__dirname, 'temp-uploads', new Date().getTime().toString());
      fs.mkdirSync(uploadDir, { recursive: true });
      cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
      // Preserve original path structure in the filename
      const relativePath = file.originalname;
      cb(null, relativePath);
    }
  }),
  limits: {
    fileSize: Infinity, // No file size limit
    files: 100000 // Allow up to 100,000 files
  },
  preservePath: true // This is important to maintain folder structure
});
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Increased limit for testing
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});

// Stricter rate limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 login attempts per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again later.' }
});

// Middleware to check if user has paid plan
function paidFeatureOnly(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  if (req.user.plan === 'free') {
    return res.status(403).json({ error: 'This feature requires a paid plan' });
  }
  next();
}

function logRequests(req, res, next) {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} IP:${req.ip}`);
  next();
}

// Security middleware
const helmet = require('helmet');
router.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", process.env.B2_BUCKET_URL, process.env.CLOUDFLARE_CDN_URL].filter(Boolean)
    }
  },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: true,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" }
}));

router.use(apiLimiter);
router.use(logRequests);

const queries = require('./example-queries');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('./db');
const B2 = require('backblaze-b2');

// Initialize B2
const b2 = new B2({
  applicationKeyId: process.env.B2_KEY_ID || '0053077662f8c230000000001',
  applicationKey: process.env.B2_APPLICATION_KEY || 'K005oD5vx03vXJG+dThfbz4t5cyvl7s',
  bucketId: process.env.B2_BUCKET_ID || 'b3a097a7d6a6c28f988c0213'
});

// B2 upload helper
async function uploadToB2(file, b2Folder) {
  try {
    await b2.authorize();
    const uploadUrl = await b2.getUploadUrl({
      bucketId: 'b3a097a7d6a6c28f988c0213' // Your bucket ID
    });

    if (!uploadUrl.data || !uploadUrl.data.uploadUrl || !uploadUrl.data.authorizationToken) {
      throw new Error('Failed to get B2 upload URL');
    }

    const fileName = `${b2Folder}${file.originalname}`;
    const uploadResult = await b2.uploadFile({
      uploadUrl: uploadUrl.data.uploadUrl,
      uploadAuthToken: uploadUrl.data.authorizationToken,
      fileName: fileName,
      data: file.buffer,
      contentType: file.mimetype,
      bucketId: 'b3a097a7d6a6c28f988c0213'
    });

    if (!uploadResult.data || !uploadResult.data.fileName) {
      throw new Error('Failed to upload file to B2');
    }

    console.log(`[SUCCESS] Uploaded file to B2: ${fileName}`);
    return uploadResult.data.fileName;
  } catch (error) {
    console.error(`[ERROR] B2 upload failed:`, error);
    throw new Error('Failed to upload to B2: ' + error.message);
  }
}
// Get audit logs for a folder's share links
router.get('/api/folder/:folderId/audit-log', authMiddleware, async (req, res) => {
  const { folderId } = req.params;
  try {
    const logs = await pool.query(
      "SELECT action, timestamp FROM transfers WHERE folder_id = $1 AND action LIKE 'sharelink_access:%' ORDER BY timestamp DESC LIMIT 100",
      [folderId]
    );
    res.json({ logs: logs.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

  // Payment verification endpoint (UPI/manual)
  router.post('/api/payments/upi/verify', authMiddleware, async (req, res) => {
    let { transactionId, plan } = req.body;
    const userId = req.user?.id;
    transactionId = sanitizeString(transactionId);
    plan = sanitizeString(plan);
    if (!transactionId || !plan || !userId) return res.status(400).json({ error: 'Missing details' });
    // Log for manual review
    await pool.query(
      'INSERT INTO transfers (folder_id, user_id, action, timestamp) VALUES ($1, $2, $3, NOW())',
      [null, userId, `upi_payment:${plan}:${transactionId}`]
    );
    // Automatically upgrade user plan
    const validPlans = ['Pro', 'Enterprise'];
    if (validPlans.includes(plan)) {
      await pool.query('UPDATE users SET plan = $1 WHERE id = $2', [plan, userId]);
    }
    res.json({ success: true, message: `Payment submitted. Your plan has been upgraded to ${plan}.` });
  });
function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) {
    return res.status(401).json({ error: 'Missing token' });
  }
  
  if (!auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Invalid token format' });
  }

  try {
    const token = auth.split(' ')[1];
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check token expiration
    const now = Math.floor(Date.now() / 1000);
    if (req.user.exp && req.user.exp < now) {
      throw new Error('Token expired');
    }

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError' || err.message === 'Token expired') {
      return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    res.status(401).json({ error: 'Invalid token' });
  }
}

// Auth & User
router.post('/api/auth/register', authLimiter, async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Missing fields' });
  try {
    const hash = await bcrypt.hash(password, 10);
    const user = await queries.createUser(name, email, hash);
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/api/auth/login', authLimiter, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Missing fields' });
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user.id, email: user.email, plan: user.plan }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/api/user/profile', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, plan, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(`[ERROR] /api/user/profile:`, err);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

router.post('/api/user/upgrade-plan', authMiddleware, async (req, res) => {
  // TODO: Upgrade plan
  res.send('Upgrade plan endpoint');
});

// Folder Upload & Download
router.post('/api/folder/upload', authMiddleware, paidFeatureOnly, upload.array('files'), async (req, res) => {
  const userId = req.user.id;
  const { folderName } = req.body;
  const files = req.files;
  
  if (!folderName || !files || files.length === 0) {
    return res.status(400).json({ error: 'Missing folder or files' });
  }

  let folder;
  try {
    // Create a unique folder ID for this upload
    const timestamp = Date.now();
    const uploadId = `${userId}_${timestamp}`;
    const b2Folder = `uploads/${userId}/${timestamp}_${folderName}/`;
    
    // Initialize B2 upload
    await b2.authorize(); // Make sure we're authorized
    
    // Track upload progress
    let totalSize = 0;
    let uploadedFiles = 0;
    const totalFiles = files.length;
    const b2Keys = [];

    // Create a function to upload a single file
    async function uploadSingleFile(file) {
      try {
        // Get upload URL and auth token
        const uploadUrlResponse = await b2.getUploadUrl({
          bucketId: process.env.B2_BUCKET_ID || 'b3a097a7d6a6c28f988c0213'
        });

        // Preserve the folder structure in B2
        const relativePath = file.filename; // This contains the original path
        const b2Path = path.join(b2Folder, relativePath).replace(/\\/g, '/');

        // Create read stream from the temporary file
        const fileStream = fs.createReadStream(file.path);
        
        // Upload to B2 with proper content type
        const uploadResult = await b2.uploadFile({
          uploadUrl: uploadUrlResponse.data.uploadUrl,
          uploadAuthToken: uploadUrlResponse.data.authorizationToken,
          fileName: b2Path,
          data: fileStream,
          contentType: file.mimetype || 'application/octet-stream',
          onUploadProgress: (event) => {
            // You can emit progress events here if needed
            console.log(`Uploading ${relativePath}: ${event.loaded}/${event.total} bytes`);
          }
        });

        totalSize += file.size;
        uploadedFiles++;
        b2Keys.push(uploadResult.data.fileName);

        // Clean up the temporary file
        fs.unlinkSync(file.path);

        // Send progress update
        res.write(JSON.stringify({
          type: 'progress',
          file: relativePath,
          progress: (uploadedFiles / totalFiles) * 100,
          totalFiles: totalFiles,
          completedFiles: uploadedFiles
        }) + '\n');

      } catch (error) {
        console.error(`Failed to upload ${file.filename}:`, error);
        throw error;
      }
    }

    // Set up response for streaming updates
    res.setHeader('Content-Type', 'application/x-ndjson');
    res.setHeader('Transfer-Encoding', 'chunked');

    // Upload files in parallel, but with a reasonable concurrency limit
    const concurrencyLimit = 5;
    const fileGroups = [];
    for (let i = 0; i < files.length; i += concurrencyLimit) {
      fileGroups.push(files.slice(i, i + concurrencyLimit));
    }

    for (const group of fileGroups) {
      await Promise.all(group.map(file => uploadSingleFile(file)));
    }

    // Save folder metadata
    folder = await queries.addFolder(userId, folderName, totalSize, b2Keys[0]);
    await queries.logTransfer(folder.id, userId, 'upload');

    // Save file structure for later downloads
    const folderStructure = {
      id: folder.id,
      name: folderName,
      files: b2Keys,
      totalSize: totalSize,
      created: new Date().toISOString()
    };

    await pool.query(
      'UPDATE folders SET metadata = $1 WHERE id = $2',
      [JSON.stringify(folderStructure), folder.id]
    );

    // Send final success response
    res.end(JSON.stringify({
      type: 'complete',
      folder: folderStructure,
      message: 'Upload completed successfully'
    }));

  } catch (err) {
    // Clean up any temporary files
    if (files) {
      files.forEach(file => {
        try {
          fs.unlinkSync(file.path);
        } catch (e) {
          console.error('Failed to clean up temporary file:', e);
        }
      });
    }

    // Clean up folder if needed
    if (folder?.id) {
      try {
        await queries.deleteFolder(folder.id);
      } catch (cleanupError) {
        console.error(`[ERROR] Folder cleanup failed:`, cleanupError);
      }
    }

    console.error(`[ERROR] /api/folder/upload:`, err);
    res.status(500).json({ 
      error: 'Upload failed. Please try again.',
      details: err.message
    });
  }
});

router.get('/api/folder/:id/download', authMiddleware, paidFeatureOnly, async (req, res) => {
  try {
    const folderId = req.params.id;
    // Query DB for folder metadata including file structure
    const result = await pool.query('SELECT * FROM folders WHERE id = $1', [folderId]);
    const folder = result.rows[0];
    
    if (!folder || !folder.metadata) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    // Parse the folder structure
    const folderStructure = folder.metadata;
    
    // Authorize with B2
    await b2.authorize();

    // Generate download URLs for all files with proper folder structure
    const downloadUrls = await Promise.all(folderStructure.files.map(async (fileName) => {
      const downloadAuth = await b2.getDownloadAuthorization({
        bucketId: process.env.B2_BUCKET_ID || 'b3a097a7d6a6c28f988c0213',
        fileNamePrefix: fileName,
        validDurationInSeconds: 86400 // 24 hours
      });

      return {
        path: fileName,
        url: `https://f005.backblazeb2.com/file/${process.env.B2_BUCKET_NAME}/${fileName}`,
        auth: downloadAuth.data.authorizationToken
      };
    }));

    // Return the complete folder structure with authenticated download URLs
    res.json({
      folderName: folder.name,
      totalSize: folderStructure.totalSize,
      files: downloadUrls,
      expiresIn: '24 hours'
    });

  } catch (err) {
    console.error(`[ERROR] /api/folder/:id/download:`, err);
    res.status(500).json({ error: err.message || 'Failed to generate download URLs' });
  }
});

// Export the router
module.exports = router;
});

router.get('/api/folder/:id/metadata', authMiddleware, async (req, res) => {
  try {
    const folderId = req.params.id;
    const result = await queries.getUserFolders(folderId); // For demo, use getUserFolders
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const crypto = require('crypto');


router.post('/api/folder/:id/share-link', authMiddleware, paidFeatureOnly, async (req, res) => {
  try {
    const folderId = String(req.params.id).replace(/[^a-zA-Z0-9_-]/g, '');
    let { password, expiryHours } = req.body;
    if (typeof password !== 'string') password = '';
    if (typeof expiryHours !== 'number' || expiryHours < 1 || expiryHours > 168) expiryHours = 24;
    if (!folderId) throw new Error('Invalid folder ID');
    if (password.length > 128) throw new Error('Password too long');
    const linkId = crypto.randomBytes(8).toString('hex');
    const expiresAt = expiryHours ? new Date(Date.now() + expiryHours * 3600 * 1000) : null;
    const hash = password ? crypto.createHash('sha256').update(password).digest('hex') : null;
    await pool.query(
      'INSERT INTO share_links (link_id, folder_id, hash, expires_at) VALUES ($1, $2, $3, $4)',
      [linkId, folderId, hash, expiresAt]
    );
    res.json({ link: `/download/${linkId}` });
  } catch (err) {
    console.error(`[ERROR] /api/folder/:id/share-link:`, err);
    res.status(400).json({ error: err.message || 'Failed to create share link' });
  }
});

router.post('/api/share-link/validate', async (req, res) => {
  const { linkId, password } = req.body;
  const result = await pool.query('SELECT * FROM share_links WHERE link_id = $1', [linkId]);
  const link = result.rows[0];
  let accessStatus = 'success';
  try {
    if (!link) {
      accessStatus = 'not_found';
      throw new Error('Link not found');
    }
    if (link.expires_at && new Date() > link.expires_at) {
      accessStatus = 'expired';
      throw new Error('Link expired');
    }
    if (link.hash && (!password || crypto.createHash('sha256').update(password).digest('hex') !== link.hash)) {
      accessStatus = 'invalid_password';
      throw new Error('Invalid password');
    }
    await pool.query(
      'INSERT INTO transfers (folder_id, user_id, action, timestamp) VALUES ($1, $2, $3, NOW())',
      [link.folder_id, null, `sharelink_access:${linkId}:${accessStatus}`]
    );
    res.json({ valid: true, folderId: link.folder_id });
  } catch (err) {
    await pool.query(
      'INSERT INTO transfers (folder_id, user_id, action, timestamp) VALUES ($1, $2, $3, NOW())',
      [link?.folder_id || null, null, `sharelink_access:${linkId}:${accessStatus}`]
    );
    if (accessStatus === 'not_found') {
      res.status(404).json({ error: err.message });
    } else if (accessStatus === 'expired') {
      res.status(410).json({ error: err.message });
    } else if (accessStatus === 'invalid_password') {
      res.status(401).json({ error: err.message });
    } else {
      res.status(500).json({ error: 'An unexpected error occurred' });
    }
  }
});

// Transfer History
router.get('/api/transfers', authMiddleware, async (req, res) => {
  try {
    const transfers = await queries.getRecentTransfers(req.user.id);
    res.json(transfers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Storage Management
router.post('/api/storage/move-to-cold', (req, res) => {
  // TODO: Move files to cold storage
  res.send('Move to cold storage endpoint');
});
router.get('/api/storage/status', (req, res) => {
  // TODO: Get storage status
  res.send('Storage status endpoint');
});

// P2P Transfers
router.post('/api/p2p/initiate', (req, res) => {
  // TODO: Initiate P2P transfer
  res.send('P2P initiate endpoint');
});
router.get('/api/p2p/status', (req, res) => {
  // TODO: Get P2P status
  res.send('P2P status endpoint');
});

module.exports = router;
