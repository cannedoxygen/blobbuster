-- Add payment_tx_digest column to content table
-- This tracks the user's payment transaction for Walrus storage
-- Used to prevent replay attacks (same payment used twice)

ALTER TABLE "content" ADD COLUMN "payment_tx_digest" TEXT;

-- Create unique constraint to ensure payment can only be used once
ALTER TABLE "content" ADD CONSTRAINT "content_payment_tx_digest_key" UNIQUE ("payment_tx_digest");

-- Create index for fast payment lookup
CREATE INDEX "content_payment_tx_digest_idx" ON "content"("payment_tx_digest");
