-- Create listings table to store NFT/Plot sale listings
CREATE TABLE IF NOT EXISTS listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id TEXT NOT NULL UNIQUE, -- Unique listing identifier from blockchain
  land_id TEXT NOT NULL, -- The game land ID (e.g., "13-99")
  land_data_object_id TEXT NOT NULL, -- The LandData objectId from Sui blockchain
  seller_wallet_address TEXT NOT NULL, -- Wallet address of the seller
  price INTEGER NOT NULL, -- Price in RTOKENs (u256 stored as INTEGER)
  status TEXT NOT NULL DEFAULT 'active', -- active, sold, cancelled
  listed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  sold_at TIMESTAMP WITH TIME ZONE,
  buyer_wallet_address TEXT, -- Wallet address of the buyer (if sold)
  transaction_digest TEXT NOT NULL, -- Transaction digest for listing creation
  purchase_transaction_digest TEXT, -- Transaction digest for purchase (if sold)
  x_coordinate INTEGER NOT NULL,
  y_coordinate INTEGER NOT NULL,
  zone_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  FOREIGN KEY (land_id) REFERENCES plots(land_id) ON DELETE CASCADE
);

-- Create marketplace_transactions table to store all marketplace transactions
CREATE TABLE IF NOT EXISTS marketplace_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('list', 'purchase', 'cancel')),
  transaction_digest TEXT NOT NULL UNIQUE,
  wallet_address TEXT NOT NULL,
  transaction_data JSONB, -- Store additional transaction data
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_seller ON listings(seller_wallet_address);
CREATE INDEX IF NOT EXISTS idx_listings_land_data_object_id ON listings(land_data_object_id);
CREATE INDEX IF NOT EXISTS idx_listings_listed_at ON listings(listed_at DESC);
CREATE INDEX IF NOT EXISTS idx_listings_price ON listings(price);
CREATE INDEX IF NOT EXISTS idx_listings_land_id ON listings(land_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_transactions_listing_id ON marketplace_transactions(listing_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_transactions_digest ON marketplace_transactions(transaction_digest);

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_listings_updated_at
  BEFORE UPDATE ON listings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE listings IS 'Stores NFT/Plot sale listings';
COMMENT ON TABLE marketplace_transactions IS 'Stores all marketplace blockchain transactions';

