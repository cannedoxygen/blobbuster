// Copyright (c) Blockbuster
// SPDX-License-Identifier: MIT

/// Revenue Pool module: 70/30 split with weighted scoring
///
/// Manages subscription revenue collection and distribution to content creators.
/// Uses weighted scoring algorithm where creators earn more for high-completion content.
module blockbuster::revenue_pool {
    use sui::object::{Self, UID, ID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::coin::{Self, Coin};
    use sui::balance::{Self, Balance};
    use sui::sui::SUI;
    use sui::event;

    // ===== Error Codes =====

    const ENoPendingEarnings: u64 = 100;
    const EInvalidDistribution: u64 = 101;
    const EInsufficientPoolBalance: u64 = 102;
    const ENotUploader: u64 = 103;
    const EInvalidCompletionRate: u64 = 104;

    // ===== Constants =====

    const OPERATOR_FEE_BPS: u64 = 3000;  // 30% = 3000 basis points
    const BPS_DENOMINATOR: u64 = 10000;

    // Completion multipliers (in basis points for precision)
    const MULTIPLIER_HIGH: u64 = 150;    // 1.5x for 80-100% completion
    const MULTIPLIER_MEDIUM: u64 = 125;  // 1.25x for 50-79% completion
    const MULTIPLIER_LOW: u64 = 100;     // 1.0x for 0-49% completion

    const COMPLETION_THRESHOLD_HIGH: u64 = 80;
    const COMPLETION_THRESHOLD_MEDIUM: u64 = 50;

    // ===== Structs =====

    /// Global revenue pool collecting all subscription fees
    public struct RevenuePool has key {
        id: UID,
        balance: Balance<SUI>,
        operator_fee_bps: u64,
        total_collected: u64,
        operator_share: u64,
        creator_share: u64,
        pending_distribution: u64,
        last_distribution_epoch: u64,
        platform_wallet: address,
    }

    /// Uploader account tracking creator earnings
    public struct UploaderAccount has key, store {
        id: UID,
        creator: address,
        total_streams: u64,
        total_watch_time: u64,
        weighted_score: u64,
        lifetime_earnings: u64,
        pending_earnings: u64,
        registration_epoch: u64,
        is_active: bool,
    }

    // ===== Events =====

    public struct UploaderRegistered has copy, drop {
        account_id: ID,
        creator: address,
        timestamp: u64,
    }

    public struct RevenueCollected has copy, drop {
        amount: u64,
        operator_amount: u64,
        creator_amount: u64,
    }

    public struct RewardDistributed has copy, drop {
        uploader_id: ID,
        amount: u64,
        epoch: u64,
    }

    public struct EarningsClaimed has copy, drop {
        uploader_id: ID,
        creator: address,
        amount: u64,
    }

    // ===== Initialization =====

    fun init(ctx: &mut TxContext) {
        let pool = RevenuePool {
            id: object::new(ctx),
            balance: balance::zero(),
            operator_fee_bps: OPERATOR_FEE_BPS,
            total_collected: 0,
            operator_share: 0,
            creator_share: 0,
            pending_distribution: 0,
            last_distribution_epoch: 0,
            platform_wallet: tx_context::sender(ctx),
        };

        transfer::share_object(pool);
    }

    // ===== Public Functions =====

    /// Register as content uploader
    public entry fun register_uploader(ctx: &mut TxContext) {
        let account_id = object::new(ctx);
        let account_id_copy = object::uid_to_inner(&account_id);

        let account = UploaderAccount {
            id: account_id,
            creator: tx_context::sender(ctx),
            total_streams: 0,
            total_watch_time: 0,
            weighted_score: 0,
            lifetime_earnings: 0,
            pending_earnings: 0,
            registration_epoch: tx_context::epoch_timestamp_ms(ctx),
            is_active: true,
        };

        event::emit(UploaderRegistered {
            account_id: account_id_copy,
            creator: tx_context::sender(ctx),
            timestamp: tx_context::epoch_timestamp_ms(ctx),
        });

        transfer::transfer(account, tx_context::sender(ctx));
    }

    /// Collect membership fees (called by membership contract)
    public fun collect_fees(
        pool: &mut RevenuePool,
        payment: Coin<SUI>,
        _ctx: &mut TxContext
    ) {
        let amount = coin::value(&payment);

        // Split 70/30
        let operator_amount = (amount * pool.operator_fee_bps) / BPS_DENOMINATOR;
        let creator_amount = amount - operator_amount;

        // Update pool
        pool.total_collected = pool.total_collected + amount;
        pool.operator_share = pool.operator_share + operator_amount;
        pool.creator_share = pool.creator_share + creator_amount;
        pool.pending_distribution = pool.pending_distribution + creator_amount;

        // Add to pool balance
        let payment_balance = coin::into_balance(payment);
        balance::join(&mut pool.balance, payment_balance);

        event::emit(RevenueCollected {
            amount,
            operator_amount,
            creator_amount,
        });
    }

    /// Update stream metrics with weighted scoring
    public entry fun update_stream_metrics(
        pool: &mut RevenuePool,
        uploader: &mut UploaderAccount,
        watch_duration: u64,
        content_duration: u64,
        ctx: &mut TxContext
    ) {
        // Verify uploader ownership
        assert!(uploader.creator == tx_context::sender(ctx), ENotUploader);

        // Calculate completion percentage (0-100)
        let completion_rate = if (content_duration > 0) {
            (watch_duration * 100) / content_duration
        } else {
            0
        };

        assert!(completion_rate <= 100, EInvalidCompletionRate);

        // Apply weighted multiplier
        let multiplier = get_completion_multiplier(completion_rate);

        // Calculate weighted score
        let base_score = watch_duration;
        let weighted_score = (base_score * multiplier) / 100;

        // Update uploader stats
        uploader.total_streams = uploader.total_streams + 1;
        uploader.total_watch_time = uploader.total_watch_time + watch_duration;
        uploader.weighted_score = uploader.weighted_score + weighted_score;
    }

    /// Distribute reward to uploader (called by backend weekly cron)
    public entry fun distribute_reward(
        pool: &mut RevenuePool,
        uploader: &mut UploaderAccount,
        amount: u64,
        ctx: &mut TxContext
    ) {
        // Validate amount
        assert!(amount > 0, EInvalidDistribution);
        assert!(amount <= pool.pending_distribution, EInsufficientPoolBalance);

        // Deduct from pool
        pool.pending_distribution = pool.pending_distribution - amount;

        // Update uploader
        uploader.pending_earnings = uploader.pending_earnings + amount;
        uploader.lifetime_earnings = uploader.lifetime_earnings + amount;

        // Reset weekly score (for next cycle)
        uploader.weighted_score = 0;

        // Update last distribution epoch
        pool.last_distribution_epoch = tx_context::epoch_timestamp_ms(ctx);

        event::emit(RewardDistributed {
            uploader_id: object::uid_to_inner(&uploader.id),
            amount,
            epoch: tx_context::epoch_timestamp_ms(ctx),
        });
    }

    /// Claim pending earnings (uploader withdraws to wallet)
    public entry fun claim_earnings(
        pool: &mut RevenuePool,
        uploader: &mut UploaderAccount,
        ctx: &mut TxContext
    ) {
        // Verify ownership
        assert!(uploader.creator == tx_context::sender(ctx), ENotUploader);

        let amount = uploader.pending_earnings;
        assert!(amount > 0, ENoPendingEarnings);

        // Reset pending
        uploader.pending_earnings = 0;

        // Extract coins from pool balance
        let payout_balance = balance::split(&mut pool.balance, amount);
        let payout_coin = coin::from_balance(payout_balance, ctx);

        event::emit(EarningsClaimed {
            uploader_id: object::uid_to_inner(&uploader.id),
            creator: uploader.creator,
            amount,
        });

        // Transfer to uploader
        transfer::public_transfer(payout_coin, uploader.creator);
    }

    /// Withdraw platform share (operator only)
    public entry fun withdraw_operator_share(
        pool: &mut RevenuePool,
        amount: u64,
        ctx: &mut TxContext
    ) {
        // Only platform wallet can withdraw
        assert!(tx_context::sender(ctx) == pool.platform_wallet, ENotUploader);
        assert!(amount <= pool.operator_share, EInsufficientPoolBalance);

        // Deduct from operator share
        pool.operator_share = pool.operator_share - amount;

        // Extract and transfer
        let withdrawal_balance = balance::split(&mut pool.balance, amount);
        let withdrawal_coin = coin::from_balance(withdrawal_balance, ctx);

        transfer::public_transfer(withdrawal_coin, pool.platform_wallet);
    }

    // ===== View Functions =====

    /// Calculate uploader's share of creator pool
    public fun calculate_uploader_share(
        uploader: &UploaderAccount,
        platform_total_score: u64,
        creator_pool: u64
    ): u64 {
        if (platform_total_score == 0) {
            return 0
        };

        (uploader.weighted_score * creator_pool) / platform_total_score
    }

    /// Get completion multiplier based on watch percentage
    fun get_completion_multiplier(completion_rate: u64): u64 {
        if (completion_rate >= COMPLETION_THRESHOLD_HIGH) {
            MULTIPLIER_HIGH
        } else if (completion_rate >= COMPLETION_THRESHOLD_MEDIUM) {
            MULTIPLIER_MEDIUM
        } else {
            MULTIPLIER_LOW
        }
    }

    // ===== Test-only Functions =====

    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) {
        init(ctx);
    }
}
