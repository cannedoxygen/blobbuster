import { TransactionBlock } from '@mysten/sui.js/transactions';
import { SuiClient } from '@mysten/sui.js/client';

/**
 * Walrus Payment Service
 * Handles payment for Walrus storage from user's Sui wallet
 */

interface PaymentParams {
  totalSUI: number; // Total cost in SUI (already includes WAL->SUI conversion + gas)
  recipientAddress: string; // Platform wallet address that will pay Walrus
  senderAddress: string;
  signAndExecute: (transaction: { transactionBlock: TransactionBlock; options?: any }) => Promise<any>;
}

interface PaymentResult {
  success: boolean;
  digest?: string;
  error?: string;
}

/**
 * Create and execute a payment transaction for Walrus storage
 */
export async function payForWalrusStorage(
  params: PaymentParams
): Promise<PaymentResult> {
  try {
    const { totalSUI, recipientAddress, senderAddress, signAndExecute } = params;

    // Create transaction
    const tx = new TransactionBlock();

    // totalSUI is already calculated by backend:
    // - WAL storage cost converted to SUI (using current exchange rate)
    // - + WAL upload cost converted to SUI
    // - + Sui gas fees
    // This ensures user pays the correct amount based on WAL/SUI exchange rate

    // Convert to MIST (1 SUI = 1,000,000,000 MIST)
    const totalMIST = Math.ceil(totalSUI * 1_000_000_000);

    // Split coins for payment
    const [paymentCoin] = tx.splitCoins(tx.gas, [totalMIST]);

    // Transfer to platform wallet
    tx.transferObjects([paymentCoin], recipientAddress);

    // Set sender
    tx.setSender(senderAddress);

    console.log('Executing payment transaction:', {
      totalSUI: totalSUI.toFixed(6),
      totalMIST,
      recipient: recipientAddress,
    });

    // Sign and execute transaction
    // Request showEffects to ensure we wait for transaction confirmation
    const result = await signAndExecute({
      transactionBlock: tx,
      options: {
        showEffects: true,
        showEvents: true,
      },
    });

    console.log('Payment transaction result:', result);

    // The result should have a digest after the transaction is confirmed
    if (result.digest) {
      // Double-check that transaction actually succeeded by checking effects
      const status = result.effects?.status?.status;
      if (status === 'failure') {
        const errorMsg = result.effects?.status?.error || 'Transaction failed on-chain';
        console.error('Transaction failed on-chain:', errorMsg);
        return {
          success: false,
          error: `Transaction failed: ${errorMsg}`,
        };
      }

      return {
        success: true,
        digest: result.digest,
      };
    }

    // If no digest but also no error thrown, the wallet might have rejected
    return {
      success: false,
      error: 'Transaction was not completed - please try again',
    };
  } catch (error: any) {
    console.error('Payment transaction failed:', error);

    // Check for user rejection
    if (error.message?.includes('rejected') || error.message?.includes('cancelled')) {
      return {
        success: false,
        error: 'Transaction was cancelled',
      };
    }

    return {
      success: false,
      error: error.message || 'Payment failed',
    };
  }
}

/**
 * Check if user has sufficient balance for payment
 */
export async function checkWalletBalance(
  suiClient: SuiClient,
  address: string,
  requiredSUI: number
): Promise<{ hasBalance: boolean; balance: number; required: number }> {
  try {
    const balance = await suiClient.getBalance({
      owner: address,
      coinType: '0x2::sui::SUI',
    });

    const balanceSUI = parseInt(balance.totalBalance) / 1_000_000_000;
    const hasBalance = balanceSUI >= requiredSUI;

    return {
      hasBalance,
      balance: balanceSUI,
      required: requiredSUI,
    };
  } catch (error) {
    console.error('Failed to check wallet balance:', error);
    return {
      hasBalance: false,
      balance: 0,
      required: requiredSUI,
    };
  }
}

/**
 * Format payment details for display
 */
export function formatPaymentDetails(totalSUI: number) {
  return {
    total: `${totalSUI.toFixed(6)} SUI`,
    totalMIST: Math.ceil(totalSUI * 1_000_000_000),
  };
}
