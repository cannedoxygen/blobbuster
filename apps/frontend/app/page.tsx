'use client';

// BlobBuster Homepage - Updated branding
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface PlatformStats {
  activeMembers: number;
  totalContent: number;
  contentCreators: number;
  creatorEarnings: {
    totalSUI: number;
    monthlyEstimate: number;
    formatted: string;
  };
}

export default function HomePage() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        console.log('[STATS] Fetching from:', `${API_URL}/api/stats/platform`);
        const response = await fetch(`${API_URL}/api/stats/platform`);
        console.log('[STATS] Response status:', response.status);

        if (response.ok) {
          const data = await response.json();
          console.log('[STATS] Data received:', data);
          setStats(data);
        } else {
          console.error('[STATS] Response not OK:', response.status, response.statusText);
        }
      } catch (error) {
        console.error('[STATS] Failed to fetch stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  // Format numbers with commas
  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return num.toLocaleString();
  };

  return (
    <div className="min-h-screen">
      <Header />

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-6xl md:text-8xl font-heading uppercase mb-4">
            <span className="relative inline-block">
              <span
                className="absolute top-0 left-0 text-blobbuster-blue"
                style={{ transform: 'translate(4px, 4px)', zIndex: 0 }}
              >
                BLOBBUSTER
              </span>
              <span className="relative text-blobbuster-yellow" style={{ zIndex: 1 }}>
                BLOBBUSTER
              </span>
            </span>
          </h1>

          <p className="text-2xl md:text-3xl text-white font-bold mb-8">
            Your media | Your locker | Your control
          </p>

          <p className="text-xl md:text-2xl text-blobbuster-yellow font-bold mb-8 uppercase">
            Decentralized personal video storage on Sui + Walrus
          </p>

          <p className="text-lg text-white mb-12 max-w-2xl mx-auto">
            Upload anything. Stream anywhere. Forever.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/membership"
              className="btn-primary rounded-lg"
            >
              Get Membership
            </Link>
            <Link
              href="/library"
              className="btn-primary rounded-lg"
            >
              Browse Library
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {stats ? (
            <>
              <div className="blobbuster-card p-6 text-center rounded-lg">
                <div className="text-4xl font-heading text-blobbuster-yellow mb-2 font-black">
                  {formatNumber(stats.activeMembers)}
                </div>
                <div className="text-gray-300 uppercase font-bold text-sm">Active Members</div>
              </div>
              <div className="blobbuster-card p-6 text-center rounded-lg">
                <div className="text-4xl font-heading text-blobbuster-yellow mb-2 font-black">
                  {formatNumber(stats.totalContent)}
                </div>
                <div className="text-gray-300 uppercase font-bold text-sm">Movies & Shows</div>
              </div>
              <div className="blobbuster-card p-6 text-center rounded-lg">
                <div className="text-4xl font-heading text-blobbuster-yellow mb-2 font-black">
                  {formatNumber(stats.contentCreators)}
                </div>
                <div className="text-gray-300 uppercase font-bold text-sm">Content Creators</div>
              </div>
              <div className="blobbuster-card p-6 text-center rounded-lg">
                <div className="text-4xl font-heading text-blobbuster-yellow mb-2 font-black">
                  {stats.creatorEarnings.formatted}
                </div>
                <div className="text-gray-300 uppercase font-bold text-sm">Creator Earnings</div>
              </div>
            </>
          ) : (
            // Loading placeholders
            [
              { label: 'Active Members', value: '...' },
              { label: 'Movies & Shows', value: '...' },
              { label: 'Content Creators', value: '...' },
              { label: 'Creator Earnings', value: '...' },
            ].map((stat) => (
              <div
                key={stat.label}
                className="blobbuster-card p-6 text-center rounded-lg"
              >
                <div className="text-4xl font-heading text-blobbuster-yellow mb-2 font-black">
                  {stat.value}
                </div>
                <div className="text-gray-300 uppercase font-bold text-sm">{stat.label}</div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Membership Section */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-4xl blobbuster-title text-center mb-6">
          SIMPLE MEMBERSHIP
        </h2>
        <p className="text-center text-xl text-blobbuster-yellow font-bold uppercase mb-12">
          Just $5/month - No tiers, no limits, unlimited streaming
        </p>

        <div className="max-w-2xl mx-auto">
          <div className="blobbuster-card p-8 rounded-lg">
            <div className="text-center mb-6">
              <div className="text-5xl font-black text-blobbuster-yellow mb-2">
                $5
              </div>
              <div className="text-lg text-gray-300 uppercase font-bold">2.5 SUI per month</div>
            </div>

            <ul className="space-y-3 mb-8">
              {[
                'Unlimited streaming access',
                'HD & 4K quality options',
                'Support content creators directly',
                'Retro BlobBuster card NFT',
                'Dynamic card that changes when expired',
                'Unique member number',
              ].map((feature) => (
                <li key={feature} className="flex items-start">
                  <span className="text-blobbuster-yellow mr-2 text-lg font-black">✓</span>
                  <span className="text-gray-300">{feature}</span>
                </li>
              ))}
            </ul>

            <Link
              href="/membership"
              className="btn-primary w-full justify-center rounded-lg"
            >
              Get Your Card
            </Link>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="container mx-auto px-4">
        <div className="h-1 bg-blobbuster-yellow rounded-full" />
      </div>

      {/* Footer */}
      <footer className="border-t-4 border-blobbuster-yellow mt-20">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="blobbuster-title mb-4">BLOBBUSTER</h3>
              <p className="text-gray-300 text-sm">
                The decentralized streaming platform built on Sui blockchain.
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-blobbuster-yellow uppercase">Platform</h4>
              <ul className="space-y-2 text-gray-300 text-sm">
                <li><Link href="/library" className="blobbuster-link">Library</Link></li>
                <li><Link href="/membership" className="blobbuster-link">Membership</Link></li>
                <li><Link href="/uploader" className="blobbuster-link">Creators</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-blobbuster-yellow uppercase">Resources</h4>
              <ul className="space-y-2 text-gray-300 text-sm">
                <li><a href="#" className="blobbuster-link">Documentation</a></li>
                <li><a href="#" className="blobbuster-link">API</a></li>
                <li><a href="#" className="blobbuster-link">Support</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-blobbuster-yellow uppercase">Community</h4>
              <ul className="space-y-2 text-gray-300 text-sm">
                <li><a href="#" className="blobbuster-link">Discord</a></li>
                <li><a href="#" className="blobbuster-link">Twitter</a></li>
                <li><a href="#" className="blobbuster-link">GitHub</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t-2 border-blobbuster-yellow text-center text-gray-400 text-sm uppercase">
            © 2025 BlobBuster. Built on Sui.
          </div>
        </div>
      </footer>
    </div>
  );
}
