-- Add tmdb_id column to upload_sessions table
-- This allows storing the user-selected TMDB ID to prevent wrong movie metadata

ALTER TABLE upload_sessions ADD COLUMN IF NOT EXISTS tmdb_id INTEGER;
