'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthContext';
import axios from 'axios';
import { WalrusCostCalculator } from '@/components/WalrusCostCalculator';
import { AboutWalrusModal } from '@/components/AboutWalrusModal';
import { MovieSelectionModal } from '@/components/MovieSelectionModal';
import { useCurrentAccount, useSignAndExecuteTransactionBlock, useSuiClient } from '@mysten/dapp-kit';
import { payForWalrusStorage, checkWalletBalance } from '@/lib/walrusPayment';
import { useChunkedUpload } from '@/hooks/useChunkedUpload';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const GENRES = [
  { value: 0, label: 'Action' },
  { value: 1, label: 'Comedy' },
  { value: 2, label: 'Drama' },
  { value: 3, label: 'Horror' },
  { value: 4, label: 'Sci-Fi' },
  { value: 5, label: 'Romance' },
  { value: 6, label: 'Thriller' },
  { value: 7, label: 'Documentary' },
  { value: 8, label: 'Animation' },
  { value: 9, label: 'Fantasy' },
  { value: 10, label: 'Other' },
];

interface TMDBMetadata {
  title: string;
  originalTitle?: string;
  year?: number;
  plot?: string;
  runtime?: number;
  tagline?: string;
  posterUrl?: string;
  backdropUrl?: string;
  genres?: string[];
  cast?: Array<{ name: string; character: string; profilePath?: string }>;
  director?: string;
  rating?: number;
  language?: string;
  country?: string;
  tmdbId?: number;
  imdbId?: string;
}

