'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ConnectButton } from '@mysten/dapp-kit';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { useAuth } from '@/lib/auth/AuthContext';

export default function Header() {
  const currentAccount = useCurrentAccount();
  const { isAuthenticated, login, logout, user, isLoading } = useAuth();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [userClickedSignIn, setUserClickedSignIn] = useState(false);

  const handleSignIn = async () => {
    // If no wallet, the ConnectButton will handle it
    // This function is for when wallet is already connected
    if (!currentAccount) {
      console.log('[DEBUG] No current account, skipping sign in');
      return;
    }

    console.log('[DEBUG] Starting sign in with account:', currentAccount.address);
    setIsSigningIn(true);
    try {
      await login();
      console.log('[DEBUG] Login successful!');
      setUserClickedSignIn(false); // Reset after successful login
    } catch (error) {
      console.error('[DEBUG] Sign in failed:', error);
      setUserClickedSignIn(false);
    } finally {
      setIsSigningIn(false);
    }
  };

  // Only auto-login if user explicitly clicked the Sign In button
  useEffect(() => {
    if (userClickedSignIn && currentAccount && !isAuthenticated && !isLoading) {
      handleSignIn();
    }
  }, [userClickedSignIn, currentAccount, isAuthenticated, isLoading]);

  return (
    <header className="bg-blobbuster-blue border-b border-blobbuster-yellow/30">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2 hover:opacity-80 transition">
            <div className="w-10 h-10 bg-blobbuster-gold rounded-sm" />
            <h1 className="text-2xl font-heading relative inline-block">
              <span
                className="absolute top-0 left-0 text-blobbuster-blue"
                style={{ transform: 'translate(4px, 4px)', zIndex: 0 }}
              >
                BLOBBUSTER
              </span>
              <span className="relative text-blobbuster-yellow" style={{ zIndex: 1 }}>
                BLOBBUSTER
              </span>
            </h1>
          </Link>

          <nav className="hidden md:flex space-x-8">
            <Link href="/library" className="text-white hover:text-blobbuster-yellow transition font-bold uppercase">
              Library
            </Link>
            <Link href="/membership" className="text-white hover:text-blobbuster-yellow transition font-bold uppercase">
              Membership
            </Link>
            <Link href="/uploader" className="text-white hover:text-blobbuster-yellow transition font-bold uppercase">
              Providers
            </Link>
          </nav>

          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <span className="text-sm text-blobbuster-yellow font-bold">
                  {user?.username || currentAccount?.address.slice(0, 6) + '...'}
                </span>
                <button
                  onClick={logout}
                  className="px-4 py-2 bg-blobbuster-yellow text-blobbuster-blue hover:bg-blobbuster-yellow/90 rounded-lg font-bold transition text-sm uppercase"
                >
                  Sign Out
                </button>
              </>
            ) : currentAccount ? (
              <button
                onClick={handleSignIn}
                disabled={isSigningIn || isLoading}
                className="px-6 py-2 bg-blobbuster-yellow text-blobbuster-blue hover:bg-blobbuster-yellow/90 rounded-lg font-bold transition disabled:opacity-50 disabled:cursor-not-allowed uppercase"
              >
                {isSigningIn ? 'Signing In...' : 'Sign In'}
              </button>
            ) : (
              <div onClick={() => setUserClickedSignIn(true)}>
                <ConnectButton
                  connectText="Sign In"
                  className="px-6 py-2 bg-blobbuster-yellow text-blobbuster-blue hover:bg-blobbuster-yellow/90 rounded-lg font-bold transition uppercase"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
