'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { useCurrentAccount, useSignAndExecuteTransactionBlock, useSuiClient } from '@mysten/dapp-kit';
import { payForWalrusStorage, checkWalletBalance } from '@/lib/walrusPayment';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const PLATFORM_WALLET = process.env.NEXT_PUBLIC_PLATFORM_WALLET || '0x0';

interface ExtendStorageModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: {
    id: string;
    title: string;
    storage_epochs?: number;
    storage_expires_at?: string;
    posterUrl?: string;
    thumbnailUrl?: string;
  };
  onSuccess?: () => void;
}

interface CostEstimate {
  fileSize: {
    bytes: number;
    mb: number;
    encodedMB: number;
  };
  duration: {
    epochs: number;
    days: number;
  };
  costs: {
    storageWAL: number;
    uploadWAL: number;
    totalWAL: number;
    suiGas: number;
    totalSUI: number;
    totalWithGas: number;
  };
  breakdown: string[];
}

export function ExtendStorageModal({
  isOpen,
  onClose,
  content,
  onSuccess,
}: ExtendStorageModalProps) {
  const currentAccount = useCurrentAccount();
  const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransactionBlock();
  const suiClient = useSuiClient();

  const [additionalEpochs, setAdditionalEpochs] = useState(52); // Default: ~1 year
  const [sliderValue, setSliderValue] = useState(52); // Temporary value while sliding
  const [costEstimate, setCostEstimate] = useState<CostEstimate | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [isExtending, setIsExtending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentDigest, setPaymentDigest] = useState<string | null>(null);

  // Calculate expiration info
  const currentExpiration = content.storage_expires_at ? new Date(content.storage_expires_at) : null;
  const daysRemaining = currentExpiration
    ? Math.ceil((currentExpiration.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : 0;
  const newExpiration = currentExpiration
    ? new Date(currentExpiration.getTime() + sliderValue * 14 * 24 * 60 * 60 * 1000)
    : new Date(Date.now() + sliderValue * 14 * 24 * 60 * 60 * 1000);

  // Estimate file size (2GB average for movies)
  // In production, this should be stored in the database or queried from Walrus
  const ESTIMATED_FILE_SIZE_BYTES = 2 * 1024 * 1024 * 1024; // 2 GB

  // Auto-calculate cost when epochs change
  useEffect(() => {
    if (!isOpen || additionalEpochs <= 0) {
      return;
    }

    const calculateCost = async () => {
      setIsCalculating(true);
      setError(null);

      try {
        const response = await axios.post(`${API_URL}/api/walrus/estimate-cost`, {
          fileSizeBytes: ESTIMATED_FILE_SIZE_BYTES,
          epochs: additionalEpochs,
        });

        setCostEstimate(response.data.estimate);
      } catch (err: any) {
        console.error('Failed to calculate extension cost:', err);
        setError('Failed to calculate storage cost');
      } finally {
        setIsCalculating(false);
      }
    };

    calculateCost();
  }, [isOpen, additionalEpochs]);

  const handlePayment = async () => {
    if (!costEstimate || !currentAccount) {
      setError('Please connect your wallet');
      return;
    }

    setIsPaying(true);
    setError(null);

    try {
      const totalRequired = costEstimate.costs.totalWithGas;
      const balanceCheck = await checkWalletBalance(
        suiClient,
        currentAccount.address,
        totalRequired
      );

      if (!balanceCheck.hasBalance) {
        setError(
          `Insufficient balance. You have ${balanceCheck.balance.toFixed(4)} SUI but need ${balanceCheck.required.toFixed(4)} SUI`
        );
        setIsPaying(false);
        return;
      }

      const paymentResult = await payForWalrusStorage({
        totalSUI: costEstimate.costs.totalWithGas,
        recipientAddress: PLATFORM_WALLET,
        senderAddress: currentAccount.address,
        signAndExecute: signAndExecuteTransaction,
      });

      if (paymentResult.success) {
        setPaymentDigest(paymentResult.digest || null);
        setError(null);
        console.log('Payment successful:', paymentResult.digest);

        // Auto-extend storage after successful payment
        await handleExtendStorage(paymentResult.digest || '');
      } else {
        setError(`Payment failed: ${paymentResult.error}`);
      }
    } catch (err: any) {
      console.error('Payment error:', err);
      setError(err.message || 'Payment failed');
    } finally {
      setIsPaying(false);
    }
  };

  const handleExtendStorage = async (digest: string) => {
    setIsExtending(true);
    setError(null);

    try {
      const response = await axios.post(
        `${API_URL}/api/upload/extend-storage/${content.id}`,
        {
          epochs: additionalEpochs,
          paymentDigest: digest,
          paidAmount: costEstimate!.costs.totalWithGas.toString(),
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('access_token')}`,
          },
        }
      );

      if (response.data.success) {
        // Success! Close modal and refresh
        if (onSuccess) {
          onSuccess();
        }
        onClose();
      }
    } catch (err: any) {
      console.error('Extend storage error:', err);
      setError(err.response?.data?.error || 'Failed to extend storage');
    } finally {
      setIsExtending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 bg-gradient-to-br from-blobbuster-navy to-blobbuster-navy/90 border-3 border-blobbuster-yellow rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-blobbuster-navy border-b-3 border-blobbuster-yellow p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              {(content.posterUrl || content.thumbnailUrl) && (
                <img
                  src={content.posterUrl || content.thumbnailUrl || ''}
                  alt={content.title}
                  className="w-16 h-24 object-cover rounded-lg border-2 border-blobbuster-yellow"
                />
              )}
              <div>
                <h2 className="text-2xl font-heading text-blobbuster-yellow uppercase">
                  Extend Storage
                </h2>
                <p className="text-white font-bold mt-1">{content.title}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Current Status */}
          <div className="bg-blobbuster-darkBlue/50 border border-neon-cyan/30 rounded-lg p-4">
            <p className="text-sm text-gray-400 uppercase mb-2">Current Status</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Current Epochs</p>
                <p className="text-white font-bold">{content.storage_epochs || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Days Remaining</p>
                <p className={`font-bold ${daysRemaining <= 7 ? 'text-red-400' : daysRemaining <= 30 ? 'text-orange-400' : 'text-green-400'}`}>
                  {daysRemaining} days
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-gray-500">Expires On</p>
                <p className="text-white">
                  {currentExpiration?.toLocaleDateString() || 'Unknown'}
                </p>
              </div>
            </div>
          </div>

          {/* Epoch Selector */}
          <div>
            <label className="block text-lg font-bold text-blobbuster-yellow uppercase mb-3">
              Additional Storage Duration
            </label>
            <div className="flex gap-4">
              <div className="flex-1">
                <input
                  type="range"
                  min="1"
                  max="365"
                  value={sliderValue}
                  onChange={(e) => setSliderValue(parseInt(e.target.value))}
                  onMouseUp={(e) => setAdditionalEpochs(parseInt((e.target as HTMLInputElement).value))}
                  onTouchEnd={(e) => setAdditionalEpochs(parseInt((e.target as HTMLInputElement).value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>1 epoch</span>
                  <span>365 epochs</span>
                </div>
              </div>
              <div className="w-32">
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={sliderValue}
                  onChange={(e) => {
                    const value = Math.min(365, Math.max(1, parseInt(e.target.value) || 1));
                    setSliderValue(value);
                    setAdditionalEpochs(value);
                  }}
                  className="w-full px-3 py-2 bg-blobbuster-darkBlue border-3 border-blobbuster-yellow/30 rounded-lg focus:border-blobbuster-yellow focus:outline-none text-white text-center"
                />
                <p className="text-xs text-gray-400 mt-1 text-center uppercase">epochs</p>
              </div>
            </div>
            <p className="text-sm text-gray-400 mt-2">
              Add {sliderValue} epochs ({sliderValue * 14} days) to your storage
            </p>
          </div>

          {/* New Expiration Preview */}
          <div className="bg-green-900/20 border border-green-500/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-green-400 font-semibold uppercase">New Expiration Date</p>
            </div>
            <p className="text-white text-lg font-bold">
              {newExpiration.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              Total: {(content.storage_epochs || 0) + additionalEpochs} epochs
            </p>
          </div>

          {/* Cost Estimate */}
          {isCalculating ? (
            <div className="bg-blobbuster-navy/50 border border-neon-cyan/30 rounded-lg p-6 min-h-[300px] flex items-center justify-center">
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-neon-cyan"></div>
                <p className="text-gray-300">Calculating cost...</p>
              </div>
            </div>
          ) : costEstimate ? (
            <div className="bg-blobbuster-navy/50 border border-neon-cyan/30 rounded-lg p-6 space-y-4 min-h-[300px]">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-heading text-blobbuster-gold">
                  Extension Cost
                </h3>
                <span className="text-xs text-neon-cyan font-semibold">Formula-based</span>
              </div>

              {/* Cost Breakdown */}
              <div className="space-y-3">
                {/* Walrus costs */}
                <div className="bg-blobbuster-navy/30 rounded p-3 space-y-2">
                  <p className="text-xs font-semibold text-gray-400 uppercase">Walrus Network Cost</p>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-300">Storage ({additionalEpochs} epochs)</span>
                    <span className="text-white font-mono">{costEstimate.costs.storageWAL.toFixed(4)} WAL</span>
                  </div>
                  <div className="flex justify-between text-xs pt-2 border-t border-neon-cyan/10">
                    <span className="text-gray-400">Subtotal (Walrus)</span>
                    <span className="text-gray-300 font-mono">{costEstimate.costs.totalWAL.toFixed(4)} WAL</span>
                  </div>
                </div>

                {/* User payment (in SUI) */}
                <div className="bg-neon-cyan/5 rounded p-3 space-y-2">
                  <p className="text-xs font-semibold text-neon-cyan uppercase">You Pay (in SUI)</p>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-300">Storage cost</span>
                    <span className="text-white font-mono">{(costEstimate.costs.totalSUI * 3).toFixed(4)} SUI</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-300">Platform fee</span>
                    <span className="text-white font-mono">{(costEstimate.costs.suiGas * 3).toFixed(4)} SUI</span>
                  </div>
                  <div className="flex justify-between font-bold pt-2 border-t border-neon-cyan/20">
                    <span className="text-blobbuster-gold">Total Payment</span>
                    <span className="text-neon-cyan text-lg font-mono">{costEstimate.costs.totalWithGas.toFixed(4)} SUI</span>
                  </div>
                </div>

                <p className="text-xs text-gray-500 text-center">
                  Platform converts your SUI to WAL and extends Walrus storage
                </p>
              </div>
            </div>
          ) : null}

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/20 border border-red-500 rounded-lg p-4">
              <p className="text-red-300">{error}</p>
            </div>
          )}

          {/* Payment Success */}
          {paymentDigest && (
            <div className="bg-green-900/20 border-3 border-green-500/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <p className="text-green-400 font-semibold uppercase">Payment Successful!</p>
              </div>
              <p className="text-sm text-gray-300">
                Transaction: <span className="text-blobbuster-yellow font-mono text-xs">{paymentDigest.slice(0, 20)}...</span>
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-blobbuster-navy border-t-3 border-blobbuster-yellow p-6">
          {!paymentDigest ? (
            <div className="flex gap-4">
              <button
                onClick={onClose}
                className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-bold transition uppercase border-3 border-gray-600"
                disabled={isPaying || isExtending}
              >
                Cancel
              </button>
              <button
                onClick={handlePayment}
                disabled={isPaying || isExtending || !costEstimate || !currentAccount}
                className="btn-primary flex-1 py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed justify-center gap-2"
              >
                {isPaying ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-blobbuster-blue"></div>
                    <span className="uppercase">Processing Payment...</span>
                  </>
                ) : (
                  <>
                    <span className="uppercase">
                      💳 Pay for Extension {costEstimate && `(${costEstimate.costs.totalWithGas.toFixed(4)} SUI)`}
                    </span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <button
              onClick={onClose}
              disabled={isExtending}
              className="btn-primary w-full py-3 rounded-lg disabled:opacity-50 justify-center"
            >
              {isExtending ? 'EXTENDING STORAGE...' : '✅ DONE'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
