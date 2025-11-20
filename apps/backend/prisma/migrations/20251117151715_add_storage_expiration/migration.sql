-- Add storage expiration tracking fields to content table
ALTER TABLE "content" ADD COLUMN "storage_epochs" INTEGER;
ALTER TABLE "content" ADD COLUMN "storage_expires_at" TIMESTAMP(3);

-- Create index for efficient expiration queries
CREATE INDEX "content_storage_expires_at_idx" ON "content"("storage_expires_at");

-- Set default values for existing content (assume 52 epochs = 1 year)
UPDATE "content"
SET
  "storage_epochs" = 52,
  "storage_expires_at" = "created_at" + INTERVAL '728 days'
WHERE "storage_epochs" IS NULL;
