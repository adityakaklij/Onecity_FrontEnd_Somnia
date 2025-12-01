/**
 * Centralized pricing configuration for the city builder game
 * All prices and costs are managed from this single location
 */

export const PRICING = {
  // Land pricing
  land: {
    basePrice: 2000,
    priceRange: 8000, // Random range: basePrice to basePrice + priceRange
    roadPrice: 0, // Roads are not purchasable
  },

  // Zone-based price multipliers
  zoneMultipliers: {
    residential: 1.0,
    commercial: 1.5,
    industrial: 1.2,
    agricultural: 0.8,
    park: 1.0,
    road: 0,
  },

  // Building permit fees
  permit: {
    baseFee: 5000,
    perFloorFee: 2000,
    calculate: (floors: number) => 5000 + floors * 2000,
  },

  // Contractor costs
  contractors: {
    basic: {
      id: 'c1',
      name: 'QuickBuild Co.',
      tier: 'basic' as const,
      speed: 10,
      cost: 10000,
      quality: 1.0,
    },
    premium: {
      id: 'c2',
      name: 'Premium Constructions',
      tier: 'premium' as const,
      speed: 7,
      cost: 25000,
      quality: 1.5,
    },
    luxury: {
      id: 'c3',
      name: 'Elite Developers',
      tier: 'luxury' as const,
      speed: 5,
      cost: 50000,
      quality: 2.0,
    },
  },

  // Crop costs
  crop: {
    plantingCost: 2000,
    growthDays: 7,
    baseMarketPrice: 5000,
    marketPriceRange: 5000, // Random range: baseMarketPrice to baseMarketPrice + marketPriceRange
  },

  // Building revenue
  revenue: {
    baseRevenue: 20000,
    perFloorRevenue: 5000,
    calculate: (floors: number, quality: number) => (20000 + floors * 5000) * quality,
  },

  // Building employees
  employees: {
    baseEmployees: 10,
    perFloorEmployees: 5,
    calculate: (floors: number) => 10 + floors * 5,
  },

  // Initial player balance
  player: {
    initialBalance: 500000,
  },
} as const;

// Helper function to calculate land price based on zone
// All plots cost 0.1 OCT
export const calculateLandPrice = (zone: string): number => {
  if (zone === 'road') return PRICING.land.roadPrice;
  return 0.1; // Fixed price of 0.1 OCT for all plots
};

// Helper function to get contractor by tier
export const getContractor = (tier: 'basic' | 'premium' | 'luxury') => {
  return PRICING.contractors[tier];
};

// Helper function to get all contractors
export const getAllContractors = () => {
  return [
    PRICING.contractors.basic,
    PRICING.contractors.premium,
    PRICING.contractors.luxury,
  ];
};

