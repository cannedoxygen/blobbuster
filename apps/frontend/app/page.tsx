'use client';

import Link from 'next/link';
import Header from '@/components/Header';

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <Header />

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-6xl md:text-8xl font-heading text-white mb-6 uppercase">
            THE BLOCKBUSTER
            <br />
            THEY CAN'T KILL
          </h1>

          <p className="text-xl md:text-2xl text-blockbuster-yellow font-bold mb-8 uppercase">
            Decentralized streaming on Sui blockchain
          </p>

          <p className="text-lg text-white mb-12 max-w-2xl mx-auto">
            NFT memberships. 70% to creators. Censorship-resistant.
            The classic video rental experience reimagined for Web3.
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
              className="px-8 py-4 border-3 border-blockbuster-yellow text-blockbuster-yellow hover:bg-blockbuster-yellow hover:text-blockbuster-blue font-bold text-lg transition uppercase shadow-blockbuster hover:shadow-blockbuster-hover hover:transform hover:-translate-x-0.5 hover:-translate-y-0.5 rounded-lg"
            >
              Browse Library
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {[
            { label: 'Active Members', value: '10,000+' },
            { label: 'Movies & Shows', value: '5,000+' },
            { label: 'Content Creators', value: '500+' },
            { label: 'Creator Earnings', value: '$350k/mo' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="blockbuster-card p-6 text-center rounded-lg"
            >
              <div className="text-4xl font-heading text-blockbuster-yellow mb-2 font-black">
                {stat.value}
              </div>
              <div className="text-gray-300 uppercase font-bold text-sm">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Membership Section */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-4xl blockbuster-title text-center mb-6">
          SIMPLE MEMBERSHIP
        </h2>
        <p className="text-center text-xl text-blockbuster-yellow font-bold uppercase mb-12">
          Just $5/month - No tiers, no limits, unlimited streaming
        </p>

        <div className="max-w-2xl mx-auto">
          <div className="blockbuster-card p-8 rounded-lg">
            <div className="text-center mb-6">
              <div className="text-5xl font-black text-blockbuster-yellow neon-text mb-2">
                $5
              </div>
              <div className="text-lg text-gray-300 uppercase font-bold">2.5 SUI per month</div>
            </div>

            <ul className="space-y-3 mb-8">
              {[
                'Unlimited streaming access',
                'HD & 4K quality options',
                'Support content creators directly',
                'Retro Blockbuster card NFT',
                'Dynamic card that changes when expired',
                'Unique member number',
              ].map((feature) => (
                <li key={feature} className="flex items-start">
                  <span className="text-blockbuster-yellow mr-2 text-lg font-black">✓</span>
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
        <div className="h-1 bg-blockbuster-yellow rounded-full" />
      </div>

      {/* Footer */}
      <footer className="border-t-4 border-blockbuster-yellow mt-20">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="blockbuster-title mb-4">BLOCKBUSTER</h3>
              <p className="text-gray-300 text-sm">
                The decentralized streaming platform built on Sui blockchain.
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-blockbuster-yellow uppercase">Platform</h4>
              <ul className="space-y-2 text-gray-300 text-sm">
                <li><Link href="/library" className="blockbuster-link">Library</Link></li>
                <li><Link href="/membership" className="blockbuster-link">Membership</Link></li>
                <li><Link href="/uploader" className="blockbuster-link">Creators</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-blockbuster-yellow uppercase">Resources</h4>
              <ul className="space-y-2 text-gray-300 text-sm">
                <li><a href="#" className="blockbuster-link">Documentation</a></li>
                <li><a href="#" className="blockbuster-link">API</a></li>
                <li><a href="#" className="blockbuster-link">Support</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-blockbuster-yellow uppercase">Community</h4>
              <ul className="space-y-2 text-gray-300 text-sm">
                <li><a href="#" className="blockbuster-link">Discord</a></li>
                <li><a href="#" className="blockbuster-link">Twitter</a></li>
                <li><a href="#" className="blockbuster-link">GitHub</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t-2 border-blockbuster-yellow text-center text-gray-400 text-sm uppercase">
            © 2025 Blockbuster. Built on Sui.
          </div>
        </div>
      </footer>
    </div>
  );
}
