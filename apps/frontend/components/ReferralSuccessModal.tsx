'use client';

import { useState } from 'react';

interface ReferralSuccessModalProps {
  isOpen: boolean;
  referralCode: string;
  onClose: () => void;
}

export default function ReferralSuccessModal({
  isOpen,
  referralCode,
  onClose,
}: ReferralSuccessModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const shareUrl = `${window.location.origin}/library?provider=${referralCode}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative bg-gradient-to-br from-blockbuster-navy to-blockbuster-darkBlue border-2 border-blockbuster-gold/50 rounded-xl shadow-2xl max-w-lg w-full mx-4 p-8 animate-in fade-in zoom-in duration-300">
        {/* Success Icon */}
        <div className="text-center mb-6">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
            <svg className="w-10 h-10 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-3xl font-heading text-blockbuster-gold mb-2 uppercase">
            You're Now a Provider!
          </h2>
          <p className="text-gray-300">
            Start uploading content and earning revenue
          </p>
        </div>

        {/* Referral Code Display */}
        <div className="bg-blockbuster-darkBlue/50 rounded-lg p-6 mb-6 border border-neon-cyan/20">
          <div className="text-center mb-4">
            <p className="text-sm text-gray-400 mb-2 uppercase font-bold">Your Referral Code</p>
            <div className="text-4xl font-black text-blockbuster-gold tracking-widest">
              {referralCode}
            </div>
          </div>

          <button
            onClick={handleCopy}
            className="w-full btn-primary py-3 rounded-lg flex items-center justify-center gap-2"
          >
            {copied ? (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy Code
              </>
            )}
          </button>
        </div>

        {/* Share Link */}
        <div className="bg-blockbuster-darkBlue/50 rounded-lg p-4 mb-6 border border-neon-cyan/20">
          <p className="text-xs text-gray-400 mb-2 uppercase font-bold">Share Your Collection</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={shareUrl}
              readOnly
              className="flex-1 px-3 py-2 bg-blockbuster-navy border border-neon-cyan/30 rounded text-sm text-gray-300 focus:outline-none"
            />
            <button
              onClick={handleCopyLink}
              className="px-4 py-2 bg-neon-cyan/20 hover:bg-neon-cyan/30 border border-neon-cyan/50 rounded text-sm font-bold transition"
            >
              {copied ? '✓' : 'Copy'}
            </button>
          </div>
        </div>

        {/* What You Can Do */}
        <div className="space-y-3 mb-6">
          <p className="text-sm font-bold text-blockbuster-gold uppercase">What's Next:</p>
          <div className="space-y-2 text-sm text-gray-300">
            <div className="flex items-start gap-2">
              <span className="text-neon-cyan">✓</span>
              <span>People can browse <strong>your content collection</strong> using your code</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-neon-cyan">✓</span>
              <span>Track how many people you bring to Blockbuster</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-neon-cyan">✓</span>
              <span>Upload content and earn <strong>70% revenue share</strong></span>
            </div>
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full px-6 py-3 bg-white/10 hover:bg-white/20 rounded-lg font-bold transition"
        >
          Get Started
        </button>
      </div>
    </div>
  );
}
