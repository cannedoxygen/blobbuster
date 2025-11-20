-- AlterTable
ALTER TABLE "content" ADD COLUMN "tmdb_id" INTEGER,
ADD COLUMN "imdb_id" TEXT,
ADD COLUMN "original_title" TEXT,
ADD COLUMN "year" INTEGER,
ADD COLUMN "plot" TEXT,
ADD COLUMN "runtime" INTEGER,
ADD COLUMN "tagline" TEXT,
ADD COLUMN "poster_url" TEXT,
ADD COLUMN "backdrop_url" TEXT,
ADD COLUMN "genres_list" TEXT,
ADD COLUMN "cast" TEXT,
ADD COLUMN "director" TEXT,
ADD COLUMN "external_rating" DOUBLE PRECISION,
ADD COLUMN "language" TEXT,
ADD COLUMN "country" TEXT;

-- CreateIndex
CREATE INDEX "content_tmdb_id_idx" ON "content"("tmdb_id");

-- CreateIndex
CREATE INDEX "content_year_idx" ON "content"("year");
