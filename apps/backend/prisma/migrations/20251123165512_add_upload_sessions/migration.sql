-- CreateTable
CREATE TABLE "upload_sessions" (
    "id" TEXT NOT NULL,
    "uploader_id" TEXT NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "file_size" BIGINT NOT NULL,
    "total_chunks" INTEGER NOT NULL,
    "chunks_received" INTEGER NOT NULL DEFAULT 0,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "genre" INTEGER NOT NULL,
    "epochs" INTEGER NOT NULL,
    "payment_digest" VARCHAR(255) NOT NULL,
    "paid_amount" VARCHAR(100) NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'receiving_chunks',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "content_id" TEXT,
    "video_blob_id" VARCHAR(255),
    "thumbnail_blob_id" VARCHAR(255),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upload_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "upload_sessions_payment_digest_key" ON "upload_sessions"("payment_digest");
