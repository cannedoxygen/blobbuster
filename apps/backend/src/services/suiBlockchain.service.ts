import { SuiClient } from '@mysten/sui.js/client';
import { TransactionBlock } from '@mysten/sui.js/transactions';
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';
import { decodeSuiPrivateKey } from '@mysten/sui.js/cryptography';
import { logger } from '../utils/logger';

export class SuiBlockchainService {
  private client: SuiClient;
  private platformKeypair: Ed25519Keypair;

  // Package IDs (loaded from environment)
  private MEMBERSHIP_PACKAGE: string;
  private REVENUE_POOL_PACKAGE: string;
  private CONTENT_PACKAGE: string;

  // Shared object IDs
  private MEMBER_REGISTRY: string;
  private REVENUE_POOL: string;
  private CONTENT_REGISTRY: string;

  constructor() {
    const rpcUrl = process.env.SUI_RPC_URL || 'https://fullnode.testnet.sui.io:443';
    this.client = new SuiClient({ url: rpcUrl });

    // Load platform keypair
    const privateKey = process.env.SUI_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('SUI_PRIVATE_KEY not configured');
    }

    try {
      // Handle both bech32 format (suiprivkey1...) and base64/hex formats
      if (privateKey.startsWith('suiprivkey1')) {
        // Decode bech32 encoded string (Sui wallet export format)
        const decoded = decodeSuiPrivateKey(privateKey);
        this.platformKeypair = Ed25519Keypair.fromSecretKey(decoded.secretKey);
      } else {
        // Assume base64 format (33 bytes: flag || 32-byte private key)
        // Sui keystore format includes 1-byte flag prefix, but Ed25519Keypair expects only 32 bytes
        const fullKey = Buffer.from(privateKey, 'base64');
        if (fullKey.length === 33) {
          // Strip the first byte (flag) to get the 32-byte private key
          const secretKeyOnly = fullKey.slice(1);
          this.platformKeypair = Ed25519Keypair.fromSecretKey(secretKeyOnly);
        } else if (fullKey.length === 32) {
          // Already 32 bytes, use as-is
          this.platformKeypair = Ed25519Keypair.fromSecretKey(fullKey);
        } else {
          throw new Error(`Invalid private key length: ${fullKey.length} bytes (expected 32 or 33)`);
        }
      }
      logger.info('Sui blockchain service initialized');
      logger.info(`Platform address: ${this.getPlatformAddress()}`);
    } catch (error) {
      logger.error('Failed to initialize Sui keypair:', error);
      throw error;
    }

    // Load package IDs
    this.MEMBERSHIP_PACKAGE = process.env.MEMBERSHIP_PACKAGE_ID!;
    this.REVENUE_POOL_PACKAGE = process.env.REVENUE_POOL_PACKAGE_ID!;
    this.CONTENT_PACKAGE = process.env.CONTENT_REGISTRY_PACKAGE_ID!;

