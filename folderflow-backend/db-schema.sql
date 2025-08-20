-- User table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  plan VARCHAR(50) DEFAULT 'free',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Folder metadata table
CREATE TABLE IF NOT EXISTS folders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  size BIGINT,
  status VARCHAR(50) DEFAULT 'hot',
  s3_key VARCHAR(255),
  b2_key VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transfer history table
CREATE TABLE IF NOT EXISTS transfers (
  id SERIAL PRIMARY KEY,
  folder_id INTEGER REFERENCES folders(id),
  user_id INTEGER REFERENCES users(id),
  action VARCHAR(50),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
