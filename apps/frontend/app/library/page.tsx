'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import axios from 'axios';
import Header from '@/components/Header';
import { MovieDetailsModal } from '@/components/MovieDetailsModal';
import { CategoryRow } from '@/components/CategoryRow';
import { CategorySelector } from '@/components/CategorySelector';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Default categories to show
const DEFAULT_CATEGORIES = ['recently_added', 'popular', 'highest_rated', 'decade_1980s'];
const STORAGE_KEY = 'blobBuster_libraryCategories';

interface Movie {
  id: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  posterUrl?: string;
  year?: number;
  externalRating?: number;
  totalStreams?: number;
  createdAt?: string;
  watchedByUser?: boolean;
  // Additional fields for modal
  plot?: string;
  runtime?: number;
  genresList?: string;
  director?: string;
  cast?: string;
  tagline?: string;
  backdropUrl?: string;
  genre?: number;
  walrusBlobIds?: string | object;
  storage_expires_at?: string;
  uploader?: {
    id: string;
    user: {
      username: string;
      walletAddress?: string;
    };
  };
}

interface Category {
  id: string;
  label: string;
  movies: Movie[];
  totalCount: number;
}

interface AvailableCategory {
  id: string;
  label: string;
  count: number;
  group: string;
}

export default function LibraryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, accessToken } = useAuth();

  const [categories, setCategories] = useState<Category[]>([]);
  const [availableCategories, setAvailableCategories] = useState<AvailableCategory[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(DEFAULT_CATEGORIES);
  const [loading, setLoading] = useState(true);
  const [showMembershipModal, setShowMembershipModal] = useState(false);
  const [showMovieModal, setShowMovieModal] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [hasMembership, setHasMembership] = useState(false);

  // Category selector state
  const [showCategorySelector, setShowCategorySelector] = useState(false);
  const [editingCategoryIndex, setEditingCategoryIndex] = useState<number | null>(null);

  // Provider filter state
  const [providerCode, setProviderCode] = useState('');
  const [activeProviderCode, setActiveProviderCode] = useState<string | null>(null);
  const [providerInfo, setProviderInfo] = useState<{ username: string; contentCount: number } | null>(null);
  const [providerError, setProviderError] = useState<string | null>(null);

  // Load saved categories from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === 4) {
          setSelectedCategoryIds(parsed);
        }
      } catch (e) {
        console.error('Failed to parse saved categories');
      }
    }
  }, []);

  // Save categories to localStorage when they change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedCategoryIds));
  }, [selectedCategoryIds]);

  // Check URL params for provider code on mount
  useEffect(() => {
    const providerParam = searchParams.get('provider');
    if (providerParam) {
      setProviderCode(providerParam.toUpperCase());
      applyProviderFilter(providerParam);
    }
  }, []);

  // Fetch categories when selection changes
  useEffect(() => {
    if (!activeProviderCode) {
      fetchCategories();
    }
  }, [selectedCategoryIds, accessToken, activeProviderCode]);

  // Fetch available categories for the picker
  useEffect(() => {
    fetchAvailableCategories();
  }, []);

  // Check if user has membership
  useEffect(() => {
    const checkMembership = async () => {
      if (!isAuthenticated || !accessToken) {
        setHasMembership(false);
        return;
      }

      try {
        const response = await axios.get(`${API_URL}/api/membership/user/me`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const hasActiveMembership = response.data.hasMembership && response.data.membership?.isActive;
        setHasMembership(hasActiveMembership);
      } catch (error) {
        console.error('[Library] Error checking membership:', error);
        setHasMembership(false);
      }
    };

    checkMembership();
  }, [isAuthenticated, accessToken]);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('categories', selectedCategoryIds.join(','));

      const headers: HeadersInit = {};
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }

      const response = await fetch(`${API_URL}/api/content/categories?${params.toString()}`, { headers });
      const data = await response.json();

      if (data.success) {
        setCategories(data.categories);
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableCategories = async () => {
    try {
      const response = await fetch(`${API_URL}/api/content/available-categories`);
      const data = await response.json();
      if (data.success) {
        setAvailableCategories(data.categories);
      }
    } catch (error) {
      console.error('Failed to fetch available categories:', error);
    }
  };

  const applyProviderFilter = async (code: string) => {
    const normalized = code.toUpperCase().trim();
    if (normalized.length !== 5) {
      setProviderError('Code must be 5 characters');
      return;
    }

    try {
      const response = await axios.post(`${API_URL}/api/referral/validate`, { code: normalized });
      if (response.data.valid) {
        setActiveProviderCode(normalized);
        setProviderError(null);
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
    const url = new URL(window.location.href);
    url.searchParams.delete('provider');
    window.history.pushState({}, '', url);
  };

  const handleMovieClick = async (movie: Movie) => {
    if (!isAuthenticated) {
      router.push('/membership');
      return;
    }

    if (!hasMembership) {
      setShowMembershipModal(true);
      return;
    }

    // Fetch full movie details for the modal
    try {
      const headers: HeadersInit = {};
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }
      const response = await fetch(`${API_URL}/api/content/${movie.id}`, { headers });
      const data = await response.json();
      if (data.success) {
        setSelectedMovie(data.content);
        setShowMovieModal(true);
      }
    } catch (error) {
      console.error('Failed to fetch movie details:', error);
      // Fall back to basic info
      setSelectedMovie(movie);
      setShowMovieModal(true);
    }
  };

  const handleCategoryClick = (categoryId: string) => {
    // Find which index this category is at
    const index = selectedCategoryIds.indexOf(categoryId);
    if (index !== -1) {
      setEditingCategoryIndex(index);
      setShowCategorySelector(true);
    }
  };

  const handleCategorySelect = (newCategoryId: string) => {
    if (editingCategoryIndex !== null) {
      const newCategories = [...selectedCategoryIds];
      newCategories[editingCategoryIndex] = newCategoryId;
      setSelectedCategoryIds(newCategories);
    }
    setShowCategorySelector(false);
    setEditingCategoryIndex(null);
  };

  return (
    <div className="min-h-screen">
      <Header />

      <div className="container mx-auto p-8">
        <h1 className="text-5xl font-heading text-blobbuster-gold mb-8">
          CONTENT LIBRARY
        </h1>

        {/* Provider Filter Section */}
        <div className="mb-8 blobbuster-card p-6">
          <h3 className="text-xl font-bold text-blobbuster-yellow uppercase mb-4">
            Browse by Provider
          </h3>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
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
                  className="flex-1 px-4 py-3 bg-white border-3 border-blobbuster-yellow/30 rounded-lg text-blobbuster-navy placeholder-gray-400 uppercase font-mono text-lg tracking-wider focus:border-blobbuster-yellow focus:outline-none"
                />
                <button
                  onClick={() => applyProviderFilter(providerCode)}
                  disabled={providerCode.length !== 5}
                  className="px-6 py-3 btn-primary rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed uppercase"
                >
                  Find Collection
                </button>
                {activeProviderCode && (
                  <button
                    onClick={clearProviderFilter}
                    className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-bold transition uppercase border-3 border-gray-600"
                  >
                    Clear
                  </button>
                )}
              </div>
              {providerError && (
                <p className="text-red-400 text-sm mt-2">{providerError}</p>
              )}
            </div>
          </div>

          {/* Active Provider Banner */}
          {activeProviderCode && providerInfo && (
            <div className="mt-4 p-4 bg-blobbuster-darkBlue border-3 border-blobbuster-yellow/50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400 uppercase font-bold">Currently Viewing</p>
                  <p className="text-xl font-black text-blobbuster-yellow uppercase">
                    {providerInfo.username}'s Collection
                  </p>
                  <p className="text-sm text-gray-400">
                    {providerInfo.contentCount} {providerInfo.contentCount === 1 ? 'movie' : 'movies'} available
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400 uppercase">Code</p>
                  <p className="text-2xl font-black text-blobbuster-yellow tracking-widest">{activeProviderCode}</p>
                </div>
              </div>
            </div>
          )}

          {!activeProviderCode && (
            <p className="mt-4 text-sm text-gray-400 text-center">
              Enter a provider's referral code to browse their exclusive collection
            </p>
          )}
        </div>

        {/* Category Rows Info */}
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-gray-400">
            Click on a category name to change it
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="text-neon-cyan text-xl">Loading content...</div>
          </div>
        )}

        {/* Category Rows */}
        {!loading && !activeProviderCode && (
          <div className="space-y-2">
            {categories.map((category) => (
              <CategoryRow
                key={category.id}
                categoryId={category.id}
                label={category.label}
                movies={category.movies}
                totalCount={category.totalCount}
                onMovieClick={handleMovieClick}
                onCategoryClick={handleCategoryClick}
                hasMembership={hasMembership}
              />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && categories.length === 0 && !activeProviderCode && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-xl mb-4">No content found</div>
            <p className="text-gray-500">Be the first to upload content!</p>
          </div>
        )}

        {/* Category Selector Modal */}
        <CategorySelector
          isOpen={showCategorySelector}
          onClose={() => {
            setShowCategorySelector(false);
            setEditingCategoryIndex(null);
          }}
          currentCategoryId={editingCategoryIndex !== null ? selectedCategoryIds[editingCategoryIndex] : ''}
          availableCategories={availableCategories}
          onSelect={handleCategorySelect}
        />

        {/* Membership Required Modal */}
        {showMembershipModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setShowMembershipModal(false)}
            ></div>
            <div className="relative z-10 bg-gradient-to-br from-blobbuster-navy to-blobbuster-navy/90 border-2 border-neon-cyan/30 rounded-xl shadow-2xl max-w-md w-full p-8 animate-in fade-in zoom-in duration-300">
              <div className="text-center">
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
                <h2 className="text-2xl font-heading text-blobbuster-gold mb-4">
                  Membership Required
                </h2>
                <p className="text-gray-300 mb-8 leading-relaxed">
                  You need an active BlobBuster membership to watch content. Get instant access to our entire library!
                </p>
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
