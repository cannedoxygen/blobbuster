-- Add points column to memberships table
ALTER TABLE memberships
ADD COLUMN IF NOT EXISTS points INT DEFAULT 0;

-- Create membership_watches table
CREATE TABLE IF NOT EXISTS membership_watches (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  membership_id VARCHAR(255) NOT NULL,
  content_id VARCHAR(255) NOT NULL,
  watched_at TIMESTAMP NOT NULL DEFAULT NOW(),
  completion_rate DOUBLE PRECISION NOT NULL,
  points_awarded BOOLEAN NOT NULL DEFAULT FALSE,

  CONSTRAINT membership_watches_membership_id_content_id_key UNIQUE (membership_id, content_id),
  CONSTRAINT membership_watches_membership_id_fkey FOREIGN KEY (membership_id) REFERENCES memberships(id) ON DELETE CASCADE,
  CONSTRAINT membership_watches_content_id_fkey FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS membership_watches_membership_id_idx ON membership_watches(membership_id);
CREATE INDEX IF NOT EXISTS membership_watches_content_id_idx ON membership_watches(content_id);

-- Update Prisma migrations table to mark this as applied (so Prisma knows about it)
-- This prevents Prisma from trying to recreate these changes
