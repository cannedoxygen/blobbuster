'use client';

import { useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';

type Section =
  | 'overview'
  | 'getting-started'
  | 'membership'
  | 'streaming'
  | 'uploading'
  | 'wallet'
  | 'storage'
  | 'creators'
  | 'faq';

export default function DocumentationPage() {
  const [activeSection, setActiveSection] = useState<Section>('overview');

  const sections: { id: Section; title: string; icon: string }[] = [
    { id: 'overview', title: 'Overview', icon: '📖' },
    { id: 'getting-started', title: 'Getting Started', icon: '🚀' },
    { id: 'membership', title: 'Membership', icon: '🎫' },
    { id: 'streaming', title: 'Streaming', icon: '🎬' },
    { id: 'uploading', title: 'Uploading Content', icon: '📤' },
    { id: 'wallet', title: 'Wallet Setup', icon: '👛' },
    { id: 'storage', title: 'Decentralized Storage', icon: '💾' },
    { id: 'creators', title: 'For Creators', icon: '🎨' },
    { id: 'faq', title: 'FAQ', icon: '❓' },
  ];

  return (
    <div className="min-h-screen">
      <Header />

      <div className="container mx-auto px-4 py-12">
        <h1 className="text-5xl blobbuster-title text-center mb-4">DOCUMENTATION</h1>
        <p className="text-center text-xl text-gray-300 mb-12">
          Everything you need to know about BlobBuster
        </p>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Navigation */}
          <nav className="lg:w-64 flex-shrink-0">
            <div className="blobbuster-card rounded-lg p-4 sticky top-4">
              <h3 className="text-blobbuster-yellow font-bold uppercase mb-4">Contents</h3>
              <ul className="space-y-2">
                {sections.map((section) => (
                  <li key={section.id}>
                    <button
                      onClick={() => setActiveSection(section.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-all ${
                        activeSection === section.id
                          ? 'bg-blobbuster-yellow text-blobbuster-blue font-bold'
                          : 'text-gray-300 hover:bg-white/10'
                      }`}
                    >
                      <span className="mr-2">{section.icon}</span>
                      {section.title}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </nav>

          {/* Content Area */}
          <main className="flex-1 blobbuster-card rounded-lg p-8">
            {activeSection === 'overview' && <OverviewSection />}
            {activeSection === 'getting-started' && <GettingStartedSection />}
            {activeSection === 'membership' && <MembershipSection />}
            {activeSection === 'streaming' && <StreamingSection />}
            {activeSection === 'uploading' && <UploadingSection />}
            {activeSection === 'wallet' && <WalletSection />}
            {activeSection === 'storage' && <StorageSection />}
            {activeSection === 'creators' && <CreatorsSection />}
            {activeSection === 'faq' && <FAQSection />}
          </main>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t-4 border-blobbuster-yellow mt-20">
        <div className="container mx-auto px-4 py-8 text-center">
          <Link href="/" className="blobbuster-link">
            &larr; Back to Home
          </Link>
        </div>
      </footer>
    </div>
  );
}

// ============================================
// SECTION COMPONENTS
// ============================================

function OverviewSection() {
  return (
    <div className="prose prose-invert max-w-none">
      <h2 className="text-3xl font-bold text-blobbuster-yellow mb-6">What is BlobBuster?</h2>

      <p className="text-gray-300 text-lg mb-6">
        BlobBuster is a decentralized video streaming platform built on the <strong className="text-white">Sui blockchain</strong> with
        storage powered by <strong className="text-white">Walrus</strong>. We're bringing back the video rental store experience
        for the Web3 era - but this time, you truly own your media.
      </p>

      <div className="grid md:grid-cols-3 gap-6 my-8">
        <div className="bg-white/5 rounded-lg p-6 border border-blobbuster-yellow/30">
          <h3 className="text-blobbuster-yellow font-bold text-xl mb-3">Decentralized</h3>
          <p className="text-gray-300 text-sm">
            Your videos are stored on Walrus, a decentralized storage network. No single company controls your content.
          </p>
        </div>
        <div className="bg-white/5 rounded-lg p-6 border border-blobbuster-yellow/30">
          <h3 className="text-blobbuster-yellow font-bold text-xl mb-3">Creator-First</h3>
          <p className="text-gray-300 text-sm">
            70% of membership fees go directly to content creators. Compare that to YouTube's 45% or Netflix's 0%.
          </p>
        </div>
        <div className="bg-white/5 rounded-lg p-6 border border-blobbuster-yellow/30">
          <h3 className="text-blobbuster-yellow font-bold text-xl mb-3">NFT Membership</h3>
          <p className="text-gray-300 text-sm">
            Your membership is an NFT - a retro Blockbuster-style card that lives in your wallet.
          </p>
        </div>
      </div>

      <h3 className="text-2xl font-bold text-white mt-8 mb-4">How It Works</h3>

      <ol className="list-decimal list-inside space-y-3 text-gray-300">
        <li><strong className="text-white">Connect your Sui wallet</strong> - Use Sui Wallet, Suiet, or any compatible wallet</li>
        <li><strong className="text-white">Get a membership</strong> - Pay $5/month (2.5 SUI) to mint your membership NFT</li>
        <li><strong className="text-white">Stream content</strong> - Access the entire library with unlimited streaming</li>
        <li><strong className="text-white">Support creators</strong> - Your fees are distributed to content providers weekly</li>
      </ol>

      <div className="bg-blobbuster-yellow/10 border border-blobbuster-yellow rounded-lg p-6 mt-8">
        <h4 className="text-blobbuster-yellow font-bold mb-2">Why "BlobBuster"?</h4>
        <p className="text-gray-300 text-sm">
          Walrus stores data as "blobs" (Binary Large Objects). We're busting those blobs wide open for streaming.
          Plus, it's a nostalgic nod to the video rental stores of the past. The BlobBuster they can't kill!
        </p>
      </div>
    </div>
  );
}

function GettingStartedSection() {
  return (
    <div className="prose prose-invert max-w-none">
      <h2 className="text-3xl font-bold text-blobbuster-yellow mb-6">Getting Started</h2>

      <p className="text-gray-300 text-lg mb-6">
        Ready to start streaming? Here's everything you need to get up and running in 5 minutes.
      </p>

      <h3 className="text-2xl font-bold text-white mt-8 mb-4">Step 1: Install a Sui Wallet</h3>
      <p className="text-gray-300 mb-4">
        You'll need a Sui-compatible wallet to use BlobBuster. We recommend:
      </p>
      <ul className="list-disc list-inside space-y-2 text-gray-300 mb-6">
        <li><strong className="text-white">Sui Wallet</strong> - Official wallet from Mysten Labs</li>
        <li><strong className="text-white">Suiet</strong> - Popular community wallet</li>
        <li><strong className="text-white">Ethos Wallet</strong> - Feature-rich alternative</li>
      </ul>

      <h3 className="text-2xl font-bold text-white mt-8 mb-4">Step 2: Get Some SUI</h3>
      <p className="text-gray-300 mb-4">
        You'll need SUI tokens to pay for your membership. You can get SUI from:
      </p>
      <ul className="list-disc list-inside space-y-2 text-gray-300 mb-6">
        <li>Centralized exchanges (Binance, Coinbase, KuCoin)</li>
        <li>Decentralized exchanges on Sui</li>
        <li>Bridge from other chains</li>
      </ul>

      <div className="bg-white/5 rounded-lg p-6 border border-white/20 mb-6">
        <h4 className="text-white font-bold mb-2">How much SUI do I need?</h4>
        <p className="text-gray-300 text-sm">
          A monthly membership costs <strong className="text-blobbuster-yellow">2.5 SUI</strong> (~$5 USD).
          We recommend having at least 3 SUI to cover the membership plus transaction fees.
        </p>
      </div>

      <h3 className="text-2xl font-bold text-white mt-8 mb-4">Step 3: Connect & Sign In</h3>
      <ol className="list-decimal list-inside space-y-3 text-gray-300 mb-6">
        <li>Click "Connect Wallet" in the header</li>
        <li>Select your wallet provider</li>
        <li>Approve the connection request</li>
        <li>Click "Sign In" and sign the authentication message</li>
      </ol>

      <h3 className="text-2xl font-bold text-white mt-8 mb-4">Step 4: Get Your Membership</h3>
      <ol className="list-decimal list-inside space-y-3 text-gray-300 mb-6">
        <li>Navigate to the <Link href="/membership" className="text-blobbuster-yellow hover:underline">Membership page</Link></li>
        <li>Click "Get Your Card"</li>
        <li>Confirm the transaction in your wallet</li>
        <li>Your membership NFT will appear in your wallet!</li>
      </ol>

      <h3 className="text-2xl font-bold text-white mt-8 mb-4">Step 5: Start Streaming</h3>
      <p className="text-gray-300">
        That's it! Head to the <Link href="/library" className="text-blobbuster-yellow hover:underline">Library</Link> and
        start watching. Click any title to begin streaming instantly.
      </p>
    </div>
  );
}

function MembershipSection() {
  return (
    <div className="prose prose-invert max-w-none">
      <h2 className="text-3xl font-bold text-blobbuster-yellow mb-6">Membership</h2>

      <p className="text-gray-300 text-lg mb-6">
        Your BlobBuster membership is more than just access - it's an NFT that lives in your wallet.
      </p>

      <div className="bg-blobbuster-yellow/10 border border-blobbuster-yellow rounded-lg p-6 mb-8">
        <div className="text-center">
          <div className="text-5xl font-black text-blobbuster-yellow mb-2">$5/month</div>
          <div className="text-gray-300">2.5 SUI per month</div>
        </div>
      </div>

      <h3 className="text-2xl font-bold text-white mt-8 mb-4">What's Included</h3>
      <ul className="space-y-3 text-gray-300 mb-6">
        <li className="flex items-start">
          <span className="text-blobbuster-yellow mr-3">✓</span>
          <span><strong className="text-white">Unlimited streaming</strong> - Watch as much as you want</span>
        </li>
        <li className="flex items-start">
          <span className="text-blobbuster-yellow mr-3">✓</span>
          <span><strong className="text-white">HD & 4K quality</strong> - Best available quality for each title</span>
        </li>
        <li className="flex items-start">
          <span className="text-blobbuster-yellow mr-3">✓</span>
          <span><strong className="text-white">Retro membership card NFT</strong> - Unique collectible in your wallet</span>
        </li>
        <li className="flex items-start">
          <span className="text-blobbuster-yellow mr-3">✓</span>
          <span><strong className="text-white">Dynamic card display</strong> - Card changes when expired</span>
        </li>
        <li className="flex items-start">
          <span className="text-blobbuster-yellow mr-3">✓</span>
          <span><strong className="text-white">Unique member number</strong> - Your number in BlobBuster history</span>
        </li>
        <li className="flex items-start">
          <span className="text-blobbuster-yellow mr-3">✓</span>
          <span><strong className="text-white">Support creators</strong> - 70% of your fee goes to content providers</span>
        </li>
      </ul>

      <h3 className="text-2xl font-bold text-white mt-8 mb-4">Your Membership NFT</h3>
      <p className="text-gray-300 mb-4">
        When you purchase a membership, you receive a unique NFT that looks like a retro video rental card.
        This NFT:
      </p>
      <ul className="list-disc list-inside space-y-2 text-gray-300 mb-6">
        <li>Shows your unique member number</li>
        <li>Displays as "ACTIVE" while your membership is valid</li>
        <li>Changes to show "EXPIRED" when your membership lapses</li>
        <li>Lives in your Sui wallet and can be viewed in any NFT viewer</li>
      </ul>

      <h3 className="text-2xl font-bold text-white mt-8 mb-4">Renewing Your Membership</h3>
      <p className="text-gray-300 mb-4">
        Memberships don't auto-renew. When your membership expires:
      </p>
      <ol className="list-decimal list-inside space-y-2 text-gray-300 mb-6">
        <li>Your NFT card will update to show "EXPIRED"</li>
        <li>You'll lose access to streaming</li>
        <li>Visit the membership page to renew</li>
        <li>Your NFT will update back to "ACTIVE"</li>
      </ol>

      <div className="bg-white/5 rounded-lg p-6 border border-white/20">
        <h4 className="text-white font-bold mb-2">Why no auto-renewal?</h4>
        <p className="text-gray-300 text-sm">
          We believe in transparency. You should always know when you're spending crypto.
          Manual renewals mean no surprise charges.
        </p>
      </div>
    </div>
  );
}

function StreamingSection() {
  return (
    <div className="prose prose-invert max-w-none">
      <h2 className="text-3xl font-bold text-blobbuster-yellow mb-6">Streaming</h2>

      <p className="text-gray-300 text-lg mb-6">
        BlobBuster uses HLS (HTTP Live Streaming) to deliver smooth, adaptive video playback directly from
        decentralized storage.
      </p>

      <h3 className="text-2xl font-bold text-white mt-8 mb-4">How Streaming Works</h3>
      <ol className="list-decimal list-inside space-y-3 text-gray-300 mb-6">
        <li>Click any title in the library to start watching</li>
        <li>The video player loads and begins buffering</li>
        <li>Content streams directly from Walrus aggregators</li>
        <li>Your watch progress is tracked for "Continue Watching"</li>
      </ol>

      <h3 className="text-2xl font-bold text-white mt-8 mb-4">Video Quality</h3>
      <p className="text-gray-300 mb-4">
        Videos are stored at the quality they were uploaded. Most content is available in:
      </p>
      <ul className="list-disc list-inside space-y-2 text-gray-300 mb-6">
        <li><strong className="text-white">720p HD</strong> - Standard high definition</li>
        <li><strong className="text-white">1080p Full HD</strong> - Full high definition</li>
        <li><strong className="text-white">4K Ultra HD</strong> - When available</li>
      </ul>

      <h3 className="text-2xl font-bold text-white mt-8 mb-4">Supported Devices</h3>
      <p className="text-gray-300 mb-4">
        BlobBuster works on any modern web browser:
      </p>
      <ul className="list-disc list-inside space-y-2 text-gray-300 mb-6">
        <li>Chrome, Firefox, Safari, Edge (desktop)</li>
        <li>Mobile browsers (iOS Safari, Android Chrome)</li>
        <li>Tablets and iPads</li>
      </ul>

      <div className="bg-white/5 rounded-lg p-6 border border-white/20 mb-6">
        <h4 className="text-white font-bold mb-2">Buffering Issues?</h4>
        <p className="text-gray-300 text-sm">
          Content streams from Walrus aggregators worldwide. If you experience buffering:
        </p>
        <ul className="list-disc list-inside text-gray-300 text-sm mt-2">
          <li>Check your internet connection</li>
          <li>Try refreshing the page</li>
          <li>Wait a few seconds for the buffer to build</li>
        </ul>
      </div>

      <h3 className="text-2xl font-bold text-white mt-8 mb-4">Watch History</h3>
      <p className="text-gray-300">
        BlobBuster tracks your viewing progress. When you return to the library, you'll see your
        "Continue Watching" section with titles you haven't finished. Click any title to resume
        where you left off.
      </p>
    </div>
  );
}

function UploadingSection() {
  return (
    <div className="prose prose-invert max-w-none">
      <h2 className="text-3xl font-bold text-blobbuster-yellow mb-6">Uploading Content</h2>

      <p className="text-gray-300 text-lg mb-6">
        Content creators can upload videos to BlobBuster and earn from every stream. Here's how the
        upload process works.
      </p>

      <h3 className="text-2xl font-bold text-white mt-8 mb-4">Become a Creator</h3>
      <ol className="list-decimal list-inside space-y-3 text-gray-300 mb-6">
        <li>Connect your wallet and sign in</li>
        <li>Navigate to the <Link href="/upload" className="text-blobbuster-yellow hover:underline">Upload page</Link></li>
        <li>Click "Register as Creator"</li>
        <li>You'll receive a unique creator ID and referral code</li>
      </ol>

      <h3 className="text-2xl font-bold text-white mt-8 mb-4">Upload Process</h3>
      <ol className="list-decimal list-inside space-y-3 text-gray-300 mb-6">
        <li><strong className="text-white">Select your video</strong> - MP4, MKV, AVI, MOV, or WebM</li>
        <li><strong className="text-white">Add metadata</strong> - Title, description, genre</li>
        <li><strong className="text-white">Choose storage duration</strong> - How long to store on Walrus</li>
        <li><strong className="text-white">Pay storage fee</strong> - One-time fee based on file size and duration</li>
        <li><strong className="text-white">Upload & process</strong> - We handle transcoding and storage</li>
      </ol>

      <div className="bg-blobbuster-yellow/10 border border-blobbuster-yellow rounded-lg p-6 mb-6">
        <h4 className="text-blobbuster-yellow font-bold mb-2">Supported Formats</h4>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-center">
          <div className="bg-white/10 rounded px-3 py-2 text-white font-mono">.mp4</div>
          <div className="bg-white/10 rounded px-3 py-2 text-white font-mono">.mkv</div>
          <div className="bg-white/10 rounded px-3 py-2 text-white font-mono">.avi</div>
          <div className="bg-white/10 rounded px-3 py-2 text-white font-mono">.mov</div>
          <div className="bg-white/10 rounded px-3 py-2 text-white font-mono">.webm</div>
        </div>
        <p className="text-gray-300 text-sm mt-3">Maximum file size: 10GB</p>
      </div>

      <h3 className="text-2xl font-bold text-white mt-8 mb-4">Processing Pipeline</h3>
      <p className="text-gray-300 mb-4">
        After upload, your video goes through several processing steps:
      </p>
      <ol className="list-decimal list-inside space-y-2 text-gray-300 mb-6">
        <li><strong className="text-white">Chunk upload</strong> - Large files are uploaded in chunks for reliability</li>
        <li><strong className="text-white">Assembly</strong> - Chunks are combined into a single file</li>
        <li><strong className="text-white">Transcoding</strong> - Converted to H.264 MP4 if needed</li>
        <li><strong className="text-white">Thumbnail generation</strong> - Automatic preview image</li>
        <li><strong className="text-white">Walrus upload</strong> - Stored on decentralized network</li>
        <li><strong className="text-white">Blockchain registration</strong> - Recorded on Sui</li>
        <li><strong className="text-white">Metadata enrichment</strong> - TMDB info added if available</li>
      </ol>

      <h3 className="text-2xl font-bold text-white mt-8 mb-4">Storage Costs</h3>
      <p className="text-gray-300 mb-4">
        Storage costs depend on file size and storage duration. Walrus uses "epochs" for timing
        (1 epoch ≈ 14 days). Common durations:
      </p>
      <ul className="list-disc list-inside space-y-2 text-gray-300 mb-6">
        <li><strong className="text-white">1 year</strong> - ~26 epochs</li>
        <li><strong className="text-white">5 years</strong> - ~130 epochs</li>
        <li><strong className="text-white">10 years</strong> - ~260 epochs</li>
      </ul>

      <div className="bg-white/5 rounded-lg p-6 border border-white/20">
        <h4 className="text-white font-bold mb-2">Storage Extension</h4>
        <p className="text-gray-300 text-sm">
          You can extend storage for existing content at any time. Visit your creator dashboard
          and click "Extend Storage" on any title.
        </p>
      </div>
    </div>
  );
}

function WalletSection() {
  return (
    <div className="prose prose-invert max-w-none">
      <h2 className="text-3xl font-bold text-blobbuster-yellow mb-6">Wallet Setup</h2>

      <p className="text-gray-300 text-lg mb-6">
        BlobBuster requires a Sui-compatible wallet. Here's how to set one up.
      </p>

      <h3 className="text-2xl font-bold text-white mt-8 mb-4">Recommended Wallets</h3>

      <div className="space-y-6 mb-8">
        <div className="bg-white/5 rounded-lg p-6 border border-white/20">
          <h4 className="text-white font-bold text-xl mb-2">Sui Wallet (Official)</h4>
          <p className="text-gray-300 text-sm mb-3">
            The official wallet from Mysten Labs. Most reliable and feature-complete.
          </p>
          <a
            href="https://chrome.google.com/webstore/detail/sui-wallet/opcgpfmipidbgpenhmajoajpbobppdil"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blobbuster-yellow hover:underline text-sm"
          >
            Install for Chrome &rarr;
          </a>
        </div>

        <div className="bg-white/5 rounded-lg p-6 border border-white/20">
          <h4 className="text-white font-bold text-xl mb-2">Suiet</h4>
          <p className="text-gray-300 text-sm mb-3">
            Popular community wallet with a clean interface and mobile support.
          </p>
          <a
            href="https://suiet.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blobbuster-yellow hover:underline text-sm"
          >
            Visit Suiet.app &rarr;
          </a>
        </div>

        <div className="bg-white/5 rounded-lg p-6 border border-white/20">
          <h4 className="text-white font-bold text-xl mb-2">Ethos Wallet</h4>
          <p className="text-gray-300 text-sm mb-3">
            Feature-rich wallet with built-in NFT gallery and DApp browser.
          </p>
          <a
            href="https://ethoswallet.xyz/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blobbuster-yellow hover:underline text-sm"
          >
            Visit EthosWallet.xyz &rarr;
          </a>
        </div>
      </div>

      <h3 className="text-2xl font-bold text-white mt-8 mb-4">Setting Up Your Wallet</h3>
      <ol className="list-decimal list-inside space-y-3 text-gray-300 mb-6">
        <li>Install your chosen wallet browser extension</li>
        <li>Create a new wallet (or import existing)</li>
        <li><strong className="text-blobbuster-yellow">IMPORTANT:</strong> Securely backup your recovery phrase</li>
        <li>Fund your wallet with SUI tokens</li>
      </ol>

      <div className="bg-red-500/10 border border-red-500 rounded-lg p-6 mb-6">
        <h4 className="text-red-400 font-bold mb-2">Security Warning</h4>
        <p className="text-gray-300 text-sm">
          <strong>Never share your recovery phrase or private key.</strong> BlobBuster will never ask for
          these. Anyone with your recovery phrase can steal your funds.
        </p>
      </div>

      <h3 className="text-2xl font-bold text-white mt-8 mb-4">Connecting to BlobBuster</h3>
      <ol className="list-decimal list-inside space-y-3 text-gray-300 mb-6">
        <li>Click "Connect Wallet" in the BlobBuster header</li>
        <li>Select your wallet from the list</li>
        <li>Approve the connection in your wallet popup</li>
        <li>Click "Sign In" on BlobBuster</li>
        <li>Sign the authentication message in your wallet</li>
      </ol>

      <h3 className="text-2xl font-bold text-white mt-8 mb-4">Getting SUI Tokens</h3>
      <p className="text-gray-300 mb-4">
        You can acquire SUI tokens from:
      </p>
      <ul className="list-disc list-inside space-y-2 text-gray-300">
        <li><strong className="text-white">Centralized Exchanges</strong> - Binance, Coinbase, KuCoin, OKX</li>
        <li><strong className="text-white">DEXs on Sui</strong> - Cetus, Turbos, Aftermath</li>
        <li><strong className="text-white">Bridges</strong> - Wormhole, Portal Bridge</li>
      </ul>
    </div>
  );
}

function StorageSection() {
  return (
    <div className="prose prose-invert max-w-none">
      <h2 className="text-3xl font-bold text-blobbuster-yellow mb-6">Decentralized Storage</h2>

      <p className="text-gray-300 text-lg mb-6">
        BlobBuster uses Walrus for decentralized storage. Here's what that means for your content.
      </p>

      <h3 className="text-2xl font-bold text-white mt-8 mb-4">What is Walrus?</h3>
      <p className="text-gray-300 mb-4">
        Walrus is a decentralized storage network built for the Sui ecosystem. It stores data as
        "blobs" (Binary Large Objects) across a network of independent storage nodes.
      </p>

      <div className="grid md:grid-cols-2 gap-6 my-8">
        <div className="bg-white/5 rounded-lg p-6 border border-white/20">
          <h4 className="text-blobbuster-yellow font-bold mb-3">Decentralized</h4>
          <p className="text-gray-300 text-sm">
            Data is stored across multiple independent nodes. No single point of failure.
          </p>
        </div>
        <div className="bg-white/5 rounded-lg p-6 border border-white/20">
          <h4 className="text-blobbuster-yellow font-bold mb-3">Redundant</h4>
          <p className="text-gray-300 text-sm">
            Data is replicated using erasure coding. Your content survives node failures.
          </p>
        </div>
        <div className="bg-white/5 rounded-lg p-6 border border-white/20">
          <h4 className="text-blobbuster-yellow font-bold mb-3">Verifiable</h4>
          <p className="text-gray-300 text-sm">
            Each blob has a unique ID. You can verify your content is stored correctly.
          </p>
        </div>
        <div className="bg-white/5 rounded-lg p-6 border border-white/20">
          <h4 className="text-blobbuster-yellow font-bold mb-3">Cost-Effective</h4>
          <p className="text-gray-300 text-sm">
            Pay once for storage duration. No monthly recurring fees for stored content.
          </p>
        </div>
      </div>

      <h3 className="text-2xl font-bold text-white mt-8 mb-4">Storage Duration</h3>
      <p className="text-gray-300 mb-4">
        Walrus uses "epochs" to measure time. Each epoch is approximately 14 days. When you upload
        content, you choose how many epochs to store it for.
      </p>

      <div className="bg-white/5 rounded-lg p-6 border border-white/20 mb-6">
        <h4 className="text-white font-bold mb-3">Epoch Calculator</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-blobbuster-yellow">26</div>
            <div className="text-gray-400 text-sm">epochs = 1 year</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blobbuster-yellow">130</div>
            <div className="text-gray-400 text-sm">epochs = 5 years</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blobbuster-yellow">260</div>
            <div className="text-gray-400 text-sm">epochs = 10 years</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blobbuster-yellow">520</div>
            <div className="text-gray-400 text-sm">epochs = 20 years</div>
          </div>
        </div>
      </div>

      <h3 className="text-2xl font-bold text-white mt-8 mb-4">How Streaming Works</h3>
      <p className="text-gray-300 mb-4">
        When you watch a video on BlobBuster:
      </p>
      <ol className="list-decimal list-inside space-y-2 text-gray-300 mb-6">
        <li>Your player requests the video blob ID from BlobBuster</li>
        <li>The video is fetched from Walrus aggregator nodes</li>
        <li>Content streams directly to your browser</li>
        <li>HLS ensures smooth playback with buffering</li>
      </ol>

      <div className="bg-blobbuster-yellow/10 border border-blobbuster-yellow rounded-lg p-6">
        <h4 className="text-blobbuster-yellow font-bold mb-2">Censorship Resistance</h4>
        <p className="text-gray-300 text-sm">
          Because content is stored on a decentralized network, it can't be easily removed by any
          single entity. Your content, your control.
        </p>
      </div>
    </div>
  );
}

function CreatorsSection() {
  return (
    <div className="prose prose-invert max-w-none">
      <h2 className="text-3xl font-bold text-blobbuster-yellow mb-6">For Creators</h2>

      <p className="text-gray-300 text-lg mb-6">
        BlobBuster is built for creators. Here's how the revenue model works and how you can earn.
      </p>

      <div className="bg-blobbuster-yellow/10 border border-blobbuster-yellow rounded-lg p-8 mb-8 text-center">
        <div className="text-6xl font-black text-blobbuster-yellow mb-2">70%</div>
        <div className="text-white text-xl font-bold">of all membership fees go to creators</div>
        <div className="text-gray-300 mt-2">Distributed weekly based on viewing metrics</div>
      </div>

      <h3 className="text-2xl font-bold text-white mt-8 mb-4">Revenue Distribution</h3>
      <p className="text-gray-300 mb-4">
        Every week, the creator pool is distributed to content providers based on:
      </p>
      <ul className="list-disc list-inside space-y-2 text-gray-300 mb-6">
        <li><strong className="text-white">Watch time</strong> - Total minutes viewers spent on your content</li>
        <li><strong className="text-white">Completion rate</strong> - Higher completion = higher multiplier</li>
        <li><strong className="text-white">Weighted score</strong> - Combination of the above factors</li>
      </ul>

      <h3 className="text-2xl font-bold text-white mt-8 mb-4">Completion Multipliers</h3>
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white/5 rounded-lg p-4 border border-white/20 text-center">
          <div className="text-2xl font-bold text-blobbuster-yellow">1.5x</div>
          <div className="text-white font-bold">80-100%</div>
          <div className="text-gray-400 text-sm">completion</div>
        </div>
        <div className="bg-white/5 rounded-lg p-4 border border-white/20 text-center">
          <div className="text-2xl font-bold text-blobbuster-yellow">1.25x</div>
          <div className="text-white font-bold">50-79%</div>
          <div className="text-gray-400 text-sm">completion</div>
        </div>
        <div className="bg-white/5 rounded-lg p-4 border border-white/20 text-center">
          <div className="text-2xl font-bold text-blobbuster-yellow">1.0x</div>
          <div className="text-white font-bold">0-49%</div>
          <div className="text-gray-400 text-sm">completion</div>
        </div>
      </div>

      <p className="text-gray-300 mb-6">
        This incentivizes creating engaging content that viewers watch to the end.
      </p>

      <h3 className="text-2xl font-bold text-white mt-8 mb-4">Creator Dashboard</h3>
      <p className="text-gray-300 mb-4">
        As a registered creator, you have access to:
      </p>
      <ul className="list-disc list-inside space-y-2 text-gray-300 mb-6">
        <li><strong className="text-white">Earnings overview</strong> - Total and pending earnings</li>
        <li><strong className="text-white">Content analytics</strong> - Views, completion rates per title</li>
        <li><strong className="text-white">Upload management</strong> - All your uploaded content</li>
        <li><strong className="text-white">Storage extension</strong> - Extend storage for any title</li>
        <li><strong className="text-white">Referral code</strong> - Your unique 5-character code</li>
      </ul>

      <h3 className="text-2xl font-bold text-white mt-8 mb-4">Claiming Earnings</h3>
      <p className="text-gray-300 mb-4">
        Earnings accumulate in the revenue pool. To claim:
      </p>
      <ol className="list-decimal list-inside space-y-2 text-gray-300 mb-6">
        <li>Go to your creator dashboard</li>
        <li>Click "Claim Earnings"</li>
        <li>Confirm the transaction</li>
        <li>SUI tokens are sent to your wallet</li>
      </ol>

      <div className="bg-white/5 rounded-lg p-6 border border-white/20">
        <h4 className="text-white font-bold mb-2">Comparison to Other Platforms</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-blobbuster-yellow font-bold">BlobBuster</span>
            <span className="text-white">70% to creators</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">YouTube</span>
            <span className="text-gray-400">~45% to creators</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Twitch</span>
            <span className="text-gray-400">~50% to creators</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Netflix</span>
            <span className="text-gray-400">0% to creators (licensed)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function FAQSection() {
  const faqs = [
    {
      q: 'What is BlobBuster?',
      a: 'BlobBuster is a decentralized video streaming platform built on Sui blockchain. Videos are stored on Walrus, a decentralized storage network, and membership is handled via NFTs.',
    },
    {
      q: 'How much does a membership cost?',
      a: 'Membership is $5/month, paid in SUI tokens (approximately 2.5 SUI depending on market price). This gives you unlimited streaming access.',
    },
    {
      q: 'What do I need to use BlobBuster?',
      a: 'You need a Sui-compatible wallet (like Sui Wallet, Suiet, or Ethos) and some SUI tokens to pay for membership.',
    },
    {
      q: 'Can I upload my own content?',
      a: 'Yes! Register as a creator and you can upload videos. You pay for storage (one-time fee based on size and duration), and earn 70% of membership revenue based on views.',
    },
    {
      q: 'How do creators get paid?',
      a: 'Creator earnings are distributed weekly from the revenue pool. Payments are proportional to watch time, with bonuses for high completion rates.',
    },
    {
      q: 'What happens when my membership expires?',
      a: 'Your membership NFT updates to show "EXPIRED" and you lose streaming access. You can renew anytime to restore access.',
    },
    {
      q: 'Is my content stored forever?',
      a: 'Content is stored for the duration you pay for (measured in Walrus epochs, ~14 days each). You can extend storage at any time.',
    },
    {
      q: 'What video formats are supported?',
      a: 'We accept MP4, MKV, AVI, MOV, and WebM files up to 10GB. Videos are automatically transcoded to H.264 MP4 for web playback.',
    },
    {
      q: 'Can I watch on mobile?',
      a: 'Yes! BlobBuster works on any modern mobile browser. Just connect your mobile wallet and stream.',
    },
    {
      q: 'Is there a desktop app?',
      a: 'Currently BlobBuster is web-only. Desktop and mobile apps may come in the future.',
    },
    {
      q: 'How is this different from YouTube or Netflix?',
      a: 'BlobBuster is decentralized (no single company controls it), pays creators more (70% vs ~45%), uses blockchain for payments (transparent and global), and stores content on decentralized infrastructure (censorship resistant).',
    },
    {
      q: 'What if Walrus nodes go offline?',
      a: 'Walrus uses erasure coding to replicate data across many nodes. Your content survives even if some nodes fail. This is more resilient than centralized cloud storage.',
    },
  ];

  return (
    <div className="prose prose-invert max-w-none">
      <h2 className="text-3xl font-bold text-blobbuster-yellow mb-6">Frequently Asked Questions</h2>

      <div className="space-y-6">
        {faqs.map((faq, index) => (
          <div key={index} className="bg-white/5 rounded-lg p-6 border border-white/20">
            <h3 className="text-white font-bold text-lg mb-2">{faq.q}</h3>
            <p className="text-gray-300">{faq.a}</p>
          </div>
        ))}
      </div>

      <div className="mt-12 text-center">
        <p className="text-gray-300 mb-4">Still have questions?</p>
        <a
          href="https://x.com/blobbuster"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-blobbuster-yellow hover:underline"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
          Reach out on X @blobbuster
        </a>
      </div>
    </div>
  );
}
