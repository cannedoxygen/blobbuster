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
  needsReauth: boolean; // Wallet connected but not authenticated - needs sign-in
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
  const [hasInitialized, setHasInitialized] = useState(false);
  const [previousWallet, setPreviousWallet] = useState<string | null>(null);
  const [walletConnectedThisSession, setWalletConnectedThisSession] = useState(false);
  const [needsReauth, setNeedsReauth] = useState(false); // Flag when wallet connected but auth failed

  // Load tokens from localStorage on mount
  useEffect(() => {
    const loadAuth = async () => {
      console.log('[Auth:loadAuth] Starting auth restoration...');
      try {
        const storedToken = localStorage.getItem(TOKEN_KEY);
        const storedRefreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
        console.log('[Auth:loadAuth] Stored tokens:', {
          hasAccessToken: !!storedToken,
          hasRefreshToken: !!storedRefreshToken,
          accessTokenPreview: storedToken ? storedToken.substring(0, 20) + '...' : null
        });

        if (storedToken) {
          // Verify stored token
          console.log('[Auth:loadAuth] Verifying stored token...');
          const { valid, user: userData } = await verifyToken(storedToken);
          console.log('[Auth:loadAuth] Token verification result:', { valid, userData });

          if (valid) {
            console.log('[Auth:loadAuth] Token valid, setting auth state');
            setAccessToken(storedToken);
            setUser(userData);
            setPreviousWallet(userData.walletAddress);
          } else {
            // Try to refresh token
            console.log('[Auth:loadAuth] Token invalid, attempting refresh...');
            const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
            if (refreshToken) {
              console.log('[Auth:loadAuth] Refresh token found, refreshing...');
              try {
                const { accessToken: newToken } = await refreshAccessToken(refreshToken);
                localStorage.setItem(TOKEN_KEY, newToken);
                setAccessToken(newToken);

                // Get user with new token
                const verifyResult = await verifyToken(newToken);
                if (verifyResult.valid && verifyResult.user) {
                  console.log('[Auth:loadAuth] Refresh successful, user:', verifyResult.user);
                  setUser(verifyResult.user);
                  setPreviousWallet(verifyResult.user.walletAddress);
                } else {
                  console.log('[Auth:loadAuth] New token also invalid, clearing tokens');
                  localStorage.removeItem(TOKEN_KEY);
                  localStorage.removeItem(REFRESH_TOKEN_KEY);
                }
              } catch (refreshError) {
                console.error('[Auth:loadAuth] Refresh token failed:', refreshError);
                localStorage.removeItem(TOKEN_KEY);
                localStorage.removeItem(REFRESH_TOKEN_KEY);
              }
            } else {
              // Clear invalid tokens
              console.log('[Auth:loadAuth] No refresh token, clearing tokens');
              localStorage.removeItem(TOKEN_KEY);
              localStorage.removeItem(REFRESH_TOKEN_KEY);
            }
          }
        } else {
          console.log('[Auth:loadAuth] No stored token found');
        }
      } catch (error) {
        console.error('[Auth:loadAuth] Failed to restore auth:', error);
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
      } finally {
        console.log('[Auth:loadAuth] Auth restoration complete');
        setIsLoading(false);
        setHasInitialized(true);
      }
    };

    loadAuth();
  }, []);

  // Track current wallet
  useEffect(() => {
    if (currentAccount) {
      setPreviousWallet(currentAccount.address);
      setWalletConnectedThisSession(true);
    }
  }, [currentAccount]);

  // Auto-logout only if user explicitly disconnected their wallet
  // (not on page load when wallet hasn't connected yet)
  useEffect(() => {
    if (!hasInitialized || isLoading) return;

    console.log('[Auth:walletSync] Checking wallet sync:', {
      hasUser: !!user,
      userWallet: user?.walletAddress,
      currentAccount: currentAccount?.address,
      walletConnectedThisSession,
      hasInitialized,
      isLoading
    });

    // Only logout if wallet was connected this session and is now disconnected
    // (not if page just loaded and wallet hasn't connected yet)
    if (user && walletConnectedThisSession && !currentAccount) {
      console.log('[Auth:walletSync] Wallet disconnected, logging out');
      logout();
      return;
    }

    // If user logged in but wallet changed to different address
    if (user && currentAccount && currentAccount.address.toLowerCase() !== user.walletAddress.toLowerCase()) {
      console.log('[Auth:walletSync] Wallet address mismatch!', {
        currentWallet: currentAccount.address,
        userWallet: user.walletAddress
      });
      logout();
      return;
    }

    console.log('[Auth:walletSync] Wallet sync OK');
  }, [currentAccount, user, hasInitialized, isLoading, walletConnectedThisSession]);

  // Sync wallet connection with auth state
  // Detects when wallet is connected but user is not authenticated (needs re-login)
  useEffect(() => {
    if (!hasInitialized || isLoading) return;

    const isWalletConnected = !!currentAccount;
    const isUserAuthenticated = !!user && !!accessToken;

    if (isWalletConnected && !isUserAuthenticated) {
      // Wallet is connected but we're not authenticated
      // This happens after page refresh when token verification fails
      console.log('[Auth] Wallet connected but not authenticated - needs re-auth');
      setNeedsReauth(true);
    } else {
      setNeedsReauth(false);
    }
  }, [currentAccount, user, accessToken, hasInitialized, isLoading]);

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
      setNeedsReauth(false); // Clear the reauth flag on successful login
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
    setPreviousWallet(null);
    setWalletConnectedThisSession(false);
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
    needsReauth,
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
