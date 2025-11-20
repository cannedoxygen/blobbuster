-- Find and delete Fight Club 10th Anniversary Edition
-- Keep the simple "Fight Club" with TMDB metadata

-- STEP 1: Find all Fight Club entries
-- Look for which one is "10th Anniversary" vs plain "Fight Club"
SELECT
  id,
  title,
  description,
  original_title,
  tmdb_id,
  imdb_id,
  created_at,
  blockchain_id
FROM content
WHERE title ILIKE '%Fight Club%'
ORDER BY created_at DESC;

-- STEP 2: Once you identify the Anniversary edition ID, uncomment and update below:

/*
-- Delete the 10th Anniversary Edition
-- (REPLACE WITH ACTUAL ID FROM STEP 1)

-- View before deleting
SELECT
  id,
  title,
  original_title,
  description,
  tmdb_id,
  walrus_blob_ids,
  created_at
FROM content
WHERE id = 'REPLACE_WITH_ANNIVERSARY_ID';

-- Delete related streams
DELETE FROM streams
WHERE content_id = 'REPLACE_WITH_ANNIVERSARY_ID';

-- Delete the content
DELETE FROM content
WHERE id = 'REPLACE_WITH_ANNIVERSARY_ID';

-- Verify deletion
SELECT * FROM content WHERE title ILIKE '%Fight Club%';
*/