    // Load shared object IDs
    this.MEMBER_REGISTRY = process.env.MEMBER_REGISTRY_OBJECT_ID!;
    this.REVENUE_POOL = process.env.REVENUE_POOL_OBJECT_ID!;
    this.CONTENT_REGISTRY = process.env.CONTENT_REGISTRY_OBJECT_ID!;
  }

  /**
   * Mint membership NFT - $5/month (2.5 SUI)
   */
  async mintMembership(
    durationDays: number
  ): Promise<{ nftId: string; txDigest: string }> {
    try {
      const tx = new TransactionBlock();

      // Fixed price: $5/month = 2.5 SUI (in MIST)
      const price = 2_500_000_000;

      // Split coins for payment
      const [coin] = tx.splitCoins(tx.gas, [price]);

      // Call mint_membership
      tx.moveCall({
        target: `${this.MEMBERSHIP_PACKAGE}::membership::mint_membership`,
        arguments: [
          tx.object(this.MEMBER_REGISTRY),
          tx.pure.u64(durationDays),
          coin,
        ],
      });

      const result = await this.client.signAndExecuteTransactionBlock({
        transactionBlock: tx,
        signer: this.platformKeypair,
        options: { showEffects: true, showObjectChanges: true },
      });

      const nftObject = result.objectChanges?.find(
        (c) => c.type === 'created' && c.objectType.includes('MembershipNFT')
      );
      const nftId = (nftObject && 'objectId' in nftObject) ? nftObject.objectId : '';

      logger.info(`Membership minted: ${nftId} (2.5 SUI for ${durationDays} days)`);

      return { nftId, txDigest: result.digest };
    } catch (error) {
      logger.error('Failed to mint membership:', error);
      throw error;
    }
  }

  /**
   * Verify membership is active
   */
  async verifyMembership(nftId: string): Promise<{
    isActive: boolean;
    memberNumber: number;
    issuedAt: number;
    expiresAt: number;
    owner: string;
  }> {
    try {
      const obj = await this.client.getObject({
        id: nftId,
        options: { showContent: true, showOwner: true },
      });

      if (!obj.data) {
        throw new Error('Membership NFT not found');
      }

      const fields = (obj.data.content as any)?.fields;
      const owner = (obj.data.owner as any)?.AddressOwner || '';
      const issuedAt = parseInt(fields.issued_at);
      const expiresAt = parseInt(fields.expires_at);
      const now = Date.now();

      return {
        isActive: expiresAt > now,
        memberNumber: parseInt(fields.member_number),
        issuedAt,
        expiresAt,
        owner,
      };
    } catch (error) {
      logger.error(`Failed to verify membership ${nftId}:`, error);
      throw error;
    }
  }

  /**
   * Get member registry information
   */
  async getMemberRegistryInfo(): Promise<{
    totalMembers: number;
    totalRevenue: string;
    admin: string;
  }> {
    try {
      const obj = await this.client.getObject({
        id: this.MEMBER_REGISTRY,
        options: { showContent: true },
      });

      if (!obj.data) {
        throw new Error('Member registry not found');
      }

      const fields = (obj.data.content as any)?.fields;

      return {
        totalMembers: parseInt(fields.total_members || '0'),
        totalRevenue: fields.total_revenue_collected || '0',
        admin: fields.admin || '',
      };
    } catch (error) {
      logger.error('Failed to get member registry info:', error);
      throw error;
    }
  }

  /**
   * Register content uploader
   */
  async registerUploader(address: string): Promise<{ accountId: string; txDigest: string }> {
    try {
      const tx = new TransactionBlock();

      tx.moveCall({
        target: `${this.REVENUE_POOL_PACKAGE}::revenue_pool::register_uploader`,
        arguments: [],
      });

      const result = await this.client.signAndExecuteTransactionBlock({
        transactionBlock: tx,
        signer: this.platformKeypair,
        options: { showObjectChanges: true },
      });

      const accountObject = result.objectChanges?.find(
        (c: any) => c.type === 'created' && c.objectType?.includes('UploaderAccount')
      );
      const accountId = (accountObject && 'objectId' in accountObject) ? accountObject.objectId : '';

      logger.info(`Uploader registered: ${address} -> ${accountId}`);

      return { accountId, txDigest: result.digest };
    } catch (error) {
      logger.error('Failed to register uploader:', error);
      throw error;
    }
  }

  /**
   * Record stream metrics on-chain
   */
  async recordStreamMetrics(
    membershipNftId: string,
    contentId: string,
    uploaderAccountId: string,
    watchDuration: number,
    contentDuration: number
  ): Promise<string> {
    try {
      const tx = new TransactionBlock();

      // Update membership usage
      tx.moveCall({
        target: `${this.MEMBERSHIP_PACKAGE}::membership::record_stream_usage`,
        arguments: [tx.object(membershipNftId), tx.pure(watchDuration)],
      });

      // Update uploader metrics
      tx.moveCall({
        target: `${this.REVENUE_POOL_PACKAGE}::revenue_pool::update_stream_metrics`,
        arguments: [
          tx.object(this.REVENUE_POOL),
          tx.object(uploaderAccountId),
          tx.pure(watchDuration),
          tx.pure(contentDuration),
        ],
      });

      // Track content metrics
      tx.moveCall({
        target: `${this.CONTENT_PACKAGE}::content_registry::track_stream`,
        arguments: [
          tx.object(this.CONTENT_REGISTRY),
          tx.object(contentId),
          tx.pure(watchDuration),
          tx.pure(1), // quality level
        ],
      });

      const result = await this.client.signAndExecuteTransactionBlock({
        transactionBlock: tx,
        signer: this.platformKeypair,
      });

      logger.info(`Stream metrics recorded: ${result.digest}`);

      return result.digest;
    } catch (error) {
      logger.error('Failed to record stream metrics:', error);
      throw error;
    }
  }

  /**
   * Distribute revenue to uploaders (weekly cron)
   */
  async distributeRevenue(
    distributions: Array<{ uploaderAccountId: string; amount: number }>
  ): Promise<string[]> {
    try {
      // Execute distributions in parallel
      const txPromises = distributions.map(async ({ uploaderAccountId, amount }) => {
        const tx = new TransactionBlock();

        tx.moveCall({
          target: `${this.REVENUE_POOL_PACKAGE}::revenue_pool::distribute_reward`,
          arguments: [
            tx.object(this.REVENUE_POOL),
            tx.object(uploaderAccountId),
            tx.pure(amount),
          ],
        });

        const result = await this.client.signAndExecuteTransactionBlock({
          transactionBlock: tx,
          signer: this.platformKeypair,
        });

        return result.digest;
      });

      const txDigests = await Promise.all(txPromises);

      logger.info(`Revenue distributed to ${distributions.length} uploaders`);

      return txDigests;
    } catch (error) {
      logger.error('Failed to distribute revenue:', error);
      throw error;
    }
  }

  /**
   * Register content on blockchain
   */
  async registerContent(
    title: string,
    description: string,
    genre: number,
    durationSeconds: number,
    walrusBlobIds: string,
    thumbnailUrl: string
  ): Promise<{ contentId: string; txDigest: string }> {
    try {
      const tx = new TransactionBlock();

      tx.moveCall({
        target: `${this.CONTENT_PACKAGE}::content_registry::register_content`,
        arguments: [
          tx.object(this.CONTENT_REGISTRY),
          tx.pure(title),
          tx.pure(description),
          tx.pure(genre),
          tx.pure(durationSeconds),
          tx.pure(walrusBlobIds),
          tx.pure(thumbnailUrl),
        ],
      });

      const result = await this.client.signAndExecuteTransactionBlock({
        transactionBlock: tx,
        signer: this.platformKeypair,
        options: { showObjectChanges: true },
      });

      const contentObject = result.objectChanges?.find(
        (c: any) => c.type === 'created' && c.objectType?.includes('ContentItem')
      );
      const contentId = (contentObject && 'objectId' in contentObject) ? contentObject.objectId : '';

      logger.info(`Content registered on-chain: ${contentId}`);

      return { contentId, txDigest: result.digest };
    } catch (error) {
      logger.error('Failed to register content:', error);
      throw error;
    }
  }

  /**
   * Get platform wallet address
   */
  getPlatformAddress(): string {
    return this.platformKeypair.getPublicKey().toSuiAddress();
  }
}

// Singleton instance
export const suiBlockchainService = new SuiBlockchainService();

export function getSuiBlockchainService(): SuiBlockchainService {
  return suiBlockchainService;
}
