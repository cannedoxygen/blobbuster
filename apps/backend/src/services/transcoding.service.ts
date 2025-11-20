import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { logger } from '../utils/logger';

const execAsync = promisify(exec);

/**
 * Video Transcoding Service
 * Uses FFmpeg to transcode videos to multiple quality levels
 */

export interface TranscodeOptions {
  inputPath: string;
  outputDir: string;
  qualities?: QualityPreset[];
  generateThumbnail?: boolean;
}

export interface QualityPreset {
  name: string;
  width: number;
  height: number;
  bitrate: string;
  audioBitrate: string;
}

export interface TranscodeResult {
  quality: string;
  outputPath: string;
  size: number;
  duration: number;
  width: number;
  height: number;
}

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  codec: string;
  bitrate: number;
  fps: number;
  size: number;
}

export class TranscodingService {
  private ffmpegPath: string;
  private ffprobePath: string;

  // Single quality preset - 720p for all uploads
  // Optimized for mobile/laptop viewing, faster transcoding, lower storage costs
  private static readonly QUALITY_PRESETS: Record<string, QualityPreset> = {
    '720p': {
      name: '720p',
      width: 1280,
      height: 720,
      bitrate: '2500k',
      audioBitrate: '128k',
    },
  };

  constructor() {
    this.ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';
    this.ffprobePath = process.env.FFPROBE_PATH || 'ffprobe';
  }

