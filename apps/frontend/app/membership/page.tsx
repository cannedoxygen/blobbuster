'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useCurrentAccount, useSignAndExecuteTransactionBlock } from '@mysten/dapp-kit';
import { TransactionBlock } from '@mysten/sui.js/transactions';
import Header from '@/components/Header';

// Single-tier membership page - $5/month
export default function MembershipPage() {
  const { isAuthenticated, accessToken } = useAuth();
  const currentAccount = useCurrentAccount();
  const { mutateAsync: signAndExecuteTransactionBlock } = useSignAndExecuteTransactionBlock();
  const [duration, setDuration] = useState(30);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentMembership, setCurrentMembership] = useState<any>(null);
  const [isLoadingMembership, setIsLoadingMembership] = useState(true);
  const [nftImageUrl, setNftImageUrl] = useState<string | null>(null);
  const [suiPrice, setSuiPrice] = useState<number | null>(null);
  const [isLoadingPrice, setIsLoadingPrice] = useState(true);

  // Referral code state (for entering when purchasing)
  const [referralCode, setReferralCode] = useState('');
  const [referralValid, setReferralValid] = useState<boolean | null>(null);
  const [referralProvider, setReferralProvider] = useState<string | null>(null);

  // Provider referral stats (for displaying user's own code if they're a provider)
  const [isProvider, setIsProvider] = useState(false);
  const [myReferralCode, setMyReferralCode] = useState<string | null>(null);
  const [myReferralCount, setMyReferralCount] = useState<number>(0);
  const [codeCopied, setCodeCopied] = useState(false);

  const PRICE_PER_MONTH_USD = 5;

  // Convert IPFS URL to HTTP gateway URL
  const convertIpfsUrl = (url: string): string => {
    if (url.startsWith('ipfs://')) {
      const cid = url.replace('ipfs://', '');
      // Use Pinata gateway (faster and more reliable)
      return `https://gateway.pinata.cloud/ipfs/${cid}`;
    }
    return url;
  };

  // Calculate SUI amount based on USD price and live SUI price
  const calculateSuiAmount = (usdAmount: number) => {
    if (!suiPrice) return 0;
    return usdAmount / suiPrice;
  };

  // Calculate price with discounts applied
  const calculatePrice = (days: number) => {
    const months = days / 30;
    const baseUsdPrice = PRICE_PER_MONTH_USD * months;
    let discount = 0;

    if (days === 90) discount = 0.05;  // 5% off for 3 months
    else if (days === 180) discount = 0.08; // 8% off for 6 months
    else if (days === 365) discount = 0.10; // 10% off for 1 year

    const finalUsdPrice = baseUsdPrice * (1 - discount);
    return calculateSuiAmount(finalUsdPrice);
  };

  // Fetch live SUI price from CoinGecko
  useEffect(() => {
    const fetchSuiPrice = async () => {
      try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=sui&vs_currencies=usd');
        const data = await response.json();
        if (data.sui && data.sui.usd) {
          setSuiPrice(data.sui.usd);
          console.log('[Membership] Live SUI price:', data.sui.usd);
        }
      } catch (err) {
        console.error('Failed to fetch SUI price:', err);
        // Fallback to default if API fails
        setSuiPrice(2.0); // Default fallback
      } finally {
        setIsLoadingPrice(false);
      }
    };

    fetchSuiPrice();
    // Refresh price every 60 seconds
    const interval = setInterval(fetchSuiPrice, 60000);
    return () => clearInterval(interval);
  }, []);

  // Fetch existing membership on load
  React.useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      setIsLoadingMembership(false);
      return;
    }

    const fetchMembership = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/membership/user/me`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });
        const data = await response.json();
        if (data.success && data.hasMembership) {
          setCurrentMembership(data.membership);
        }
      } catch (err) {
        console.error('Failed to fetch membership:', err);
      } finally {
        setIsLoadingMembership(false);
      }
    };

    fetchMembership();
  }, [isAuthenticated, accessToken]);

  // Check if user is a provider and fetch their referral stats
  React.useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      return;
    }

    const fetchProviderStats = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/upload/analytics`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });
        const data = await response.json();
        if (data.success && data.analytics) {
          setIsProvider(true);
          setMyReferralCode(data.analytics.referralCode);
          setMyReferralCount(data.analytics.referralCount || 0);
        }
      } catch (err) {
        // User is not a provider, that's okay
        setIsProvider(false);
      }
    };

    fetchProviderStats();
  }, [isAuthenticated, accessToken]);

  // Auto-fill referral code from URL parameter
  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');

    if (refCode && refCode.length === 5) {
      const upperCode = refCode.toUpperCase();
      setReferralCode(upperCode);
      validateReferralCode(upperCode);
    }
  }, []);

  // Use NFT card image from backend (already stored when membership was created)
  React.useEffect(() => {
    if (!currentMembership) return;

    // Use activeCardUrl if membership is active, otherwise use expiredCardUrl
    const cardUrl = currentMembership.isActive
      ? currentMembership.activeCardUrl
      : currentMembership.expiredCardUrl;

    if (cardUrl) {
      console.log('Using card URL from backend:', cardUrl);
      const httpUrl = convertIpfsUrl(cardUrl);
      console.log('Converted to HTTP:', httpUrl);
      setNftImageUrl(httpUrl);
    }
  }, [currentMembership]);

  // Copy referral link to clipboard
  const handleCopyLink = async () => {
    if (!myReferralCode) return;
    const referralLink = `${window.location.origin}/membership?ref=${myReferralCode}`;
    try {
      await navigator.clipboard.writeText(referralLink);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Validate referral code
  const validateReferralCode = async (code: string) => {
    if (code.length !== 5) {
      setReferralValid(null);
      setReferralProvider(null);
      return;
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/referral/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.toUpperCase() }),
      });
      const data = await response.json();

      if (data.valid) {
        setReferralValid(true);
        setReferralProvider(data.provider?.username || 'Provider');
      } else {
        setReferralValid(false);
        setReferralProvider(null);
      }
    } catch (error) {
      console.error('Failed to validate referral code:', error);
      setReferralValid(false);
      setReferralProvider(null);
    }
  };

  const handlePurchase = async () => {
    if (!isAuthenticated || !accessToken) {
      setError('Please sign in to purchase a membership');
      return;
    }

    if (!currentAccount) {
      setError('Please connect your Sui wallet');
      return;
    }

    if (!signAndExecuteTransactionBlock) {
      setError('Wallet does not support transaction signing');
      return;
    }

    setError(null);
    setSuccess(null);
    setIsPurchasing(true);

    try {
      // Step 1: Generate personalized NFT cards
      console.log('Generating personalized membership cards...');
      const prepareResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/membership/prepare`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!prepareResponse.ok) {
        const errorData = await prepareResponse.json();
        throw new Error(errorData.error || 'Failed to generate membership cards');
      }

      const cardData = await prepareResponse.json();
      console.log('Cards generated:', cardData);

      // Step 2: Build transaction with personalized card URL
      const tx = new TransactionBlock();

      // Set gas price to meet network requirements
      tx.setGasPrice(1000); // Set to reference gas price

      const MEMBERSHIP_PACKAGE = process.env.NEXT_PUBLIC_MEMBERSHIP_PACKAGE!;
      const MEMBER_REGISTRY = process.env.NEXT_PUBLIC_MEMBER_REGISTRY!;

      // Calculate price with discount applied
      const priceInSUI = calculatePrice(duration);
      const priceInMIST = Math.floor(priceInSUI * 1_000_000_000); // Convert SUI to MIST

      // Split coins for payment (user pays from their wallet)
      const [coin] = tx.splitCoins(tx.gas, [priceInMIST]);

      // Call mint_membership with personalized card URL
      tx.moveCall({
        target: `${MEMBERSHIP_PACKAGE}::membership::mint_membership`,
        arguments: [
          tx.object(MEMBER_REGISTRY),
          tx.pure.u64(duration),
          tx.pure.string(cardData.activeCardUrl), // Personalized card URL
          coin,
        ],
      });

      console.log('Signing transaction with user wallet...');

      // User signs and executes with THEIR wallet (they pay)
      const result = await signAndExecuteTransactionBlock({
        transactionBlock: tx,
        options: {
          showEffects: true,
          showObjectChanges: true,
        },
      });

      console.log('Transaction executed:', result);

      // IMPORTANT: Check if NFT was created first - this is the source of truth
      const createdObject = result.objectChanges?.find(
        (c: any) => c.type === 'created' && c.objectType?.includes('MembershipNFT')
      ) as any;
      const nftId = createdObject?.objectId;

      if (!nftId) {
        console.error('No NFT found in object changes:', result.objectChanges);
        console.error('Transaction effects:', result.effects);
        throw new Error('NFT was not created. Please check your wallet for the NFT and contact support.');
      }

      console.log('✅ NFT created successfully:', nftId);

      console.log('NFT created:', nftId);

      // Send transaction digest to backend to save in database
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/membership/confirm`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            txDigest: result.digest,
            nftId,
            durationDays: duration,
            activeCardUrl: cardData.activeCardUrl,
            expiredCardUrl: cardData.expiredCardUrl,
            activeCardBlobId: cardData.activeCardBlobId,
            expiredCardBlobId: cardData.expiredCardBlobId,
            referralCode: referralCode && referralValid ? referralCode.toUpperCase() : undefined,
          }),
        });

        const data = await response.json();

        if (!data.success) {
          // Transaction succeeded but backend confirmation failed
          // Still show success to user since they have the NFT
          console.warn('Backend confirmation failed:', data.error);
          setSuccess(
            `Transaction successful! Your NFT is in your wallet.\n` +
            `NFT ID: ${nftId}\n` +
            `Please refresh the page or contact support if your membership doesn't appear.`
          );
          return;
        }

        setSuccess(`Success! You are now Member #${data.membership.memberNumber}`);
        console.log('Membership confirmed:', data);

        // Refresh membership display
        setCurrentMembership(data.membership);
      } catch (backendError) {
        // Backend is down but transaction succeeded
        console.error('Backend confirmation error:', backendError);
        setSuccess(
          `Transaction successful! Your NFT is in your wallet.\n` +
          `NFT ID: ${nftId}\n` +
          `Please refresh the page in a moment. If your membership doesn't appear, contact support with this NFT ID.`
        );
      }
    } catch (err: any) {
      console.error('Purchase failed:', err);
      const errorMsg = err.message || 'Failed to purchase membership';
      setError(errorMsg);
    } finally {
      setIsPurchasing(false);
    }
  };

  const membership = {
    name: 'BLOBBUSTER MEMBERSHIP',
    priceUSD: PRICE_PER_MONTH_USD,
    priceSUI: suiPrice ? calculateSuiAmount(PRICE_PER_MONTH_USD) : 0,
    features: [
      'Unlimited streaming access',
      'HD & 4K quality options',
      'Support providers directly',
      'Retro BlobBuster card NFT',
      'Dynamic card (changes when expired)',
      'Unique member number',
      'Tradeable & transferable',
    ],
  };

  return (
    <div className="min-h-screen">
      <Header />

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-5xl mx-auto">
          {/* Single Title */}
          <div className="text-center mb-12">
            <h1 className="text-5xl md:text-6xl font-heading text-blobbuster-gold mb-4">
              {currentMembership ? 'YOUR MEMBERSHIP' : 'MEMBERSHIP'}
            </h1>
          </div>

          {/* Current Membership Display */}
          {currentMembership && (
            <div className="mb-12">
              {/* Flex Container: NFT on left, Data on right */}
              <div className="flex flex-col lg:flex-row gap-8">
                {/* LEFT: NFT Card - Square */}
                <div className="w-full lg:w-1/2">
                  <div className="blobbuster-card rounded-2xl p-2 aspect-square">
                    <div className="relative h-full">
                      <div className="rounded-xl overflow-hidden shadow-2xl bg-blobbuster-gold h-full p-4 flex items-center justify-center">
                        {nftImageUrl ? (
                          <img
                            src={nftImageUrl}
                            alt={`Membership Card #${currentMembership.memberNumber}`}
                            className="w-full h-full object-contain rounded-lg"
                            onError={(e) => {
                              console.error('Failed to load NFT image:', nftImageUrl);
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full bg-blobbuster-navy rounded-lg flex items-center justify-center">
                            <div className="text-center">
                              <div className="text-6xl mb-4">🎬</div>
                              <div className="text-blobbuster-gold font-heading text-2xl">
                                Member #{String(currentMembership.memberNumber).padStart(6, '0')}
                              </div>
                              <div className="text-gray-400 text-sm mt-2">Loading card...</div>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className={`absolute top-6 right-6 px-4 py-2 rounded-full font-bold text-sm shadow-xl ${
                        currentMembership.isActive ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                      }`}>
                        {currentMembership.isActive ? '✓ ACTIVE' : '✗ EXPIRED'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* RIGHT: All Data - Same height as NFT, evenly spaced */}
                <div className="w-full lg:w-1/2 flex flex-col justify-between aspect-square">
                  {/* Info Grid - 3 Stats */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="blobbuster-card rounded-lg p-4 text-center flex flex-col justify-center">
                      <div className="text-gray-400 text-xs font-bold uppercase mb-2">Member #</div>
                      <div className="text-2xl font-black text-blobbuster-gold">
                        #{String(currentMembership.memberNumber).padStart(6, '0')}
                      </div>
                    </div>

                    <div className="blobbuster-card rounded-lg p-4 text-center flex flex-col justify-center">
                      <div className="text-gray-400 text-xs font-bold uppercase mb-2">Status</div>
                      <div className={`text-2xl font-black ${currentMembership.isActive ? 'text-green-400' : 'text-red-400'}`}>
                        {currentMembership.isActive ? 'Active' : 'Expired'}
                      </div>
                    </div>

                    <div className="blobbuster-card rounded-lg p-4 text-center flex flex-col justify-center">
                      <div className="text-gray-400 text-xs font-bold uppercase mb-2">Expires</div>
                      <div className="text-sm font-bold text-white">
                        {new Date(currentMembership.expiresAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </div>
                    </div>
                  </div>

                  {/* NFT ID Container */}
                  <div className="blobbuster-card rounded-lg p-4 flex flex-col justify-center">
                    <div className="text-gray-400 text-xs font-bold uppercase mb-2">NFT Object ID</div>
                    <div className="text-neon-cyan font-mono text-xs break-all line-clamp-2">
                      {currentMembership.nftId}
                    </div>
                  </div>

                  {/* Provider Referral Stats */}
                  {isProvider && myReferralCode && (
                    <div className="blobbuster-card rounded-lg p-4 bg-gradient-to-br from-blobbuster-gold/5 to-yellow-700/5 flex items-center justify-center">
                      <div className="flex items-center justify-between gap-3 w-full">
                        <div className="flex items-center gap-3">
                          <div className="text-3xl">🎯</div>
                          <div>
                            <div className="text-xs text-gray-400 uppercase font-bold">Referral Code</div>
                            <div className="text-2xl font-black text-blobbuster-gold tracking-wider font-mono">
                              {myReferralCode}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={handleCopyLink}
                            className="px-4 py-3 bg-neon-cyan/20 hover:bg-neon-cyan/30 border border-neon-cyan/50 rounded-lg text-sm font-bold transition"
                          >
                            {codeCopied ? '✓' : '📋'}
                          </button>
                          <div className="text-center">
                            <div className="text-2xl font-black text-neon-cyan">{myReferralCount}</div>
                            <div className="text-xs text-gray-400">Refs</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Active Benefits or Renewal */}
                  {currentMembership.isActive ? (
                    <div className="blobbuster-card rounded-lg p-4 bg-gradient-to-br from-green-900/10 to-green-800/10 flex items-center justify-center">
                      <div className="flex items-center justify-between gap-3 w-full">
                        <div className="flex items-center gap-3">
                          <div className="text-3xl">🎬</div>
                          <div>
                            <div className="text-xs text-gray-400 uppercase font-bold">Membership</div>
                            <div className="text-lg font-black text-green-400">Unlimited Streaming</div>
                          </div>
                        </div>
                        <div className="text-xs text-gray-300 font-bold text-right">
                          <div>✓ HD & 4K</div>
                          <div>✓ All Content</div>
                          <div>✓ 70% to Providers</div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="blobbuster-card rounded-lg p-4 bg-gradient-to-br from-red-900/10 to-red-800/10 flex items-center justify-center">
                      <div className="flex items-center justify-between gap-3 w-full">
                        <div className="flex items-center gap-3">
                          <div className="text-3xl">⚠️</div>
                          <div>
                            <div className="text-xs text-gray-400 uppercase font-bold">Membership</div>
                            <div className="text-lg font-black text-red-400">Expired</div>
                          </div>
                        </div>
                        <button
                          onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}
                          className="px-6 py-3 btn-primary rounded-lg font-bold text-sm transition"
                        >
                          Renew
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {!currentMembership && !isLoadingMembership && (
          <>
          {/* Membership Card - Single Option */}
          <div className="mb-12">
            <div className="bg-gradient-to-br from-blue-900 via-blue-800 to-yellow-600 rounded-lg p-1 shadow-2xl">
              <div className="bg-blobbuster-navy rounded-lg p-8">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <div className="text-neon-cyan text-sm font-bold mb-2 uppercase tracking-wide">
                      Monthly Membership
                    </div>
                    <h2 className="text-3xl font-heading text-blobbuster-gold mb-2">
                      {membership.name}
                    </h2>
                    <p className="text-gray-400 text-sm">
                      Simple monthly membership - No tiers, no limits
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-4xl font-bold text-blobbuster-gold">
                      ${membership.priceUSD}
                    </div>
                    <div className="text-sm text-gray-400">
                      {isLoadingPrice ? 'Loading...' : `${membership.priceSUI.toFixed(2)} SUI/mo`}
                    </div>
                  </div>
                </div>

                <div className="border-t border-neon-cyan/20 pt-6 mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {membership.features.map((feature, idx) => (
                      <div key={idx} className="flex items-start">
                        <span className="text-neon-cyan mr-2 text-lg">✓</span>
                        <span className="text-gray-300">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-blobbuster-gold/10 border border-blobbuster-gold/30 rounded p-4 text-center">
                  <p className="text-blobbuster-gold font-bold">
                    You'll receive a retro BlobBuster membership card NFT
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    Card design changes when expired - just like the old days!
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Duration Selector */}
          <div className="max-w-2xl mx-auto mb-8">
            <div className="bg-blobbuster-navy/50 rounded-lg p-6 border border-neon-cyan/20">
              <h3 className="text-xl font-bold mb-4">Select Duration</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { days: 30, label: '1 Month' },
                  { days: 90, label: '3 Months', discount: '5% off' },
                  { days: 180, label: '6 Months', discount: '8% off' },
                  { days: 365, label: '1 Year', discount: '10% off' },
                ].map((option) => (
                  <button
                    key={option.days}
                    onClick={() => setDuration(option.days)}
                    className={`p-4 rounded border-2 transition ${
                      duration === option.days
                        ? 'border-blobbuster-gold bg-blobbuster-gold/10'
                        : 'border-gray-700 hover:border-blobbuster-gold'
                    }`}
                  >
                    <div className="font-bold">{option.label}</div>
                    {option.discount && (
                      <div className="text-xs text-blobbuster-gold mt-1">
                        {option.discount}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Purchase Summary */}
          <div className="max-w-2xl mx-auto">
            <div className="bg-blobbuster-navy/70 rounded-lg p-8 border-2 border-neon-cyan/30">
              <h3 className="text-2xl font-heading text-blobbuster-gold mb-6">
                Purchase Summary
              </h3>

              <div className="space-y-4 mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-400">Membership:</span>
                  <span className="font-bold">BlobBuster Monthly</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Duration:</span>
                  <span className="font-bold">{duration} days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Price per month:</span>
                  <span className="font-bold">
                    ${PRICE_PER_MONTH_USD} {isLoadingPrice ? '(loading...)' : `(${calculateSuiAmount(PRICE_PER_MONTH_USD).toFixed(2)} SUI)`}
                  </span>
                </div>
                {suiPrice && (
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Live SUI price:</span>
                    <span>${suiPrice.toFixed(3)} USD</span>
                  </div>
                )}

                {/* Referral Code Input */}
                <div className="border-t border-gray-700 pt-4">
                  <label className="block text-sm text-gray-400 mb-2">
                    Have a referral code? (Optional)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={referralCode}
                      onChange={(e) => {
                        const value = e.target.value.toUpperCase();
                        setReferralCode(value);
                        if (value.length === 5) {
                          validateReferralCode(value);
                        } else {
                          setReferralValid(null);
                          setReferralProvider(null);
                        }
                      }}
                      maxLength={5}
                      placeholder="5-CHAR"
                      className="flex-1 px-4 py-2 bg-blobbuster-navy border border-neon-cyan/20 rounded placeholder-gray-500 uppercase font-mono tracking-wider"
                      style={{ color: '#F5C518' }}
                    />
                    {referralValid === true && (
                      <div className="flex items-center text-green-400">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                    {referralValid === false && (
                      <div className="flex items-center text-red-400">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </div>
                    )}
                  </div>
                  {referralValid === true && referralProvider && (
                    <p className="text-xs text-green-400 mt-1">
                      ✓ Valid code from {referralProvider}
                    </p>
                  )}
                  {referralValid === false && (
                    <p className="text-xs text-red-400 mt-1">
                      ✗ Invalid referral code
                    </p>
                  )}
                </div>

                <div className="border-t border-gray-700 pt-4 flex justify-between text-xl">
                  <span className="font-bold">Total:</span>
                  <span className="font-bold text-blobbuster-gold">
                    {isLoadingPrice ? 'Loading...' : `${calculatePrice(duration).toFixed(2)} SUI`}
                  </span>
                </div>
              </div>

              {error && (
                <div className="mb-4 p-4 bg-red-500/20 border border-red-500 rounded text-red-200">
                  {error}
                </div>
              )}

              {success && (
                <div className="mb-4 p-4 bg-green-500/20 border border-green-500 rounded text-green-200">
                  {success}
                </div>
              )}

              <button
                onClick={handlePurchase}
                disabled={isPurchasing || !isAuthenticated || isLoadingPrice}
                className="btn-primary w-full py-4 rounded-lg text-lg transition transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPurchasing ? 'Processing...' : isLoadingPrice ? 'Loading price...' : isAuthenticated ? 'Purchase Membership' : 'Please Sign In First'}
              </button>

              <p className="text-center text-sm text-gray-400 mt-4">
                Your membership card NFT will be minted instantly
              </p>
            </div>
          </div>
          </>
          )}

          {/* Benefits Section */}
          <div className="mt-16 text-center">
            <h3 className="text-3xl font-heading text-blobbuster-gold mb-8">
              Why BlobBuster?
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="p-6">
                <div className="text-4xl mb-4">🎬</div>
                <h4 className="font-bold mb-2">Simple Pricing</h4>
                <p className="text-gray-400 text-sm">
                  $5/month. That's it. No tiers, no gimmicks, unlimited streaming.
                </p>
              </div>
              <div className="p-6">
                <div className="text-4xl mb-4">🎨</div>
                <h4 className="font-bold mb-2">NFT Membership Card</h4>
                <p className="text-gray-400 text-sm">
                  Retro BlobBuster card that you own. It even changes when expired!
                </p>
              </div>
              <div className="p-6">
                <div className="text-4xl mb-4">💰</div>
                <h4 className="font-bold mb-2">Support Creators</h4>
                <p className="text-gray-400 text-sm">
                  70% of your subscription goes directly to content creators
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
