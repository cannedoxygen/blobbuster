'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCurrentAccount, useSignAndExecuteTransactionBlock } from '@mysten/dapp-kit';
import { TransactionBlock } from '@mysten/sui.js/transactions';
import axios from 'axios';
import { useVideoPrefetch } from '@/lib/hooks/useVideoPrefetch';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface MovieDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: {
    id: string;
    title: string;
    description?: string;
    plot?: string;
    thumbnailUrl?: string;
    posterUrl?: string;
    backdropUrl?: string;
    year?: number;
    runtime?: number;
    duration?: number;
    genre?: number;
    genresList?: string;
    director?: string;
    cast?: string;
    externalRating?: number;
    totalStreams?: number;
    storage_expires_at?: string;
    tagline?: string;
    walrusBlobIds?: string | object;
    uploader?: {
      id: string;
      user: {
        username?: string;
        walletAddress?: string;
      };
    };
  };
}

const GENRE_MAP: { [key: number]: string } = {
  1: 'Action',
  2: 'Comedy',
  3: 'Drama',
  4: 'Horror',
  5: 'Sci-Fi',
  6: 'Documentary',
  7: 'Thriller',
  8: 'Romance',
  9: 'Animation',
  10: 'Other',
};

export function MovieDetailsModal({
  isOpen,
  onClose,
  content,
}: MovieDetailsModalProps) {
  const router = useRouter();
  const currentAccount = useCurrentAccount();
  const { mutate: signAndExecuteTransactionBlock } = useSignAndExecuteTransactionBlock();

  const [showTipModal, setShowTipModal] = useState(false);
  const [tipAmount, setTipAmount] = useState('');
  const [isTipping, setIsTipping] = useState(false);

  // Prefetch first 5MB of video when modal opens
  // This warms up the cache so playback starts faster
  useVideoPrefetch(
    isOpen ? content.id : null,
    isOpen ? content.walrusBlobIds || null : null
  );

  if (!isOpen) return null;

  const handleTip = async (amount: string) => {
    if (!currentAccount || !content.uploader?.user?.walletAddress) {
      alert('Provider wallet address not available');
      return;
    }

    const tipAmountNumber = parseFloat(amount);
    if (isNaN(tipAmountNumber) || tipAmountNumber <= 0) {
      alert('Please enter a valid tip amount');
      return;
    }

    setIsTipping(true);

    try {
      const amountInMist = Math.floor(tipAmountNumber * 1_000_000_000);

      console.log(`[Tip] Sending ${tipAmountNumber} SUI to ${content.uploader?.user?.walletAddress}`);

      const tx = new TransactionBlock();
      const [coin] = tx.splitCoins(tx.gas, [amountInMist]);
      tx.transferObjects([coin], content.uploader!.user!.walletAddress);

      await new Promise((resolve, reject) => {
        signAndExecuteTransactionBlock(
          { transactionBlock: tx, chain: 'sui:mainnet' },
          {
            onSuccess: async (result) => {
              console.log('[Tip] Transaction successful:', result.digest);
              alert(`✅ Successfully sent ${tipAmountNumber} SUI tip!`);
              setShowTipModal(false);
              setTipAmount('');
              resolve(result);
            },
            onError: (error) => {
              console.error('[Tip] Transaction failed:', error);
              reject(error);
            },
          }
        );
      });
    } catch (err: any) {
      console.error('[Tip] Error:', err);
      alert(err?.message || 'Failed to send tip. Please try again.');
    } finally {
      setIsTipping(false);
    }
  };

  // Calculate expiration message
  const getExpirationMessage = () => {
    if (!content.storage_expires_at) return null;

    const now = new Date();
    const expirationDate = new Date(content.storage_expires_at);
    const daysRemaining = Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysRemaining <= 0) {
      return { message: 'No longer available', color: 'text-red-400', icon: '⚠️' };
    } else if (daysRemaining <= 7) {
      return { message: `Only ${daysRemaining} days left!`, color: 'text-orange-400', icon: '⏰' };
    } else if (daysRemaining <= 30) {
      return { message: `Available for ${daysRemaining} more days`, color: 'text-yellow-400', icon: '📅' };
    } else {
      return { message: `Available for ${daysRemaining} days`, color: 'text-green-400', icon: '✓' };
    }
  };

  const expirationInfo = getExpirationMessage();

  // Parse genres list if available
  const genres = content.genresList
    ? JSON.parse(content.genresList)
    : content.genre
    ? [GENRE_MAP[content.genre] || 'Other']
    : [];

  // Parse cast if available
  const castList = content.cast ? JSON.parse(content.cast).slice(0, 6) : [];

  const handleWatch = () => {
    router.push(`/watch/${content.id}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/90 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 bg-gradient-to-br from-blobbuster-navy to-blobbuster-darkBlue border-3 border-blobbuster-yellow rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        {/* Backdrop Image Header */}
        {content.backdropUrl && (
          <div
            className="h-80 bg-cover bg-center relative rounded-t-lg"
            style={{ backgroundImage: `url(${content.backdropUrl})` }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-blobbuster-navy via-blobbuster-navy/60 to-transparent rounded-t-lg" />

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-white/80 hover:text-white transition bg-black/50 rounded-full p-2 hover:bg-black/70"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Expiration badge on backdrop */}
            {expirationInfo && (
              <div className={`absolute bottom-4 right-4 px-4 py-2 rounded-lg font-bold text-sm ${
                expirationInfo.color === 'text-red-400' ? 'bg-red-900/80' :
                expirationInfo.color === 'text-orange-400' ? 'bg-orange-900/80' :
                expirationInfo.color === 'text-yellow-400' ? 'bg-yellow-900/80' :
                'bg-green-900/80'
              } backdrop-blur-sm border-2 ${
                expirationInfo.color === 'text-red-400' ? 'border-red-500' :
                expirationInfo.color === 'text-orange-400' ? 'border-orange-500' :
                expirationInfo.color === 'text-yellow-400' ? 'border-yellow-500' :
                'border-green-500'
              }`}>
                <span className={expirationInfo.color}>
                  {expirationInfo.icon} {expirationInfo.message}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Header (if no backdrop) */}
        {!content.backdropUrl && (
          <div className="bg-blobbuster-navy border-b-3 border-blobbuster-yellow p-6">
            <div className="flex items-start justify-between">
              <h2 className="text-3xl font-heading text-blobbuster-yellow uppercase">
                Movie Details
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
          </div>
        )}

        {/* Content */}
        <div className="p-6 md:p-8 space-y-6">
          {/* Title & Poster Section */}
          <div className="flex flex-col md:flex-row items-start gap-6">
            {/* Poster */}
            {(content.posterUrl || content.thumbnailUrl) && (
              <div className="flex-shrink-0 mx-auto md:mx-0">
                <img
                  src={content.posterUrl || content.thumbnailUrl}
                  alt={content.title}
                  className="w-64 rounded-lg shadow-blobbuster border-3 border-blobbuster-yellow"
                />
                {/* Rating on poster */}
                {content.externalRating && (
                  <div className="mt-4 text-center bg-blobbuster-navy/80 py-3 rounded-lg border-2 border-blobbuster-yellow">
                    <span className="text-3xl">⭐</span>
                    <span className="ml-2 text-2xl font-black text-blobbuster-yellow">
                      {content.externalRating.toFixed(1)}
                    </span>
                    <span className="text-gray-400 text-sm ml-1">/10</span>
                  </div>
                )}
              </div>
            )}

            {/* Info */}
            <div className="flex-1">
              <h1 className="text-4xl md:text-5xl font-heading text-white mb-3 uppercase leading-tight">
                {content.title}
              </h1>

              {/* Tagline */}
              {content.tagline && (
                <p className="text-neon-cyan italic text-lg mb-4">
                  "{content.tagline}"
                </p>
              )}

              {/* Meta Info */}
              <div className="flex flex-wrap gap-3 mb-6">
                {content.year && (
                  <span className="px-4 py-2 bg-blobbuster-darkBlue rounded-full text-blobbuster-yellow font-bold border-2 border-blobbuster-yellow/30">
                    {content.year}
                  </span>
                )}
                {(content.runtime || content.duration) && (
                  <span className="px-4 py-2 bg-blobbuster-darkBlue rounded-full text-white font-bold border-2 border-neon-cyan/30">
                    {content.runtime || Math.floor((content.duration || 0) / 60)} min
                  </span>
                )}
                {genres.length > 0 && genres.slice(0, 3).map((genre: string, idx: number) => (
                  <span key={idx} className="px-4 py-2 bg-blobbuster-darkBlue rounded-full text-neon-cyan font-bold border-2 border-neon-cyan/30">
                    {genre}
                  </span>
                ))}
              </div>

              {/* Description/Plot */}
              <div className="mb-6">
                <h3 className="text-xl font-heading text-blobbuster-gold uppercase mb-2">
                  Plot
                </h3>
                <p className="text-gray-300 leading-relaxed text-lg">
                  {content.plot || content.description || 'No description available.'}
                </p>
              </div>

              {/* Director & Views */}
              <div className="grid grid-cols-2 gap-4">
                {content.director && (
                  <div className="bg-blobbuster-darkBlue/50 rounded-lg p-4 border-2 border-blobbuster-yellow/20">
                    <p className="text-xs text-gray-400 uppercase mb-1">Director</p>
                    <p className="text-white font-bold text-lg">{content.director}</p>
                  </div>
                )}
                {content.totalStreams !== undefined && (
                  <div className="bg-blobbuster-darkBlue/50 rounded-lg p-4 border-2 border-neon-cyan/20">
                    <p className="text-xs text-gray-400 uppercase mb-1">Views</p>
                    <p className="text-neon-cyan font-bold text-lg">
                      {content.totalStreams.toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Cast */}
          {castList.length > 0 && (
            <div className="bg-blobbuster-navy/50 border border-neon-cyan/30 rounded-lg p-6">
              <h3 className="text-xl font-heading text-blobbuster-gold uppercase mb-4">
                Cast
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {castList.map((actor: any, idx: number) => (
                  <div key={idx} className="text-center">
                    {actor.profilePath && (
                      <img
                        src={actor.profilePath}
                        alt={actor.name}
                        className="w-full aspect-square rounded-full object-cover mb-2 border-3 border-blobbuster-yellow/30"
                      />
                    )}
                    <p className="text-sm font-bold text-white truncate">{actor.name}</p>
                    <p className="text-xs text-gray-400 truncate">{actor.character}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Availability Notice (if expiring soon) */}
          {expirationInfo && expirationInfo.color !== 'text-green-400' && (
            <div className={`rounded-lg p-6 border-2 ${
              expirationInfo.color === 'text-red-400' ? 'bg-red-900/20 border-red-500' :
              expirationInfo.color === 'text-orange-400' ? 'bg-orange-900/20 border-orange-500' :
              'bg-yellow-900/20 border-yellow-500'
            }`}>
              <div className="flex items-center gap-3">
                <span className="text-4xl">{expirationInfo.icon}</span>
                <div>
                  <p className={`text-lg font-bold ${expirationInfo.color}`}>
                    {expirationInfo.message}
                  </p>
                  <p className="text-sm text-gray-300 mt-1">
                    {expirationInfo.color === 'text-red-400'
                      ? 'This content will be removed soon. Watch it now!'
                      : expirationInfo.color === 'text-orange-400'
                      ? 'This content is expiring soon. Don\'t miss it!'
                      : 'Watch before it expires from our library.'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-blobbuster-navy border-t-3 border-blobbuster-yellow p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={onClose}
              className="flex-1 py-4 bg-gray-700 hover:bg-gray-600 rounded-lg font-bold transition uppercase border-3 border-gray-600 text-white"
            >
              Close
            </button>
            <button
              onClick={() => setShowTipModal(true)}
              disabled={!currentAccount || !content.uploader?.user?.walletAddress}
              className="btn-primary flex-1 py-4 rounded-lg justify-center gap-3 text-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              💰 Tip Provider
            </button>
            <button
              onClick={handleWatch}
              className="btn-primary flex-1 py-4 rounded-lg justify-center gap-3 text-xl"
            >
              🎬 Watch Now
            </button>
          </div>
        </div>

        {/* Tip Modal */}
        {showTipModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="fixed inset-0 bg-black/95 backdrop-blur-sm" onClick={() => !isTipping && setShowTipModal(false)} />
            <div className="relative z-10 bg-gradient-to-br from-blobbuster-navy via-blobbuster-darkBlue to-black border-4 border-blobbuster-gold rounded-2xl p-8 max-w-lg w-full shadow-2xl shadow-blobbuster-gold/30 animate-in zoom-in duration-300">
              {/* Header */}
              <div className="text-center mb-8">
                <div className="text-6xl mb-4">💰</div>
                <h3 className="text-4xl font-heading text-blobbuster-gold mb-2 uppercase tracking-wider">
                  TIP THE PROVIDER
                </h3>
                <p className="text-neon-cyan text-lg font-bold">
                  {content.uploader?.user?.username || 'Anonymous Provider'}
                </p>
                <p className="text-gray-400 text-sm mt-2">
                  Send SUI directly to support their work
                </p>
              </div>

              <div className="space-y-6">
                {/* Quick tip buttons */}
                <div>
                  <p className="text-gray-400 text-xs uppercase mb-3 tracking-wide">Quick Tips</p>
                  <div className="grid grid-cols-4 gap-3">
                    {['1', '5', '10', '25'].map((amount) => (
                      <button
                        key={amount}
                        onClick={() => handleTip(amount)}
                        disabled={isTipping}
                        className="group relative px-4 py-4 bg-gradient-to-br from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 border-3 border-yellow-700 rounded-xl font-black text-black text-lg transition-all transform hover:scale-105 hover:shadow-lg hover:shadow-yellow-500/50 disabled:opacity-50 disabled:transform-none"
                      >
                        <div className="text-sm opacity-70">SUI</div>
                        <div className="text-2xl">{amount}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom amount */}
                <div>
                  <p className="text-gray-400 text-xs uppercase mb-3 tracking-wide">Custom Amount</p>
                  <div className="flex gap-3">
                    <input
                      type="number"
                      placeholder="Enter amount..."
                      value={tipAmount}
                      onChange={(e) => setTipAmount(e.target.value)}
                      min="0.01"
                      step="0.01"
                      className="flex-1 px-6 py-4 bg-blobbuster-darkBlue border-3 border-neon-cyan/30 rounded-xl text-white text-lg placeholder-gray-500 focus:border-neon-cyan focus:outline-none focus:ring-2 focus:ring-neon-cyan/50"
                      disabled={isTipping}
                    />
                    <button
                      onClick={() => handleTip(tipAmount)}
                      disabled={isTipping || !tipAmount}
                      className="px-8 py-4 bg-gradient-to-r from-neon-cyan to-neon-blue text-black rounded-xl font-black text-lg hover:shadow-lg hover:shadow-neon-cyan/50 transition-all transform hover:scale-105 disabled:opacity-50 disabled:transform-none uppercase"
                    >
                      {isTipping ? 'Sending...' : 'Send'}
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => setShowTipModal(false)}
                  disabled={isTipping}
                  className="w-full py-4 bg-gray-800/50 hover:bg-gray-700 rounded-xl font-bold text-white transition uppercase border-2 border-gray-600 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
