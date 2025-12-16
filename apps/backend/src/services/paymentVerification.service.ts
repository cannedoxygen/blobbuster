import { SuiClient } from '@mysten/sui.js/client';
import { logger } from '../utils/logger';

/**
 * Payment Verification Service
 * Verifies that users have paid the correct amount to platform wallet
 * before allowing Walrus uploads
 */

export interface PaymentVerification {
  isValid: boolean;
  error?: string;
  details?: {
    sender: string;
    recipient: string;
    amountSUI: number;
    digest: string;
    timestamp: Date;
  };
}

export class PaymentVerificationService {
  private suiClient: SuiClient;
  private platformWallet: string;

  constructor() {
    const rpcUrl = process.env.SUI_RPC_URL || 'https://fullnode.mainnet.sui.io:443';
    this.suiClient = new SuiClient({ url: rpcUrl });

    // Platform wallet that receives storage payments
    this.platformWallet = process.env.NEXT_PUBLIC_PLATFORM_WALLET ||
                         '0xbeef1f109b13a5cfe22ee360fd1052554e7df984d7cccb116af6e2c9df41c3ed';

    logger.info('Payment verification service initialized', {
      platformWallet: this.platformWallet,
    });
  }

  /**
   * Verify that a payment transaction is valid
   * @param txDigest - Transaction digest to verify
   * @param expectedSender - Expected sender address (user's wallet)
   * @param expectedAmount - Expected payment amount in SUI
   * @returns Verification result
   */
  async verifyPayment(
    txDigest: string,
    expectedSender: string,
    expectedAmount: number
  ): Promise<PaymentVerification> {
    try {
      logger.info('Verifying payment transaction', {
        digest: txDigest,
        expectedSender,
        expectedAmount,
      });

      // Get transaction details
      const txData = await this.suiClient.getTransactionBlock({
        digest: txDigest,
        options: {
          showEffects: true,
          showBalanceChanges: true,
          showInput: true,
        },
      });

      // Check transaction exists and succeeded
      if (!txData) {
        return {
          isValid: false,
          error: 'Transaction not found',
        };
      }

      if (txData.effects?.status?.status !== 'success') {
        return {
          isValid: false,
          error: `Transaction failed: ${txData.effects?.status?.error}`,
        };
      }

      // Verify sender
      const sender = txData.transaction?.data?.sender;
      if (!sender) {
        return {
          isValid: false,
          error: 'Cannot determine transaction sender',
        };
      }

      if (sender.toLowerCase() !== expectedSender.toLowerCase()) {
        return {
          isValid: false,
          error: `Sender mismatch: expected ${expectedSender}, got ${sender}`,
        };
      }

      // Verify payment to platform wallet
      const balanceChanges = txData.balanceChanges || [];

      // Find platform wallet's balance change (should be positive)
      const platformChange = balanceChanges.find(
        (change) =>
          change.owner &&
          typeof change.owner === 'object' &&
          'AddressOwner' in change.owner &&
          change.owner.AddressOwner.toLowerCase() === this.platformWallet.toLowerCase() &&
          change.coinType === '0x2::sui::SUI'
      );

      if (!platformChange) {
        return {
          isValid: false,
          error: `No SUI transfer found to platform wallet ${this.platformWallet}`,
        };
      }

      // Calculate amount received (in SUI)
      const amountMIST = BigInt(platformChange.amount);
      const amountSUI = Number(amountMIST) / 1_000_000_000;

      // Verify amount (allow 1% tolerance for gas estimation differences)
      const tolerance = expectedAmount * 0.01;
      if (amountSUI < expectedAmount - tolerance) {
        return {
          isValid: false,
          error: `Insufficient payment: expected ${expectedAmount} SUI, got ${amountSUI.toFixed(6)} SUI`,
        };
      }

      // Get timestamp
      const timestamp = txData.timestampMs
        ? new Date(parseInt(txData.timestampMs))
        : new Date();

      logger.info('Payment verified successfully', {
        digest: txDigest,
        sender,
        amountSUI: amountSUI.toFixed(6),
        expectedAmount: expectedAmount.toFixed(6),
      });

      return {
        isValid: true,
        details: {
          sender,
          recipient: this.platformWallet,
          amountSUI,
          digest: txDigest,
          timestamp,
        },
      };
    } catch (error) {
      logger.error('Payment verification failed', {
        digest: txDigest,
        error: error instanceof Error ? error.message : error,
      });

      return {
        isValid: false,
        error: `Verification error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Check if a transaction has already been used for an upload
   * Prevents replay attacks where same payment is reused
   */
  async isTransactionUsed(txDigest: string): Promise<boolean> {
    // This should check database for used payment digests
    // For now, returns false (implement with database check)
    return false;
  }
}

// Singleton instance
let paymentVerificationInstance: PaymentVerificationService | null = null;

export function getPaymentVerificationService(): PaymentVerificationService {
  if (!paymentVerificationInstance) {
    paymentVerificationInstance = new PaymentVerificationService();
  }
  return paymentVerificationInstance;
}

export default PaymentVerificationService;
