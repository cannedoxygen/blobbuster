-- Rename NFT card blob columns to CID columns for IPFS
-- Run this in Supabase SQL Editor

-- Rename blob columns to cid (for IPFS content identifiers)
ALTER TABLE memberships
RENAME COLUMN active_card_blob TO active_card_cid;

ALTER TABLE memberships
RENAME COLUMN expired_card_blob TO expired_card_cid;

-- Success message
SELECT 'NFT card blob columns renamed to CID columns successfully!' as message;
