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
  signAndExecute: (transaction: { transactionBlock: TransactionBlock }) => Promise<any>;
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
    const result = await signAndExecute({
      transactionBlock: tx,
    });

    console.log('Payment transaction result:', result);

    if (result.digest) {
      return {
        success: true,
        digest: result.digest,
      };
    }

    return {
      success: false,
      error: 'Transaction failed: no digest returned',
    };
  } catch (error: any) {
    console.error('Payment transaction failed:', error);
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
