/**
 * Service for minting land NFTs on EVM-compatible blockchain
 */

import { ethers } from 'ethers';
import { ContractAddress, ContractABI } from '../Constants/constants';
import { ZoneType } from '@/types/game';

const INITIAL_RTOKENS = 5000;

const ZoneTypeIds: Record<ZoneType, number> = {
  agricultural: 11,
  residential: 12,
  commercial: 13,
  industrial: 14,
  billboard: 15,
  park: 11, // Default to agricultural for park
  road: 11, // Default to agricultural for road
};

const ZoneTypeImgUrls: Record<ZoneType, string> = {
  agricultural: "https://purple-sheer-shrimp-152.mypinata.cloud/ipfs/bafybeihmcayqd2jqltlidtiwi73r2tgw35xu3fscx6ikbiarvlgwobaqva/Agirculture.jpg",
  residential: "https://purple-sheer-shrimp-152.mypinata.cloud/ipfs/bafybeihmcayqd2jqltlidtiwi73r2tgw35xu3fscx6ikbiarvlgwobaqva/Residential.jpg",
  commercial: "https://purple-sheer-shrimp-152.mypinata.cloud/ipfs/bafybeihmcayqd2jqltlidtiwi73r2tgw35xu3fscx6ikbiarvlgwobaqva/commericial.jpg",
  industrial: "https://purple-sheer-shrimp-152.mypinata.cloud/ipfs/bafybeihmcayqd2jqltlidtiwi73r2tgw35xu3fscx6ikbiarvlgwobaqva/Industrial.jpg",
  billboard: "https://purple-sheer-shrimp-152.mypinata.cloud/ipfs/bafybeihmcayqd2jqltlidtiwi73r2tgw35xu3fscx6ikbiarvlgwobaqva/Billboard.jpg",
  park: "https://purple-sheer-shrimp-152.mypinata.cloud/ipfs/bafybeiagwlj4lq3zox2jwgarqll2epq6p2jolz7dug3oqsgepvn4qpfoea/Agriculture.png", // Default for park
  road: "https://purple-sheer-shrimp-152.mypinata.cloud/ipfs/bafybeiagwlj4lq3zox2jwgarqll2epq6p2jolz7dug3oqsgepvn4qpfoea/Agriculture.png", // Default for road
};

export interface MintResult {
  digest: string;
  landDataObjectId: string;
  ownerAddress: string;
  rtokens: number;
}

/**
 * Get provider and signer from window.ethereum
 */
const getProviderAndSigner = async () => {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('MetaMask or other Web3 provider not found. Please install MetaMask.');
  }
  
  // const provider = new ethers.providers.Web3Provider(window.ethereum);
  // const signer = provider.getSigner();
  const provider = new ethers.BrowserProvider(window.ethereum)
  const signer = await provider.getSigner()
  return { provider, signer };
};

/**
 * Create mint transaction
 */
export const createMintTransaction = async (
  x: number,
  y: number,
  zoneType: ZoneType
): Promise<ethers.ContractTransaction> => {
  // const { signer } = getProviderAndSigner();
  const provider = new ethers.BrowserProvider(window.ethereum)
  const signer = await provider.getSigner()
  const contractInstance = new ethers.Contract(ContractAddress, ContractABI, signer);
  
  // Get the zone type ID and image URL based on the zone type
  const zoneTypeId = ZoneTypeIds[zoneType] || ZoneTypeIds.agricultural;
  const nftImageUrl = ZoneTypeImgUrls[zoneType] || ZoneTypeImgUrls.agricultural;

  console.log("Minting NFT with:", { x, y, nftImageUrl, zoneTypeId });
  
  // Call mint_nft function: mint_nft(uint16 x, uint16 y, string uri, uint8 landType)
  // const gasEstimate = await contractInstance.mint_nft.estimateGas(x, y, nftImageUrl, zoneTypeId)

  const tx = await contractInstance.mint_nft(x, y, nftImageUrl, zoneTypeId, {gasLimit:5259054, });
  // const tx = await contractInstance.mint_nft(89, 55, nftImageUrl, 11, {gasLimit:80259054, });
  console.log("Transaction:", tx);
  
  return tx;
};

