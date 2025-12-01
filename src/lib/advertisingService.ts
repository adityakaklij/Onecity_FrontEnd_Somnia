/**
 * Service for billboard advertising-related blockchain transactions on Sui
 */

import { Transaction } from "@mysten/sui/transactions";
import { SuiClient } from '@mysten/sui/client';
import { UserBalance, ContractAddress, InitialSharedVersion } from '../Constants/constants';

const PACKAGE_ID = ContractAddress;
const BALANCE_OBJECT_ID = UserBalance;
const INITIAL_SHARED_VERSION = InitialSharedVersion;
const RPC_URL = "https://rpc-testnet.onelabs.cc:443";

const suiClient = new SuiClient({ url: RPC_URL });

export interface ListForAdvertisingResult {
  digest: string;
  listingId: string;
}

export interface LeaseAdvertisingResult {
  digest: string;
}

/**
 * Create transaction for listing billboard for advertising
 * public fun list_for_advertising(land: &mut LandData, price: u256, ctx: &mut TxContext)
 */
export const createListForAdvertisingTransaction = (
  landDataObjectId: string,
  price: number, // Price in RTOKENs (will be converted to u256)
  senderAddress?: string
): Transaction => {
  const tx = new Transaction();
  
  // Set sender if provided
  if (senderAddress) {
    tx.setSender(senderAddress);
  }
  
  // Convert price to u256 (bigint)
  const priceBigInt = BigInt(price);
  
  tx.moveCall({
    package: PACKAGE_ID,
    module: "LandRegistry",
    function: "list_for_advertising",
    arguments: [
      tx.object(landDataObjectId), // land: &mut LandData
      tx.pure.u256(priceBigInt), // price: u256
    ],
  });

  return tx;
};

/**
 * Create transaction for leasing advertising space
 * public fun lease_advertising_space(land: &LandData, url: String, user_balance: &mut UserBalance, ctx: &mut TxContext)
 */
export const createLeaseAdvertisingTransaction = async (
  landDataObjectId: string,
  imageUrl: string,
  senderAddress?: string
): Promise<Transaction> => {
  console.log("landDataObjectId", landDataObjectId);
  
  const tx = new Transaction();
  
  // Set sender if provided
  if (senderAddress) {
    tx.setSender(senderAddress);
  }
  
  tx.moveCall({
    package: PACKAGE_ID,
    module: "LandRegistry",
    function: "lease_advertising_space",
    arguments: [
      tx.object(landDataObjectId), // land: &LandData
      tx.pure.string(imageUrl), // url: String
      tx.sharedObjectRef({
        objectId: BALANCE_OBJECT_ID,
        mutable: true,
        initialSharedVersion: INITIAL_SHARED_VERSION,
      }), // user_balance: &mut UserBalance
    ],
  });

  return tx;
};

/**
 * Extract listing ID from transaction result
 */
export const extractAdvertisingListingIdFromTransaction = (transactionResult: any): string | null => {
  try {
    // The listing ID might be in the created objects or events
    if (transactionResult?.effects?.created && Array.isArray(transactionResult.effects.created)) {
      // Look for an AdvertisingListing object
      const listing = transactionResult.effects.created.find((created: any) => 
        created.owner && created.reference?.objectId
      );
      
      if (listing?.reference?.objectId) {
        return listing.reference.objectId;
      }
    }
    
    // Check objectChanges for created listings
    if (transactionResult?.objectChanges && Array.isArray(transactionResult.objectChanges)) {
      const listingChange = transactionResult.objectChanges.find((change: any) => 
        change.type === 'created' && 
        (change.objectType?.includes('Advertising') || change.objectType?.includes('Billboard'))
      );
      
      if (listingChange?.objectId) {
        return listingChange.objectId;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting advertising listing ID:', error);
    return null;
  }
};

/**
 * Wait for transaction and extract listing ID
 */
export const waitForListForAdvertisingTransaction = async (digest: string): Promise<ListForAdvertisingResult | null> => {
  try {
    const transactionResult = await suiClient.waitForTransaction({
      digest,
      options: {
        showEffects: true,
        showObjectChanges: true,
        showEvents: true,
      },
    });

    console.log("List For Advertising Transaction Result:", transactionResult);

    const listingId = extractAdvertisingListingIdFromTransaction(transactionResult);

    if (!listingId) {
      console.warn('Could not extract listing ID from transaction, will use digest as reference');
    }

    return {
      digest,
      listingId: listingId || digest, // Fallback to digest if listing ID not found
    };
  } catch (error) {
    console.error("Error waiting for list for advertising transaction:", error);
    return null;
  }
};

/**
 * Wait for lease transaction
 */
export const waitForLeaseAdvertisingTransaction = async (digest: string): Promise<LeaseAdvertisingResult | null> => {
  try {
    await suiClient.waitForTransaction({
      digest,
      options: {
        showEffects: true,
        showObjectChanges: true,
      },
    });

    return { digest };
  } catch (error) {
    console.error("Error waiting for lease advertising transaction:", error);
    return null;
  }
};