  /**
   * Get video metadata using ffprobe
   */
  async getVideoMetadata(videoPath: string): Promise<VideoMetadata> {
    try {
      const cmd = `${this.ffprobePath} -v quiet -print_format json -show_format -show_streams "${videoPath}"`;
      const { stdout } = await execAsync(cmd);
      const data = JSON.parse(stdout);

      const videoStream = data.streams.find((s: any) => s.codec_type === 'video');

      if (!videoStream) {
        throw new Error('No video stream found in file');
      }

      const stats = await fs.stat(videoPath);

      return {
        duration: parseFloat(data.format.duration),
        width: videoStream.width,
        height: videoStream.height,
        codec: videoStream.codec_name,
        bitrate: parseInt(data.format.bit_rate),
        fps: eval(videoStream.r_frame_rate), // e.g., "30/1" = 30
        size: stats.size,
      };
    } catch (error) {
      logger.error('Failed to get video metadata', {
        videoPath,
        error: error instanceof Error ? error.message : error,
      });
      throw new Error(`Failed to analyze video: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Check if video needs transcoding
   * Only 2 requirements: H.264 codec + MP4 container
   * All resolutions accepted (720p, 1080p, 4K, etc.)
   */
  async shouldSkipTranscoding(metadata: VideoMetadata, filePath: string): Promise<{
    skip: boolean;
    reason?: string;
  }> {
    try {
      // Requirement 1: Must be MP4 container
      const ext = path.extname(filePath).toLowerCase();
      if (ext !== '.mp4') {
        return { skip: false, reason: `Format is ${ext}, need MP4` };
      }

      // Requirement 2: Must be H.264 codec
      if (metadata.codec !== 'h264') {
        return { skip: false, reason: `Codec is ${metadata.codec}, need H.264` };
      }

      // Both requirements met! Skip transcoding
      logger.info('Video is compatible (H.264 MP4), skipping transcoding', {
        filePath,
        codec: metadata.codec,
        resolution: `${metadata.width}x${metadata.height}`,
      });

      return { skip: true };
    } catch (error) {
      // If we can't determine, safer to transcode
      logger.warn('Failed to check if transcoding needed, will transcode to be safe', {
        error: error instanceof Error ? error.message : error,
      });
      return { skip: false, reason: 'Could not verify optimization' };
    }
  }


  /**
   * Transcode video to multiple quality levels
   */
  async transcodeVideo(options: TranscodeOptions): Promise<{
    qualities: TranscodeResult[];
    thumbnail?: string;
    metadata: VideoMetadata;
  }> {
    const { inputPath, outputDir, qualities, generateThumbnail = true } = options;

    logger.info('Starting video transcoding', {
      input: inputPath,
      outputDir,
      qualities: qualities?.map((q) => q.name) || 'all',
    });

    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true });

    // Get source video metadata
    const metadata = await this.getVideoMetadata(inputPath);

    // Determine which qualities to generate based on source resolution
    const presetsToUse = this.selectQualityPresets(metadata, qualities);

    // Transcode all qualities in parallel (be mindful of CPU usage)
    const transcodePromises = presetsToUse.map((preset) =>
      this.transcodeToQuality(inputPath, outputDir, preset, metadata)
    );

    const results = await Promise.all(transcodePromises);

    // Generate thumbnail if requested
    let thumbnailPath: string | undefined;
    if (generateThumbnail) {
      thumbnailPath = await this.generateThumbnail(inputPath, outputDir);
    }

    logger.info('Transcoding completed', {
      input: inputPath,
      qualities: results.map((r) => r.quality),
      thumbnail: !!thumbnailPath,
    });

    return {
      qualities: results,
      thumbnail: thumbnailPath,
      metadata,
    };
  }

  /**
   * Transcode video to a specific quality
   */
  private async transcodeToQuality(
    inputPath: string,
    outputDir: string,
    preset: QualityPreset,
    sourceMetadata: VideoMetadata
  ): Promise<TranscodeResult> {
    const outputPath = path.join(outputDir, `${preset.name}.mp4`);

    logger.info(`Transcoding to ${preset.name}`, { input: inputPath });

    // Build FFmpeg command
    // -i: input file
    // -vf scale: scale video to target resolution (maintains aspect ratio)
    // -c:v libx264: use H.264 codec
    // -preset: encoding speed/quality tradeoff (fast, medium, slow)
    // -crf: constant rate factor (quality: 23 is default, lower = better)
    // -b:v: video bitrate
    // -c:a aac: audio codec
    // -b:a: audio bitrate
    // -movflags +faststart: optimize for web streaming
    const cmd = `${this.ffmpegPath} -i "${inputPath}" \
      -vf "scale=${preset.width}:${preset.height}:force_original_aspect_ratio=decrease,pad=${preset.width}:${preset.height}:(ow-iw)/2:(oh-ih)/2" \
      -c:v libx264 \
      -preset medium \
      -crf 23 \
      -b:v ${preset.bitrate} \
      -maxrate ${preset.bitrate} \
      -bufsize ${parseInt(preset.bitrate) * 2}k \
      -c:a aac \
      -b:a ${preset.audioBitrate} \
      -movflags +faststart \
      -y \
      "${outputPath}"`;

    try {
      await execAsync(cmd, { maxBuffer: 1024 * 1024 * 10 }); // 10MB buffer

      const stats = await fs.stat(outputPath);
      const outputMetadata = await this.getVideoMetadata(outputPath);

      logger.info(`Transcoding to ${preset.name} completed`, {
        size: stats.size,
        duration: outputMetadata.duration,
      });

      return {
        quality: preset.name,
        outputPath,
        size: stats.size,
        duration: outputMetadata.duration,
        width: outputMetadata.width,
        height: outputMetadata.height,
      };
    } catch (error) {
      logger.error(`Failed to transcode to ${preset.name}`, {
        input: inputPath,
        error: error instanceof Error ? error.message : error,
      });
      throw new Error(`Transcoding to ${preset.name} failed: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Generate video thumbnail
   */
  async generateThumbnail(inputPath: string, outputDir: string): Promise<string> {
    const thumbnailPath = path.join(outputDir, 'thumbnail.jpg');

    logger.info('Generating thumbnail', { input: inputPath });

    // Extract frame at 2 seconds (or 10% of duration, whichever is less)
    const cmd = `${this.ffmpegPath} -i "${inputPath}" \
      -ss 2 \
      -vframes 1 \
      -vf "scale=1280:720:force_original_aspect_ratio=decrease" \
      -q:v 2 \
      -y \
      "${thumbnailPath}"`;

    try {
      await execAsync(cmd);
      logger.info('Thumbnail generated', { path: thumbnailPath });
      return thumbnailPath;
    } catch (error) {
      logger.error('Failed to generate thumbnail', {
        input: inputPath,
        error: error instanceof Error ? error.message : error,
      });
      throw new Error(`Thumbnail generation failed: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Select appropriate quality presets based on source video resolution
   * Simplified to only use 720p
   */
  private selectQualityPresets(metadata: VideoMetadata, requestedQualities?: QualityPreset[]): QualityPreset[] {
    if (requestedQualities && requestedQualities.length > 0) {
      return requestedQualities;
    }

    const presets: QualityPreset[] = [];
    const sourceHeight = metadata.height;

    // Only transcode to 720p for simplicity, cost savings, and faster processing
    if (sourceHeight >= 720) {
      presets.push(TranscodingService.QUALITY_PRESETS['720p']);
    } else {
      // If source is lower than 720p, just use the source resolution
      presets.push({
        name: '720p', // Still call it 720p for consistency
        width: Math.min(metadata.width, 1280),
        height: Math.min(metadata.height, 720),
        bitrate: '2500k',
        audioBitrate: '128k',
      });
    }

    logger.info('Selected quality presets', {
      sourceResolution: `${metadata.width}x${metadata.height}`,
      presets: presets.map((p) => p.name),
    });

    return presets;
  }

  /**
   * Generate HLS segments for adaptive streaming
   * Splits video into ~10 second chunks for smooth playback
   */
  async generateHLSSegments(
    inputPath: string,
    outputDir: string,
    preset?: QualityPreset
  ): Promise<{
    segments: { index: number; filePath: string; duration: number }[];
    playlistPath: string;
    metadata: VideoMetadata;
  }> {
    const qualityPreset = preset || TranscodingService.QUALITY_PRESETS['720p'];
    const segmentDir = path.join(outputDir, 'hls');
    const playlistPath = path.join(segmentDir, 'playlist.m3u8');
    const segmentPattern = path.join(segmentDir, 'segment_%03d.ts');

    logger.info('Generating HLS segments', {
      input: inputPath,
      segmentDir,
      quality: qualityPreset.name,
    });

    // Ensure segment directory exists
    await fs.mkdir(segmentDir, { recursive: true });

    // Get source video metadata
    const metadata = await this.getVideoMetadata(inputPath);

    // Check if we can skip transcoding and just segment the video
    const { skip, reason } = await this.shouldSkipTranscoding(metadata, inputPath);

    let cmd: string;

    if (skip) {
      // Fast path: Just segment the video without re-encoding (copy mode)
      logger.info('Using fast HLS segmentation (copy mode) - no transcoding needed', {
        codec: metadata.codec,
        resolution: `${metadata.width}x${metadata.height}`,
      });

      // Build FFmpeg command for fast segmentation
      // -c:v copy -c:a copy: copy video/audio streams without re-encoding
      cmd = `${this.ffmpegPath} -i "${inputPath}" \
        -c:v copy \
        -c:a copy \
        -hls_time 10 \
        -hls_list_size 0 \
        -hls_segment_type mpegts \
        -hls_flags independent_segments \
        -hls_segment_filename "${segmentPattern}" \
        -y \
        "${playlistPath}"`;
    } else {
      // Slow path: Full transcode + segmentation
      logger.info('Using full HLS transcoding', {
        reason,
        codec: metadata.codec,
        resolution: `${metadata.width}x${metadata.height}`,
      });

      // Build FFmpeg command for HLS segmentation with transcoding
      // -hls_time: target segment duration in seconds (10s for smooth streaming)
      // -hls_list_size 0: include all segments in playlist
      // -hls_segment_type mpegts: use MPEG-TS container for segments
      // -hls_flags independent_segments: each segment can be decoded independently
      cmd = `${this.ffmpegPath} -i "${inputPath}" \
        -vf "scale=${qualityPreset.width}:${qualityPreset.height}:force_original_aspect_ratio=decrease,pad=${qualityPreset.width}:${qualityPreset.height}:(ow-iw)/2:(oh-ih)/2" \
        -c:v libx264 \
        -preset medium \
        -crf 23 \
        -b:v ${qualityPreset.bitrate} \
        -maxrate ${qualityPreset.bitrate} \
        -bufsize ${parseInt(qualityPreset.bitrate) * 2}k \
        -c:a aac \
        -b:a ${qualityPreset.audioBitrate} \
        -hls_time 10 \
        -hls_list_size 0 \
        -hls_segment_type mpegts \
        -hls_flags independent_segments \
        -hls_segment_filename "${segmentPattern}" \
        -y \
        "${playlistPath}"`;
    }

    try {
      await execAsync(cmd, { maxBuffer: 1024 * 1024 * 10 }); // 10MB buffer

      // Read the generated playlist to get segment info
      const playlistContent = await fs.readFile(playlistPath, 'utf-8');
      const segments: { index: number; filePath: string; duration: number }[] = [];

      let currentDuration = 0;
      const lines = playlistContent.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Parse segment duration from #EXTINF:10.0,
        if (line.startsWith('#EXTINF:')) {
          currentDuration = parseFloat(line.split(':')[1].split(',')[0]);
        }

        // Parse segment filename (segment_000.ts, segment_001.ts, etc.)
        if (line.endsWith('.ts')) {
          const segmentFile = path.join(segmentDir, line);
          const segmentIndex = parseInt(line.match(/segment_(\d+)\.ts/)?.[1] || '0');

          segments.push({
            index: segmentIndex,
            filePath: segmentFile,
            duration: currentDuration,
          });
        }
      }

      logger.info('HLS segments generated', {
        totalSegments: segments.length,
        totalDuration: segments.reduce((sum, s) => sum + s.duration, 0),
      });

      return {
        segments,
        playlistPath,
        metadata,
      };
    } catch (error) {
      logger.error('Failed to generate HLS segments', {
        input: inputPath,
        error: error instanceof Error ? error.message : error,
      });
      throw new Error(`HLS generation failed: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Clean up temporary transcoded files
   */
  async cleanup(outputDir: string): Promise<void> {
    try {
      await fs.rm(outputDir, { recursive: true, force: true });
      logger.info('Cleaned up transcoding directory', { dir: outputDir });
    } catch (error) {
      logger.error('Failed to cleanup transcoding directory', {
        dir: outputDir,
        error: error instanceof Error ? error.message : error,
      });
    }
  }

  /**
   * Validate that FFmpeg is available
   */
  async validateFFmpeg(): Promise<boolean> {
    try {
      await execAsync(`${this.ffmpegPath} -version`);
      await execAsync(`${this.ffprobePath} -version`);
      return true;
    } catch (error) {
      logger.error('FFmpeg validation failed', {
        error: error instanceof Error ? error.message : error,
      });
      return false;
    }
  }
}

// Singleton instance
let transcodingServiceInstance: TranscodingService | null = null;

export function getTranscodingService(): TranscodingService {
  if (!transcodingServiceInstance) {
    transcodingServiceInstance = new TranscodingService();
  }
  return transcodingServiceInstance;
}

export default TranscodingService;
