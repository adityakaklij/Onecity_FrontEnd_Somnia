/**
 * Database operations for saving and loading game state
 * Uses Supabase for persistence
 */

import { supabase } from '@/integrations/supabase/client';
import { Land, Player } from '@/types/game';

const GAME_STATE_TABLE = 'game_states';
const PLAYER_TABLE = 'players';
const PLOTS_TABLE = 'plots_2';
const PERMITS_TABLE = 'permits_2';
const PERMIT_VOTES_TABLE = 'permit_votes_2';
const PERMIT_TRANSACTIONS_TABLE = 'permit_transactions_2';
const LISTINGS_TABLE = 'listings_2';
const MARKETPLACE_TRANSACTIONS_TABLE = 'marketplace_transactions_2';
const BILLBOARD_ADVERTISING_TABLE = 'billboard_advertising_2';
const BILLBOARD_TRANSACTIONS_TABLE = 'billboard_transactions_2';

// Initialize database tables (run this once or in migration)
export const initializeDatabase = async () => {
  // Note: This assumes tables are created via Supabase dashboard or migrations
  // For now, we'll use a simple storage approach
  console.log('Database initialized');
};

// Save game state to localStorage as fallback and Supabase if available
export const saveGameState = async (lands: Land[], player: Player) => {
  const gameData = {
    lands,
    player,
    savedAt: new Date().toISOString(),
  };

  // Save to localStorage as primary storage (works offline)
  try {
    localStorage.setItem('cityBuilderGameState', JSON.stringify(gameData));
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
  }

  // Try to save to Supabase if available
  // Note: Supabase tables need to be created first. For now, using localStorage only.
  // To enable Supabase: Create a 'game_states' table with columns: id (uuid), game_data (jsonb), updated_at (timestamp)
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (userData?.user) {
      // Supabase integration can be added here once tables are set up
      // For now, localStorage is the primary storage
      console.log('Supabase user authenticated, but tables not configured. Using localStorage.');
    }
  } catch (error) {
    console.warn('Supabase not available, using localStorage only:', error);
  }
};

// Load game state from localStorage or Supabase
export const loadGameState = async (): Promise<{ lands: Land[]; player: Player } | null> => {
  // Try Supabase first (if tables are configured)
  // Note: Supabase tables need to be created first. For now, using localStorage only.
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (userData?.user) {
      // Supabase integration can be added here once tables are set up
      // For now, localStorage is the primary storage
      console.log('Supabase user authenticated, but tables not configured. Using localStorage.');
    }
  } catch (error) {
    console.warn('Supabase not available, trying localStorage:', error);
  }

  // Fallback to localStorage
  try {
    const savedData = localStorage.getItem('cityBuilderGameState');
    if (savedData) {
      const gameData = JSON.parse(savedData);
      // Convert date strings back to Date objects if needed
      if (gameData.lands) {
        gameData.lands = gameData.lands.map((land: any) => ({
          ...land,
          building: land.building ? {
            ...land.building,
            permit: land.building.permit ? {
              ...land.building.permit,
              submittedDate: land.building.permit.submittedDate ? new Date(land.building.permit.submittedDate) : undefined,
              approvalDate: land.building.permit.approvalDate ? new Date(land.building.permit.approvalDate) : undefined,
            } : undefined,
            crop: land.building.crop ? {
              ...land.building.crop,
              planted: land.building.crop.planted ? new Date(land.building.crop.planted) : undefined,
              harvestDate: land.building.crop.harvestDate ? new Date(land.building.crop.harvestDate) : undefined,
            } : undefined,
            lease: land.building.lease ? {
              ...land.building.lease,
              startDate: land.building.lease.startDate ? new Date(land.building.lease.startDate) : undefined,
              endDate: land.building.lease.endDate ? new Date(land.building.lease.endDate) : undefined,
            } : undefined,
          } : null,
        }));
      }
      return gameData;
    }
  } catch (error) {
    console.error('Failed to load from localStorage:', error);
  }

  return null;
};

