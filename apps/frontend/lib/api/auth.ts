import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const authApi = axios.create({
  baseURL: `${API_URL}/api/auth`,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface User {
  id: string;
  walletAddress: string;
  username?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  hasMembership: boolean;
  isUploader: boolean;
  createdAt: string;
}

export interface AuthResponse {
  success: boolean;
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface ChallengeResponse {
  success: boolean;
  message: string;
}

export interface VerifyResponse {
  success: boolean;
  valid: boolean;
  user: User;
}

/**
 * Get challenge message for wallet to sign
 */
export async function getChallenge(walletAddress: string): Promise<ChallengeResponse> {
  const { data } = await authApi.post<ChallengeResponse>('/challenge', {
    walletAddress,
  });
  return data;
}

/**
 * Authenticate with wallet signature
 */
export async function connectWallet(
  walletAddress: string,
  message: string,
  signature: string
): Promise<AuthResponse> {
  const { data } = await authApi.post<AuthResponse>('/connect', {
    walletAddress,
    message,
    signature,
  });
  return data;
}

/**
 * Verify JWT token
 */
export async function verifyToken(token: string): Promise<VerifyResponse> {
  const { data } = await authApi.post<VerifyResponse>('/verify', {
    token,
  });
  return data;
}

/**
 * Refresh access token
 */
export async function refreshAccessToken(refreshToken: string): Promise<{ accessToken: string }> {
  const { data } = await authApi.post('/refresh', {
    refreshToken,
  });
  return data;
}

/**
 * Get current user
 */
export async function getCurrentUser(token: string): Promise<{ user: User }> {
  const { data } = await authApi.get('/me', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return data;
}
