'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { VideoPlayer } from '@/components/VideoPlayer';
import { useAuth } from '@/lib/auth/AuthContext';
import Header from '@/components/Header';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Content {
  id: string;
  blockchainId: string;
  title: string;
  description: string;
  genre: number;
  durationSeconds: number;
  thumbnailUrl?: string;
  totalStreams: number;
  averageCompletionRate: number;
  ratingSum: number;
  ratingCount: number;
  uploader: {
    id: string;
    username?: string;
  };
}

interface StreamSession {
  sessionId: string;
  streamUrl: string;
}

export default function WatchPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  const { isAuthenticated, accessToken, user, isLoading: authLoading } = useAuth();

  const [content, setContent] = useState<Content | null>(null);
  const [streamSession, setStreamSession] = useState<StreamSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Debug: Log auth state changes
  useEffect(() => {
    console.log('[Watch Page] Auth State:', {
      isAuthenticated,
      authLoading,
      hasAccessToken: !!accessToken,
      accessTokenPreview: accessToken ? accessToken.substring(0, 20) + '...' : 'none',
      user: user ? {
        id: user.id,
        walletAddress: user.walletAddress,
        username: user.username,
      } : 'none',
    });
  }, [isAuthenticated, authLoading, accessToken, user]);

  // Fetch content details
  useEffect(() => {
    const fetchContent = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/content/${id}`);
        setContent(response.data.content);
      } catch (err: any) {
        console.error('Failed to fetch content:', err);
        setError(err.response?.data?.error || 'Failed to load content');
      }
    };

    fetchContent();
  }, [id]);

  // Start streaming session
  useEffect(() => {
    console.log('[Watch] Auth check:', {
      isAuthenticated,
      hasAccessToken: !!accessToken,
      hasContent: !!content,
      contentId: content?.id
    });

    if (!isAuthenticated || !content) {
      console.log('[Watch] Not ready to start stream - missing auth or content');
      return;
    }

    const startStream = async () => {
      try {
        setIsLoading(true);

        console.log('[Watch] Starting stream for content:', content.id);
        console.log('[Watch] Using access token:', accessToken?.substring(0, 20) + '...');

        const response = await axios.post(
          `${API_URL}/api/stream/start`,
          {
            contentId: content.id,
          },
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        console.log('[Watch] ✅ Stream started successfully:', response.data);
        console.log('[Watch] Stream URL:', response.data.streamUrl);
        setStreamSession(response.data);
        setError(null);
      } catch (err: any) {
        console.error('[Watch] ❌ Failed to start stream:', err);
        console.error('[Watch] Error response:', err.response?.data);
        console.error('[Watch] Error status:', err.response?.status);

        const errorMessage = err.response?.data?.error || 'Failed to start stream';
        const errorCode = err.response?.data?.code;

        if (errorCode === 'NO_MEMBERSHIP') {
          console.log('[Watch] Membership required error');
          setError('You need an active membership to watch content. Please purchase a membership.');
        } else {
          console.log('[Watch] Other error:', errorMessage);
          setError(errorMessage);
        }
      } finally {
        setIsLoading(false);
      }
    };

    startStream();
  }, [isAuthenticated, content, accessToken]);

  // Redirect if not authenticated (but only after auth has loaded)
  useEffect(() => {
    if (!isAuthenticated && !authLoading && !isLoading) {
      console.log('[Watch Page] Not authenticated, redirecting to membership page');
      router.push('/membership');
    }
  }, [isAuthenticated, authLoading, isLoading, router]);

  if (isLoading && !content) {
    return (
      <div className="min-h-screen bg-blobbuster-navy flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-neon-cyan mx-auto mb-4"></div>
          <p className="text-gray-300">Loading content...</p>
        </div>
      </div>
    );
  }

  if (error) {
    const isMembershipError = error.includes('membership') || error.includes('Membership');

    return (
      <div className="min-h-screen bg-blobbuster-navy flex items-center justify-center p-4">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm"></div>

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
              {isMembershipError ? 'Membership Required' : 'Oops!'}
            </h2>

            {/* Message */}
            <p className="text-gray-300 mb-8 leading-relaxed">
              {isMembershipError
                ? 'You need an active BlobBuster membership to watch content. Get instant access to our entire library!'
                : error
              }
            </p>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {isMembershipError && (
                <button
                  onClick={() => router.push('/membership')}
                  className="px-6 py-3 bg-gradient-to-r from-neon-cyan to-neon-blue text-black rounded-lg font-bold hover:shadow-lg hover:shadow-neon-cyan/50 transition-all duration-300 transform hover:scale-105"
                >
                  Get Membership
                </button>
              )}
              <button
                onClick={() => router.push('/library')}
                className={`px-6 py-3 ${isMembershipError ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-neon-cyan text-black hover:bg-neon-cyan/80'} rounded-lg font-bold transition-all duration-300`}
              >
                Back to Library
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="min-h-screen bg-blobbuster-navy flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-300">Content not found</p>
        </div>
      </div>
    );
  }

  console.log('Rendering watch page, streamSession:', streamSession);
  console.log('isLoading:', isLoading, 'content:', content);

  return (
    <div className="min-h-screen bg-blobbuster-navy">
      <Header />
      {/* Video Player */}
      <div className="relative">
        {streamSession && (
          <VideoPlayer
            contentId={content.id}
            sessionId={streamSession.sessionId}
            streamUrl={streamSession.streamUrl}
            durationSeconds={content.durationSeconds}
            accessToken={accessToken || ''}
          />
        )}

        {isLoading && !streamSession && (
          <div className="aspect-video bg-black flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-neon-cyan mx-auto mb-4"></div>
              <p className="text-white">Starting stream...</p>
            </div>
          </div>
        )}
      </div>

      {/* Content Info */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl">
          <h1 className="text-4xl font-heading text-blobbuster-gold mb-4">
            {content.title}
          </h1>

          <div className="flex items-center gap-6 text-gray-400 mb-6">
            <span>{Math.floor(content.durationSeconds / 60)} min</span>
            {content.ratingCount > 0 && (
              <span>
                ⭐ {(content.ratingSum / content.ratingCount).toFixed(1)} / 5.0
              </span>
            )}
            <span>{content.totalStreams.toLocaleString()} views</span>
            <span>{content.averageCompletionRate}% completion rate</span>
          </div>

          <p className="text-gray-300 mb-6 leading-relaxed">
            {content.description}
          </p>

          <div className="border-t border-neon-cyan/20 pt-6">
            <p className="text-sm text-gray-400">
              Uploaded by{' '}
              <span className="text-neon-cyan">
                {content.uploader.username || 'Anonymous'}
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
