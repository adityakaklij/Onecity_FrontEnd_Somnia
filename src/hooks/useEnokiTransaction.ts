/**
 * Hook for preparing transactions with Enoki wallet support on ONEChain
 * 
 * This hook automatically handles gas payment configuration for Enoki wallets,
 * which require OCT coins instead of SUI coins for gas on ONEChain.
 */

import { useCallback } from 'react';
import { Transaction } from '@mysten/sui/transactions';
import { useSuiClient } from '@mysten/dapp-kit';
import { useCurrentWallet } from '@mysten/dapp-kit';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { prepareTransactionForEnoki } from '@/lib/enokiGasHelper';

/**
 * Hook that returns a function to prepare transactions for Enoki wallets
 * 
 * @returns A function that prepares a transaction with proper gas payment configuration
 */
export function useEnokiTransaction() {
  const suiClient = useSuiClient();
  const wallet = useCurrentWallet();
  const account = useCurrentAccount();

  const prepareTransaction = useCallback(
    async (tx: Transaction) => {
      if (!account) {
        throw new Error('No account connected');
      }

      // Set sender if not already set
      if (!tx.blockData.sender) {
        tx.setSender(account.address);
      }

      // Prepare transaction for Enoki wallets (set OCT gas payment if needed)
      await prepareTransactionForEnoki(
        tx,
        suiClient,
        account.address,
        wallet?.currentWallet || null
      );

      return tx;
    },
    [suiClient, wallet, account]
  );

  return { prepareTransaction };
}

