'use client';

import { useEffect, useRef, useCallback } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const PREFETCH_SIZE = 5 * 1024 * 1024; // 5MB

interface WalrusBlobIds {
  type?: 'single' | 'hls';
  videoBlobId?: string;
  video?: string;
  '720p'?: string;
  '1080p'?: string;
  '480p'?: string;
}

/**
 * Hook to prefetch the first 5MB of a video when the movie details modal opens.
 * This warms up the browser cache so playback starts faster.
 */
export function useVideoPrefetch(contentId: string | null, walrusBlobIds: WalrusBlobIds | string | null) {
  const abortControllerRef = useRef<AbortController | null>(null);
  const prefetchedRef = useRef<Set<string>>(new Set());

  const prefetch = useCallback(async () => {
    if (!contentId || !walrusBlobIds) return;

    // Parse blob IDs if string
    const blobIds: WalrusBlobIds = typeof walrusBlobIds === 'string'
      ? JSON.parse(walrusBlobIds)
      : walrusBlobIds;

    // Get the blob ID based on format
    let blobId: string | null = null;

    if (blobIds.type === 'single' && blobIds.videoBlobId) {
      blobId = blobIds.videoBlobId;
    } else if (blobIds.video) {
      blobId = blobIds.video;
    } else {
      // Legacy format - try quality keys
      blobId = blobIds['720p'] || blobIds['1080p'] || blobIds['480p'] || null;
    }

    if (!blobId) {
      console.log('[Prefetch] No blob ID found for content:', contentId);
      return;
    }

    // Skip if already prefetched
    if (prefetchedRef.current.has(blobId)) {
      console.log('[Prefetch] Already prefetched:', blobId);
      return;
    }

    // Abort any existing prefetch
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    const streamUrl = `${API_URL}/api/stream/proxy/${blobId}`;

    console.log('[Prefetch] Starting prefetch for:', contentId, 'blob:', blobId);

    try {
      const response = await fetch(streamUrl, {
        method: 'GET',
        headers: {
          'Range': `bytes=0-${PREFETCH_SIZE - 1}`,
        },
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok && response.status !== 206) {
        console.warn('[Prefetch] Non-OK response:', response.status);
        return;
      }

      // Read the response to ensure it's cached
      const reader = response.body?.getReader();
      if (reader) {
        let bytesRead = 0;
        while (bytesRead < PREFETCH_SIZE) {
          const { done, value } = await reader.read();
          if (done) break;
          bytesRead += value?.length || 0;
        }
        reader.cancel();
      }

      prefetchedRef.current.add(blobId);
      console.log('[Prefetch] Completed prefetch for:', contentId, '(~5MB cached)');
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('[Prefetch] Aborted prefetch for:', contentId);
      } else {
        console.warn('[Prefetch] Failed to prefetch:', error.message);
      }
    }
  }, [contentId, walrusBlobIds]);

  // Start prefetch when contentId/blobIds change
  useEffect(() => {
    prefetch();

    // Cleanup - abort on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [prefetch]);

  // Return abort function for manual control
  const abort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  return { abort };
}
