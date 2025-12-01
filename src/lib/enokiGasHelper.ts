/**
 * Helper utilities for handling gas payments with Enoki wallets on ONEChain
 * 
 * Enoki wallets default to using SUI coins for gas, but ONEChain requires OCT coins.
 * This module provides utilities to detect Enoki wallets and configure gas payments correctly.
 */

import { Transaction } from '@mysten/sui/transactions';
import { SuiClient } from '@mysten/sui/client';
import { isEnokiWallet } from '@mysten/enoki';
import type { Wallet } from '@mysten/wallet-standard';

const OCT_COIN_TYPE = '0x2::oct::OCT';

/**
 * Check if the current wallet is an Enoki wallet
 */
export function isCurrentWalletEnoki(wallet: Wallet | null): boolean {
  if (!wallet) return false;
  return isEnokiWallet(wallet);
}

/**
 * Configure gas payment for a transaction using OCT coins
 * This is required for Enoki wallets on ONEChain since they default to SUI coins
 * 
 * @param tx - The transaction to configure
 * @param suiClient - The Sui client instance
 * @param senderAddress - The address of the transaction sender
 * @returns Promise that resolves when gas payment is configured
 */
export async function setOCTGasPayment(
  tx: Transaction,
  suiClient: SuiClient,
  senderAddress: string
): Promise<void> {
  try {
    // Get OCT coins for the sender
    const octCoins = await suiClient.getCoins({
      owner: senderAddress,
      coinType: OCT_COIN_TYPE,
    });

    if (!octCoins.data || octCoins.data.length === 0) {
      throw new Error(
        `No OCT coins found for address ${senderAddress}. ` +
        `ONEChain requires OCT coins for gas payments. ` +
        `Please ensure you have OCT tokens in your wallet.`
      );
    }

    // Use the first OCT coin for gas payment
    // If you need to use multiple coins, you can modify this logic
    const gasPayment = octCoins.data.slice(0, 1).map((coin) => ({
      objectId: coin.coinObjectId,
      version: coin.version,
      digest: coin.digest,
    }));

    // Set the gas payment on the transaction
    tx.setGasPayment(gasPayment);

    console.log(`Configured gas payment using OCT coin: ${gasPayment[0].objectId}`);
  } catch (error) {
    console.error('Error setting OCT gas payment:', error);
    throw error;
  }
}

/**
 * Prepare a transaction for Enoki wallets on ONEChain
 * This function automatically configures gas payment if needed
 * 
 * @param tx - The transaction to prepare
 * @param suiClient - The Sui client instance
 * @param senderAddress - The address of the transaction sender
 * @param wallet - The current wallet (to check if it's Enoki)
 * @returns Promise that resolves when the transaction is prepared
 */
export async function prepareTransactionForEnoki(
  tx: Transaction,
  suiClient: SuiClient,
  senderAddress: string,
  wallet: Wallet | null
): Promise<void> {
  // Only configure gas payment if using an Enoki wallet
  if (isCurrentWalletEnoki(wallet)) {
    await setOCTGasPayment(tx, suiClient, senderAddress);
  }
  // For non-Enoki wallets, the wallet will handle gas payment automatically
}

