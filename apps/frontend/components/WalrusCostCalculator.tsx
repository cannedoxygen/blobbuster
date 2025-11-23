'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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

interface WalrusCostCalculatorProps {
  fileSizeBytes: number;
  epochs: number;
  onCostCalculated?: (estimate: CostEstimate) => void;
}

export function WalrusCostCalculator({
  fileSizeBytes,
  epochs,
  onCostCalculated,
}: WalrusCostCalculatorProps) {
  const [estimate, setEstimate] = useState<CostEstimate | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-calculate when file size or epochs change (formula is instant!)
  useEffect(() => {
    if (!fileSizeBytes || fileSizeBytes <= 0) {
      setEstimate(null);
      return;
    }

    const calculateCost = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await axios.post(`${API_URL}/api/walrus/estimate-cost`, {
          fileSizeBytes,
          epochs,
        });

        const estimateData = response.data.estimate;
        setEstimate(estimateData);

        if (onCostCalculated) {
          onCostCalculated(estimateData);
        }
      } catch (err: any) {
        console.error('Failed to calculate cost:', err);
        setError('Failed to calculate storage cost');
      } finally {
        setLoading(false);
      }
    };

    calculateCost();
  }, [fileSizeBytes, epochs, onCostCalculated]);

  if (!fileSizeBytes || fileSizeBytes <= 0) {
    return null;
  }

  if (loading) {
    return (
      <div className="bg-blobbuster-navy/50 border border-neon-cyan/30 rounded-lg p-6 min-h-[400px] flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-neon-cyan"></div>
          <p className="text-gray-300">Calculating cost...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-6 min-h-[400px] flex items-center justify-center">
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    );
  }

  if (!estimate) {
    return null;
  }

  return (
    <div className="bg-blobbuster-navy/50 border border-neon-cyan/30 rounded-lg p-6 space-y-4 min-h-[400px]">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-heading text-blobbuster-gold">
          Storage Cost Estimate
        </h3>
        <span className="text-xs text-neon-cyan font-semibold">Formula-based</span>
      </div>

      {/* File Size Info */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-gray-400">Original Size</p>
          <p className="text-white font-medium">{estimate.fileSize.mb.toFixed(2)} MB</p>
        </div>
        <div>
          <p className="text-gray-400">Encoded Size</p>
          <p className="text-white font-medium">{estimate.fileSize.encodedMB.toFixed(2)} MB</p>
          <p className="text-xs text-gray-500">~4.5x RedStuff encoding</p>
        </div>
      </div>

      {/* Storage Duration */}
      <div>
        <p className="text-gray-400 text-sm">Storage Duration</p>
        <p className="text-white font-medium">
          {estimate.duration.epochs} epochs ({estimate.duration.days} days)
        </p>
      </div>

      {/* Cost Breakdown */}
      <div className="border-t border-neon-cyan/20 pt-4 space-y-3">
        {/* Walrus costs (actual, not multiplied) */}
        <div className="bg-blobbuster-navy/30 rounded p-3 space-y-2">
          <p className="text-xs font-semibold text-gray-400 uppercase">Walrus Network Cost</p>
          <div className="flex justify-between text-sm">
            <span className="text-gray-300">Storage ({estimate.duration.epochs} epochs)</span>
            <span className="text-white font-mono">{estimate.costs.storageWAL.toFixed(4)} WAL</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-300">Write fee</span>
            <span className="text-white font-mono">{estimate.costs.uploadWAL.toFixed(6)} WAL</span>
          </div>
          <div className="flex justify-between text-xs pt-2 border-t border-neon-cyan/10">
            <span className="text-gray-400">Subtotal (Walrus)</span>
            <span className="text-gray-300 font-mono">{estimate.costs.totalWAL.toFixed(4)} WAL</span>
          </div>
        </div>

        {/* User payment (in SUI) with breakdown */}
        <div className="bg-neon-cyan/5 rounded p-3 space-y-2">
          <p className="text-xs font-semibold text-neon-cyan uppercase">You Pay (in SUI)</p>
          <div className="flex justify-between text-sm">
            <span className="text-gray-300">Storage cost</span>
            <span className="text-white font-mono">{(estimate.costs.totalSUI * 3).toFixed(4)} SUI</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-300">Platform fee</span>
            <span className="text-white font-mono">{(estimate.costs.suiGas * 3).toFixed(4)} SUI</span>
          </div>
          <div className="flex justify-between font-bold pt-2 border-t border-neon-cyan/20">
            <span className="text-blobbuster-gold">Total Payment</span>
            <span className="text-neon-cyan text-lg font-mono">{estimate.costs.totalWithGas.toFixed(4)} SUI</span>
          </div>
        </div>

        <p className="text-xs text-gray-500 text-center">
          Platform converts your SUI to WAL and pays Walrus network
        </p>
      </div>
    </div>
  );
}
