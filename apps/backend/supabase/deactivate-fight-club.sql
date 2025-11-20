-- DELETE broken Fight Club upload
-- Content ID: fe7d6933-5b2c-4d4c-a6bc-e000629c2102
-- Reason: Deletable blob (underpaid WAL), expires at epoch 17 end
-- Blob ID: RVh0_5D4QtfKksNSOoHUfCyE1SLurknx5vuO32kn1ow

-- STEP 1: View the content before deleting
SELECT
  id,
  title,
  status,
  blockchain_id,
  walrus_blob_ids,
  created_at,
  updated_at
FROM content
WHERE id = 'fe7d6933-5b2c-4d4c-a6bc-e000629c2102';

-- STEP 2: Delete any related streams first (foreign key constraint)
DELETE FROM streams
WHERE content_id = 'fe7d6933-5b2c-4d4c-a6bc-e000629c2102';

-- STEP 3: Delete the content record
DELETE FROM content
WHERE id = 'fe7d6933-5b2c-4d4c-a6bc-e000629c2102';

-- STEP 4: Verify deletion (should return no rows)
SELECT *
FROM content
WHERE id = 'fe7d6933-5b2c-4d4c-a6bc-e000629c2102';
