-- Add metadata column to folders table
ALTER TABLE folders ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Create index on metadata
CREATE INDEX IF NOT EXISTS idx_folders_metadata ON folders USING GIN (metadata);
