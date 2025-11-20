// Copyright (c) Blockbuster
// SPDX-License-Identifier: MIT

#[test_only]
module blockbuster::revenue_pool_tests {
    use sui::test_scenario::{Self as ts};
    use sui::coin::{Self};
    use sui::sui::SUI;
    use blockbuster::revenue_pool::{Self, RevenuePool, UploaderAccount};

    const ADMIN: address = @0xAD;
    const CREATOR1: address = @0xC1;
    const CREATOR2: address = @0xC2;

    #[test]
    fun test_initialization() {
        let mut scenario = ts::begin(ADMIN);

        {
            revenue_pool::init_for_testing(ts::ctx(&mut scenario));
        };

        ts::next_tx(&mut scenario, ADMIN);
        {
            assert!(ts::has_most_recent_shared<RevenuePool>(), 0);
        };

        ts::end(scenario);
    }

    #[test]
    fun test_register_uploader() {
        let mut scenario = ts::begin(ADMIN);

        {
            revenue_pool::init_for_testing(ts::ctx(&mut scenario));
        };

        ts::next_tx(&mut scenario, CREATOR1);
        {
            revenue_pool::register_uploader(ts::ctx(&mut scenario));
        };

        ts::next_tx(&mut scenario, CREATOR1);
        {
            assert!(ts::has_most_recent_for_address<UploaderAccount>(CREATOR1), 1);
        };

        ts::end(scenario);
    }

    #[test]
    fun test_collect_fees() {
        let mut scenario = ts::begin(ADMIN);

        {
            revenue_pool::init_for_testing(ts::ctx(&mut scenario));
        };

        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut pool = ts::take_shared<RevenuePool>(&scenario);
            let payment = coin::mint_for_testing<SUI>(1000_000_000_000, ts::ctx(&mut scenario)); // 1000 SUI

            revenue_pool::collect_fees(&mut pool, payment, ts::ctx(&mut scenario));

            ts::return_shared(pool);
        };

        ts::end(scenario);
    }

    #[test]
    fun test_weighted_scoring() {
        let mut scenario = ts::begin(ADMIN);

        {
            revenue_pool::init_for_testing(ts::ctx(&mut scenario));
        };

        // Register creator
        ts::next_tx(&mut scenario, CREATOR1);
        {
            revenue_pool::register_uploader(ts::ctx(&mut scenario));
        };

        // Update metrics with high completion (90%)
        ts::next_tx(&mut scenario, CREATOR1);
        {
            let mut pool = ts::take_shared<RevenuePool>(&scenario);
            let mut account = ts::take_from_address<UploaderAccount>(&scenario, CREATOR1);

            revenue_pool::update_stream_metrics(
                &mut pool,
                &mut account,
                5400, // 90 minutes watched
                6000, // 100 minutes total (90% completion)
                ts::ctx(&mut scenario)
            );

            ts::return_shared(pool);
            ts::return_to_address(CREATOR1, account);
        };

        ts::end(scenario);
    }
}
