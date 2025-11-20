'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface WalrusInfo {
  network: string;
  currentEpoch: number;
  epochDurationDays: number;
  capacity: {
    total: string;
    used: string;
    available: string;
    utilization: string;
  };
  pricing: {
    storagePerGB: string;
    uploadPerGB: string;
  };
  features: {
    erasureCoding: string;
    permanentStorage: boolean;
    deletableStorage: boolean;
    maxBlobSize: string;
  };
  integration: {
    publisherUrl: string;
    aggregatorUrl: string;
    defaultEpochs: number;
  };
}

interface AboutWalrusModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AboutWalrusModal({ isOpen, onClose }: AboutWalrusModalProps) {
  const [walrusInfo, setWalrusInfo] = useState<WalrusInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchWalrusInfo();
    }
  }, [isOpen]);

  const fetchWalrusInfo = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/walrus/info`);
      setWalrusInfo(response.data.info);
    } catch (error) {
      console.error('Failed to fetch Walrus info:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-blockbuster-navy border-2 border-neon-cyan rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-blockbuster-navy border-b border-neon-cyan/30 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-heading text-blockbuster-gold">
            About Walrus Storage
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* What is Walrus */}
          <section>
            <h3 className="text-xl font-heading text-neon-cyan mb-3">
              What is Walrus?
            </h3>
            <p className="text-gray-300 leading-relaxed">
              Walrus is a decentralized storage and data availability protocol built on Sui blockchain.
              It provides secure, censorship-resistant storage for large files like videos, leveraging
              advanced erasure coding to achieve exceptional efficiency and reliability.
            </p>
          </section>

          {/* How It Works */}
          <section>
            <h3 className="text-xl font-heading text-neon-cyan mb-3">
              How Does It Work?
            </h3>
            <div className="space-y-4">
              <div className="bg-blockbuster-navy/50 border border-neon-cyan/20 rounded-lg p-4">
                <h4 className="font-semibold text-blockbuster-gold mb-2">
                  1. Erasure Coding (5x Redundancy)
                </h4>
                <p className="text-gray-300 text-sm">
                  Your video is encoded into multiple "slivers" distributed across storage nodes.
                  Only 2/3 of slivers are needed to reconstruct the original file, providing
                  exceptional reliability while reducing storage costs from 500x to below 5x
                  compared to traditional replication.
                </p>
              </div>

              <div className="bg-blockbuster-navy/50 border border-neon-cyan/20 rounded-lg p-4">
                <h4 className="font-semibold text-blockbuster-gold mb-2">
                  2. Epoch-Based Storage
                </h4>
                <p className="text-gray-300 text-sm">
                  Storage is paid for in "epochs" (time periods). On mainnet, 1 epoch ≈ 14 days.
                  You choose how many epochs to store your content.
                </p>
              </div>

              <div className="bg-blockbuster-navy/50 border border-neon-cyan/20 rounded-lg p-4">
                <h4 className="font-semibold text-blockbuster-gold mb-2">
                  3. Sui Blockchain Integration
                </h4>
                <p className="text-gray-300 text-sm">
                  Storage metadata and certificates are recorded on Sui blockchain, ensuring
                  verifiable proof of storage. Payment is handled via WAL tokens (Walrus's native token)
                  and SUI for gas fees.
                </p>
              </div>

              <div className="bg-blockbuster-navy/50 border border-neon-cyan/20 rounded-lg p-4">
                <h4 className="font-semibold text-blockbuster-gold mb-2">
                  4. Decentralized Retrieval
                </h4>
                <p className="text-gray-300 text-sm">
                  Videos are served through aggregator nodes that reconstruct the original file
                  from distributed slivers. This enables fast, reliable streaming without central
                  points of failure.
                </p>
              </div>
            </div>
          </section>

          {/* Key Benefits */}
          <section>
            <h3 className="text-xl font-heading text-neon-cyan mb-3">
              Why Walrus for Video Streaming?
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">🛡️</span>
                <div>
                  <h4 className="font-semibold text-white mb-1">Censorship Resistant</h4>
                  <p className="text-sm text-gray-400">No single entity can take down your content</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="text-2xl">💰</span>
                <div>
                  <h4 className="font-semibold text-white mb-1">Cost Efficient</h4>
                  <p className="text-sm text-gray-400">~$0.02/GB annually vs traditional cloud storage</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="text-2xl">⚡</span>
                <div>
                  <h4 className="font-semibold text-white mb-1">High Performance</h4>
                  <p className="text-sm text-gray-400">Fast retrieval through distributed network</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="text-2xl">🔒</span>
                <div>
                  <h4 className="font-semibold text-white mb-1">Verifiable Storage</h4>
                  <p className="text-sm text-gray-400">Blockchain-based proof of availability</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="text-2xl">♾️</span>
                <div>
                  <h4 className="font-semibold text-white mb-1">Permanent Storage Option</h4>
                  <p className="text-sm text-gray-400">Store content indefinitely if desired</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="text-2xl">🌐</span>
                <div>
                  <h4 className="font-semibold text-white mb-1">Truly Decentralized</h4>
                  <p className="text-sm text-gray-400">No dependence on centralized platforms</p>
                </div>
              </div>
            </div>
          </section>

          {/* Current Network Status */}
          {walrusInfo && !loading && (
            <section>
              <h3 className="text-xl font-heading text-neon-cyan mb-3">
                Network Status
              </h3>
              <div className="bg-blockbuster-navy/50 border border-neon-cyan/20 rounded-lg p-4">
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400">Network</p>
                    <p className="text-white font-medium capitalize">{walrusInfo.network}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Current Epoch</p>
                    <p className="text-white font-medium">{walrusInfo.currentEpoch}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Epoch Duration</p>
                    <p className="text-white font-medium">{walrusInfo.epochDurationDays} day(s)</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Default Storage</p>
                    <p className="text-white font-medium">{walrusInfo.integration.defaultEpochs} epochs</p>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Pricing Model */}
          <section>
            <h3 className="text-xl font-heading text-neon-cyan mb-3">
              Pricing Model
            </h3>
            <div className="bg-blockbuster-navy/50 border border-neon-cyan/20 rounded-lg p-4 space-y-3">
              <div>
                <h4 className="font-semibold text-white mb-2">Storage Costs (per epoch)</h4>
                <p className="text-gray-300 text-sm">
                  Charged based on encoded file size (original × 5 + metadata). Prices are determined
                  by storage node consensus on the network.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-white mb-2">Upload Fees (one-time)</h4>
                <p className="text-gray-300 text-sm">
                  One-time fee to write data to the network. Covers bandwidth and processing costs
                  for distributing slivers across storage nodes.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-white mb-2">Sui Gas Fees</h4>
                <p className="text-gray-300 text-sm">
                  Small transaction fees for blockchain operations (registering blob, certifying storage).
                  Typically ~0.01-0.02 SUI per upload.
                </p>
              </div>
            </div>
          </section>

          {/* Mainnet Launch */}
          <section className="bg-gradient-to-r from-neon-cyan/10 to-blockbuster-gold/10 border border-neon-cyan/30 rounded-lg p-6">
            <h3 className="text-xl font-heading text-neon-cyan mb-2">
              Mainnet Launch: March 2025
            </h3>
            <p className="text-gray-300 text-sm mb-4">
              Walrus mainnet is launching in March 2025. Current testnet pricing is estimated
              based on expected mainnet economics. Real pricing will be determined by network
              consensus once mainnet launches.
            </p>
            <div className="flex flex-wrap gap-2">
              <a
                href="https://www.walrus.xyz"
                target="_blank"
                rel="noopener noreferrer"
                className="text-neon-cyan hover:underline text-sm"
              >
                Official Website →
              </a>
              <a
                href="https://docs.wal.app"
                target="_blank"
                rel="noopener noreferrer"
                className="text-neon-cyan hover:underline text-sm"
              >
                Documentation →
              </a>
              <a
                href="https://github.com/MystenLabs/walrus"
                target="_blank"
                rel="noopener noreferrer"
                className="text-neon-cyan hover:underline text-sm"
              >
                GitHub →
              </a>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-blockbuster-navy border-t border-neon-cyan/30 p-4">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-neon-cyan text-black font-bold rounded hover:bg-neon-cyan/80 transition"
          >
            Got It!
          </button>
        </div>
      </div>
    </div>
  );
}
