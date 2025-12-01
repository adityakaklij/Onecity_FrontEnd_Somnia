/**
 * Hook for EVM wallet connection (MetaMask, etc.)
 */

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

export interface EVMAccount {
  address: string;
  isConnected: boolean;
}

export function useEVMWallet() {
  const [account, setAccount] = useState<EVMAccount | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // Check if wallet is already connected
  useEffect(() => {
    const checkConnection = async () => {
      if (typeof window !== 'undefined' && window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          
          if (accounts && accounts.length > 0) {
            setAccount({
              address: accounts[0],
              isConnected: true,
            });
          }
        } catch (error) {
          console.error('Error checking wallet connection:', error);
        }
      }
    };

    checkConnection();

    // Listen for account changes
    if (typeof window !== 'undefined' && window.ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts && accounts.length > 0) {
          setAccount({
            address: accounts[0],
            isConnected: true,
          });
        } else {
          setAccount(null);
        }
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);

      return () => {
        if (window.ethereum) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        }
      };
    }
  }, []);

  const connect = async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error('MetaMask or other Web3 provider not found. Please install MetaMask.');
    }

    setIsConnecting(true);
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      if (accounts && accounts.length > 0) {
        setAccount({
          address: accounts[0],
          isConnected: true,
        });
      }
    } catch (error: any) {
      console.error('Error connecting wallet:', error);
      throw error;
    } finally {
      setIsConnecting(false);
    }
  };

  return {
    account,
    isConnected: account?.isConnected || false,
    address: account?.address || null,
    connect,
    isConnecting,
  };
}