// Auto-save helper (debounced)
let saveTimeout: NodeJS.Timeout | null = null;
export const autoSave = (lands: Land[], player: Player, delay: number = 2000) => {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }
  saveTimeout = setTimeout(() => {
    saveGameState(lands, player);
  }, delay);
};

/**
 * Save plot purchase data to Supabase
 */
export interface PlotPurchaseData {
  landId: string;
  x: number;
  y: number;
  ownerWalletAddress: string;
  landDataObjectId: string;
  transactionDigest: string;
  rtokens: number;
  zoneType: string;
}

export const savePlotPurchase = async (plotData: PlotPurchaseData): Promise<boolean> => {
  try {
    console.log('Saving plot purchase to database:', {
      landId: plotData.landId,
      ownerWalletAddress: plotData.ownerWalletAddress,
      landDataObjectId: plotData.landDataObjectId,
      transactionDigest: plotData.transactionDigest,
      rtokens: plotData.rtokens,
    });

    // Ensure rtokens is set (default to 5000 if not provided)
    const rtokensValue = plotData.rtokens !== undefined && plotData.rtokens !== null ? plotData.rtokens : 5000;

    // Use upsert to handle both new inserts and updates
    // This will insert if the plot doesn't exist, or update if it does
    const { data, error } = await (supabase as any)
      .from(PLOTS_TABLE as any)
      .upsert({
        land_id: plotData.landId,
        x_coordinate: plotData.x,
        y_coordinate: plotData.y,
        owner_wallet_address: plotData.ownerWalletAddress,
        land_data_object_id: plotData.landDataObjectId,
        transaction_digest: plotData.transactionDigest,
        rtokens: rtokensValue,
        zone_type: plotData.zoneType,
        purchased_at: new Date().toISOString(),
      }, {
        onConflict: 'land_id', // Use land_id as the conflict resolution key
        ignoreDuplicates: false, // Update on conflict
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving plot purchase to database:', error);
      console.error('Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      throw error; // Throw to be caught by retry logic
    }

    console.log('Plot purchase saved successfully to database:', data);
    console.log('Saved rtokens value:', data?.rtokens);
    return true;
  } catch (error: any) {
    console.error('Exception saving plot purchase:', error);
    // Re-throw to allow retry logic in the caller
    throw error;
  }
};

/**
 * Load plot data for a specific wallet address
 */
export const loadPlotsByWallet = async (walletAddress: string): Promise<PlotPurchaseData[]> => {
  try {
    const { data, error } = await supabase
      .from(PLOTS_TABLE)
      .select('*')
      .eq('owner_wallet_address', walletAddress)
      .order('purchased_at', { ascending: false });

    if (error) {
      console.error('Error loading plots:', error);
      return [];
    }

    return (data || []).map((plot: any) => ({
      landId: plot.land_id,
      x: plot.x_coordinate,
      y: plot.y_coordinate,
      ownerWalletAddress: plot.owner_wallet_address,
      landDataObjectId: plot.land_data_object_id,
      transactionDigest: plot.transaction_digest,
      rtokens: plot.rtokens,
      zoneType: plot.zone_type,
    }));
  } catch (error) {
    console.error('Exception loading plots:', error);
    return [];
  }
};

/**
 * Load plot data by land ID
 */
export const loadPlotByLandId = async (landId: string): Promise<PlotPurchaseData | null> => {
  try {
    const { data, error } = await supabase
      .from(PLOTS_TABLE)
      .select('*')
      .eq('land_id', landId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return null;
      }
      console.error('Error loading plot:', error);
      return null;
    }

    return {
      landId: data.land_id,
      x: data.x_coordinate,
      y: data.y_coordinate,
      ownerWalletAddress: data.owner_wallet_address,
      landDataObjectId: data.land_data_object_id,
      transactionDigest: data.transaction_digest,
      rtokens: data.rtokens,
      zoneType: data.zone_type,
    };
  } catch (error) {
    console.error('Exception loading plot:', error);
    return null;
  }
};

/**
 * Get total RTOKEN balance for a wallet address
 */
export const getTotalRTokenBalance = async (walletAddress: string): Promise<number> => {
  try {
    const { data, error } = await supabase
      .from(PLOTS_TABLE)
      .select('rtokens')
      .eq('owner_wallet_address', walletAddress);

    if (error) {
      console.error('Error getting RTOKEN balance:', error);
      return 0;
    }

    const total = (data || []).reduce((sum, plot) => sum + (plot.rtokens || 0), 0);
    return total;
  } catch (error) {
    console.error('Exception getting RTOKEN balance:', error);
    return 0;
  }
};

/**
 * Update RTOKEN balance for a plot
 */
export const updatePlotRTokenBalance = async (
  landDataObjectId: string,
  newBalance: number
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from(PLOTS_TABLE)
      .update({ rtokens: newBalance })
      .eq('land_data_object_id', landDataObjectId);

    if (error) {
      console.error('Error updating RTOKEN balance:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Exception updating RTOKEN balance:', error);
    return false;
  }
};

/**
 * Permit-related database operations
 */
export interface PermitData {
  permitId?: number; // Optional - will be auto-generated by database sequence
  blockchainPermitId?: string; // Blockchain permit object ID (for blockchain transactions)
  landId: string;
  landDataObjectId: string;
  ownerWalletAddress: string;
  description: string;
  buildingType?: string;
  floors: number;
  status: 'pending' | 'approved' | 'rejected' | 'construction_started';
  permitFee: number;
  upvotes: number;
  downvotes: number;
  minimumUpvotes: number;
  transactionDigest: string;
}

/**
 * Save permit application to database
 * permit_id will be auto-generated by database sequence starting from 1
 */
export const savePermit = async (permitData: PermitData): Promise<{ id: string; permitId: number } | null> => {
  try {
    const insertData: any = {
      land_id: permitData.landId,
      land_data_object_id: permitData.landDataObjectId,
      owner_wallet_address: permitData.ownerWalletAddress,
      description: permitData.description,
      building_type: permitData.buildingType,
      floors: permitData.floors,
      status: permitData.status,
      permit_fee: permitData.permitFee,
      upvotes: permitData.upvotes,
      downvotes: permitData.downvotes,
      minimum_upvotes: permitData.minimumUpvotes,
      transaction_digest: permitData.transactionDigest,
      submitted_at: new Date().toISOString(),
    };

    // Only include permit_id if explicitly provided (shouldn't normally be provided)
    if (permitData.permitId !== undefined) {
      insertData.permit_id = permitData.permitId;
    }

    // Include blockchain permit ID if provided
    if (permitData.blockchainPermitId) {
      insertData.blockchain_permit_id = permitData.blockchainPermitId;
    }

    const { data, error } = await supabase
      .from(PERMITS_TABLE)
      .insert(insertData)
      .select('id, permit_id')
      .single();

    if (error) {
      console.error('Error saving permit:', error);
      return null;
    }

    // Save transaction record
    await savePermitTransaction({
      permitId: data.id,
      transactionType: 'apply',
      transactionDigest: permitData.transactionDigest,
      walletAddress: permitData.ownerWalletAddress,
      transactionData: permitData,
    });

    return { id: data.id, permitId: data.permit_id };
  } catch (error) {
    console.error('Exception saving permit:', error);
    return null;
  }
};

/**
 * Load all permits (for voting page)
 */
export const loadAllPermits = async (): Promise<any[]> => {
  try {
    const { data, error } = await supabase
      .from(PERMITS_TABLE)
      .select(`
        *,
        permit_votes_2 (
          voter_wallet_address,
          vote_type,
          created_at
        ),
        plots_2 (
          zone_type
        )
      `)
      .order('submitted_at', { ascending: false });

    if (error) {
      console.error('Error loading permits:', error);
      return [];
    }

    // Flatten the zone_type from plots_2 relation
    return (data || []).map((permit: any) => ({
      ...permit,
      zone_type: permit.plots_2?.zone_type || null,
    }));
  } catch (error) {
    console.error('Exception loading permits:', error);
    return [];
  }
};

/**
 * Load permits for a specific wallet address
 */
export const loadPermitsByWallet = async (walletAddress: string): Promise<any[]> => {
  try {
    const { data, error } = await supabase
      .from(PERMITS_TABLE)
      .select(`
        *,
        permit_votes_2 (
          voter_wallet_address,
          vote_type,
          created_at
        )
      `)
      .eq('owner_wallet_address', walletAddress)
      .order('submitted_at', { ascending: false });

    if (error) {
      console.error('Error loading permits by wallet:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Exception loading permits by wallet:', error);
    return [];
  }
};

/**
 * Load permit by permit ID (sequential integer ID)
 */
export const loadPermitById = async (permitId: number | string): Promise<any | null> => {
  try {
    // Convert to number if string
    const permitIdNum = typeof permitId === 'string' ? parseInt(permitId, 10) : permitId;
    
    const { data, error } = await supabase
      .from(PERMITS_TABLE)
      .select(`
        *,
        permit_votes_2 (
          voter_wallet_address,
          vote_type,
          created_at
        )
      `)
      .eq('permit_id', permitIdNum)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Error loading permit:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Exception loading permit:', error);
    return null;
  }
};

/**
 * Save vote to database
 */
export const savePermitVote = async (
  permitId: number | string,
  voterWalletAddress: string,
  voteType: 'upvote' | 'downvote',
  transactionDigest: string
): Promise<boolean> => {
  try {
    // First, get the permit UUID from permit_id (sequential integer)
    const permit = await loadPermitById(permitId);
    if (!permit) {
      console.error('Permit not found:', permitId);
      return false;
    }

    // Check if user already voted
    const { data: existingVote } = await supabase
      .from(PERMIT_VOTES_TABLE)
      .select('*')
      .eq('permit_id', permit.id)
      .eq('voter_wallet_address', voterWalletAddress)
      .single();

    if (existingVote) {
      console.error('User has already voted on this permit');
      return false;
    }

    // Save vote
    const { error: voteError } = await supabase
      .from(PERMIT_VOTES_TABLE)
      .insert({
        permit_id: permit.id,
        voter_wallet_address: voterWalletAddress,
        vote_type: voteType,
        transaction_digest: transactionDigest,
      });

    if (voteError) {
      console.error('Error saving vote:', voteError);
      return false;
    }

    // Update permit vote counts
    const updateField = voteType === 'upvote' ? 'upvotes' : 'downvotes';
    const currentCount = permit[updateField] || 0;
    const { error: updateError } = await supabase
      .from(PERMITS_TABLE)
      .update({ [updateField]: currentCount + 1 })
      .eq('id', permit.id);

    if (updateError) {
      console.error('Error updating vote counts:', updateError);
    }

    // Save transaction record
    await savePermitTransaction({
      permitId: permit.id,
      transactionType: 'vote',
      transactionDigest,
      walletAddress: voterWalletAddress,
      transactionData: { voteType },
    });

    return true;
  } catch (error) {
    console.error('Exception saving vote:', error);
    return false;
  }
};

/**
 * Update permit status
 */
export const updatePermitStatus = async (
  permitId: number | string,
  status: 'pending' | 'approved' | 'rejected' | 'construction_started',
  transactionDigest?: string
): Promise<boolean> => {
  try {
    const permit = await loadPermitById(permitId);
    if (!permit) {
      console.error('Permit not found:', permitId);
      return false;
    }

    const updateData: any = { status };
    if (status === 'approved') {
      updateData.approved_at = new Date().toISOString();
    }
    if (transactionDigest) {
      updateData.transaction_digest = transactionDigest;
    }

    const { error } = await supabase
      .from(PERMITS_TABLE)
      .update(updateData)
      .eq('id', permit.id);

    if (error) {
      console.error('Error updating permit status:', error);
      return false;
    }

    if (transactionDigest) {
      await savePermitTransaction({
        permitId: permit.id,
        transactionType: 'update',
        transactionDigest,
        walletAddress: permit.owner_wallet_address,
        transactionData: { status },
      });
    }

    return true;
  } catch (error) {
    console.error('Exception updating permit status:', error);
    return false;
  }
};

/**
 * Save permit transaction
 */
export const savePermitTransaction = async (transactionData: {
  permitId: string;
  transactionType: 'apply' | 'vote' | 'update' | 'start_construction';
  transactionDigest: string;
  walletAddress: string;
  transactionData?: any;
}): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from(PERMIT_TRANSACTIONS_TABLE)
      .insert({
        permit_id: transactionData.permitId,
        transaction_type: transactionData.transactionType,
        transaction_digest: transactionData.transactionDigest,
        wallet_address: transactionData.walletAddress,
        transaction_data: transactionData.transactionData || {},
      });

    if (error) {
      console.error('Error saving permit transaction:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Exception saving permit transaction:', error);
    return false;
  }
};

/**
 * Check if user has voted on a permit
 */
export const getUserVote = async (
  permitId: number | string,
  voterWalletAddress: string
): Promise<'upvote' | 'downvote' | null> => {
  try {
    const permit = await loadPermitById(permitId);
    if (!permit) {
      return null;
    }

    const { data, error } = await supabase
      .from(PERMIT_VOTES_TABLE)
      .select('vote_type')
      .eq('permit_id', permit.id)
      .eq('voter_wallet_address', voterWalletAddress)
      .single();

    if (error || !data) {
      return null;
    }

    return data.vote_type as 'upvote' | 'downvote';
  } catch (error) {
    console.error('Exception getting user vote:', error);
    return null;
  }
};

/**
 * Marketplace/Listing-related database operations
 */
export interface ListingData {
  listingId: string;
  landId: string;
  landDataObjectId: string;
  sellerWalletAddress: string;
  price: number;
  x: number;
  y: number;
  zoneType: string;
  transactionDigest: string;
}

/**
 * Save listing to database
 */
export const saveListing = async (listingData: ListingData): Promise<string | null> => {
  try {
    const { data, error } = await supabase
      .from(LISTINGS_TABLE)
      .insert({
        listing_id: listingData.listingId,
        land_id: listingData.landId,
        land_data_object_id: listingData.landDataObjectId,
        seller_wallet_address: listingData.sellerWalletAddress,
        price: listingData.price,
        status: 'active',
        transaction_digest: listingData.transactionDigest,
        x_coordinate: listingData.x,
        y_coordinate: listingData.y,
        zone_type: listingData.zoneType,
        listed_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error saving listing:', error);
      return null;
    }

    // Save transaction record
    await saveMarketplaceTransaction({
      listingId: data.id,
      transactionType: 'list',
      transactionDigest: listingData.transactionDigest,
      walletAddress: listingData.sellerWalletAddress,
      transactionData: listingData,
    });

    return data.id;
  } catch (error) {
    console.error('Exception saving listing:', error);
    return null;
  }
};

/**
 * Load all active listings (for marketplace page)
 */
export const loadAllListings = async (): Promise<any[]> => {
  try {
    const { data, error } = await supabase
      .from(LISTINGS_TABLE)
      .select('*')
      .eq('status', 'active')
      .order('listed_at', { ascending: false });

    if (error) {
      console.error('Error loading listings:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Exception loading listings:', error);
    return [];
  }
};

/**
 * Load listing by listing ID
 */
export const loadListingById = async (listingId: string): Promise<any | null> => {
  try {
    const { data, error } = await supabase
      .from(LISTINGS_TABLE)
      .select('*')
      .eq('listing_id', listingId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Error loading listing:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Exception loading listing:', error);
    return null;
  }
};

/**
 * Load listing by land data object ID
 */
export const loadListingByLandDataObjectId = async (landDataObjectId: string): Promise<any | null> => {
  try {
    const { data, error } = await supabase
      .from(LISTINGS_TABLE)
      .select('*')
      .eq('land_data_object_id', landDataObjectId)
      .eq('status', 'active')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Error loading listing by land data object ID:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Exception loading listing by land data object ID:', error);
    return null;
  }
};

/**
 * Update listing status (sold, cancelled)
 */
export const updateListingStatus = async (
  listingId: string,
  status: 'active' | 'sold' | 'cancelled',
  buyerWalletAddress?: string,
  purchaseTransactionDigest?: string
): Promise<boolean> => {
  try {
    const listing = await loadListingById(listingId);
    if (!listing) {
      console.error('Listing not found:', listingId);
      return false;
    }

    const updateData: any = { status };
    if (status === 'sold') {
      updateData.sold_at = new Date().toISOString();
      if (buyerWalletAddress) {
        updateData.buyer_wallet_address = buyerWalletAddress;
      }
      if (purchaseTransactionDigest) {
        updateData.purchase_transaction_digest = purchaseTransactionDigest;
      }
    }

    const { error } = await supabase
      .from(LISTINGS_TABLE)
      .update(updateData)
      .eq('id', listing.id);

    if (error) {
      console.error('Error updating listing status:', error);
      return false;
    }

    if (purchaseTransactionDigest) {
      await saveMarketplaceTransaction({
        listingId: listing.id,
        transactionType: 'purchase',
        transactionDigest: purchaseTransactionDigest,
        walletAddress: buyerWalletAddress || '',
        transactionData: { status, buyerWalletAddress },
      });
    }

    return true;
  } catch (error) {
    console.error('Exception updating listing status:', error);
    return false;
  }
};

/**
 * Remove listing (cancel)
 */
export const removeListing = async (
  listingId: string,
  transactionDigest?: string
): Promise<boolean> => {
  try {
    const listing = await loadListingById(listingId);
    if (!listing) {
      console.error('Listing not found:', listingId);
      return false;
    }

    const { error } = await supabase
      .from(LISTINGS_TABLE)
      .update({ status: 'cancelled' })
      .eq('id', listing.id);

    if (error) {
      console.error('Error removing listing:', error);
      return false;
    }

    if (transactionDigest) {
      await saveMarketplaceTransaction({
        listingId: listing.id,
        transactionType: 'cancel',
        transactionDigest,
        walletAddress: listing.seller_wallet_address,
        transactionData: { status: 'cancelled' },
      });
    }

    return true;
  } catch (error) {
    console.error('Exception removing listing:', error);
    return false;
  }
};

/**
 * Save marketplace transaction
 */
export const saveMarketplaceTransaction = async (transactionData: {
  listingId: string;
  transactionType: 'list' | 'purchase' | 'cancel';
  transactionDigest: string;
  walletAddress: string;
  transactionData?: any;
}): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from(MARKETPLACE_TRANSACTIONS_TABLE)
      .insert({
        listing_id: transactionData.listingId,
        transaction_type: transactionData.transactionType,
        transaction_digest: transactionData.transactionDigest,
        wallet_address: transactionData.walletAddress,
        transaction_data: transactionData.transactionData || {},
      });

    if (error) {
      console.error('Error saving marketplace transaction:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Exception saving marketplace transaction:', error);
    return false;
  }
};

/**
 * Update plot ownership after purchase
 * Also transfers RTOKENs: deducts from buyer, adds to seller
 */
export const updatePlotOwnership = async (
  landDataObjectId: string,
  newOwnerWalletAddress: string,
  oldOwnerWalletAddress: string,
  price: number,
  transactionDigest: string
): Promise<boolean> => {
  try {
    console.log('Updating plot ownership:', {
      landDataObjectId,
      newOwnerWalletAddress,
      oldOwnerWalletAddress,
      price,
      transactionDigest,
    });

    // Get the plot being sold - use type assertion to bypass TypeScript strict checking
    const { data: plotData, error: plotError } = await (supabase as any)
      .from(PLOTS_TABLE as any)
      .select('*')
      .eq('land_data_object_id', landDataObjectId)
      .single();

    if (plotError || !plotData) {
      console.error('Error fetching plot:', plotError);
      console.error('Plot data:', plotData);
      return false;
    }

    console.log('Found plot to update:', plotData);

    // Update plot ownership and set rtokens to 5000 for new owner (as per minting)
    const { error: updateError, data: updatedData } = await (supabase as any)
      .from(PLOTS_TABLE as any)
      .update({
        owner_wallet_address: newOwnerWalletAddress,
        transaction_digest: transactionDigest,
        purchased_at: new Date().toISOString(),
        rtokens: 5000, // New owner gets 5000 rtokens (as per minting)
      })
      .eq('land_data_object_id', landDataObjectId)
      .select();

    if (updateError) {
      console.error('Error updating plot ownership:', updateError);
      console.error('Update error details:', {
        message: updateError.message,
        details: updateError.details,
        hint: updateError.hint,
        code: updateError.code,
      });
      return false;
    }

    console.log('Plot ownership updated successfully:', updatedData);

    // Deduct RTOKENs from buyer (deduct from their total across all plots)
    const { data: buyerPlots } = await (supabase as any)
      .from(PLOTS_TABLE as any)
      .select('id, land_data_object_id, rtokens')
      .eq('owner_wallet_address', newOwnerWalletAddress)
      .order('purchased_at', { ascending: false });

    if (buyerPlots && buyerPlots.length > 0) {
      let remainingToDeduct = price;
      for (const plot of buyerPlots) {
        if (remainingToDeduct <= 0) break;
        
        const currentRtokens = plot.rtokens || 0;
        if (plot.land_data_object_id === landDataObjectId) {
          // Skip the plot being purchased (already set to 5000)
          continue;
        }
        
        if (currentRtokens > 0) {
          const deduction = Math.min(remainingToDeduct, currentRtokens);
          const newBalance = currentRtokens - deduction;
          remainingToDeduct -= deduction;
          
          await (supabase as any)
            .from(PLOTS_TABLE as any)
            .update({ rtokens: newBalance })
            .eq('id', plot.id);
        }
      }
    }

    // Add RTOKENs to seller (add to one of their existing plots, or create entry)
    const { data: sellerPlots } = await (supabase as any)
      .from(PLOTS_TABLE as any)
      .select('id, rtokens')
      .eq('owner_wallet_address', oldOwnerWalletAddress)
      .order('purchased_at', { ascending: false })
      .limit(1);

    if (sellerPlots && sellerPlots.length > 0) {
      // Add to seller's first plot
      const sellerPlot = sellerPlots[0];
      const currentRtokens = sellerPlot.rtokens || 0;
      await (supabase as any)
        .from(PLOTS_TABLE as any)
        .update({ rtokens: currentRtokens + price })
        .eq('id', sellerPlot.id);
    } else {
      // If seller has no plots, we can't add rtokens (they sold their last plot)
      // This is fine - they received the payment
      console.log('Seller has no remaining plots to add rtokens to');
    }

    return true;
  } catch (error) {
    console.error('Exception updating plot ownership:', error);
    return false;
  }
};

/**
 * Billboard Advertising-related database operations
 */
export interface AdvertisingListingData {
  listingId: string;
  landId: string;
  landDataObjectId: string;
  ownerWalletAddress: string;
  price: number;
  transactionDigest: string;
}

/**
 * Save advertising listing to database
 */
export const saveAdvertisingListing = async (listingData: AdvertisingListingData): Promise<string | null> => {
  try {
    const { data, error } = await supabase
      .from(BILLBOARD_ADVERTISING_TABLE)
      .insert({
        listing_id: listingData.listingId,
        land_id: listingData.landId,
        land_data_object_id: listingData.landDataObjectId,
        owner_wallet_address: listingData.ownerWalletAddress,
        price: listingData.price,
        status: 'available',
        list_transaction_digest: listingData.transactionDigest,
        listed_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error saving advertising listing:', error);
      return null;
    }

    // Save transaction record
    await saveBillboardTransaction({
      advertisingId: data.id,
      transactionType: 'list',
      transactionDigest: listingData.transactionDigest,
      walletAddress: listingData.ownerWalletAddress,
      transactionData: listingData,
    });

    return data.id;
  } catch (error) {
    console.error('Exception saving advertising listing:', error);
    return null;
  }
};

/**
 * Load advertising listing by land data object ID
 */
export const loadAdvertisingByLandDataObjectId = async (landDataObjectId: string): Promise<any | null> => {
  try {
    const { data, error } = await supabase
      .from(BILLBOARD_ADVERTISING_TABLE)
      .select('*')
      .eq('land_data_object_id', landDataObjectId)
      .in('status', ['available', 'leased'])
      .order('listed_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error loading advertising listing:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Exception loading advertising listing:', error);
    return null;
  }
};

/**
 * Load all active advertising listings
 */
export const loadAllAdvertisingListings = async (): Promise<any[]> => {
  try {
    const { data, error } = await supabase
      .from(BILLBOARD_ADVERTISING_TABLE)
      .select('*')
      .eq('status', 'available')
      .order('listed_at', { ascending: false });

    if (error) {
      console.error('Error loading advertising listings:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Exception loading advertising listings:', error);
    return [];
  }
};

/**
 * Update advertising listing status (leased, cancelled)
 */
export const updateAdvertisingStatus = async (
  listingId: string,
  status: 'available' | 'leased' | 'cancelled',
  advertiserWalletAddress?: string,
  imageUrl?: string,
  leaseTransactionDigest?: string
): Promise<boolean> => {
  try {
    const { data: listing } = await supabase
      .from(BILLBOARD_ADVERTISING_TABLE)
      .select('*')
      .eq('listing_id', listingId)
      .single();

    if (!listing) {
      console.error('Advertising listing not found:', listingId);
      return false;
    }

    const updateData: any = { status };
    if (status === 'leased') {
      updateData.leased_at = new Date().toISOString();
      if (advertiserWalletAddress) {
        updateData.advertiser_wallet_address = advertiserWalletAddress;
      }
      if (imageUrl) {
        updateData.image_url = imageUrl;
      }
      if (leaseTransactionDigest) {
        updateData.lease_transaction_digest = leaseTransactionDigest;
      }
    }

    const { error } = await supabase
      .from(BILLBOARD_ADVERTISING_TABLE)
      .update(updateData)
      .eq('id', listing.id);

    if (error) {
      console.error('Error updating advertising status:', error);
      return false;
    }

    if (leaseTransactionDigest) {
      await saveBillboardTransaction({
        advertisingId: listing.id,
        transactionType: 'lease',
        transactionDigest: leaseTransactionDigest,
        walletAddress: advertiserWalletAddress || '',
        transactionData: { status, advertiserWalletAddress, imageUrl },
      });
    }

    return true;
  } catch (error) {
    console.error('Exception updating advertising status:', error);
    return false;
  }
};

/**
 * Save billboard transaction
 */
export const saveBillboardTransaction = async (transactionData: {
  advertisingId: string;
  transactionType: 'list' | 'lease' | 'cancel';
  transactionDigest: string;
  walletAddress: string;
  transactionData?: any;
}): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from(BILLBOARD_TRANSACTIONS_TABLE)
      .insert({
        advertising_id: transactionData.advertisingId,
        transaction_type: transactionData.transactionType,
        transaction_digest: transactionData.transactionDigest,
        wallet_address: transactionData.walletAddress,
        transaction_data: transactionData.transactionData || {},
      });

    if (error) {
      console.error('Error saving billboard transaction:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Exception saving billboard transaction:', error);
    return false;
  }
};

/**
 * Get active advertising for a land (for displaying billboard image)
 */
export const getActiveAdvertising = async (landDataObjectId: string): Promise<{ imageUrl: string; advertiser: string } | null> => {
  try {
    const { data, error } = await supabase
      .from(BILLBOARD_ADVERTISING_TABLE)
      .select('image_url, advertiser_wallet_address')
      .eq('land_data_object_id', landDataObjectId)
      .eq('status', 'leased')
      .order('leased_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data || !data.image_url) {
      return null;
    }

    return {
      imageUrl: data.image_url,
      advertiser: data.advertiser_wallet_address || '',
    };
  } catch (error) {
    console.error('Exception getting active advertising:', error);
    return null;
  }
};

