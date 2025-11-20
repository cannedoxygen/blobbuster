-- DELETE Fight Club without metadata (blockchain ID ending in ...c347)
-- Content ID: 34784ae8-22b2-4940-9077-06ca6d2fcb46
-- Reason: Duplicate upload without TMDB enrichment - keeping the one with full metadata

-- STEP 1: View the content before deleting
SELECT
  id,
  title,
  description,
  status,
  blockchain_id,
  walrus_blob_ids,
  tmdb_id,
  imdb_id,
  created_at,
  updated_at
FROM content
WHERE id = '34784ae8-22b2-4940-9077-06ca6d2fcb46';

-- STEP 2: Delete any related streams first (foreign key constraint)
DELETE FROM streams
WHERE content_id = '34784ae8-22b2-4940-9077-06ca6d2fcb46';

-- STEP 3: Delete the content record
DELETE FROM content
WHERE id = '34784ae8-22b2-4940-9077-06ca6d2fcb46';

-- STEP 4: Verify deletion (should return no rows)
SELECT *
FROM content
WHERE id = '34784ae8-22b2-4940-9077-06ca6d2fcb46';

-- STEP 5: Verify the good one is still there (with tmdb_id = 550)
SELECT
  id,
  title,
  description,
  tmdb_id,
  imdb_id,
  blockchain_id
FROM content
WHERE title ILIKE '%Fight Club%';