/**
 * Wait for transaction and extract result
 */
export const waitForMintTransaction = async (tx: any): Promise<MintResult | null> => {
  try {
    // Get owner address from transaction or signer
    let ownerAddress: string;
    try {
      // Try to get from signer first
      const { signer } = await getProviderAndSigner();
      ownerAddress = await signer.getAddress();
    } catch (error) {
      // Fallback: get from transaction or window.ethereum
      if (tx.from) {
        ownerAddress = tx.from;
      } else if (typeof window !== 'undefined' && window.ethereum) {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          ownerAddress = accounts[0];
        } else {
          throw new Error('No wallet address found');
        }
      } else {
        throw new Error('No wallet address found');
      }
    }
    
    // Wait for transaction to be mined
    const receipt = await tx.wait();
    
    console.log("Mint Transaction Receipt:", receipt);

    // Check if transaction reverted
    if (receipt.status === 0 || receipt.status === null) {
      // Transaction reverted - try to get revert reason
      let revertReason = 'Transaction reverted';
      try {
        const { provider } = await getProviderAndSigner();
        // Try to call the contract to see what the error might be
        const contractInstance = new ethers.Contract(ContractAddress, ContractABI, provider);
        // This won't work for getting revert reason, but we can at least provide context
        revertReason = 'Transaction reverted. The land at these coordinates may already be minted, or there may be insufficient funds.';
      } catch (err) {
        // Ignore errors in getting revert reason
      }
      
      throw new Error(revertReason);
    }

    // Extract landId from LandMinted event
    const { provider } = await getProviderAndSigner();
    const contractInstance = new ethers.Contract(ContractAddress, ContractABI, provider);
    
    // For ethers v6, events are in receipt.logs, need to parse them
    let landId: string | null = null;
    
    // Try to find LandMinted event in logs
    if (receipt.logs && receipt.logs.length > 0) {
      try {
        // Parse logs to find LandMinted event
        const iface = new ethers.Interface(ContractABI);
        for (const log of receipt.logs) {
          try {
            const parsedLog = iface.parseLog(log);
            if (parsedLog && parsedLog.name === 'LandMinted') {
              landId = parsedLog.args.id?.toString() || null;
              break;
            }
          } catch (e) {
            // Not the event we're looking for, continue
          }
        }
      } catch (error) {
        console.warn('Error parsing logs:', error);
      }
    }

    // If we can't get landId from event, we can query the contract for the latest landId
    if (!landId) {
      try {
        const nextLandId = await contractInstance.nextLandId();
        // The minted landId would be nextLandId - 1 (since nextLandId increments after mint)
        landId = (Number(nextLandId) - 1).toString();
      } catch (error) {
        console.warn('Could not get landId from contract, using transaction hash as reference');
        landId = receipt.hash || receipt.transactionHash;
      }
    }

    return {
      digest: receipt.hash || receipt.transactionHash,
      landDataObjectId: landId || receipt.hash || receipt.transactionHash, // Use landId as landDataObjectId for EVM
      ownerAddress,
      rtokens: INITIAL_RTOKENS,
    };
  } catch (error: any) {
    console.error("Error waiting for mint transaction:", error);
    
    // Re-throw with more context if it's a revert
    if (error.message && error.message.includes('revert')) {
      throw new Error(`Transaction failed: ${error.message}. The land at these coordinates may already be minted.`);
    }
    
    throw error; // Re-throw to be handled by caller
  }
};

/**
 * Create transaction to split coin (not needed for EVM, but kept for compatibility)
 * This function is a no-op for EVM chains
 */
export const createSplitOCTCoinTransaction = async (senderAddress: string): Promise<null> => {
  // Not needed for EVM chains - gas is handled automatically
  return null;
};