export default function UploadPage() {
  const router = useRouter();
  const { isAuthenticated, accessToken } = useAuth();
  const currentAccount = useCurrentAccount();
  const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransactionBlock();
  const suiClient = useSuiClient();
  const { uploadFile, isUploading: isChunkUploading, uploadProgress: chunkProgress, statusMessage } = useChunkedUpload();

  // Step 1: File selection
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Step 2: TMDB metadata preview
  const [isFetchingMetadata, setIsFetchingMetadata] = useState(false);
  const [metadata, setMetadata] = useState<TMDBMetadata | null>(null);
  const [metadataFound, setMetadataFound] = useState(false);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [duplicateContent, setDuplicateContent] = useState<any>(null);
  const [movieOptions, setMovieOptions] = useState<any[]>([]);
  const [isMovieSelectionOpen, setIsMovieSelectionOpen] = useState(false);

  // Editable fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [genre, setGenre] = useState(0);

  // Step 3: Upload
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [storageEpochs, setStorageEpochs] = useState(30);
  const [sliderValue, setSliderValue] = useState(30); // Temporary value while sliding
  const [isAboutWalrusOpen, setIsAboutWalrusOpen] = useState(false);
  const [costEstimate, setCostEstimate] = useState<any>(null);
  const [isPaying, setIsPaying] = useState(false);
  const [paymentComplete, setPaymentComplete] = useState(false);
  const [paymentDigest, setPaymentDigest] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const PLATFORM_WALLET = process.env.NEXT_PUBLIC_PLATFORM_WALLET || '0x0';

  // Sync chunked upload progress to UI
  useEffect(() => {
    if (isChunkUploading) {
      setUploadProgress(chunkProgress);
    }
  }, [isChunkUploading, chunkProgress]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileSelect = async (file: File) => {
    // Validate file type - check both MIME type and extension
    const allowedTypes = ['video/mp4', 'video/x-msvideo', 'video/x-matroska', 'video/quicktime', 'video/webm'];
    const allowedExtensions = ['.mp4', '.avi', '.mkv', '.mov', '.webm'];
    const fileExtension = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));

    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
      setError('Invalid file type. Please upload MP4, AVI, MKV, MOV, or WEBM files.');
      return;
    }

    // Validate file size (10GB max)
    const maxSize = 10 * 1024 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('File too large. Maximum size is 10GB.');
      return;
    }

    setVideoFile(file);
    setError(null);

    // Immediately fetch TMDB metadata
    await fetchMetadata(file.name);
  };

  const fetchMetadata = async (filename: string) => {
    setIsFetchingMetadata(true);
    setMetadata(null);
    setMetadataFound(false);
    setIsDuplicate(false);
    setDuplicateContent(null);

    try {
      // First, check if there are multiple matches
      const multiResponse = await axios.post(`${API_URL}/api/metadata/search-multiple`, {
        filename,
      });

      if (multiResponse.data.success && multiResponse.data.count > 1) {
        // Multiple matches found - show selection modal
        setMovieOptions(multiResponse.data.results);
        setIsMovieSelectionOpen(true);
        setIsFetchingMetadata(false);
        return;
      }

      // Single match or no matches - use existing single search
      const response = await axios.post(`${API_URL}/api/metadata/search`, {
        filename,
      });

      if (response.data.success && response.data.found) {
        const meta = response.data.metadata;
        setMetadata(meta);
        setMetadataFound(true);

        // Pre-fill editable fields
        setTitle(meta.title || '');
        setDescription(meta.plot || '');

        // Try to map TMDB genre to our genres
        if (meta.genres && meta.genres.length > 0) {
          const tmdbGenre = meta.genres[0].toLowerCase();
          const genreMapping: { [key: string]: number } = {
            action: 0,
            comedy: 1,
            drama: 2,
            horror: 3,
            'science fiction': 4,
            romance: 5,
            thriller: 6,
            documentary: 7,
            animation: 8,
            fantasy: 9,
          };
          const mappedGenre = genreMapping[tmdbGenre];
          if (mappedGenre !== undefined) {
            setGenre(mappedGenre);
          }
        }

        // Check for duplicates if we have a TMDB ID
        if (meta.tmdbId) {
          try {
            const duplicateCheck = await axios.post(`${API_URL}/api/metadata/check-duplicate`, {
              tmdbId: meta.tmdbId,
            });

            if (duplicateCheck.data.success && duplicateCheck.data.isDuplicate) {
              setIsDuplicate(true);
              setDuplicateContent(duplicateCheck.data.existingContent);
            }
          } catch (duplicateError) {
            console.error('Duplicate check failed:', duplicateError);
            // Don't block upload if duplicate check fails
          }
        }
      } else {
        // No TMDB match - use filename
        const cleanFilename = filename
          .replace(/\.(mp4|mkv|avi|mov|webm)$/i, '')
          .replace(/[._-]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        setTitle(cleanFilename);
        setDescription('');
        setMetadataFound(false);
      }
    } catch (error) {
      console.error('Failed to fetch metadata:', error);
      // Fallback to filename
      const cleanFilename = filename
        .replace(/\.(mp4|mkv|avi|mov|webm)$/i, '')
        .replace(/[._-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      setTitle(cleanFilename);
      setDescription('');
      setMetadataFound(false);
    } finally {
      setIsFetchingMetadata(false);
    }
  };

  const handleManualSearch = async () => {
    if (!title.trim()) {
      setError('Please enter a title to search');
      return;
    }

    setIsFetchingMetadata(true);
    setError(null);
    setIsDuplicate(false);
    setDuplicateContent(null);

    try {
      const response = await axios.post(`${API_URL}/api/metadata/search-by-title`, {
        title: title.trim(),
      });

      if (response.data.success && response.data.found) {
        const meta = response.data.metadata;
        setMetadata(meta);
        setMetadataFound(true);
        setTitle(meta.title || '');
        setDescription(meta.plot || '');

        // Try to map TMDB genre to our genres
        if (meta.genres && meta.genres.length > 0) {
          const tmdbGenre = meta.genres[0].toLowerCase();
          const genreMapping: { [key: string]: number } = {
            action: 0,
            comedy: 1,
            drama: 2,
            horror: 3,
            'science fiction': 4,
            romance: 5,
            thriller: 6,
            documentary: 7,
            animation: 8,
            fantasy: 9,
          };
          const mappedGenre = genreMapping[tmdbGenre];
          if (mappedGenre !== undefined) {
            setGenre(mappedGenre);
          }
        }

        // Check for duplicates if we have a TMDB ID
        if (meta.tmdbId) {
          try {
            const duplicateCheck = await axios.post(`${API_URL}/api/metadata/check-duplicate`, {
              tmdbId: meta.tmdbId,
            });

            if (duplicateCheck.data.success && duplicateCheck.data.isDuplicate) {
              setIsDuplicate(true);
              setDuplicateContent(duplicateCheck.data.existingContent);
            }
          } catch (duplicateError) {
            console.error('Duplicate check failed:', duplicateError);
            // Don't block upload if duplicate check fails
          }
        }
      } else {
        setError('No match found in TMDB. Try a different title.');
        setMetadataFound(false);
      }
    } catch (error) {
      console.error('Manual search failed:', error);
      setError('Search failed. Please try again.');
    } finally {
      setIsFetchingMetadata(false);
    }
  };

  const handleMovieSelect = async (movie: any) => {
    // Close the modal
    setIsMovieSelectionOpen(false);
    setMovieOptions([]);

    // Show loading state
    setIsFetchingMetadata(true);
    setError(null);
    setIsDuplicate(false);
    setDuplicateContent(null);

    try {
      // The movie from the search-multiple endpoint has basic info
      // We can use it directly or fetch full details if needed
      const meta = movie;
      setMetadata(meta);
      setMetadataFound(true);

      // Pre-fill editable fields
      setTitle(meta.title || '');
      setDescription(meta.plot || '');

      // Try to map TMDB genre to our genres
      if (meta.genres && meta.genres.length > 0) {
        const tmdbGenre = meta.genres[0].toLowerCase();
        const genreMapping: { [key: string]: number } = {
          action: 0,
          comedy: 1,
          drama: 2,
          horror: 3,
          'science fiction': 4,
          romance: 5,
          thriller: 6,
          documentary: 7,
          animation: 8,
          fantasy: 9,
        };
        const mappedGenre = genreMapping[tmdbGenre];
        if (mappedGenre !== undefined) {
          setGenre(mappedGenre);
        }
      }

      // Check for duplicates
      if (meta.tmdbId) {
        try {
          const duplicateCheck = await axios.post(`${API_URL}/api/metadata/check-duplicate`, {
            tmdbId: meta.tmdbId,
          });

          if (duplicateCheck.data.success && duplicateCheck.data.isDuplicate) {
            setIsDuplicate(true);
            setDuplicateContent(duplicateCheck.data.existingContent);
          }
        } catch (duplicateError) {
          console.error('Duplicate check failed:', duplicateError);
          // Don't block upload if duplicate check fails
        }
      }
    } catch (error) {
      console.error('Failed to process selected movie:', error);
      setError('Failed to load movie details. Please try again.');
    } finally {
      setIsFetchingMetadata(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handlePayment = async () => {
    if (!costEstimate || !currentAccount) {
      setError('Please connect your wallet and select a file');
      return;
    }

    setIsPaying(true);
    setError(null);

    try {
      const totalRequired = costEstimate.costs.totalWithGas;
      const balanceCheck = await checkWalletBalance(
        suiClient,
        currentAccount.address,
        totalRequired
      );

      if (!balanceCheck.hasBalance) {
        setError(
          `Insufficient balance. You have ${balanceCheck.balance.toFixed(4)} SUI but need ${balanceCheck.required.toFixed(4)} SUI`
        );
        setIsPaying(false);
        return;
      }

      const paymentResult = await payForWalrusStorage({
        totalSUI: costEstimate.costs.totalWithGas, // Total payment including 3x markup and gas
        recipientAddress: PLATFORM_WALLET,
        senderAddress: currentAccount.address,
        signAndExecute: signAndExecuteTransaction,
      });

      if (paymentResult.success) {
        setPaymentComplete(true);
        setPaymentDigest(paymentResult.digest || null);
        setError(null);
        console.log('Payment successful:', paymentResult.digest);

        // Auto-upload after successful payment - pass digest directly since state update is async
        await startUpload(paymentResult.digest);
      } else {
        setError(`Payment failed: ${paymentResult.error}`);
      }
    } catch (err: any) {
      console.error('Payment error:', err);
      setError(err.message || 'Payment failed');
    } finally {
      setIsPaying(false);
    }
  };

  const startUpload = async (digestOverride?: string) => {
    if (!videoFile || !accessToken) {
      setError('Missing required information for upload');
      return;
    }

    // Use passed digest or fall back to state
    const digest = digestOverride || paymentDigest;
    if (!digest) {
      setError('Payment verification missing - please pay for storage first');
      return;
    }

    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      const result = await uploadFile({
        file: videoFile,
        title: title || videoFile.name,
        description: description || 'Auto-generated from TMDB',
        genre,
        epochs: storageEpochs,
        paymentDigest: digest,
        paidAmount: costEstimate!.costs.totalWithGas.toString(),
        tmdbId: metadata?.tmdbId,
        accessToken,
        onProgress: (progress) => setUploadProgress(progress),
        onStatusUpdate: (status) => console.log('Status:', status),
      });

      if (result.success && result.contentId) {
        setSuccess(true);
        localStorage.setItem('latest_upload_id', result.contentId);

        setTimeout(() => {
          router.push('/uploader');
        }, 2000);
      } else {
        setError(result.error || 'Upload failed');
        setIsUploading(false);
      }
    } catch (error: any) {
      console.error('Upload failed:', error);
      setError(error.message || 'Failed to upload content');
      setIsUploading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-300 mb-4">Please sign in to upload content</p>
          <Link href="/membership" className="blobbuster-link">
            Go to Sign In
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-3xl font-heading text-white mb-4 uppercase">Upload Started!</h1>
          <p className="text-gray-300 mb-6">
            Your content is being processed. You'll be redirected to your dashboard.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b-4 border-blobbuster-yellow">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <Link href="/uploader" className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-blobbuster-yellow rounded-lg" />
              <h1 className="text-2xl font-heading text-blobbuster-yellow">BLOBBUSTER</h1>
            </Link>
            <Link
              href="/uploader"
              className="blobbuster-link"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-5xl mx-auto">
          {/* Header Card */}
          <div className="blobbuster-card p-8 mb-8 text-center">
            <h1 className="text-5xl font-heading text-blobbuster-yellow mb-4 uppercase">
              Upload Content
            </h1>
            <p className="text-xl text-white font-bold uppercase">
              Drop your movie → Preview metadata → Upload
            </p>
          </div>

          {/* Step 1: File Upload (always visible) */}
          <div className="mb-8 blobbuster-card p-6">
            <h3 className="text-lg font-bold text-blobbuster-yellow uppercase mb-4">
              Step 1: Select Video File
            </h3>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-3 border-dashed rounded-lg p-12 text-center cursor-pointer transition ${
                isDragging
                  ? 'border-blobbuster-yellow bg-blobbuster-yellow/10'
                  : 'border-blobbuster-yellow/30 hover:border-blobbuster-yellow bg-blobbuster-darkBlue/50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/x-msvideo,video/x-matroska,video/quicktime,video/webm,.mp4,.avi,.mkv,.mov,.webm"
                onChange={handleFileInputChange}
                className="hidden"
              />
              {videoFile ? (
                <div>
                  <div className="text-6xl mb-4">📹</div>
                  <p className="text-2xl font-bold text-blobbuster-yellow mb-2 uppercase">{videoFile.name}</p>
                  <p className="text-lg text-gray-400">
                    {(videoFile.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setVideoFile(null);
                      setMetadata(null);
                      setMetadataFound(false);
                    }}
                    className="mt-4 text-red-400 hover:text-red-300 uppercase font-bold"
                  >
                    ✕ Remove File
                  </button>
                </div>
              ) : (
                <div>
                  <div className="text-6xl mb-4">⬆️</div>
                  <p className="text-2xl font-bold text-white mb-2 uppercase">Drag & drop your video here</p>
                  <p className="text-lg text-gray-400 mb-4">or click to browse</p>
                  <p className="text-sm text-gray-500 uppercase">
                    Accepted formats: MP4, AVI, MKV, MOV, WEBM (Max 10GB)
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Step 2: Metadata Loading */}
          {isFetchingMetadata && (
            <div className="blobbuster-card rounded-lg p-8 text-center mb-8">
              <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blobbuster-yellow mx-auto mb-4"></div>
              <p className="text-lg text-gray-300 uppercase">Fetching metadata from TMDB...</p>
            </div>
          )}

          {/* Step 2: Metadata Preview (if found or file selected) */}
          {videoFile && !isFetchingMetadata && (
            <div className="blobbuster-card rounded-lg overflow-hidden mb-8">
              <div className="p-4 border-b-3 border-blobbuster-yellow/30">
                <h3 className="text-lg font-bold text-blobbuster-yellow uppercase">
                  Step 2: Movie Details
                </h3>
              </div>
              {metadata?.backdropUrl && (
                <div
                  className="h-48 bg-cover bg-center relative"
                  style={{ backgroundImage: `url(${metadata.backdropUrl})` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-blobbuster-navy via-blobbuster-navy/80 to-transparent" />
                </div>
              )}

              <div className="p-8">
                <div className="flex items-start gap-6 mb-6">
                  {/* Poster */}
                  {metadata?.posterUrl && (
                    <div className="flex-shrink-0">
                      <img
                        src={metadata.posterUrl}
                        alt={metadata.title}
                        className="w-40 rounded-lg shadow-blobbuster border-3 border-blobbuster-yellow"
                      />
                      {metadata.rating && (
                        <div className="mt-3 text-center bg-black/60 py-2 rounded-lg">
                          <span className="text-2xl">⭐</span>
                          <span className="ml-2 text-xl font-bold text-blobbuster-yellow">
                            {metadata.rating.toFixed(1)}
                          </span>
                          <span className="text-gray-400 text-sm">/10</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Metadata */}
                  <div className="flex-1">
                    {/* Duplicate Warning */}
                    {isDuplicate && duplicateContent && (
                      <div className="mb-4 p-4 bg-red-900/30 border-3 border-red-500 rounded-lg">
                        <div className="flex items-start gap-3">
                          <div className="text-3xl">⚠️</div>
                          <div className="flex-1">
                            <p className="text-red-400 font-bold text-lg uppercase mb-2">
                              Duplicate Content Detected!
                            </p>
                            <p className="text-white mb-3">
                              This movie already exists in our library:
                            </p>
                            <div className="flex gap-3 bg-black/30 p-3 rounded-lg">
                              {duplicateContent.posterUrl && (
                                <img
                                  src={duplicateContent.posterUrl}
                                  alt={duplicateContent.title}
                                  className="w-16 h-24 object-cover rounded border-2 border-blobbuster-yellow"
                                />
                              )}
                              <div>
                                <p className="font-bold text-blobbuster-yellow">
                                  {duplicateContent.title} {duplicateContent.year && `(${duplicateContent.year})`}
                                </p>
                                <p className="text-sm text-gray-400">
                                  Uploaded: {new Date(duplicateContent.uploadedAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <p className="text-red-300 text-sm mt-3 uppercase font-bold">
                              You cannot upload duplicate content.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* TMDB Match Status */}
                    {metadataFound ? (
                      <div className="mb-4 p-3 bg-green-900/20 border border-green-500/50 rounded">
                        <p className="text-green-400 font-semibold flex items-center gap-2">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          TMDB Match Found!
                        </p>
                      </div>
                    ) : (
                      <div className="mb-4 p-3 bg-yellow-900/20 border border-yellow-500/50 rounded">
                        <p className="text-yellow-400 text-sm">
                          No TMDB match found. You can search manually below.
                        </p>
                      </div>
                    )}

                    {/* Editable Title */}
                    <div className="mb-4">
                      <label className="block text-sm font-bold text-blobbuster-yellow mb-2 uppercase">
                        Title *
                      </label>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full px-4 py-2 bg-blobbuster-darkBlue border-3 border-blobbuster-yellow/30 rounded-lg focus:border-blobbuster-yellow focus:outline-none text-white"
                      />
                    </div>

                    {/* Editable Description */}
                    <div className="mb-4">
                      <label className="block text-sm font-bold text-blobbuster-yellow mb-2 uppercase">
                        Description
                      </label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={4}
                        className="w-full px-4 py-2 bg-blobbuster-darkBlue border-3 border-blobbuster-yellow/30 rounded-lg focus:border-blobbuster-yellow focus:outline-none text-white resize-none"
                      />
                    </div>

                    {/* Genre */}
                    <div className="mb-4">
                      <label className="block text-sm font-bold text-blobbuster-yellow mb-2 uppercase">
                        Genre *
                      </label>
                      <select
                        value={genre}
                        onChange={(e) => setGenre(parseInt(e.target.value))}
                        className="w-full px-4 py-2 bg-blobbuster-darkBlue border-3 border-blobbuster-yellow/30 rounded-lg focus:border-blobbuster-yellow focus:outline-none text-white"
                      >
                        {GENRES.map((g) => (
                          <option key={g.value} value={g.value}>
                            {g.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Manual Search Button */}
                    <button
                      type="button"
                      onClick={handleManualSearch}
                      disabled={isFetchingMetadata}
                      className="btn-primary px-4 py-2 rounded-lg disabled:opacity-50"
                    >
                      🔍 Search TMDB Manually
                    </button>
                  </div>
                </div>

                {/* Additional Metadata */}
                {metadata && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 border-t border-gray-700">
                    {metadata.year && (
                      <div>
                        <p className="text-xs text-gray-500">Year</p>
                        <p className="font-bold">{metadata.year}</p>
                      </div>
                    )}
                    {metadata.runtime && (
                      <div>
                        <p className="text-xs text-gray-500">Runtime</p>
                        <p className="font-bold">{metadata.runtime} min</p>
                      </div>
                    )}
                    {metadata.director && (
                      <div>
                        <p className="text-xs text-gray-500 uppercase">Director</p>
                        <p className="font-bold text-blobbuster-yellow">{metadata.director}</p>
                      </div>
                    )}
                    {metadata.genres && metadata.genres.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-500">TMDB Genres</p>
                        <p className="font-bold text-sm">{metadata.genres.slice(0, 2).join(', ')}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Cast */}
                {metadata?.cast && metadata.cast.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-blobbuster-yellow/30">
                    <p className="text-sm font-bold text-blobbuster-yellow mb-3 uppercase">Cast</p>
                    <div className="flex gap-3 overflow-x-auto pb-2">
                      {metadata.cast.slice(0, 6).map((actor, idx) => (
                        <div key={idx} className="flex-shrink-0 text-center" style={{ width: '80px' }}>
                          {actor.profilePath && (
                            <img
                              src={actor.profilePath}
                              alt={actor.name}
                              className="w-20 h-20 rounded-full object-cover mb-1 border-3 border-blobbuster-yellow/30"
                            />
                          )}
                          <p className="text-xs font-bold truncate">{actor.name}</p>
                          <p className="text-xs text-gray-500 truncate">{actor.character}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Storage & Payment (only show if file selected) */}
          {videoFile && !isFetchingMetadata && (
            <>
              {/* Storage Duration */}
              <div className="mb-8 blobbuster-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-blobbuster-yellow uppercase">
                    Step 3: Storage Duration
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsAboutWalrusOpen(true)}
                    className="text-sm blobbuster-link flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    About Walrus Storage
                  </button>
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <input
                      type="range"
                      min="1"
                      max="365"
                      value={sliderValue}
                      onChange={(e) => setSliderValue(parseInt(e.target.value))}
                      onMouseUp={(e) => setStorageEpochs(parseInt((e.target as HTMLInputElement).value))}
                      onTouchEnd={(e) => setStorageEpochs(parseInt((e.target as HTMLInputElement).value))}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                      <span>1 epoch</span>
                      <span>365 epochs</span>
                    </div>
                  </div>
                  <div className="w-32">
                    <input
                      type="number"
                      min="1"
                      max="365"
                      value={sliderValue}
                      onChange={(e) => {
                        const value = Math.min(365, Math.max(1, parseInt(e.target.value) || 1));
                        setSliderValue(value);
                        setStorageEpochs(value);
                      }}
                      className="w-full px-3 py-2 bg-blobbuster-darkBlue border-3 border-blobbuster-yellow/30 rounded-lg focus:border-blobbuster-yellow focus:outline-none text-white text-center"
                    />
                    <p className="text-xs text-gray-400 mt-1 text-center uppercase">epochs</p>
                  </div>
                </div>
                <p className="text-sm text-gray-400 mt-3">
                  Each epoch ≈ 14 days on mainnet. Your content will be stored for <span className="text-blobbuster-yellow font-bold">{sliderValue * 14} days</span>.
                </p>
              </div>

              {/* Cost Calculator */}
              <WalrusCostCalculator
                fileSizeBytes={videoFile.size}
                epochs={storageEpochs}
                onCostCalculated={setCostEstimate}
              />

              {/* Error Message */}
              {error && (
                <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 mb-8">
                  <p className="text-red-300">{error}</p>
                </div>
              )}

              {/* Upload Progress */}
              {isUploading && (
                <div className="mb-8">
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-gray-400 uppercase">Uploading...</span>
                    <span className="text-sm text-blobbuster-yellow font-bold">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-blobbuster-yellow h-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Payment Status */}
              {paymentComplete && paymentDigest && (
                <div className="bg-green-900/20 border-3 border-green-500/50 rounded-lg p-4 mb-8">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <p className="text-green-400 font-semibold uppercase">Payment Successful!</p>
                  </div>
                  <p className="text-sm text-gray-300">
                    Transaction: <span className="text-blobbuster-yellow font-mono text-xs">{paymentDigest.slice(0, 20)}...</span>
                  </p>
                </div>
              )}

              {/* Payment/Submit Buttons */}
              {!paymentComplete ? (
                <button
                  type="button"
                  onClick={handlePayment}
                  disabled={isPaying || !videoFile || !costEstimate || !currentAccount || isDuplicate}
                  className="btn-primary w-full py-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed justify-center gap-2"
                >
                  {isPaying ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-blobbuster-blue"></div>
                      <span className="uppercase">Processing Payment...</span>
                    </>
                  ) : isDuplicate ? (
                    <span className="uppercase">❌ Cannot Upload Duplicate Content</span>
                  ) : (
                    <>
                      <span className="uppercase">💳 Pay for Storage {costEstimate && `(${costEstimate.costs.totalWithGas.toFixed(6)} SUI)`}</span>
                    </>
                  )}
                </button>
              ) : (
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => router.push('/uploader')}
                    className="flex-1 py-4 bg-gray-700 hover:bg-gray-600 rounded-lg font-bold transition uppercase border-3 border-gray-600"
                    disabled={isUploading}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => startUpload()}
                    disabled={isUploading || !videoFile || isDuplicate}
                    className="btn-primary flex-1 py-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed justify-center"
                  >
                    {isUploading ? 'UPLOADING...' : '🚀 UPLOAD CONTENT'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* About Walrus Modal */}
      <AboutWalrusModal
        isOpen={isAboutWalrusOpen}
        onClose={() => setIsAboutWalrusOpen(false)}
      />

      {/* Movie Selection Modal */}
      <MovieSelectionModal
        isOpen={isMovieSelectionOpen}
        movies={movieOptions}
        onSelect={handleMovieSelect}
        onClose={() => {
          setIsMovieSelectionOpen(false);
          setMovieOptions([]);
          setIsFetchingMetadata(false);
        }}
      />

      {/* Upload In Progress Modal */}
      {(isUploading || isPaying) && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-blobbuster-navy border-4 border-blobbuster-yellow rounded-xl max-w-md w-full p-8 text-center shadow-blobbuster">
            {/* Warning Icon */}
            <div className="text-6xl mb-4">
              {isPaying ? '💳' : '📤'}
            </div>

            {/* Title */}
            <h2 className="text-2xl font-heading text-blobbuster-yellow mb-4 uppercase">
              {isPaying ? 'Processing Payment...' : 'Upload In Progress'}
            </h2>

            {/* Warning Message */}
            <div className="bg-red-900/30 border-2 border-red-500 rounded-lg p-4 mb-6">
              <p className="text-red-400 font-bold text-lg mb-2">⚠️ DO NOT REFRESH OR CLOSE THIS PAGE</p>
              <p className="text-gray-300 text-sm">
                {isPaying
                  ? 'Your payment is being processed. Interrupting may result in lost funds.'
                  : 'Your content is being uploaded and processed. This may take several minutes for large files. Closing this page could result in lost funds and incomplete upload.'}
              </p>
            </div>

            {/* Progress */}
            {isUploading && (
              <div className="mb-6">
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-400 uppercase">{statusMessage || 'Processing...'}</span>
                  <span className="text-sm text-blobbuster-yellow font-bold">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-4 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blobbuster-yellow to-yellow-400 h-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Spinner for payment */}
            {isPaying && (
              <div className="flex justify-center mb-6">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blobbuster-yellow border-t-transparent"></div>
              </div>
            )}

            {/* Reassurance */}
            <p className="text-gray-400 text-sm">
              {isPaying
                ? 'Please confirm the transaction in your wallet...'
                : 'You will be automatically redirected when complete.'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
