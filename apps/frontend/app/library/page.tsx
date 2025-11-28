'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import axios from 'axios';
import Header from '@/components/Header';
import { MovieDetailsModal } from '@/components/MovieDetailsModal';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Content {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string | null;
  duration: number;
  genre: number;
  totalStreams: number;
  createdAt: string;

  // TMDB Metadata
  posterUrl?: string;
  backdropUrl?: string;
  year?: number;
  plot?: string;
  runtime?: number;
  externalRating?: number;
  genresList?: string;
  director?: string;
  cast?: string;
  tagline?: string;

  // Storage expiration
  storage_epochs?: number;
  storage_expires_at?: string;

  // Walrus blob IDs for prefetching
  walrusBlobIds?: string | object;

  uploader: {
    id: string;
    user: {
      username: string;
      walletAddress?: string;
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

export default function LibraryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, accessToken } = useAuth();
  const [content, setContent] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [genre, setGenre] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showMembershipModal, setShowMembershipModal] = useState(false);
  const [showMovieModal, setShowMovieModal] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState<Content | null>(null);
  const [hasMembership, setHasMembership] = useState(false);

  // Provider filter state
  const [providerCode, setProviderCode] = useState('');
  const [activeProviderCode, setActiveProviderCode] = useState<string | null>(null);
  const [providerInfo, setProviderInfo] = useState<{ username: string; contentCount: number } | null>(null);
  const [providerError, setProviderError] = useState<string | null>(null);

  // Check URL params for provider code on mount
  useEffect(() => {
    const providerParam = searchParams.get('provider');
    if (providerParam) {
      setProviderCode(providerParam.toUpperCase());
      applyProviderFilter(providerParam);
    }
  }, []);

  useEffect(() => {
    fetchContent();
  }, [genre, activeProviderCode]);

  // Check if user has membership
  useEffect(() => {
    const checkMembership = async () => {
      console.log('[Library] Checking membership...', { isAuthenticated, hasAccessToken: !!accessToken });

      if (!isAuthenticated || !accessToken) {
        console.log('[Library] Not authenticated or no access token');
        setHasMembership(false);
        return;
      }

      try {
        const response = await axios.get(`${API_URL}/api/membership/user/me`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        console.log('[Library] Membership API response:', response.data);
        console.log('[Library] Has membership:', response.data.hasMembership);
        console.log('[Library] Membership is active:', response.data.membership?.isActive);

        // Check both hasMembership AND isActive status
        const hasActiveMembership = response.data.hasMembership && response.data.membership?.isActive;
        console.log('[Library] Final hasActiveMembership:', hasActiveMembership);
        setHasMembership(hasActiveMembership);
      } catch (error) {
        console.error('[Library] Error checking membership:', error);
        setHasMembership(false);
      }
    };

    checkMembership();
  }, [isAuthenticated, accessToken]);

  const fetchContent = async () => {
    try {
      setLoading(true);

      let url: string;
      if (activeProviderCode) {
        // Fetch from provider-specific endpoint
        url = `${API_URL}/api/referral/content/${activeProviderCode}`;
      } else {
        // Fetch all content
        const params = new URLSearchParams();
        if (genre !== 'all') {
          params.append('genre', genre);
        }
        url = `${API_URL}/api/content?${params.toString()}`;
      }

      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setContent(data.content);
        if (data.provider) {
          setProviderInfo({
            username: data.provider.username,
            contentCount: data.pagination.total,
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch content:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyProviderFilter = async (code: string) => {
    const normalized = code.toUpperCase().trim();
    if (normalized.length !== 5) {
      setProviderError('Code must be 5 characters');
      return;
    }

    try {
      // Validate code first
      const response = await axios.post(`${API_URL}/api/referral/validate`, {
        code: normalized,
      });

      if (response.data.valid) {
        setActiveProviderCode(normalized);
        setProviderError(null);
        // Update URL
        const url = new URL(window.location.href);
        url.searchParams.set('provider', normalized);
        window.history.pushState({}, '', url);
      } else {
        setProviderError('Invalid referral code');
        setActiveProviderCode(null);
        setProviderInfo(null);
      }
    } catch (error) {
      console.error('Failed to validate code:', error);
      setProviderError('Failed to validate code');
    }
  };

  const clearProviderFilter = () => {
    setProviderCode('');
    setActiveProviderCode(null);
    setProviderInfo(null);
    setProviderError(null);
    // Remove URL param
    const url = new URL(window.location.href);
    url.searchParams.delete('provider');
    window.history.pushState({}, '', url);
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getExpirationWarning = (expiresAt?: string) => {
    if (!expiresAt) return null;

    const now = new Date();
    const expirationDate = new Date(expiresAt);
    const daysRemaining = Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysRemaining <= 0) {
      return { message: 'EXPIRED', color: 'bg-red-600', days: 0 };
    } else if (daysRemaining <= 7) {
      return { message: `${daysRemaining}d left`, color: 'bg-red-500', days: daysRemaining };
    } else if (daysRemaining <= 14) {
      return { message: `${daysRemaining}d left`, color: 'bg-orange-500', days: daysRemaining };
    } else if (daysRemaining <= 30) {
      return { message: `${daysRemaining}d left`, color: 'bg-yellow-500', days: daysRemaining };
    }

    return null; // Don't show warning if more than 30 days
  };

  const handleMovieClick = (item: Content) => {
    if (!isAuthenticated) {
      router.push('/membership');
      return;
    }

    if (!hasMembership) {
      setShowMembershipModal(true);
      return;
    }

    // Open movie details modal
    setSelectedMovie(item);
    setShowMovieModal(true);
  };

  const filteredContent = content.filter((item) =>
    searchQuery
      ? item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase())
      : true
  );

  return (
    <div className="min-h-screen">
      <Header />

      <div className="container mx-auto p-8">
        <h1 className="text-5xl font-heading text-blobbuster-gold mb-8">
          CONTENT LIBRARY
        </h1>

        {/* Provider Filter Section */}
        <div className="mb-8 p-6 bg-blobbuster-navy/50 border-2 border-neon-cyan/30 rounded-lg">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-bold text-blobbuster-gold uppercase mb-2">
                🎬 Browse by Provider
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={providerCode}
                  onChange={(e) => setProviderCode(e.target.value.toUpperCase())}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      applyProviderFilter(providerCode);
                    }
                  }}
                  placeholder="Enter 5-character code"
                  maxLength={5}
                  className="flex-1 px-4 py-2 bg-blobbuster-navy border border-neon-cyan/20 rounded text-white placeholder-gray-500 uppercase font-mono text-lg tracking-wider"
                />
                <button
                  onClick={() => applyProviderFilter(providerCode)}
                  disabled={providerCode.length !== 5}
                  className="px-6 py-2 btn-primary rounded font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Find Collection
                </button>
                {activeProviderCode && (
                  <button
                    onClick={clearProviderFilter}
                    className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded font-bold transition"
                  >
                    Clear
                  </button>
                )}
              </div>
              {providerError && (
                <p className="text-red-400 text-sm mt-2">⚠️ {providerError}</p>
              )}
            </div>
          </div>

          {/* Active Provider Banner */}
          {activeProviderCode && providerInfo && (
            <div className="mt-4 p-4 bg-blobbuster-gold/10 border border-blobbuster-gold/30 rounded">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400 uppercase font-bold">Currently Viewing</p>
                  <p className="text-xl font-black text-blobbuster-gold">
                    {providerInfo.username}'s Collection
                  </p>
                  <p className="text-sm text-gray-400">
                    {providerInfo.contentCount} {providerInfo.contentCount === 1 ? 'movie' : 'movies'} available
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400 uppercase">Code</p>
                  <p className="text-2xl font-black text-neon-cyan tracking-widest">{activeProviderCode}</p>
                </div>
              </div>
            </div>
          )}

          {!activeProviderCode && (
            <p className="mt-3 text-sm text-gray-400 text-center">
              Enter a provider's referral code to browse their exclusive collection
            </p>
          )}
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-8">
          <select
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            className="px-4 py-2 bg-blobbuster-navy border border-neon-cyan/20 rounded font-bold"
            style={{ color: '#FFD700' }}
          >
            <option value="all" className="bg-blobbuster-navy text-white">All Genres</option>
            <option value="1" className="bg-blobbuster-navy text-white">Action</option>
            <option value="2" className="bg-blobbuster-navy text-white">Comedy</option>
            <option value="3" className="bg-blobbuster-navy text-white">Drama</option>
            <option value="4" className="bg-blobbuster-navy text-white">Horror</option>
            <option value="5" className="bg-blobbuster-navy text-white">Sci-Fi</option>
            <option value="6" className="bg-blobbuster-navy text-white">Documentary</option>
            <option value="7" className="bg-blobbuster-navy text-white">Thriller</option>
            <option value="8" className="bg-blobbuster-navy text-white">Romance</option>
            <option value="9" className="bg-blobbuster-navy text-white">Animation</option>
            <option value="10" className="bg-blobbuster-navy text-white">Other</option>
          </select>

          <input
            type="search"
            placeholder="Search content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-4 py-2 bg-blobbuster-navy border border-neon-cyan/20 rounded text-white placeholder-gray-500"
          />
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="text-neon-cyan text-xl">Loading content...</div>
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredContent.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-xl mb-4">No content found</div>
            <p className="text-gray-500">
              {searchQuery
                ? 'Try a different search term'
                : 'Be the first to upload content!'}
            </p>
          </div>
        )}

        {/* Content Grid */}
        {!loading && filteredContent.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {filteredContent.map((item) => (
              <div
                key={item.id}
                onClick={() => handleMovieClick(item)}
                className="group cursor-pointer relative"
              >
                <div className="aspect-[2/3] bg-blobbuster-navy/50 rounded-lg mb-2 overflow-hidden border border-neon-cyan/20 group-hover:border-neon-pink transition relative">
                  {/* Use TMDB poster if available, fallback to thumbnail */}
                  {item.posterUrl || item.thumbnailUrl ? (
                    <>
                      <img
                        src={item.posterUrl || item.thumbnailUrl || ''}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />

                      {/* Expiration Warning Badge */}
                      {(() => {
                        const warning = getExpirationWarning(item.storage_expires_at);
                        return warning ? (
                          <div className={`absolute top-2 left-2 ${warning.color} px-2 py-1 rounded text-xs font-bold backdrop-blur-sm text-white shadow-lg`}>
                            ⚠️ {warning.message}
                          </div>
                        ) : null;
                      })()}

                      {/* Rating Badge */}
                      {item.externalRating && (
                        <div className="absolute top-2 right-2 bg-black/80 px-2 py-1 rounded text-xs font-bold backdrop-blur-sm">
                          ⭐ {item.externalRating.toFixed(1)}
                        </div>
                      )}

                      {/* Hover Overlay with Plot */}
                      {item.plot && (
                        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-end">
                          <p className="text-xs text-gray-300 line-clamp-4 leading-relaxed">
                            {item.plot}
                          </p>
                          {item.director && (
                            <p className="text-xs text-neon-cyan mt-2">
                              Dir: {item.director}
                            </p>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-600">
                      <div className="text-center p-4">
                        <div className="text-4xl mb-2">🎬</div>
                        <div className="text-sm">{item.title}</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Title */}
                <h3 className="font-bold text-sm mb-1 group-hover:text-neon-cyan transition line-clamp-2">
                  {item.title}
                </h3>

                {/* Metadata */}
                <p className="text-xs text-gray-400">
                  {item.year || new Date(item.createdAt).getFullYear()} •{' '}
                  {item.runtime ? `${item.runtime} min` : formatDuration(item.duration)}
                </p>

                {/* Genres from TMDB or fallback */}
                {item.genresList ? (
                  <p className="text-xs text-gray-500 mt-1">
                    {JSON.parse(item.genresList).slice(0, 2).join(', ')}
                  </p>
                ) : (
                  <p className="text-xs text-gray-500 mt-1">
                    {GENRE_MAP[item.genre] || 'Other'}
                  </p>
                )}

                {/* Views */}
                <p className="text-xs text-gray-600 mt-1">
                  {item.totalStreams.toLocaleString()} views
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Membership Required Modal */}
        {showMembershipModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setShowMembershipModal(false)}
            ></div>

            {/* Modal */}
            <div className="relative z-10 bg-gradient-to-br from-blobbuster-navy to-blobbuster-navy/90 border-2 border-neon-cyan/30 rounded-xl shadow-2xl max-w-md w-full p-8 animate-in fade-in zoom-in duration-300">
              <div className="text-center">
                {/* Icon */}
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-neon-pink/20 flex items-center justify-center">
                  <svg
                    className="w-10 h-10 text-neon-pink"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                </div>

                {/* Title */}
                <h2 className="text-2xl font-heading text-blobbuster-gold mb-4">
                  Membership Required
                </h2>

                {/* Message */}
                <p className="text-gray-300 mb-8 leading-relaxed">
                  You need an active BlobBuster membership to watch content. Get instant access to our entire library!
                </p>

                {/* Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={() => router.push('/membership')}
                    className="px-6 py-3 bg-gradient-to-r from-neon-cyan to-neon-blue text-black rounded-lg font-bold hover:shadow-lg hover:shadow-neon-cyan/50 transition-all duration-300 transform hover:scale-105"
                  >
                    Get Membership
                  </button>
                  <button
                    onClick={() => setShowMembershipModal(false)}
                    className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg font-bold transition-all duration-300"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Movie Details Modal */}
      {selectedMovie && (
        <MovieDetailsModal
          isOpen={showMovieModal}
          onClose={() => {
            setShowMovieModal(false);
            setSelectedMovie(null);
          }}
          content={{
            ...selectedMovie,
            thumbnailUrl: selectedMovie.thumbnailUrl ?? undefined,
          }}
        />
      )}
    </div>
  );
}
