import { PinataSDK } from 'pinata';
import fs from 'fs/promises';
import { Blob } from 'buffer';
import { logger } from '../utils/logger';

export class IPFSService {
  private pinata: PinataSDK;

  constructor() {
    const jwt = process.env.PINATA_JWT;
    if (!jwt) {
      throw new Error('PINATA_JWT not configured');
    }
    this.pinata = new PinataSDK({
      pinataJwt: jwt,
      pinataGateway: 'gateway.pinata.cloud'
    });
    logger.info('IPFS service initialized (Pinata)');
  }

  /**
   * Upload file to IPFS via Pinata
   */
  async uploadFile(filePath: string): Promise<{ cid: string; url: string; gatewayUrl: string }> {
    try {
      const data = await fs.readFile(filePath);
      const fileName = filePath.split('/').pop() || 'image.png';

      const blob = new Blob([data], { type: 'image/png' });
      const file = new File([blob], fileName, { type: 'image/png' });

      logger.info('Uploading file to IPFS via Pinata', { fileName, size: data.length });

      const upload = await this.pinata.upload.file(file);
      const cid = upload.IpfsHash;

      const url = `ipfs://${cid}`;
      const gatewayUrl = `https://gateway.pinata.cloud/ipfs/${cid}`;

      logger.info('File uploaded to IPFS successfully', { cid, url });

      return { cid, url, gatewayUrl };
    } catch (error) {
      logger.error('Failed to upload file to IPFS:', error);
      throw error;
    }
  }
}

// Singleton instance
let ipfsServiceInstance: IPFSService | null = null;

export function getIPFSService(): IPFSService {
  if (!ipfsServiceInstance) {
    ipfsServiceInstance = new IPFSService();
  }
  return ipfsServiceInstance;
}
