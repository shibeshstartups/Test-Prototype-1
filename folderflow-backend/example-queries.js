const pool = require('./db');

// Create a new user
async function createUser(name, email, password) {
  const res = await pool.query(
    'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING *',
    [name, email, password]
  );
  return res.rows[0];
}

// Add a folder
async function addFolder(userId, name, size, s3Key) {
  const res = await pool.query(
    'INSERT INTO folders (user_id, name, size, s3_key) VALUES ($1, $2, $3, $4) RETURNING *',
    [userId, name, size, s3Key]
  );
  return res.rows[0];
}

// Log a transfer
async function logTransfer(folderId, userId, action) {
  const res = await pool.query(
    'INSERT INTO transfers (folder_id, user_id, action) VALUES ($1, $2, $3) RETURNING *',
    [folderId, userId, action]
  );
  return res.rows[0];
}

// Get user folders
async function getUserFolders(userId) {
  const res = await pool.query(
    'SELECT * FROM folders WHERE user_id = $1',
    [userId]
  );
  return res.rows;
}

// Get recent transfers
async function getRecentTransfers(userId) {
  const res = await pool.query(
    'SELECT * FROM transfers WHERE user_id = $1 ORDER BY timestamp DESC LIMIT 10',
    [userId]
  );
  return res.rows;
}

module.exports = { createUser, addFolder, logTransfer, getUserFolders, getRecentTransfers };
