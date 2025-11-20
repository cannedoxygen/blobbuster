// Copyright (c) Blockbuster
// SPDX-License-Identifier: MIT

#[test_only]
module blockbuster::membership_tests {
    use sui::test_scenario::{Self as ts};
    use sui::coin::{Self};
    use sui::sui::SUI;
    use blockbuster::membership::{Self, MemberRegistry, MembershipNFT, AdminCap};

    const ADMIN: address = @0xAD;
    const USER1: address = @0xB1;
    const USER2: address = @0xB2;

    #[test]
    fun test_initialization() {
        let mut scenario = ts::begin(ADMIN);

        // Initialize membership system
        {
            membership::init_for_testing(ts::ctx(&mut scenario));
        };

        // Check admin cap and registry created
        ts::next_tx(&mut scenario, ADMIN);
        {
            assert!(ts::has_most_recent_for_address<AdminCap>(ADMIN), 0);
            assert!(ts::has_most_recent_shared<MemberRegistry>(), 1);
        };

        ts::end(scenario);
    }

    #[test]
    fun test_mint_basic_membership() {
        let mut scenario = ts::begin(ADMIN);

        // Initialize
        {
            membership::init_for_testing(ts::ctx(&mut scenario));
        };

        // USER1 mints Basic membership
        ts::next_tx(&mut scenario, USER1);
        {
            let mut registry = ts::take_shared<MemberRegistry>(&scenario);
            let payment = coin::mint_for_testing<SUI>(100_000_000_000, ts::ctx(&mut scenario));

            membership::mint_membership(
                &mut registry,
                1, // Basic tier
                30, // 30 days
                payment,
                ts::ctx(&mut scenario)
            );

            ts::return_shared(registry);
        };

        // Verify NFT created
        ts::next_tx(&mut scenario, USER1);
        {
            assert!(ts::has_most_recent_for_address<MembershipNFT>(USER1), 2);
        };

        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = membership::EInsufficientPayment)]
    fun test_mint_membership_insufficient_payment() {
        let mut scenario = ts::begin(ADMIN);

        {
            membership::init_for_testing(ts::ctx(&mut scenario));
        };

        ts::next_tx(&mut scenario, USER1);
        {
            let mut registry = ts::take_shared<MemberRegistry>(&scenario);
            let payment = coin::mint_for_testing<SUI>(50_000_000_000, ts::ctx(&mut scenario)); // Only 50 SUI

            membership::mint_membership(
                &mut registry,
                1, // Basic tier (requires 100 SUI)
                30,
                payment,
                ts::ctx(&mut scenario)
            );

            ts::return_shared(registry);
        };

        ts::end(scenario);
    }

    #[test]
    fun test_record_stream_usage() {
        let mut scenario = ts::begin(ADMIN);

        // Initialize and mint
        {
            membership::init_for_testing(ts::ctx(&mut scenario));
        };

        ts::next_tx(&mut scenario, USER1);
        {
            let mut registry = ts::take_shared<MemberRegistry>(&scenario);
            let payment = coin::mint_for_testing<SUI>(100_000_000_000, ts::ctx(&mut scenario));

            membership::mint_membership(&mut registry, 1, 30, payment, ts::ctx(&mut scenario));
            ts::return_shared(registry);
        };

        // Record usage
        ts::next_tx(&mut scenario, USER1);
        {
            let mut nft = ts::take_from_address<MembershipNFT>(&scenario, USER1);

            membership::record_stream_usage(&mut nft, 3600, ts::ctx(&mut scenario)); // 1 hour

            ts::return_to_address(USER1, nft);
        };

        ts::end(scenario);
    }
}
