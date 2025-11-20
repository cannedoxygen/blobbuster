// ===== User Types =====

export interface User {
  id: string;
  walletAddress: string;
  username?: string;
  email?: string;
  avatarUrl?: string;
  createdAt: Date;
}

// ===== Membership Types =====

export enum MembershipTier {
  Basic = 1,
  Premium = 2,
  Collector = 3,
}

export interface Membership {
  id: string;
  userId: string;
  nftObjectId: string;
  tier: MembershipTier;
  issuedAt: Date;
  expiresAt: Date;
  isActive: boolean;
}

export interface MembershipTierInfo {
  id: MembershipTier;
  name: string;
  price: number; // in SUI
  priceInMist: bigint; // in MIST
  features: string[];
  streamLimit: number;
  supports4K: boolean;
}

// ===== Content Types =====

export enum ContentGenre {
  Action = 0,
  Comedy = 1,
  Drama = 2,
  Horror = 3,
  SciFi = 4,
  Romance = 5,
  Thriller = 6,
  Documentary = 7,
  Animation = 8,
  Family = 9,
}

export enum ContentStatus {
  Pending = 0,
  Active = 1,
  Inactive = 2,
  Removed = 3,
}

export interface Content {
  id: string;
  blockchainId: string;
  uploaderId: string;
  title: string;
  description: string;
  genre: ContentGenre;
  durationSeconds: number;
  walrusBlobIds: {
    original?: string;
    '480p'?: string;
    '720p'?: string;
    '1080p'?: string;
    '4K'?: string;
    thumbnail?: string;
  };
  thumbnailUrl?: string;
  status: ContentStatus;
  totalStreams: number;
  totalWatchTime: number;
  averageCompletionRate: number;
  averageRating: number;
  createdAt: Date;
  updatedAt: Date;
}

// ===== Streaming Types =====

export enum QualityLevel {
  SD = 0,    // 480p
  HD = 1,    // 720p
  FHD = 2,   // 1080p
  UHD = 3,   // 4K
}

export interface StreamSession {
  id: string;
  userId: string;
  contentId: string;
  sessionId: string;
  startTime: Date;
  endTime?: Date;
  watchDuration?: number;
  completionPercentage?: number;
  qualityLevel?: QualityLevel;
  blockchainTxDigest?: string;
}

export interface StreamStartResponse {
  sessionId: string;
  streamUrl: string;
  token: string;
  expiresAt: Date;
  availableQualities: QualityLevel[];
}

// ===== Revenue Types =====

export interface UploaderProfile {
  id: string;
  userId: string;
  blockchainAccountId: string;
  totalEarnings: bigint;
  pendingEarnings: bigint;
  totalStreams: number;
  totalContentUploaded: number;
}

export interface Distribution {
  id: string;
  uploaderId: string;
  weekStartDate: Date;
  weekEndDate: Date;
  amount: bigint;
  weightedScore: bigint;
  totalStreams: number;
  blockchainTxDigest: string;
  createdAt: Date;
}

export interface RevenuePoolStats {
  totalCollected: bigint;
  operatorShare: bigint;
  creatorShare: bigint;
  pendingDistribution: bigint;
  lastDistributionEpoch: number;
}

// ===== Analytics Types =====

export interface PlatformAnalytics {
  date: Date;
  newMembers: number;
  activeMembers: number;
  totalStreams: number;
  totalWatchHours: number;
  revenueCollected: bigint;
  newContent: number;
}

export interface CreatorAnalytics {
  uploaderId: string;
  totalEarnings: bigint;
  pendingEarnings: bigint;
  totalStreams: number;
  totalWatchTime: number;
  averageCompletionRate: number;
  topContent: Array<{
    contentId: string;
    title: string;
    streams: number;
    earnings: bigint;
  }>;
}

// ===== API Response Types =====

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// ===== Blockchain Types =====

export interface SuiTransaction {
  digest: string;
  timestamp: number;
  sender: string;
  status: 'success' | 'failure';
}

export interface MembershipNFT {
  objectId: string;
  owner: string;
  tier: MembershipTier;
  issuedAt: number;
  expiresAt: number;
  streamsUsed: number;
  totalWatchTime: number;
  isTransferable: boolean;
}

// ===== Upload Types =====

export interface UploadProgress {
  contentId: string;
  status: 'uploading' | 'transcoding' | 'uploading_walrus' | 'registering' | 'completed' | 'failed';
  progress: number; // 0-100
  currentStep?: string;
  error?: string;
}

export interface ContentUploadRequest {
  title: string;
  description: string;
  genre: ContentGenre;
  file: File | Buffer;
}

// ===== Walrus Storage Types =====

export interface WalrusUploadResult {
  blobId: string;
  objectId?: string;
  size: number;
  epochs: number;
  cost: number;
  storageCostSUI: string;
  deletable: boolean;
  encodingType: string;
  createdAt: Date;
}

export interface WalrusBlobMetadata {
  blobId: string;
  size: number;
  epochs: number;
  expiresAt: Date;
  isPermanent: boolean;
}

export interface WalrusQualitySet {
  '480p'?: WalrusUploadResult;
  '720p'?: WalrusUploadResult;
  '1080p'?: WalrusUploadResult;
  '4K'?: WalrusUploadResult;
  thumbnail?: WalrusUploadResult;
}

export interface WalrusStorageStats {
  totalBlobs: number;
  totalSize: number;
  totalCost: number;
  activeBlobs: number;
  expiringBlobs: number;
}
