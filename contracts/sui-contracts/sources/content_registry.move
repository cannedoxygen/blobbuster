// Copyright (c) Blockbuster
// SPDX-License-Identifier: MIT

/// Content Registry module: Catalog of all movies with streaming metrics
///
/// Manages the global content library including metadata, streaming statistics,
/// and content status (pending, active, inactive).
module blockbuster::content_registry {
    use sui::object::{Self, UID, ID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::event;
    use std::string::{String};
    use std::vector;

    // ===== Error Codes =====

    const EInvalidRating: u64 = 200;
    const EContentNotActive: u64 = 201;
    const EUnauthorized: u64 = 202;
    const EInvalidStatus: u64 = 203;
    const EInvalidGenre: u64 = 204;

    // ===== Constants =====

    // Content status
    const STATUS_PENDING: u8 = 0;
    const STATUS_ACTIVE: u8 = 1;
    const STATUS_INACTIVE: u8 = 2;
    const STATUS_REMOVED: u8 = 3;

    // Quality levels
    const QUALITY_SD: u8 = 0;      // 480p
    const QUALITY_HD: u8 = 1;      // 720p
    const QUALITY_FHD: u8 = 2;     // 1080p
    const QUALITY_UHD: u8 = 3;     // 4K

    // Genres (expandable)
    const GENRE_ACTION: u8 = 0;
    const GENRE_COMEDY: u8 = 1;
    const GENRE_DRAMA: u8 = 2;
    const GENRE_HORROR: u8 = 3;
    const GENRE_SCIFI: u8 = 4;
    const GENRE_ROMANCE: u8 = 5;
    const GENRE_THRILLER: u8 = 6;
    const GENRE_DOCUMENTARY: u8 = 7;
    const GENRE_ANIMATION: u8 = 8;
    const GENRE_FAMILY: u8 = 9;

    // ===== Structs =====

    /// Admin capability for content moderation
    public struct AdminCap has key, store {
        id: UID
    }

    /// Global content registry
    public struct ContentRegistry has key {
        id: UID,
        admin: address,
        total_content: u64,
        active_content: u64,
        total_streams: u64,
        featured_ids: vector<ID>,
    }

    /// Individual content item
    public struct ContentItem has key {
        id: UID,
        uploader: address,
        title: String,
        description: String,
        genre: u8,
        duration_seconds: u64,
        walrus_blob_ids: String,  // JSON string of blob IDs for different qualities
        thumbnail_url: String,
        status: u8,
        total_streams: u64,
        total_watch_time: u64,
        average_completion_rate: u64,
        rating_sum: u64,
        rating_count: u64,
        upload_timestamp: u64,
    }

    /// Stream session record (owned by viewer)
    public struct StreamSession has key, store {
        id: UID,
        content_id: ID,
        viewer: address,
        start_time: u64,
        watch_duration: u64,
        completion_percentage: u64,
        quality_level: u8,
    }

    // ===== Events =====

    public struct ContentRegistered has copy, drop {
        content_id: ID,
        title: String,
        uploader: address,
        walrus_blob_ids: String,
        timestamp: u64,
    }

    public struct ContentStatusUpdated has copy, drop {
        content_id: ID,
        old_status: u8,
        new_status: u8,
    }

    public struct StreamTracked has copy, drop {
        session_id: ID,
        content_id: ID,
        viewer: address,
        watch_duration: u64,
        completion_percentage: u64,
    }

    public struct ContentRated has copy, drop {
        content_id: ID,
        rater: address,
        rating: u64,
        new_average: u64,
    }

    // ===== Initialization =====

    fun init(ctx: &mut TxContext) {
        let admin_cap = AdminCap {
            id: object::new(ctx)
        };

        let registry = ContentRegistry {
            id: object::new(ctx),
            admin: tx_context::sender(ctx),
            total_content: 0,
            active_content: 0,
            total_streams: 0,
            featured_ids: vector::empty(),
        };

        transfer::transfer(admin_cap, tx_context::sender(ctx));
        transfer::share_object(registry);
    }

    // ===== Public Functions =====

    /// Register new content (uploader submits for approval)
    public entry fun register_content(
        registry: &mut ContentRegistry,
        title: String,
        description: String,
        genre: u8,
        duration_seconds: u64,
        walrus_blob_ids: String,
        thumbnail_url: String,
        ctx: &mut TxContext
    ) {
        // Validate genre
        assert!(genre <= GENRE_FAMILY, EInvalidGenre);

        let content_id = object::new(ctx);
        let content_id_copy = object::uid_to_inner(&content_id);

        let content = ContentItem {
            id: content_id,
            uploader: tx_context::sender(ctx),
            title,
            description,
            genre,
            duration_seconds,
            walrus_blob_ids,
            thumbnail_url,
            status: STATUS_PENDING,  // Requires admin approval
            total_streams: 0,
            total_watch_time: 0,
            average_completion_rate: 0,
            rating_sum: 0,
            rating_count: 0,
            upload_timestamp: tx_context::epoch_timestamp_ms(ctx),
        };

        // Update registry
        registry.total_content = registry.total_content + 1;

        // Emit event for off-chain indexing
        event::emit(ContentRegistered {
            content_id: content_id_copy,
            title: content.title,
            uploader: tx_context::sender(ctx),
            walrus_blob_ids: content.walrus_blob_ids,
            timestamp: content.upload_timestamp,
        });

        // Share content (anyone can read, only uploader can modify with admin approval)
        transfer::share_object(content);
    }

    /// Update content status (admin only)
    public entry fun update_content_status(
        _admin_cap: &AdminCap,
        registry: &mut ContentRegistry,
        content: &mut ContentItem,
        new_status: u8,
        _ctx: &mut TxContext
    ) {
        assert!(new_status <= STATUS_REMOVED, EInvalidStatus);

        let old_status = content.status;
        content.status = new_status;

        // Update active count
        if (old_status != STATUS_ACTIVE && new_status == STATUS_ACTIVE) {
            registry.active_content = registry.active_content + 1;
        } else if (old_status == STATUS_ACTIVE && new_status != STATUS_ACTIVE) {
            registry.active_content = registry.active_content - 1;
        };

        event::emit(ContentStatusUpdated {
            content_id: object::uid_to_inner(&content.id),
            old_status,
            new_status,
        });
    }

    /// Track streaming session
    public entry fun track_stream(
        registry: &mut ContentRegistry,
        content: &mut ContentItem,
        watch_duration: u64,
        quality_level: u8,
        ctx: &mut TxContext
    ) {
        // Verify content is active
        assert!(content.status == STATUS_ACTIVE, EContentNotActive);

        // Calculate completion percentage
        let completion = if (content.duration_seconds > 0) {
            (watch_duration * 100) / content.duration_seconds
        } else {
            0
        };

        // Ensure completion doesn't exceed 100%
        let completion = if (completion > 100) {
            100
        } else {
            completion
        };

        // Update content metrics
        content.total_streams = content.total_streams + 1;
        content.total_watch_time = content.total_watch_time + watch_duration;

        // Update average completion rate
        if (content.total_streams > 0) {
            let total_completion = (content.average_completion_rate * (content.total_streams - 1)) + completion;
            content.average_completion_rate = total_completion / content.total_streams;
        };

        // Update registry
        registry.total_streams = registry.total_streams + 1;

        // Create session record
        let session_id = object::new(ctx);
        let session_id_copy = object::uid_to_inner(&session_id);

        let session = StreamSession {
            id: session_id,
            content_id: object::uid_to_inner(&content.id),
            viewer: tx_context::sender(ctx),
            start_time: tx_context::epoch_timestamp_ms(ctx),
            watch_duration,
            completion_percentage: completion,
            quality_level,
        };

        event::emit(StreamTracked {
            session_id: session_id_copy,
            content_id: object::uid_to_inner(&content.id),
            viewer: tx_context::sender(ctx),
            watch_duration,
            completion_percentage: completion,
        });

        // Transfer session to viewer (for watch history)
        transfer::transfer(session, tx_context::sender(ctx));
    }

    /// Rate content (1-5 stars)
    public entry fun rate_content(
        content: &mut ContentItem,
        rating: u64,
        ctx: &mut TxContext
    ) {
        assert!(rating >= 1 && rating <= 5, EInvalidRating);
        assert!(content.status == STATUS_ACTIVE, EContentNotActive);

        content.rating_sum = content.rating_sum + rating;
        content.rating_count = content.rating_count + 1;

        let new_average = content.rating_sum / content.rating_count;

        event::emit(ContentRated {
            content_id: object::uid_to_inner(&content.id),
            rater: tx_context::sender(ctx),
            rating,
            new_average,
        });
    }

    /// Add content to featured list (admin only)
    public entry fun add_to_featured(
        _admin_cap: &AdminCap,
        registry: &mut ContentRegistry,
        content_id: ID,
        _ctx: &mut TxContext
    ) {
        vector::push_back(&mut registry.featured_ids, content_id);
    }

    /// Remove from featured list (admin only)
    public entry fun remove_from_featured(
        _admin_cap: &AdminCap,
        registry: &mut ContentRegistry,
        content_id: ID,
        _ctx: &mut TxContext
    ) {
        let (found, index) = vector::index_of(&registry.featured_ids, &content_id);
        if (found) {
            vector::remove(&mut registry.featured_ids, index);
        };
    }

    // ===== View Functions =====

    /// Get average rating
    public fun get_average_rating(content: &ContentItem): u64 {
        if (content.rating_count == 0) {
            return 0
        };
        content.rating_sum / content.rating_count
    }

    /// Check if content is active
    public fun is_active(content: &ContentItem): bool {
        content.status == STATUS_ACTIVE
    }

    // ===== Test-only Functions =====

    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) {
        init(ctx);
    }
}
