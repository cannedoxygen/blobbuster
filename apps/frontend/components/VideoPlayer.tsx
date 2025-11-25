'use client';

import { useEffect, useRef } from 'react';
import axios from 'axios';
import Hls from 'hls.js';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface VideoPlayerProps {
  contentId: string;
  sessionId: string;
  streamUrl: string;
  durationSeconds: number;
  accessToken: string;
}

export function VideoPlayer({
  contentId,
  sessionId,
  streamUrl,
  durationSeconds,
  accessToken,
}: VideoPlayerProps) {
  console.log('VideoPlayer rendering with streamUrl:', streamUrl);

  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const watchDurationRef = useRef(0);

  // Initialize HLS.js for m3u8 streams
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !streamUrl) return;

    const isHLS = streamUrl.endsWith('.m3u8');

    if (isHLS && Hls.isSupported()) {
      // Use HLS.js for adaptive streaming
      console.log('Initializing HLS.js for stream:', streamUrl);

      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        // Buffer settings optimized for smooth VOD playback
        backBufferLength: 90, // Keep 90 seconds of back buffer for seeking
        maxBufferLength: 60, // Buffer 60 seconds ahead for seamless playback
        maxMaxBufferLength: 120, // Allow up to 2 minutes buffer
        maxBufferSize: 120 * 1000 * 1000, // 120 MB max buffer
        maxBufferHole: 0.5, // Maximum gap to skip
        // Start loading immediately and aggressively
        startLevel: -1, // Auto-select quality
        autoStartLoad: true,
        // Segment loading optimization
        maxLoadingDelay: 4, // Max delay before aborting slow segment
        fragLoadingTimeOut: 20000, // 20s timeout per segment
        fragLoadingMaxRetry: 6, // Retry failed segments
        fragLoadingRetryDelay: 1000, // 1s between retries
        // Level loading
        levelLoadingTimeOut: 10000,
        levelLoadingMaxRetry: 4,
      });

      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
        console.log('HLS manifest loaded, ready to play', {
          levels: data.levels.length,
          firstLevel: data.firstLevel,
        });
        // Auto-play when manifest is ready
        video.play().catch((err) => console.log('Auto-play prevented:', err));
      });

      hls.on(Hls.Events.FRAG_LOADED, (event, data) => {
        console.log(`HLS segment ${data.frag.sn} loaded (${(data.frag.stats.total / 1024).toFixed(0)}KB)`);
      });

      hls.on(Hls.Events.BUFFER_APPENDED, () => {
        if (video.buffered.length > 0) {
          const bufferedEnd = video.buffered.end(video.buffered.length - 1);
          const bufferedAhead = bufferedEnd - video.currentTime;
          console.log(`Buffer: ${bufferedAhead.toFixed(1)}s ahead`);
        }
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error('HLS error:', data.type, data.details, data);
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.log('Network error, attempting to recover...');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.log('Media error, attempting to recover...');
              hls.recoverMediaError();
              break;
            default:
              console.error('Fatal error, cannot recover');
              hls.destroy();
              break;
          }
        }
      });

      hlsRef.current = hls;

      return () => {
        if (hlsRef.current) {
          hlsRef.current.destroy();
          hlsRef.current = null;
        }
      };
    } else if (isHLS && video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari has native HLS support
      console.log('Using native HLS support (Safari)');
      video.src = streamUrl;
    } else {
      // Regular MP4 playback (legacy)
      console.log('Using standard video playback');
      video.src = streamUrl;
    }
  }, [streamUrl]);

  // Track video events
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      watchDurationRef.current = Math.floor(video.currentTime);
    };

    const handleLoadedMetadata = () => {
      console.log('Video metadata loaded:', {
        duration: video.duration,
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
        src: video.currentSrc,
      });
    };

    const handleLoadedData = () => {
      console.log('Video data loaded - first frame ready');
    };

    const handleCanPlay = () => {
      console.log('Video can play');
    };

    const handleError = () => {
      console.error('Video error:', video.error);
    };

    const handleWaiting = () => {
      console.log('Video buffering...');
    };

    const handlePlaying = () => {
      console.log('Video playing');
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('error', handleError);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('playing', handlePlaying);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('error', handleError);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('playing', handlePlaying);
    };
  }, []);

  // Heartbeat mechanism - send progress every 30 seconds
  useEffect(() => {
    const sendHeartbeat = async (isFinal = false) => {
      try {
        const currentDuration = watchDurationRef.current;
        await axios.post(
          `${API_URL}/api/stream/heartbeat`,
          {
            sessionId,
            contentId,
            watchDuration: currentDuration,
            isFinal,
          },
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        console.log(`Heartbeat sent: ${currentDuration}s`);
      } catch (error) {
        console.error('Failed to send heartbeat:', error);
      }
    };

    // Send heartbeat every 30 seconds
    heartbeatIntervalRef.current = setInterval(() => {
      if (watchDurationRef.current > 0) {
        sendHeartbeat(false);
      }
    }, 30000); // 30 seconds

    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
    };
  }, [sessionId, contentId, accessToken]);

  // Send final heartbeat when component unmounts
  useEffect(() => {
    return () => {
      if (watchDurationRef.current > 0) {
        sendHeartbeat(true);
      }
    };
  }, []);

  const sendHeartbeat = async (isFinal = false) => {
    try {
      const currentDuration = watchDurationRef.current;
      const completionPercentage = Math.min(
        Math.round((currentDuration / durationSeconds) * 100),
        100
      );

      await axios.post(
        `${API_URL}/api/stream/${isFinal ? 'end' : 'heartbeat'}`,
        {
          sessionId,
          contentId,
          watchDuration: currentDuration,
          completionPercentage,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      console.log(
        `${isFinal ? 'Final' : 'Heartbeat'} sent: ${currentDuration}s (${completionPercentage}% complete)`
      );
    } catch (error) {
      console.error('Failed to send heartbeat:', error);
    }
  };

  return (
    <div className="relative bg-black min-h-[400px] md:min-h-[600px] flex items-center justify-center">
      <video
        ref={videoRef}
        controls
        playsInline
        preload="auto"
        crossOrigin="anonymous"
        className="w-full h-full max-w-full max-h-full"
        style={{ minHeight: '400px' }}
      >
        Your browser does not support the video tag.
      </video>
    </div>
  );
}
