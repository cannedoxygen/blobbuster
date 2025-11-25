import { useState, useCallback } from 'react';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB per chunk (industry standard)

interface ChunkedUploadOptions {
  file: File;
  title: string;
  description: string;
  genre: number;
  epochs: number;
  paymentDigest: string;
  paidAmount: string;
  accessToken: string;
  tmdbId?: number;
  onProgress?: (progress: number) => void;
  onStatusUpdate?: (status: string) => void;
}

interface ChunkedUploadResult {
  success: boolean;
  contentId?: string;
  error?: string;
}

export function useChunkedUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');

  const uploadFile = useCallback(
    async (options: ChunkedUploadOptions): Promise<ChunkedUploadResult> => {
      const {
        file,
        title,
        description,
        genre,
        epochs,
        paymentDigest,
        paidAmount,
        accessToken,
        tmdbId,
        onProgress,
        onStatusUpdate,
      } = options;

      setIsUploading(true);
      setUploadProgress(0);
      setStatusMessage('Preparing upload...');

      try {
        // Calculate total chunks based on file size and 10MB chunk size
        const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

        // STEP 1: Initiate upload session
        const initiateResponse = await axios.post(
          `${API_URL}/api/upload/initiate`,
          {
            fileName: file.name,
            fileSize: file.size,
            totalChunks,
            title,
            description,
            genre,
            epochs,
            paymentDigest,
            paidAmount,
            tmdbId,
          },
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );

        if (!initiateResponse.data.success) {
          throw new Error(initiateResponse.data.error || 'Failed to initiate upload');
        }

        const uploadId = initiateResponse.data.uploadId;

        // STEP 2: Upload chunks sequentially
        for (let i = 0; i < totalChunks; i++) {
          const start = i * CHUNK_SIZE;
          const end = Math.min(start + CHUNK_SIZE, file.size);
          const chunk = file.slice(start, end);

          setStatusMessage(`Uploading chunk ${i + 1}/${totalChunks}...`);
          if (onStatusUpdate) {
            onStatusUpdate(`Uploading chunk ${i + 1}/${totalChunks}...`);
          }

          const formData = new FormData();
          formData.append('chunk', chunk);
          formData.append('chunkIndex', i.toString());

          await axios.post(`${API_URL}/api/upload/chunk/${uploadId}`, formData, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'multipart/form-data',
            },
          });

          // Update progress (0-80% for chunks)
          const progress = Math.floor(((i + 1) / totalChunks) * 80);
          setUploadProgress(progress);
          if (onProgress) {
            onProgress(progress);
          }
        }

        // STEP 3: Complete upload (triggers background processing)
        setStatusMessage('Processing upload...');
        if (onStatusUpdate) {
          onStatusUpdate('Processing upload...');
        }

        const completeResponse = await axios.post(
          `${API_URL}/api/upload/complete/${uploadId}`,
          {},
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );

        if (!completeResponse.data.success) {
          throw new Error(completeResponse.data.error || 'Failed to complete upload');
        }

        // STEP 4: Poll for status until complete
        let statusCheck = await pollUploadStatus(uploadId, accessToken, (status, progress) => {
          setStatusMessage(status);
          setUploadProgress(progress);
          if (onStatusUpdate) {
            onStatusUpdate(status);
          }
          if (onProgress) {
            onProgress(progress);
          }
        });

        if (statusCheck.status === 'complete') {
          setUploadProgress(100);
          setStatusMessage('Upload complete!');
          setIsUploading(false);
          return {
            success: true,
            contentId: statusCheck.contentId,
          };
        } else {
          throw new Error(statusCheck.error || 'Upload failed');
        }
      } catch (error: any) {
        setIsUploading(false);
        setStatusMessage('Upload failed');
        console.error('Chunked upload error:', error);
        return {
          success: false,
          error: error.response?.data?.error || error.message || 'Upload failed',
        };
      }
    },
    []
  );

  return {
    uploadFile,
    isUploading,
    uploadProgress,
    statusMessage,
  };
}

/**
 * Poll upload status until complete or error
 */
async function pollUploadStatus(
  uploadId: string,
  accessToken: string,
  onUpdate: (status: string, progress: number) => void
): Promise<{ status: string; contentId?: string; error?: string }> {
  const maxAttempts = 600; // 10 minutes max (1 second intervals)
  let attempts = 0;

  while (attempts < maxAttempts) {
    try {
      const response = await axios.get(`${API_URL}/api/upload/status/${uploadId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const { status, progress, message, contentId, error } = response.data;

      onUpdate(message, progress);

      if (status === 'complete') {
        return { status, contentId };
      }

      if (status === 'error') {
        return { status, error };
      }

      // Wait 1 second before next poll
      await new Promise((resolve) => setTimeout(resolve, 1000));
      attempts++;
    } catch (error) {
      console.error('Status poll error:', error);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      attempts++;
    }
  }

  return { status: 'error', error: 'Upload timeout' };
}
