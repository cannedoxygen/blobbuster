'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthContext';
import Header from '@/components/Header';
import { ExtendStorageModal } from '@/components/ExtendStorageModal';
import { ContentDetailsModal } from '@/components/ContentDetailsModal';
import ReferralSuccessModal from '@/components/ReferralSuccessModal';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface UploaderProfile {
  id: string;
  blockchainAccountId: string;
  totalEarnings: string;
  pendingEarnings: string;
  totalStreams: string;
  totalContentUploaded: number;
}

interface Analytics {
  totalEarnings: string;
  pendingEarnings: string;
  totalStreams: string;
  totalContent: number;
  referralCode: string | null;
  referralCount: number;
  averageCompletion: number;
  topContent: Array<{
    id: string;
    title: string;
    streams: string;
    completionRate: number;
  }>;
}

interface Content {
  id: string;
  title: string;
  description: string;
  thumbnailUrl?: string;
  posterUrl?: string;
  backdropUrl?: string;
  totalStreams: string;
  totalWatchTime?: string;
  averageCompletionRate?: number;
  ratingSum?: string;
  ratingCount?: string;
  status: number;
  createdAt: string;
  storage_epochs?: number;
  storage_expires_at?: string;
  durationSeconds?: number;
  genre?: number;
  year?: number;
  director?: string;
  externalRating?: number;
}

