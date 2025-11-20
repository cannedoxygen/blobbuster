-- Add NFT card URL columns to memberships table
-- Run this in Supabase SQL Editor

ALTER TABLE memberships
ADD COLUMN IF NOT EXISTS active_card_url TEXT,
ADD COLUMN IF NOT EXISTS expired_card_url TEXT,
ADD COLUMN IF NOT EXISTS active_card_blob TEXT,
ADD COLUMN IF NOT EXISTS expired_card_blob TEXT;

-- Success message
SELECT 'NFT card URL columns added successfully!' as message;
