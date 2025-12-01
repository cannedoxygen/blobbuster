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
 * Returns { valid: false } on any error instead of throwing
 */
export async function verifyToken(token: string): Promise<VerifyResponse> {
  try {
    const { data } = await authApi.post<VerifyResponse>('/verify', {
      token,
    });
    return data;
  } catch (error: any) {
    // Return valid: false instead of throwing - let caller handle refresh logic
    console.log('[verifyToken] Token verification failed:', error?.response?.data || error.message);
    return {
      success: false,
      valid: false,
      user: null as any,
    };
  }
}

/**
 * Refresh access token
 * Throws on error - caller should handle and clear tokens
 */
export async function refreshAccessToken(refreshToken: string): Promise<{ accessToken: string }> {
  console.log('[refreshAccessToken] Attempting to refresh token...');
  const { data } = await authApi.post('/refresh', {
    refreshToken,
  });
  console.log('[refreshAccessToken] Refresh successful');
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