export default function UploaderPage() {
  const router = useRouter();
  const { isAuthenticated, accessToken, user, isLoading: authLoading } = useAuth();

  const [uploaderProfile, setUploaderProfile] = useState<UploaderProfile | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [content, setContent] = useState<Content[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeUploads, setActiveUploads] = useState<any[]>([]);
  const [extendModalOpen, setExtendModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);

  // Referral modal state
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [newReferralCode, setNewReferralCode] = useState<string>('');

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/membership');
    }
  }, [authLoading, isAuthenticated, router]);

  // Check uploader status and fetch data
  useEffect(() => {
    if (authLoading || !isAuthenticated || !accessToken) {
      return;
    }

    const checkUploaderStatus = async () => {
      setIsFetching(true);
      try {
        // Try to get uploader profile
        const profileResponse = await axios.get(`${API_URL}/api/upload/analytics`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (profileResponse.data.success) {
          setAnalytics(profileResponse.data.analytics);

          // Fetch the uploader's content
          const contentResponse = await axios.get(`${API_URL}/api/upload/my-content`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });

          if (contentResponse.data.success) {
            setContent(contentResponse.data.content || []);
          }
        }
      } catch (error: any) {
        if (error.response?.data?.code === 'NOT_UPLOADER') {
          // User is not an uploader yet - this is expected
          setAnalytics(null);
        } else {
          console.error('Failed to fetch uploader data:', error);
        }
      } finally {
        setIsFetching(false);
      }
    };

    checkUploaderStatus();
  }, [authLoading, isAuthenticated, accessToken]);

  // Poll for active uploads every 60 seconds (gentle polling for progress tracking)
  useEffect(() => {
    if (!isAuthenticated || !accessToken) return;

    const fetchActiveUploads = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/upload/active`);
        if (response.data.success) {
          setActiveUploads(response.data.uploads || []);
        }
      } catch (error) {
        // Silent fail - don't spam console
      }
    };

    // Fetch immediately on mount
    fetchActiveUploads();

    // Then poll every 60 seconds
    const interval = setInterval(fetchActiveUploads, 60000);

    return () => clearInterval(interval);
  }, [isAuthenticated, accessToken]);

  // Refresh content list when uploads complete
  useEffect(() => {
    if (activeUploads.length === 0 && isAuthenticated && accessToken) {
      // Refetch content when no active uploads (upload likely completed)
      const refetchContent = async () => {
        try {
          const contentResponse = await axios.get(`${API_URL}/api/upload/my-content`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });

          if (contentResponse.data.success) {
            setContent(contentResponse.data.content || []);
          }
        } catch (error) {
          console.error('Failed to refresh content:', error);
        }
      };

      const timer = setTimeout(refetchContent, 1000);
      return () => clearTimeout(timer);
    }
  }, [activeUploads, isAuthenticated, accessToken]);

  const handleRegister = async () => {
    if (!accessToken) return;

    setIsRegistering(true);
    setError(null);

    try {
      const response = await axios.post(
        `${API_URL}/api/upload/register`,
        {},
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (response.data.success && response.data.referralCode) {
        // Show success modal with referral code
        setNewReferralCode(response.data.referralCode);
        setShowReferralModal(true);
      }
    } catch (error: any) {
      console.error('Registration failed:', error);
      setError(error.response?.data?.error || 'Failed to register as uploader');
    } finally {
      setIsRegistering(false);
    }
  };

  const handleReferralModalClose = () => {
    setShowReferralModal(false);
    // Refresh page to show dashboard
    window.location.reload();
  };

  const handleCopyReferralCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleUploadClick = () => {
    if (!analytics) {
      setError('Please register as a provider first');
      return;
    }
    router.push('/uploader/upload');
  };

  const handleViewDetails = (item: Content) => {
    setSelectedContent(item);
    setDetailsModalOpen(true);
  };

  const handleExtendStorage = (item: Content) => {
    setSelectedContent(item);
    setExtendModalOpen(true);
  };

  const handleExtendStorageFromDetails = () => {
    // Close details modal and open extend modal
    setDetailsModalOpen(false);
    setExtendModalOpen(true);
  };

  const handleExtendSuccess = async () => {
    // Refresh content list
    try {
      const contentResponse = await axios.get(`${API_URL}/api/upload/my-content`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (contentResponse.data.success) {
        setContent(contentResponse.data.content || []);
      }
    } catch (error) {
      console.error('Failed to refresh content:', error);
    }
  };

  if (authLoading || isFetching) {
    return (
      <div className="min-h-screen bg-blobbuster-navy flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-neon-cyan mx-auto mb-4"></div>
          <p className="text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  const isUploader = analytics !== null;

  return (
    <div className="min-h-screen">
      <Header />

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-5xl md:text-6xl font-heading text-white mb-4 uppercase">
              PROVIDER DASHBOARD
            </h1>
            <p className="text-xl text-blobbuster-yellow font-bold uppercase">
              Monetize your content. Earn 70% of streaming revenue.
            </p>
          </div>

          {/* Stats Cards */}
          {isUploader && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
              <div className="blobbuster-card p-6 rounded-lg">
                <div className="text-gray-400 text-sm mb-2 uppercase font-bold">Total Earnings</div>
                <div className="text-3xl font-black text-blobbuster-yellow">
                  {(parseFloat(analytics?.totalEarnings || '0') / 1e9).toFixed(2)} SUI
                </div>
                <div className="text-xs text-gray-500 mt-1 uppercase">Lifetime</div>
              </div>

              <div className="blobbuster-card p-6 rounded-lg">
                <div className="text-gray-400 text-sm mb-2 uppercase font-bold">Pending</div>
                <div className="text-3xl font-black text-blobbuster-yellow">
                  {(parseFloat(analytics?.pendingEarnings || '0') / 1e9).toFixed(2)} SUI
                </div>
                <div className="text-xs text-gray-500 mt-1 uppercase">This week</div>
              </div>

              <div className="blobbuster-card p-6 rounded-lg">
                <div className="text-gray-400 text-sm mb-2 uppercase font-bold">Total Streams</div>
                <div className="text-3xl font-black text-blobbuster-yellow">
                  {analytics?.totalStreams || 0}
                </div>
                <div className="text-xs text-gray-500 mt-1 uppercase">All content</div>
              </div>

              <div className="blobbuster-card p-6 rounded-lg">
                <div className="text-gray-400 text-sm mb-2 uppercase font-bold">Avg. Completion</div>
                <div className="text-3xl font-black text-blobbuster-yellow">
                  {analytics?.averageCompletion || 0}%
                </div>
                <div className="text-xs text-gray-500 mt-1 uppercase">Watch rate</div>
              </div>
            </div>
          )}

          {/* Referral Stats Section */}
          {isUploader && analytics?.referralCode && (
            <div className="mb-12 blobbuster-card rounded-lg p-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="text-center md:text-left">
                  <h3 className="text-lg font-bold text-gray-400 uppercase mb-2">Your Referral Code</h3>
                  <div className="flex items-center gap-4">
                    <div className="text-4xl font-black text-blobbuster-gold tracking-widest">
                      {analytics.referralCode}
                    </div>
                    <button
                      onClick={() => handleCopyReferralCode(analytics.referralCode!)}
                      className="px-4 py-2 bg-neon-cyan/20 hover:bg-neon-cyan/30 border border-neon-cyan/50 rounded font-bold text-sm transition"
                    >
                      📋 Copy
                    </button>
                  </div>
                  <p className="text-sm text-gray-400 mt-2">
                    Share this code! People can browse your collection and join with your referral.
                  </p>
                </div>

                <div className="flex gap-6">
                  <div className="text-center">
                    <div className="text-4xl font-black text-neon-cyan">
                      {analytics.referralCount}
                    </div>
                    <p className="text-xs text-gray-400 uppercase mt-1">Referrals</p>
                  </div>
                  <a
                    href={`/library?provider=${analytics.referralCode}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 py-3 btn-primary rounded-lg font-bold text-sm hover:scale-105 transition flex items-center gap-2"
                  >
                    🔗 View Your Collection
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-8 bg-red-500/20 border border-red-500 rounded-lg p-4 text-center">
              <p className="text-red-300">{error}</p>
            </div>
          )}

          {/* Registration / Upload Section */}
          {!isUploader ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
              {/* Register as Provider */}
              <div className="blobbuster-card rounded-lg p-8">
                <div className="text-4xl mb-4">🎬</div>
                <h3 className="text-2xl blobbuster-title mb-4">
                  Become a Provider
                </h3>
                <p className="text-gray-300 mb-6">
                  Register on the blockchain to start earning from your content.
                  One-time registration required.
                </p>
                <button
                  onClick={handleRegister}
                  disabled={isRegistering}
                  className="btn-primary w-full justify-center rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isRegistering ? 'Registering...' : 'Register as Provider'}
                </button>
              </div>

              {/* Upload Content - Disabled */}
              <div className="bg-blobbuster-darkBlue/50 rounded-lg p-8 border-3 border-gray-600/50 opacity-60">
                <div className="text-4xl mb-4">📤</div>
                <h3 className="text-2xl font-heading text-gray-400 mb-4 uppercase">
                  Upload Content
                </h3>
                <p className="text-gray-500 mb-6">
                  Register as a provider first to unlock content uploads.
                </p>
                <button
                  disabled
                  className="w-full py-3 bg-gray-600 text-gray-400 rounded-lg font-bold cursor-not-allowed uppercase"
                >
                  Upload New Content
                </button>
              </div>
            </div>
          ) : (
            <div className="mb-12 text-center">
              <button
                onClick={handleUploadClick}
                className="btn-primary px-12 py-4 rounded-lg text-lg"
              >
                📤 Upload New Content
              </button>
            </div>
          )}

          {/* How It Works */}
          <div className="blobbuster-card rounded-lg p-8 mb-12">
            <h3 className="text-2xl blobbuster-title mb-6 text-center">
              How Provider Earnings Work
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="text-5xl mb-4 text-blobbuster-yellow font-black">70%</div>
                <h4 className="font-bold mb-2 text-blobbuster-yellow uppercase">Revenue Share</h4>
                <p className="text-sm text-gray-400">
                  You earn 70% of all subscription fees. Platform takes only 30%.
                </p>
              </div>
              <div className="text-center">
                <div className="text-5xl mb-4">⭐</div>
                <h4 className="font-bold mb-2 text-blobbuster-yellow uppercase">Weighted Scoring</h4>
                <p className="text-sm text-gray-400">
                  Earn more for high-completion content. 1.5x bonus for 80%+ watch rate.
                </p>
              </div>
              <div className="text-center">
                <div className="text-5xl mb-4">📅</div>
                <h4 className="font-bold mb-2 text-blobbuster-yellow uppercase">Weekly Payouts</h4>
                <p className="text-sm text-gray-400">
                  Automatic distribution every Sunday. Paid directly to your wallet.
                </p>
              </div>
            </div>
          </div>

          {/* Your Content */}
          {isUploader && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl blobbuster-title">
                  Your Content
                </h3>
                <button
                  onClick={handleUploadClick}
                  className="btn-primary px-6 py-2 rounded-lg"
                >
                  + Upload New
                </button>
              </div>

              {/* Active Uploads - Processing */}
              {activeUploads.length > 0 && (
                <div className="mb-6 space-y-4">
                  {activeUploads.map((upload) => {
                    // Format time remaining
                    const formatTime = (seconds: number) => {
                      if (!seconds) return null;
                      const hours = Math.floor(seconds / 3600);
                      const mins = Math.floor((seconds % 3600) / 60);
                      const secs = seconds % 60;
                      if (hours > 0) return `~${hours}h ${mins}m remaining`;
                      if (mins > 0) return `~${mins}m ${secs}s remaining`;
                      return `~${secs}s remaining`;
                    };

                    // Format file size
                    const formatSize = (bytes: number) => {
                      if (!bytes) return null;
                      const gb = bytes / (1024 * 1024 * 1024);
                      if (gb >= 1) return `${gb.toFixed(2)} GB`;
                      const mb = bytes / (1024 * 1024);
                      return `${mb.toFixed(0)} MB`;
                    };

                    return (
                      <div
                        key={upload.contentId}
                        className="blobbuster-card rounded-lg p-6 animate-pulse-slow"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-blobbuster-yellow/20 rounded-lg flex items-center justify-center">
                              <svg className="w-6 h-6 text-blobbuster-yellow animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                            </div>
                            <div>
                              <h4 className="font-bold text-lg text-blobbuster-yellow uppercase">Processing Upload</h4>
                              <p className="text-sm text-gray-400">
                                {formatSize(upload.fileSize) && `${formatSize(upload.fileSize)} • `}
                                Content ID: {upload.contentId.slice(0, 8)}...
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-black text-blobbuster-yellow">{upload.progress}%</div>
                            <p className="text-xs text-gray-400 capitalize">{upload.status}</p>
                          </div>
                        </div>

                        <div className="mb-3">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-300">{upload.currentStep}</span>
                            {upload.estimatedTimeRemaining > 0 && (
                              <span className="text-blobbuster-yellow font-medium">
                                {formatTime(upload.estimatedTimeRemaining)}
                              </span>
                            )}
                          </div>
                          <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-blobbuster-yellow h-full transition-all duration-300"
                              style={{ width: `${upload.progress}%` }}
                            />
                          </div>
                        </div>

                        {upload.error && (
                          <div className="mt-3 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm">
                            ❌ Error: {upload.error}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {content.length === 0 && activeUploads.length === 0 ? (
                /* Empty State */
                <div className="bg-blobbuster-darkBlue/50 rounded-lg p-12 border-3 border-dashed border-blobbuster-yellow/30 text-center">
                  <div className="text-6xl mb-4">🎥</div>
                  <h4 className="text-xl font-bold mb-2 text-blobbuster-yellow uppercase">No Content Yet</h4>
                  <p className="text-gray-400 mb-6">
                    Upload your first movie or show to start earning
                  </p>
                  <button
                    onClick={handleUploadClick}
                    className="btn-primary px-8 py-3 rounded-lg"
                  >
                    Upload Content
                  </button>
                </div>
              ) : (
                /* Content List */
                <div className="space-y-4">
                  {content.map((item) => {
                    // Calculate expiration warning
                    const getExpirationWarning = (expiresAt?: string) => {
                      if (!expiresAt) return null;
                      const now = new Date();
                      const expirationDate = new Date(expiresAt);
                      const daysRemaining = Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

                      if (daysRemaining <= 0) {
                        return { message: 'EXPIRED', color: 'bg-red-600', days: 0, showExtend: true };
                      } else if (daysRemaining <= 7) {
                        return { message: `${daysRemaining}d left`, color: 'bg-red-500', days: daysRemaining, showExtend: true };
                      } else if (daysRemaining <= 30) {
                        return { message: `${daysRemaining}d left`, color: 'bg-orange-500', days: daysRemaining, showExtend: true };
                      }
                      return null;
                    };

                    const expirationWarning = getExpirationWarning(item.storage_expires_at);

                    return (
                      <div
                        key={item.id}
                        onClick={() => handleViewDetails(item)}
                        className="blobbuster-card rounded-lg p-6 hover:shadow-blobbuster-hover hover:transform hover:-translate-x-0.5 hover:-translate-y-0.5 transition cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            {(item.posterUrl || item.thumbnailUrl) ? (
                              <div className="w-24 aspect-[2/3] bg-gray-700 rounded-lg overflow-hidden flex-shrink-0">
                                <img
                                  src={item.posterUrl || item.thumbnailUrl}
                                  alt={item.title}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className="w-24 aspect-[2/3] bg-gray-700 rounded-lg flex items-center justify-center text-3xl flex-shrink-0">
                                🎬
                              </div>
                            )}
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-bold text-lg text-blobbuster-yellow uppercase">{item.title}</h4>
                                {expirationWarning && (
                                  <span className={`${expirationWarning.color} px-2 py-1 rounded text-xs font-bold text-white`}>
                                    ⚠️ {expirationWarning.message}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-400 line-clamp-1">
                                {item.description}
                              </p>
                              <p className="text-xs text-gray-500 mt-1 uppercase">
                                Status:{' '}
                                <span
                                  className={
                                    item.status === 1 ? 'text-blobbuster-yellow' : item.status === 2 ? 'text-red-400' : 'text-gray-400'
                                  }
                                >
                                  {item.status === 1 ? 'Active' : item.status === 2 ? 'Expired' : 'Inactive'}
                                </span>{' '}
                                • Uploaded {new Date(item.createdAt).toLocaleDateString()}
                                {item.storage_expires_at && (
                                  <> • Expires {new Date(item.storage_expires_at).toLocaleDateString()}</>
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="text-right flex flex-col gap-2">
                            <div>
                              <div className="text-2xl font-black text-blobbuster-yellow">
                                {(item.totalStreams ? parseInt(item.totalStreams) : 0).toLocaleString()}
                              </div>
                              <p className="text-xs text-gray-400 uppercase">streams</p>
                            </div>
                            {expirationWarning?.showExtend && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleExtendStorage(item);
                                }}
                                className="px-3 py-1 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded transition uppercase"
                              >
                                Extend Storage
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* FAQ */}
          <div className="mt-16">
            <h3 className="text-2xl blobbuster-title mb-6 text-center">
              Provider FAQ
            </h3>
            <div className="space-y-4 max-w-3xl mx-auto">
              <details className="blobbuster-card rounded-lg p-6">
                <summary className="font-bold cursor-pointer text-blobbuster-yellow uppercase">
                  What content can I upload?
                </summary>
                <p className="text-gray-400 mt-3 text-sm">
                  You can upload movies, TV shows, documentaries, and short films.
                  Content must be owned by you or you must have distribution rights.
                  All content goes through moderation before going live.
                </p>
              </details>

              <details className="blobbuster-card rounded-lg p-6">
                <summary className="font-bold cursor-pointer text-blobbuster-yellow uppercase">
                  How is my revenue calculated?
                </summary>
                <p className="text-gray-400 mt-3 text-sm">
                  Your earnings = (your weighted score / total platform score) × 70% of weekly revenue.
                  Weighted score increases with watch completion rate: 1.5x bonus for 80%+ completion,
                  1.25x for 50-79%, 1.0x base for under 50%.
                </p>
              </details>

              <details className="blobbuster-card rounded-lg p-6">
                <summary className="font-bold cursor-pointer text-blobbuster-yellow uppercase">
                  When do I get paid?
                </summary>
                <p className="text-gray-400 mt-3 text-sm">
                  Payouts happen automatically every Sunday at 2:00 AM UTC. Earnings are
                  sent directly to your connected wallet. No minimum withdrawal amount.
                </p>
              </details>

              <details className="blobbuster-card rounded-lg p-6">
                <summary className="font-bold cursor-pointer text-blobbuster-yellow uppercase">
                  What formats are supported?
                </summary>
                <p className="text-gray-400 mt-3 text-sm">
                  We accept MP4, MKV, AVI, and MOV files. Maximum file size: 10GB.
                  Your content will be automatically transcoded to 720p HD for optimal
                  streaming quality, faster processing, and storage efficiency.
                </p>
              </details>
            </div>
          </div>
        </div>
      </div>

      {/* Content Details Modal */}
      {selectedContent && (
        <ContentDetailsModal
          isOpen={detailsModalOpen}
          onClose={() => {
            setDetailsModalOpen(false);
            setSelectedContent(null);
          }}
          content={selectedContent}
          onExtendStorage={handleExtendStorageFromDetails}
        />
      )}

      {/* Extend Storage Modal */}
      {selectedContent && (
        <ExtendStorageModal
          isOpen={extendModalOpen}
          onClose={() => {
            setExtendModalOpen(false);
            setSelectedContent(null);
          }}
          content={selectedContent}
          onSuccess={handleExtendSuccess}
        />
      )}

      {/* Referral Success Modal */}
      <ReferralSuccessModal
        isOpen={showReferralModal}
        referralCode={newReferralCode}
        onClose={handleReferralModalClose}
      />
    </div>
  );
}
