/**
 * Service for marketplace-related blockchain transactions on EVM-compatible blockchain
 */

import { ethers } from 'ethers';
import { ContractAddress, ContractABI } from '../Constants/constants';

export interface ListForSaleResult {
  digest: string;
  listingId: string;
}

export interface PurchaseListingResult {
  digest: string;
}

/**
 * Get provider and signer from window.ethereum
 */
const getProviderAndSigner = async () => {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('MetaMask or other Web3 provider not found. Please install MetaMask.');
  }
  
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  return { provider, signer };
};

/**
 * Create transaction for listing NFT for sale
 * list_for_sale(uint256 landId, uint256 price)
 */
export const createListForSaleTransaction = async (
  landId: string | number,
  price: number // Price in RTOKENs
): Promise<any> => {
  const { signer } = await getProviderAndSigner();
  const contractInstance = new ethers.Contract(ContractAddress, ContractABI, signer);
  
  // Convert landId to BigNumber if it's a string
  const landIdBN = BigInt(landId.toString());
  const priceBN = BigInt(price.toString());
  
  console.log("Listing for sale:", { landId: landIdBN.toString(), price: priceBN.toString() });
  
  // Call list_for_sale function
  const tx = await contractInstance.list_for_sale(landIdBN, priceBN);
  
  return tx;
};

/**
 * Create transaction for purchasing listed property
 * purchase_listed_nft(uint256 landId)
 */
export const createPurchaseListingTransaction = async (
  landId: string | number
): Promise<any> => {
  const { signer } = await getProviderAndSigner();
  const contractInstance = new ethers.Contract(ContractAddress, ContractABI, signer);
  
  // Convert landId to BigNumber if it's a string
  const landIdBN = BigInt(landId.toString());
  
  console.log("Purchasing listing:", { landId: landIdBN.toString() });
  
  // Call purchase_listed_nft function
  const tx = await contractInstance.purchase_listed_nft(landIdBN);
  
  return tx;
};

/**
 * Wait for transaction and extract listing ID
 */
export const waitForListForSaleTransaction = async (tx: any): Promise<ListForSaleResult | null> => {
  try {
    const { provider } = await getProviderAndSigner();
    
    // Wait for transaction to be mined
    const receipt = await tx.wait();
    
    console.log("List For Sale Transaction Receipt:", receipt);

    // Extract listingId from LandListed event (ethers v6 format)
    const contractInstance = new ethers.Contract(ContractAddress, ContractABI, provider);
    
    // In ethers v6, events are in receipt.logs, need to parse them
    let listingId: string | null = null;
    if (receipt.logs && receipt.logs.length > 0) {
      const iface = contractInstance.interface;
      for (const log of receipt.logs) {
        try {
          const parsedLog = iface.parseLog(log);
          if (parsedLog && parsedLog.name === 'LandListed') {
            listingId = parsedLog.args.landId?.toString() || null;
            break;
          }
        } catch (e) {
          // Not the event we're looking for
        }
      }
    }

    if (!listingId) {
      console.warn('Could not extract listing ID from transaction, will use transaction hash as reference');
      listingId = receipt.hash;
    }

    return {
      digest: receipt.hash,
      listingId: listingId || receipt.hash,
    };
  } catch (error) {
    console.error("Error waiting for list for sale transaction:", error);
    return null;
  }
};

/**
 * Wait for purchase transaction
 */
export const waitForPurchaseListingTransaction = async (tx: any): Promise<PurchaseListingResult | null> => {
  try {
    // Wait for transaction to be mined
    const receipt = await tx.wait();
    
    console.log("Purchase Listing Transaction Receipt:", receipt);

    return { digest: receipt.hash };
  } catch (error) {
    console.error("Error waiting for purchase listing transaction:", error);
    return null;
  }
};

/**
 * Get listing details from blockchain
 */
export const getListingDetails = async (listingId: string | number): Promise<any | null> => {
  try {
    const { provider } = await getProviderAndSigner();
    const contractInstance = new ethers.Contract(ContractAddress, ContractABI, provider);
    
    const landIdBN = BigInt(listingId.toString());
    const listing = await contractInstance.listings(landIdBN);
    
    return {
      landId: listing.landId.toString(),
      price: listing.price.toString(),
      seller: listing.seller,
      active: listing.active,
    };
  } catch (error) {
    console.error("Error getting listing details:", error);
    return null;
  }
};
