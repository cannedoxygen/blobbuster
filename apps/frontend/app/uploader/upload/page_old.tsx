'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthContext';
import axios from 'axios';
import { WalrusCostCalculator } from '@/components/WalrusCostCalculator';
import { AboutWalrusModal } from '@/components/AboutWalrusModal';
import { useCurrentAccount, useSignAndExecuteTransactionBlock, useSuiClient } from '@mysten/dapp-kit';
import { payForWalrusStorage, checkWalletBalance, formatPaymentDetails } from '@/lib/walrusPayment';

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

export default function UploadPage() {
  const router = useRouter();
  const { isAuthenticated, accessToken } = useAuth();
  const currentAccount = useCurrentAccount();
  const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransactionBlock();
  const suiClient = useSuiClient();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [genre, setGenre] = useState(0);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [storageEpochs, setStorageEpochs] = useState(30); // Default 30 epochs
  const [isAboutWalrusOpen, setIsAboutWalrusOpen] = useState(false);
  const [costEstimate, setCostEstimate] = useState<any>(null);
  const [isPaying, setIsPaying] = useState(false);
  const [paymentComplete, setPaymentComplete] = useState(false);
  const [paymentDigest, setPaymentDigest] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Platform wallet address (receives payments for Walrus storage)
  const PLATFORM_WALLET = process.env.NEXT_PUBLIC_PLATFORM_WALLET || '0x0'; // TODO: Set in env

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

  const handleFileSelect = (file: File) => {
    // Validate file type
    const allowedTypes = ['video/mp4', 'video/x-msvideo', 'video/x-matroska', 'video/quicktime', 'video/webm'];
    if (!allowedTypes.includes(file.type)) {
      setError('Invalid file type. Please upload MP4, AVI, MKV, MOV, or WEBM files.');
      return;
    }

    // Validate file size (10GB max)
    const maxSize = 10 * 1024 * 1024 * 1024; // 10GB in bytes
    if (file.size > maxSize) {
      setError('File too large. Maximum size is 10GB.');
      return;
    }

    // Auto-fill title from filename if title is empty
    if (!title.trim()) {
      // Remove extension and clean up filename
      const fileName = file.name.replace(/\.(mp4|mkv|avi|mov|webm)$/i, '');
      // Replace dots, underscores, dashes with spaces
      const cleanedName = fileName
        .replace(/[._-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      setTitle(cleanedName);
    }

    setVideoFile(file);
    setError(null);
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
      // Check wallet balance
      const totalRequired = costEstimate.costs.totalSUI;
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

      // Execute payment transaction
      const paymentResult = await payForWalrusStorage({
        walAmount: costEstimate.costs.totalWAL,
        suiGas: costEstimate.costs.suiGas,
        recipientAddress: PLATFORM_WALLET,
        senderAddress: currentAccount.address,
        signAndExecute: signAndExecuteTransaction,
      });

      if (paymentResult.success) {
        setPaymentComplete(true);
        setPaymentDigest(paymentResult.digest || null);
        setError(null);
        console.log('Payment successful:', paymentResult.digest);

        // Auto-upload after successful payment
        await startUpload();
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

  const startUpload = async () => {
    if (!videoFile || !accessToken) {
      setError('Missing required information for upload');
      return;
    }

    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('video', videoFile);
      // Use filename if title is empty (backend will use TMDB data)
      formData.append('title', title.trim() || videoFile.name);
      formData.append('description', description.trim() || 'Auto-generated from TMDB');
      formData.append('genre', genre.toString());

      const response = await axios.post(`${API_URL}/api/upload/content`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${accessToken}`,
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
          setUploadProgress(percentCompleted);
        },
      });

      if (response.data.success) {
        setSuccess(true);

        // Store contentId for progress tracking in dashboard
        if (response.data.contentId) {
          localStorage.setItem('latest_upload_id', response.data.contentId);
        }

        setTimeout(() => {
          router.push('/uploader');
        }, 2000);
      }
    } catch (error: any) {
      console.error('Upload failed:', error);
      setError(error.response?.data?.error || 'Failed to upload content');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await startUpload();
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-blockbuster-navy flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-300 mb-4">Please sign in to upload content</p>
          <Link href="/membership" className="text-neon-cyan hover:underline">
            Go to Sign In
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-blockbuster-navy flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-3xl font-heading text-blockbuster-gold mb-4">Upload Started!</h1>
          <p className="text-gray-300 mb-6">
            Your content is being processed. Transcoding and storage may take some time. You'll be
            redirected to your dashboard.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-blockbuster-navy">
      {/* Header */}
      <header className="border-b border-neon-cyan/20 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <Link href="/uploader" className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-blockbuster-gold rounded-sm" />
              <h1 className="text-2xl font-heading text-blockbuster-gold">BLOCKBUSTER</h1>
            </Link>
            <Link
              href="/uploader"
              className="text-gray-300 hover:text-neon-cyan transition"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-heading text-blockbuster-gold mb-4">
              Upload Content
            </h1>
            <p className="text-xl text-gray-300">
              Share your movie or show with the world
            </p>
          </div>

          {/* Upload Form */}
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Video File Upload */}
            <div>
              <label className="block text-lg font-bold text-blockbuster-gold mb-3">
                Video File *
              </label>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition ${
                  isDragging
                    ? 'border-neon-cyan bg-neon-cyan/10'
                    : 'border-gray-600 hover:border-neon-cyan/50 bg-blockbuster-navy/30'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/mp4,video/x-msvideo,video/x-matroska,video/quicktime,video/webm"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
                {videoFile ? (
                  <div>
                    <div className="text-5xl mb-4">📹</div>
                    <p className="text-xl font-bold text-neon-cyan mb-2">{videoFile.name}</p>
                    <p className="text-sm text-gray-400">
                      {(videoFile.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setVideoFile(null);
                      }}
                      className="mt-4 text-neon-pink hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="text-5xl mb-4">⬆️</div>
                    <p className="text-xl font-bold mb-2">Drag & drop your video here</p>
                    <p className="text-sm text-gray-400 mb-4">or click to browse</p>
                    <p className="text-xs text-gray-500">
                      Accepted formats: MP4, AVI, MKV, MOV, WEBM (Max 10GB)
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-lg font-bold text-blockbuster-gold mb-3">
                Title <span className="text-gray-500 text-sm font-normal">(optional - auto-filled from filename)</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Auto-filled from filename, or enter custom title"
                maxLength={200}
                className="w-full px-4 py-3 bg-blockbuster-navy border border-gray-600 rounded-lg focus:border-neon-cyan focus:outline-none text-white"
              />
              <p className="text-xs text-gray-500 mt-1">
                {title.length}/200 characters • TMDB will auto-fetch metadata if available
              </p>
            </div>

            {/* Description */}
            <div>
              <label className="block text-lg font-bold text-blockbuster-gold mb-3">
                Description <span className="text-gray-500 text-sm font-normal">(optional - auto-filled from TMDB)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Leave empty to auto-fetch plot from TMDB, or enter custom description"
                rows={5}
                className="w-full px-4 py-3 bg-blockbuster-navy border border-gray-600 rounded-lg focus:border-neon-cyan focus:outline-none text-white resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                TMDB will automatically fetch plot, cast, director, and poster if available
              </p>
            </div>

            {/* Genre */}
            <div>
              <label className="block text-lg font-bold text-blockbuster-gold mb-3">
                Genre *
              </label>
              <select
                value={genre}
                onChange={(e) => setGenre(parseInt(e.target.value))}
                className="w-full px-4 py-3 bg-blockbuster-navy border border-gray-600 rounded-lg focus:border-neon-cyan focus:outline-none text-white"
                required
              >
                {GENRES.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Storage Duration */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-lg font-bold text-blockbuster-gold">
                  Storage Duration
                </label>
                <button
                  type="button"
                  onClick={() => setIsAboutWalrusOpen(true)}
                  className="text-sm text-neon-cyan hover:underline flex items-center gap-1"
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
                    value={storageEpochs}
                    onChange={(e) => setStorageEpochs(parseInt(e.target.value))}
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
                    value={storageEpochs}
                    onChange={(e) => setStorageEpochs(Math.min(365, Math.max(1, parseInt(e.target.value) || 1)))}
                    className="w-full px-3 py-2 bg-blockbuster-navy border border-gray-600 rounded-lg focus:border-neon-cyan focus:outline-none text-white text-center"
                  />
                  <p className="text-xs text-gray-400 mt-1 text-center">epochs</p>
                </div>
              </div>
              <p className="text-sm text-gray-400 mt-2">
                Each epoch ≈ 14 days on mainnet. Your content will be stored for {storageEpochs * 14} days.
              </p>
            </div>

            {/* Cost Calculator */}
            {videoFile && (
              <WalrusCostCalculator
                fileSizeBytes={videoFile.size}
                epochs={storageEpochs}
                onCostCalculated={setCostEstimate}
              />
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-red-500/20 border border-red-500 rounded-lg p-4">
                <p className="text-red-300">{error}</p>
              </div>
            )}

            {/* Upload Progress */}
            {isUploading && (
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-400">Uploading...</span>
                  <span className="text-sm text-neon-cyan">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-neon-cyan h-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Payment Status */}
            {paymentComplete && paymentDigest && (
              <div className="bg-green-900/20 border border-green-500/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <p className="text-green-400 font-semibold">Payment Successful!</p>
                </div>
                <p className="text-sm text-gray-300">
                  Transaction: <span className="text-neon-cyan font-mono text-xs">{paymentDigest.slice(0, 20)}...</span>
                </p>
                <p className="text-sm text-gray-400 mt-1">You can now upload your content.</p>
              </div>
            )}

            {/* Payment/Submit Buttons */}
            {!paymentComplete ? (
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={handlePayment}
                  disabled={isPaying || !videoFile || !costEstimate || !currentAccount}
                  className="w-full py-4 bg-gradient-to-r from-neon-cyan to-blockbuster-gold text-black hover:opacity-90 rounded-lg font-bold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isPaying ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-black"></div>
                      Processing Payment...
                    </>
                  ) : (
                    <>
                      💳 Pay for Storage {costEstimate && `(${costEstimate.costs.totalSUI.toFixed(6)} SUI)`}
                    </>
                  )}
                </button>
                <p className="text-xs text-gray-400 text-center">
                  You must pay for storage before uploading. Payment is sent to the platform wallet, which covers Walrus storage costs.
                </p>
              </div>
            ) : (
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => router.push('/uploader')}
                  className="flex-1 py-4 bg-gray-700 hover:bg-gray-600 rounded-lg font-bold transition"
                  disabled={isUploading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading || !videoFile}
                  className="flex-1 py-4 bg-neon-cyan text-black hover:bg-neon-cyan/80 rounded-lg font-bold transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploading ? 'Uploading...' : 'Upload Content'}
                </button>
              </div>
            )}
          </form>

          {/* Info Box */}
          <div className="mt-12 bg-blockbuster-navy/30 rounded-lg p-6 border border-neon-cyan/20">
            <div className="flex items-start justify-between mb-3">
              <h3 className="text-lg font-bold text-blockbuster-gold">📌 Important Notes</h3>
              <button
                onClick={() => setIsAboutWalrusOpen(true)}
                className="text-sm text-neon-cyan hover:underline"
              >
                Learn more about Walrus →
              </button>
            </div>
            <ul className="space-y-2 text-sm text-gray-300">
              <li>• 🎬 <strong>TMDB Auto-Fetch:</strong> Movie metadata (title, plot, cast, poster) is automatically fetched from TMDB based on filename</li>
              <li>• Your video will be automatically transcoded to 720p for optimal streaming</li>
              <li>• Processing may take several minutes depending on file size</li>
              <li>• Content is stored on the decentralized Walrus network using 5x erasure coding</li>
              <li>• You will pay for storage using WAL tokens from your Sui wallet</li>
              <li>• Storage is epoch-based: testnet epochs are ~1 day, mainnet epochs are ~14 days</li>
              <li>• Ensure you have distribution rights for the content you upload</li>
            </ul>
          </div>
        </div>
      </div>

      {/* About Walrus Modal */}
      <AboutWalrusModal
        isOpen={isAboutWalrusOpen}
        onClose={() => setIsAboutWalrusOpen(false)}
      />
    </div>
  );
}
