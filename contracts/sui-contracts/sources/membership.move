// Copyright (c) Blockbuster
// SPDX-License-Identifier: MIT

/// Membership module: NFT-based access control
///
/// Simple monthly membership: $5/month (2.5 SUI)
/// - Unlimited streaming access
/// - Support content creators
/// - Retro Blockbuster card NFT that changes when expired
module blockbuster::membership {
    use sui::object::{Self, UID, ID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::event;
    use std::string::{Self, String};
    use sui::package;
    use sui::display;

    // ===== Error Codes =====

    const EInsufficientPayment: u64 = 1;
    const ENotOwner: u64 = 2;
    const EMembershipExpired: u64 = 3;
    const ENotAuthorized: u64 = 4;

    // ===== Constants =====

    // Price in MIST (1 SUI = 1_000_000_000 MIST)
    // PROMO: Jan 23 - Feb 28, 2026 - Free memberships (revert to 2_500_000_000 after)
    // Original: $5 USD ≈ 2.5 SUI = 2_500_000_000 MIST
    const MEMBERSHIP_PRICE: u64 = 1;  // Near-zero for promo period

    // ===== Structs =====

    /// One-time witness for claiming package ownership
    public struct MEMBERSHIP has drop {}

    /// Admin capability - grants platform admin privileges
    public struct AdminCap has key, store {
        id: UID
    }

    /// Global member registry - tracks all memberships
    public struct MemberRegistry has key {
        id: UID,
        admin: address,
        total_members: u64,
        total_revenue_collected: u64,
    }

    /// Membership NFT - owned by user
    /// Retro Blockbuster card that changes display when expired
    public struct MembershipNFT has key, store {
        id: UID,
        owner: address,
        member_number: u64,             // Unique member ID
        issued_at: u64,
        expires_at: u64,
        streams_used: u64,
        total_watch_time: u64,
        image_url: String,              // Dynamic: changes based on expiration
        is_transferable: bool,
    }

    // ===== Events =====

    public struct MembershipMinted has copy, drop {
        nft_id: ID,
        owner: address,
        member_number: u64,
        expires_at: u64,
    }

    public struct MembershipRenewed has copy, drop {
        nft_id: ID,
        new_expiry: u64,
    }

    public struct DisplayUpdated has copy, drop {
        nft_id: ID,
        new_image_url: String,
        is_expired: bool,
    }

    // ===== Initialization =====

    /// Initialize the membership registry (one-time setup)
    fun init(otw: MEMBERSHIP, ctx: &mut TxContext) {
        let admin_cap = AdminCap {
            id: object::new(ctx)
        };

        let registry = MemberRegistry {
            id: object::new(ctx),
            admin: tx_context::sender(ctx),
            total_members: 0,
            total_revenue_collected: 0,
        };

        // Create Display for NFT - this makes it visible in wallets
        let publisher = package::claim(otw, ctx);
        let mut display = display::new<MembershipNFT>(&publisher, ctx);

        display::add(&mut display, string::utf8(b"name"), string::utf8(b"Blockbuster Membership Card #{member_number}"));
        display::add(&mut display, string::utf8(b"description"), string::utf8(b"Official Blockbuster membership card. Unlimited streaming access. 70% to creators."));
        display::add(&mut display, string::utf8(b"image_url"), string::utf8(b"{image_url}"));
        display::add(&mut display, string::utf8(b"project_url"), string::utf8(b"https://blockbuster.streaming"));
        display::add(&mut display, string::utf8(b"creator"), string::utf8(b"Blockbuster"));

        display::update_version(&mut display);

        transfer::public_transfer(publisher, tx_context::sender(ctx));
        transfer::public_transfer(display, tx_context::sender(ctx));
        transfer::transfer(admin_cap, tx_context::sender(ctx));
        transfer::share_object(registry);
    }

    // ===== Public Functions =====

    /// Mint new membership NFT - $5/month (2.5 SUI)
    /// Note: payment is forwarded to revenue_pool in production
    /// Image URL should be the personalized card uploaded to Walrus
    public entry fun mint_membership(
        registry: &mut MemberRegistry,
        duration_days: u64,
        image_url: String,
        payment: Coin<SUI>,
        ctx: &mut TxContext
    ) {
        // Verify payment (2.5 SUI per month = 30 days)
        let payment_value = coin::value(&payment);
        assert!(payment_value >= MEMBERSHIP_PRICE, EInsufficientPayment);

        // Calculate expiry timestamp
        let now = tx_context::epoch_timestamp_ms(ctx);
        let duration_ms = duration_days * 86400 * 1000; // days to milliseconds
        let expires_at = now + duration_ms;

        // Increment member count for unique member number
        registry.total_members = registry.total_members + 1;
        let member_number = registry.total_members;

        // Create NFT with personalized card image
        let nft_id = object::new(ctx);
        let nft_id_copy = object::uid_to_inner(&nft_id);

        let nft = MembershipNFT {
            id: nft_id,
            owner: tx_context::sender(ctx),
            member_number,
            issued_at: now,
            expires_at,
            streams_used: 0,
            total_watch_time: 0,
            image_url,  // Personalized card from Walrus
            is_transferable: true,
        };

        // Update registry stats (track actual payment received)
        registry.total_revenue_collected = registry.total_revenue_collected + payment_value;

        // Emit event
        event::emit(MembershipMinted {
            nft_id: nft_id_copy,
            owner: tx_context::sender(ctx),
            member_number,
            expires_at,
        });

        // TODO: Transfer payment to revenue pool
        // For now, send to admin (in production, forward to revenue_pool)
        transfer::public_transfer(payment, registry.admin);

        // Transfer NFT to buyer
        transfer::transfer(nft, tx_context::sender(ctx));
    }

    /// Renew existing membership
    /// Image URL should be the new personalized active card
    public entry fun renew_membership(
        nft: &mut MembershipNFT,
        registry: &mut MemberRegistry,
        duration_days: u64,
        active_image_url: String,
        payment: Coin<SUI>,
        ctx: &mut TxContext
    ) {
        // Verify ownership
        assert!(nft.owner == tx_context::sender(ctx), ENotOwner);

        // Verify payment
        let payment_value = coin::value(&payment);
        assert!(payment_value >= MEMBERSHIP_PRICE, EInsufficientPayment);

        // Extend expiry
        let duration_ms = duration_days * 86400 * 1000;
        nft.expires_at = nft.expires_at + duration_ms;

        // Update to active card image
        nft.image_url = active_image_url;

        // Update registry (track actual payment received)
        registry.total_revenue_collected = registry.total_revenue_collected + payment_value;

        // Emit event
        event::emit(MembershipRenewed {
            nft_id: object::uid_to_inner(&nft.id),
            new_expiry: nft.expires_at,
        });

        // Transfer payment
        transfer::public_transfer(payment, registry.admin);
    }

    /// Update NFT display image
    /// Typically called when membership expires to show expired card
    /// new_image_url should be the personalized expired card from Walrus
    public entry fun update_nft_display(
        nft: &mut MembershipNFT,
        new_image_url: String,
        ctx: &TxContext
    ) {
        let now = tx_context::epoch_timestamp_ms(ctx);
        let is_expired = now >= nft.expires_at;

        // Update to new image
        nft.image_url = new_image_url;

        // Emit event
        event::emit(DisplayUpdated {
            nft_id: object::uid_to_inner(&nft.id),
            new_image_url,
            is_expired,
        });
    }

    /// Record stream usage (called by backend)
    public entry fun record_stream_usage(
        nft: &mut MembershipNFT,
        watch_duration: u64,
        _ctx: &mut TxContext
    ) {
        nft.streams_used = nft.streams_used + 1;
        nft.total_watch_time = nft.total_watch_time + watch_duration;
    }

    // ===== View Functions =====

    /// Check if membership is currently active
    public fun is_active(nft: &MembershipNFT, ctx: &TxContext): bool {
        let now = tx_context::epoch_timestamp_ms(ctx);
        nft.expires_at > now
    }

    // ===== Admin Functions =====

    /// Update membership transferability (admin only)
    public entry fun update_transferability(
        _admin_cap: &AdminCap,
        nft: &mut MembershipNFT,
        is_transferable: bool,
        _ctx: &mut TxContext
    ) {
        nft.is_transferable = is_transferable;
    }

    // ===== Test-only Functions =====

    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) {
        init(ctx);
    }
}
