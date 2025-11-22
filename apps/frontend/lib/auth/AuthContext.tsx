'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useCurrentAccount, useSignPersonalMessage } from '@mysten/dapp-kit';
import { User, getChallenge, connectWallet, verifyToken, refreshAccessToken } from '../api/auth';

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: () => Promise<void>;
  logout: () => void;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'blobbuster_access_token';
const REFRESH_TOKEN_KEY = 'blobbuster_refresh_token';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const currentAccount = useCurrentAccount();
  const { mutateAsync: signPersonalMessage } = useSignPersonalMessage();

  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load tokens from localStorage on mount
  useEffect(() => {
    const loadAuth = async () => {
      try {
        const storedToken = localStorage.getItem(TOKEN_KEY);

        if (storedToken) {
          // Verify stored token
          const { valid, user: userData } = await verifyToken(storedToken);

          if (valid) {
            setAccessToken(storedToken);
            setUser(userData);
          } else {
            // Try to refresh token
            const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
            if (refreshToken) {
              const { accessToken: newToken } = await refreshAccessToken(refreshToken);
              localStorage.setItem(TOKEN_KEY, newToken);
              setAccessToken(newToken);

              // Get user with new token
              const { user: userData } = await verifyToken(newToken);
              setUser(userData);
            } else {
              // Clear invalid tokens
              localStorage.removeItem(TOKEN_KEY);
              localStorage.removeItem(REFRESH_TOKEN_KEY);
            }
          }
        }
      } catch (error) {
        console.error('Failed to restore auth:', error);
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
      } finally {
        setIsLoading(false);
      }
    };

    loadAuth();
  }, []);

  // Auto-logout if wallet disconnects
  useEffect(() => {
    if (!currentAccount && user) {
      logout();
    }
  }, [currentAccount, user]);

  const login = useCallback(async () => {
    if (!currentAccount) {
      setError('Please connect your wallet first');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const walletAddress = currentAccount.address;

      // Step 1: Get challenge message
      const { message } = await getChallenge(walletAddress);

      // Step 2: Sign message with wallet
      const signedMessage = await signPersonalMessage({
        message: new TextEncoder().encode(message),
      });

      const signature = signedMessage.signature;

      // Step 3: Authenticate with backend
      const response = await connectWallet(
        walletAddress,
        message,
        signature
      );

      // Step 4: Store tokens
      localStorage.setItem(TOKEN_KEY, response.accessToken);
      localStorage.setItem(REFRESH_TOKEN_KEY, response.refreshToken);

      setAccessToken(response.accessToken);
      setUser(response.user);
    } catch (error: any) {
      console.error('Login failed:', error);
      setError(error.message || 'Authentication failed');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [currentAccount, signPersonalMessage]);

  const logout = useCallback(() => {
    setUser(null);
    setAccessToken(null);
    setError(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }, []);

  const refreshAuth = useCallback(async () => {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);

    if (!refreshToken) {
      logout();
      return;
    }

    try {
      const { accessToken: newToken } = await refreshAccessToken(refreshToken);
      localStorage.setItem(TOKEN_KEY, newToken);
      setAccessToken(newToken);

      // Get updated user info
      const { user: userData } = await verifyToken(newToken);
      setUser(userData);
    } catch (error) {
      console.error('Token refresh failed:', error);
      logout();
    }
  }, [logout]);

  const value: AuthContextType = {
    user,
    accessToken,
    isAuthenticated: !!user && !!accessToken,
    isLoading,
    error,
    login,
    logout,
    refreshAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
