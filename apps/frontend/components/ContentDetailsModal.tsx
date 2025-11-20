'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface ContentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: {
    id: string;
    title: string;
    description: string;
    thumbnailUrl?: string;
    posterUrl?: string;
    backdropUrl?: string;
    totalStreams: string | number;
    totalWatchTime?: string | number;
    averageCompletionRate?: number;
    ratingSum?: string | number;
    ratingCount?: string | number;
    status: number;
    createdAt: string;
    storage_epochs?: number;
    storage_expires_at?: string;
    durationSeconds?: number;
    genre?: number;
    year?: number;
    director?: string;
    externalRating?: number;
  };
  onExtendStorage?: () => void;
}

const GENRE_MAP: { [key: number]: string } = {
  0: 'Action',
  1: 'Comedy',
  2: 'Drama',
  3: 'Horror',
  4: 'Sci-Fi',
  5: 'Romance',
  6: 'Thriller',
  7: 'Documentary',
  8: 'Animation',
  9: 'Fantasy',
  10: 'Other',
};

export function ContentDetailsModal({
  isOpen,
  onClose,
  content,
  onExtendStorage,
}: ContentDetailsModalProps) {
  const router = useRouter();

  if (!isOpen) return null;

  // Calculate metrics
  const totalStreams = typeof content.totalStreams === 'string'
    ? parseInt(content.totalStreams)
    : content.totalStreams;

  const totalWatchTime = content.totalWatchTime
    ? (typeof content.totalWatchTime === 'string'
      ? parseInt(content.totalWatchTime)
      : content.totalWatchTime)
    : 0;

  const totalWatchHours = Math.floor(totalWatchTime / 3600);
  const totalWatchMinutes = Math.floor((totalWatchTime % 3600) / 60);

  const ratingCount = content.ratingCount
    ? (typeof content.ratingCount === 'string'
      ? parseInt(content.ratingCount)
      : content.ratingCount)
    : 0;

  const ratingSum = content.ratingSum
    ? (typeof content.ratingSum === 'string'
      ? parseInt(content.ratingSum)
      : content.ratingSum)
    : 0;

  const averageRating = ratingCount > 0 ? (ratingSum / ratingCount).toFixed(1) : 'N/A';

  // Expiration info
  const currentExpiration = content.storage_expires_at ? new Date(content.storage_expires_at) : null;
  const daysRemaining = currentExpiration
    ? Math.ceil((currentExpiration.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const isExpiringSoon = daysRemaining <= 30;
  const isExpired = daysRemaining <= 0;

  const handleWatch = () => {
    router.push(`/watch/${content.id}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 bg-gradient-to-br from-blockbuster-navy to-blockbuster-navy/90 border-3 border-blockbuster-yellow rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Backdrop Image Header */}
        {content.backdropUrl && (
          <div
            className="h-64 bg-cover bg-center relative rounded-t-lg"
            style={{ backgroundImage: `url(${content.backdropUrl})` }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-blockbuster-navy via-blockbuster-navy/80 to-transparent rounded-t-lg" />
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-white/80 hover:text-white transition bg-black/50 rounded-full p-2"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Header (if no backdrop) */}
        {!content.backdropUrl && (
          <div className="sticky top-0 bg-blockbuster-navy border-b-3 border-blockbuster-yellow p-6">
            <div className="flex items-start justify-between">
              <h2 className="text-3xl font-heading text-blockbuster-yellow uppercase">
                Content Analytics
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
        <div className="p-6 space-y-6">
          {/* Title & Poster Section */}
          <div className="flex items-start gap-6">
            {/* Poster */}
            {(content.posterUrl || content.thumbnailUrl) && (
              <div className="flex-shrink-0">
                <img
                  src={content.posterUrl || content.thumbnailUrl}
                  alt={content.title}
                  className="w-48 rounded-lg shadow-blockbuster border-3 border-blockbuster-yellow"
                />
              </div>
            )}

            {/* Info */}
            <div className="flex-1">
              <h1 className="text-4xl font-heading text-white mb-2 uppercase">
                {content.title}
              </h1>

              {/* Meta Info */}
              <div className="flex flex-wrap gap-3 mb-4 text-sm">
                {content.year && (
                  <span className="px-3 py-1 bg-blockbuster-darkBlue rounded-full text-blockbuster-yellow font-bold">
                    {content.year}
                  </span>
                )}
                {content.genre !== undefined && (
                  <span className="px-3 py-1 bg-blockbuster-darkBlue rounded-full text-neon-cyan font-bold">
                    {GENRE_MAP[content.genre] || 'Other'}
                  </span>
                )}
                <span className={`px-3 py-1 rounded-full font-bold ${
                  content.status === 1 ? 'bg-green-900/30 text-green-400' :
                  content.status === 2 ? 'bg-red-900/30 text-red-400' :
                  'bg-gray-900/30 text-gray-400'
                }`}>
                  {content.status === 1 ? 'Active' : content.status === 2 ? 'Expired' : 'Inactive'}
                </span>
              </div>

              {/* Description */}
              <p className="text-gray-300 leading-relaxed mb-4">
                {content.description}
              </p>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blockbuster-darkBlue/50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 uppercase">Uploaded</p>
                  <p className="text-white font-bold">
                    {new Date(content.createdAt).toLocaleDateString()}
                  </p>
                </div>
                {content.director && (
                  <div className="bg-blockbuster-darkBlue/50 rounded-lg p-3">
                    <p className="text-xs text-gray-400 uppercase">Director</p>
                    <p className="text-white font-bold">{content.director}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="bg-blockbuster-navy/50 border border-neon-cyan/30 rounded-lg p-6">
            <h3 className="text-xl font-heading text-blockbuster-gold uppercase mb-4">
              📊 Performance Metrics
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Total Streams */}
              <div className="bg-blockbuster-darkBlue/50 rounded-lg p-4 text-center">
                <div className="text-3xl font-black text-blockbuster-yellow mb-1">
                  {totalStreams.toLocaleString()}
                </div>
                <p className="text-xs text-gray-400 uppercase">Total Streams</p>
              </div>

              {/* Watch Time */}
              <div className="bg-blockbuster-darkBlue/50 rounded-lg p-4 text-center">
                <div className="text-3xl font-black text-neon-cyan mb-1">
                  {totalWatchHours > 0 ? `${totalWatchHours}h` : `${totalWatchMinutes}m`}
                </div>
                <p className="text-xs text-gray-400 uppercase">Watch Time</p>
              </div>

              {/* Completion Rate */}
              <div className="bg-blockbuster-darkBlue/50 rounded-lg p-4 text-center">
                <div className="text-3xl font-black text-green-400 mb-1">
                  {content.averageCompletionRate || 0}%
                </div>
                <p className="text-xs text-gray-400 uppercase">Avg. Completion</p>
                <p className="text-xs text-gray-500 mt-1">
                  {(content.averageCompletionRate ?? 0) >= 80 ? '🔥 1.5x bonus' :
                   (content.averageCompletionRate ?? 0) >= 50 ? '✨ 1.25x bonus' :
                   '📊 1.0x base'}
                </p>
              </div>

              {/* Average Rating */}
              <div className="bg-blockbuster-darkBlue/50 rounded-lg p-4 text-center">
                <div className="text-3xl font-black text-yellow-400 mb-1">
                  {averageRating === 'N/A' ? averageRating : `⭐ ${averageRating}`}
                </div>
                <p className="text-xs text-gray-400 uppercase">
                  {ratingCount} {ratingCount === 1 ? 'Rating' : 'Ratings'}
                </p>
              </div>
            </div>
          </div>

          {/* Storage Information */}
          <div className={`border rounded-lg p-6 ${
            isExpired ? 'bg-red-900/20 border-red-500' :
            isExpiringSoon ? 'bg-orange-900/20 border-orange-500' :
            'bg-blockbuster-navy/50 border-neon-cyan/30'
          }`}>
            <h3 className="text-xl font-heading text-blockbuster-gold uppercase mb-4">
              💾 Storage Information
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-gray-400 uppercase mb-1">Current Epochs</p>
                <p className="text-white text-lg font-bold">
                  {content.storage_epochs || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase mb-1">Days Remaining</p>
                <p className={`text-lg font-bold ${
                  isExpired ? 'text-red-400' :
                  daysRemaining <= 7 ? 'text-red-400' :
                  daysRemaining <= 30 ? 'text-orange-400' :
                  'text-green-400'
                }`}>
                  {isExpired ? 'EXPIRED' : `${daysRemaining} days`}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase mb-1">Expires On</p>
                <p className="text-white text-lg font-bold">
                  {currentExpiration?.toLocaleDateString() || 'Unknown'}
                </p>
              </div>
            </div>

            {isExpiringSoon && onExtendStorage && (
              <button
                onClick={() => {
                  onClose();
                  onExtendStorage();
                }}
                className="mt-4 w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg transition uppercase"
              >
                ⚠️ Extend Storage Now
              </button>
            )}
          </div>

          {/* Revenue Insights (Placeholder - would need API endpoint) */}
          <div className="bg-blockbuster-navy/50 border border-neon-cyan/30 rounded-lg p-6">
            <h3 className="text-xl font-heading text-blockbuster-gold uppercase mb-4">
              💰 Revenue Insights
            </h3>
            <p className="text-gray-400 text-sm">
              Your earnings are calculated weekly based on this content's weighted score.
              Higher completion rates earn 1.5x bonus (80%+) or 1.25x bonus (50-79%).
            </p>
            <div className="mt-4 p-4 bg-blockbuster-darkBlue/50 rounded-lg">
              <p className="text-xs text-gray-400 uppercase mb-2">Weighted Score Multiplier</p>
              <p className="text-2xl font-black text-blockbuster-yellow">
                {content.averageCompletionRate >= 80 ? '1.5x' :
                 content.averageCompletionRate >= 50 ? '1.25x' :
                 '1.0x'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Based on {content.averageCompletionRate}% average completion rate
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-blockbuster-navy border-t-3 border-blockbuster-yellow p-6">
          <div className="flex gap-4">
            <button
              onClick={onClose}
              className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-bold transition uppercase border-3 border-gray-600"
            >
              Close
            </button>
            <button
              onClick={handleWatch}
              className="btn-primary flex-1 py-3 rounded-lg justify-center gap-2 text-lg"
            >
              🎬 Watch Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
