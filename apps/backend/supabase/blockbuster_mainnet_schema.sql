-- Blockbuster Mainnet Database Schema
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/abvszvlvqmtngekjaxxl/sql/new

-- Create users table
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    wallet_address TEXT NOT NULL UNIQUE,
    username VARCHAR(50),
    email VARCHAR(255),
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Create uploader_profiles table
CREATE TABLE uploader_profiles (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE REFERENCES users(id),
    blockchain_account_id TEXT NOT NULL UNIQUE,
    total_earnings BIGINT NOT NULL DEFAULT 0,
    pending_earnings BIGINT NOT NULL DEFAULT 0,
    total_streams BIGINT NOT NULL DEFAULT 0,
    total_content_uploaded INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Create content table
CREATE TABLE content (
    id TEXT PRIMARY KEY,
    blockchain_id TEXT NOT NULL UNIQUE,
    uploader_id TEXT NOT NULL REFERENCES uploader_profiles(id),
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    genre INTEGER NOT NULL,
    duration_seconds INTEGER NOT NULL,
    walrus_blob_ids JSONB NOT NULL,
    thumbnail_url TEXT,
    status INTEGER NOT NULL DEFAULT 0,
    total_streams BIGINT NOT NULL DEFAULT 0,
    total_watch_time BIGINT NOT NULL DEFAULT 0,
    average_completion_rate INTEGER NOT NULL DEFAULT 0,
    rating_sum BIGINT NOT NULL DEFAULT 0,
    rating_count BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX content_genre_idx ON content(genre);
CREATE INDEX content_status_idx ON content(status);
CREATE INDEX content_uploader_id_idx ON content(uploader_id);

-- Create memberships table
CREATE TABLE memberships (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    nft_object_id TEXT NOT NULL UNIQUE,
    member_number INTEGER NOT NULL,
    tier INTEGER NOT NULL,
    issued_at TIMESTAMP WITH TIME ZONE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX memberships_user_id_idx ON memberships(user_id);

-- Create streams table
CREATE TABLE streams (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    content_id TEXT NOT NULL REFERENCES content(id),
    session_id TEXT NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    watch_duration INTEGER,
    completion_percentage INTEGER,
    quality_level INTEGER,
    blockchain_tx_digest TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX streams_content_id_idx ON streams(content_id);
CREATE INDEX streams_created_at_idx ON streams(created_at);
CREATE INDEX streams_user_id_idx ON streams(user_id);

-- Create distributions table
CREATE TABLE distributions (
    id TEXT PRIMARY KEY,
    uploader_id TEXT NOT NULL REFERENCES uploader_profiles(id),
    week_start_date DATE NOT NULL,
    week_end_date DATE NOT NULL,
    amount BIGINT NOT NULL,
    weighted_score BIGINT NOT NULL,
    total_streams INTEGER NOT NULL,
    blockchain_tx_digest TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX distributions_uploader_id_idx ON distributions(uploader_id);
CREATE INDEX distributions_week_start_date_idx ON distributions(week_start_date);

-- Create daily_analytics table
CREATE TABLE daily_analytics (
    id TEXT PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    new_members INTEGER NOT NULL DEFAULT 0,
    active_members INTEGER NOT NULL DEFAULT 0,
    total_streams INTEGER NOT NULL DEFAULT 0,
    total_watch_hours INTEGER NOT NULL DEFAULT 0,
    revenue_collected BIGINT NOT NULL DEFAULT 0,
    new_content INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create platform_config table
CREATE TABLE platform_config (
    id TEXT PRIMARY KEY,
    key TEXT NOT NULL UNIQUE,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Create Prisma migrations table (needed by Prisma)
CREATE TABLE _prisma_migrations (
    id VARCHAR(36) PRIMARY KEY,
    checksum VARCHAR(64) NOT NULL,
    finished_at TIMESTAMP WITH TIME ZONE,
    migration_name VARCHAR(255) NOT NULL,
    logs TEXT,
    rolled_back_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    applied_steps_count INTEGER NOT NULL DEFAULT 0
);

-- Insert initial migration record
INSERT INTO _prisma_migrations (id, checksum, finished_at, migration_name, applied_steps_count)
VALUES (
    '00000000-0000-0000-0000-000000000000',
    'manual_initialization',
    NOW(),
    'manual_mainnet_schema',
    1
);

-- Success message
SELECT 'Blockbuster Mainnet Schema Created Successfully!' as message;
