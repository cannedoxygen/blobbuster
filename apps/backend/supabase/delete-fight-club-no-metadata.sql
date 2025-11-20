-- DELETE Fight Club upload with no metadata
-- Reason: Duplicate upload without TMDB enrichment

-- STEP 1: Find Fight Club entries and identify which one has no metadata
SELECT
  id,
  title,
  description,
  tmdb_id,
  imdb_id,
  status,
  blockchain_id,
  walrus_blob_ids,
  created_at,
  updated_at
FROM content
WHERE title LIKE '%Fight Club%'
ORDER BY created_at ASC;

-- STEP 2: View the specific content before deleting (REPLACE WITH ACTUAL ID)
-- Look for the entry with NULL tmdb_id and imdb_id from the results above
-- Then uncomment and update the ID below:

/*
SELECT
  id,
  title,
  status,
  blockchain_id,
  walrus_blob_ids,
  tmdb_id,
  imdb_id,
  created_at,
  updated_at
FROM content
WHERE id = 'REPLACE_WITH_ACTUAL_ID_FROM_STEP_1';

-- STEP 3: Delete any related streams first (foreign key constraint)
DELETE FROM streams
WHERE content_id = 'REPLACE_WITH_ACTUAL_ID_FROM_STEP_1';

-- STEP 4: Delete the content record
DELETE FROM content
WHERE id = 'REPLACE_WITH_ACTUAL_ID_FROM_STEP_1';

-- STEP 5: Verify deletion (should return no rows)
SELECT *
FROM content
WHERE id = 'REPLACE_WITH_ACTUAL_ID_FROM_STEP_1';
*/
