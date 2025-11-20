import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import { getIPFSService } from './ipfs.service';
import { logger } from '../utils/logger';

/**
 * NFT Membership Card Generator Service
 * Generates personalized Blockbuster membership cards and uploads to IPFS
 */

export interface CardGenerationResult {
  activeCardUrl: string;
  expiredCardUrl: string;
  activeCardCID: string;
  expiredCardCID: string;
}

export class NFTCardService {
  private ipfsService: ReturnType<typeof getIPFSService>;
  private templatePath: string;
  private tempDir: string;

  // Card text positioning (calibrated from testing)
  private readonly POSITIONS = {
    memberNumber: { x: 420, y: 635 },
    memberName: { x: 420, y: 710 },
    status: { x: 255, y: 775 },
  };

  private readonly FONT_SIZE = 20;
  private readonly FONT_FAMILY = 'Courier New, monospace';

  constructor() {
    this.ipfsService = getIPFSService();
    // Template is in the backend assets folder
    this.templatePath = path.join(__dirname, '../assets/card.png');
    this.tempDir = '/tmp/nft-cards';
  }

  /**
   * Initialize temp directory
   */
  async init() {
    await fs.mkdir(this.tempDir, { recursive: true });
    logger.info('NFT Card Service initialized', { tempDir: this.tempDir });
  }

  /**
   * Generate both ACTIVE and EXPIRED membership cards for a user
   * @param memberNumber - Unique member number (e.g., 42)
   * @param walletAddress - User's wallet address
   * @returns Walrus URLs for both cards
   */
  async generateMembershipCards(
    memberNumber: number,
    walletAddress: string
  ): Promise<CardGenerationResult> {
    try {
      logger.info('Generating membership cards', { memberNumber, walletAddress });

      // Truncate wallet address if too long (keep it readable)
      const displayAddress = walletAddress.length > 42
        ? walletAddress.substring(0, 42)
        : walletAddress;

      // Format member number with leading zeros
      const formattedNumber = String(memberNumber).padStart(6, '0');

      // Generate both cards
      const activeCardPath = path.join(this.tempDir, `member-${formattedNumber}-active.png`);
      const expiredCardPath = path.join(this.tempDir, `member-${formattedNumber}-expired.png`);

      await Promise.all([
        this.generateCard(formattedNumber, displayAddress, true, activeCardPath),
        this.generateCard(formattedNumber, displayAddress, false, expiredCardPath),
      ]);

      logger.info('Cards generated, uploading to IPFS', { memberNumber });

      // Upload both to IPFS (permanent, decentralized)
      const [activeUpload, expiredUpload] = await Promise.all([
        this.ipfsService.uploadFile(activeCardPath),
        this.ipfsService.uploadFile(expiredCardPath),
      ]);

      // Clean up temp files
      await Promise.all([
        fs.unlink(activeCardPath).catch(() => {}),
        fs.unlink(expiredCardPath).catch(() => {}),
      ]);

      logger.info('Cards uploaded to IPFS', {
        memberNumber,
        activeCID: activeUpload.cid,
        expiredCID: expiredUpload.cid,
      });

      return {
        activeCardUrl: activeUpload.url,      // ipfs://Qm...
        expiredCardUrl: expiredUpload.url,    // ipfs://Qm...
        activeCardCID: activeUpload.cid,      // Qm...
        expiredCardCID: expiredUpload.cid,    // Qm...
      };
    } catch (error) {
      logger.error('Failed to generate membership cards', { error, memberNumber });
      throw new Error(`Card generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate a single membership card
   * @private
   */
  private async generateCard(
    memberNumber: string,
    walletAddress: string,
    isActive: boolean,
    outputPath: string
  ): Promise<void> {
    const status = isActive ? 'ACTIVE' : 'EXPIRED';
    const statusColor = isActive ? '#00FF00' : '#FF0000';

    const textSvg = `
      <svg width="1024" height="1024">
        <text
          x="${this.POSITIONS.memberNumber.x}"
          y="${this.POSITIONS.memberNumber.y}"
          font-family="${this.FONT_FAMILY}"
          font-size="${this.FONT_SIZE}"
          font-weight="bold"
          fill="#000000">${memberNumber}</text>
        <text
          x="${this.POSITIONS.memberName.x}"
          y="${this.POSITIONS.memberName.y}"
          font-family="${this.FONT_FAMILY}"
          font-size="${this.FONT_SIZE}"
          font-weight="bold"
          fill="#000000">${walletAddress}</text>
        <text
          x="${this.POSITIONS.status.x}"
          y="${this.POSITIONS.status.y}"
          font-family="${this.FONT_FAMILY}"
          font-size="${this.FONT_SIZE}"
          font-weight="bold"
          fill="${statusColor}">${status}</text>
      </svg>
    `;

    await sharp(this.templatePath)
      .composite([{
        input: Buffer.from(textSvg),
        top: 0,
        left: 0,
      }])
      .png()
      .toFile(outputPath);
  }

  /**
   * Clean up old temporary card files
   */
  async cleanup() {
    try {
      const files = await fs.readdir(this.tempDir);
      await Promise.all(
        files.map(file => fs.unlink(path.join(this.tempDir, file)).catch(() => {}))
      );
      logger.info('NFT card temp files cleaned up');
    } catch (error) {
      logger.warn('Failed to cleanup NFT card temp files', { error });
    }
  }
}
