export type ZoneType = 'residential' | 'commercial' | 'industrial' | 'agricultural' | 'park' | 'road' | 'billboard';

export type BuildingType = 
  | 'house' | 'apartment' | 'skyscraper' 
  | 'shop' | 'mall' | 'office' 
  | 'factory' | 'warehouse' | 'powerplant'
  | 'farm' | 'greenhouse' | 'silo'
  | null;

export type DevelopmentStage = 'empty' | 'foundation' | 'construction' | 'complete';

export type CropType = 'wheat' | 'corn' | 'rice' | 'vegetables' | 'fruits';

export type ContractorTier = 'basic' | 'premium' | 'luxury';

export interface Contractor {
  id: string;
  name: string;
  tier: ContractorTier;
  speed: number; // days to complete
  cost: number;
  quality: number; // affects revenue multiplier
}

export interface Permit {
  id: string;
  permitId?: string; // Blockchain permit ID
  type: 'building' | 'demolition' | 'expansion';
  status: 'pending' | 'approved' | 'rejected' | 'construction_started';
  fee: number;
  submittedDate: Date;
  approvalDate?: Date;
  // Voting data
  upvotes?: number;
  downvotes?: number;
  minimumUpvotes?: number;
  description?: string;
  landDataObjectId?: string;
  ownerWalletAddress?: string;
  transactionDigest?: string;
  // User's vote (if they've voted)
  userVote?: 'upvote' | 'downvote' | null;
}

export interface Crop {
  type: CropType;
  planted: Date;
  growthStage: number; // 0-100
  harvestDate: Date;
  yieldAmount?: number;
  marketPrice: number;
}

export interface Lease {
  tenant: string | null;
  monthlyRent: number;
  startDate?: Date;
  endDate?: Date;
  terms: string;
}

export interface Production {
  type: 'cement' | 'steel' | 'electronics' | 'textiles' | 'chemicals';
  capacity: number;
  currentOutput: number;
  efficiency: number;
  marketDemand: number;
}

export interface Building {
  type: BuildingType;
  stage: DevelopmentStage;
  floors?: number;
  permit?: Permit;
  contractor?: Contractor;
  constructionProgress: number;
  revenue?: number;
  employees?: number;
  crop?: Crop;
  lease?: Lease;
  production?: Production;
}

export interface Land {
  id: string;
  x: number;
  y: number;
  zone: ZoneType;
  owner: 'player' | 'other' | null; // 'player' = owned by current user, 'other' = owned by another user, null = available
  price: number;
  building: Building | null;
  forLease?: boolean;
  leasePrice?: number;
  // Blockchain data
  landDataObjectId?: string; // The LandData objectId from transaction
  transactionDigest?: string; // Transaction digest
  ownerWalletAddress?: string; // Wallet address of the owner
  rtokens?: number; // RTOKEN balance (default 5000 on purchase)
  purchasedAt?: Date; // Purchase timestamp
  // Billboard advertising
  hasBillboard?: boolean; // Whether this plot has a billboard
  advertisingImageUrl?: string; // Current advertising image URL (if leased)
  advertisingListing?: {
    listingId: string;
    price: number;
    status: 'available' | 'leased';
  };
}

export interface Player {
  id: string;
  name: string;
  balance: number;
  ownedLands: string[];
  leasedLands: string[];
  monthlyIncome: number;
}
