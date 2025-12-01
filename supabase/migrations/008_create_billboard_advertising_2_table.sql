-- Create billboard_advertising_2 table to store billboard advertising listings and leases
CREATE TABLE IF NOT EXISTS billboard_advertising_2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id TEXT NOT NULL UNIQUE, -- Unique listing identifier from blockchain
  land_id TEXT NOT NULL, -- The game land ID (e.g., "13-99")
  land_data_object_id TEXT NOT NULL, -- The LandData objectId from Sui blockchain
  owner_wallet_address TEXT NOT NULL, -- Wallet address of the plot owner
  price INTEGER NOT NULL, -- Price in RTOKENs (u256 stored as INTEGER)
  status TEXT NOT NULL DEFAULT 'available', -- available, leased, cancelled
  image_url TEXT, -- Image URL for the advertisement (set when leased)
  advertiser_wallet_address TEXT, -- Wallet address of the advertiser (if leased)
  listed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  leased_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE, -- Optional expiration date
  list_transaction_digest TEXT NOT NULL, -- Transaction digest for listing
  lease_transaction_digest TEXT, -- Transaction digest for leasing (if leased)
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  FOREIGN KEY (land_id) REFERENCES plots_2(land_id) ON DELETE CASCADE
);

-- Create billboard_transactions table to store all billboard transactions
CREATE TABLE IF NOT EXISTS billboard_transactions_2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advertising_id UUID NOT NULL REFERENCES billboard_advertising_2(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('list', 'lease', 'cancel')),
  transaction_digest TEXT NOT NULL UNIQUE,
  wallet_address TEXT NOT NULL,
  transaction_data JSONB, -- Store additional transaction data
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_billboard_advertising_2_status ON billboard_advertising_2(status);
CREATE INDEX IF NOT EXISTS idx_billboard_advertising_2_owner ON billboard_advertising_2(owner_wallet_address);
CREATE INDEX IF NOT EXISTS idx_billboard_advertising_2_land_data_object_id ON billboard_advertising_2(land_data_object_id);
CREATE INDEX IF NOT EXISTS idx_billboard_advertising_2_listed_at ON billboard_advertising_2(listed_at DESC);
CREATE INDEX IF NOT EXISTS idx_billboard_advertising_2_land_id ON billboard_advertising_2(land_id);
CREATE INDEX IF NOT EXISTS idx_billboard_transactions_2_advertising_id ON billboard_transactions_2(advertising_id);
CREATE INDEX IF NOT EXISTS idx_billboard_transactions_2_digest ON billboard_transactions_2(transaction_digest);

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_billboard_advertising_2_updated_at
  BEFORE UPDATE ON billboard_advertising_2
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE billboard_advertising_2 IS 'Stores billboard advertising listings and leases';
COMMENT ON TABLE billboard_transactions_2 IS 'Stores all billboard advertising blockchain transactions';

