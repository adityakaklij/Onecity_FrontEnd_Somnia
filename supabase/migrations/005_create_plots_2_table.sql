-- Create plots_2 table to store land NFT purchase data
CREATE TABLE IF NOT EXISTS plots_2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  land_id TEXT NOT NULL UNIQUE, -- The game land ID (e.g., "13-99")
  x_coordinate INTEGER NOT NULL,
  y_coordinate INTEGER NOT NULL,
  owner_wallet_address TEXT NOT NULL,
  land_data_object_id TEXT NOT NULL UNIQUE, -- The LandData objectId from Sui blockchain
  transaction_digest TEXT NOT NULL,
  rtokens INTEGER NOT NULL DEFAULT 5000,
  zone_type TEXT NOT NULL,
  purchased_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create index on owner_wallet_address for fast lookups
CREATE INDEX IF NOT EXISTS idx_plots_2_owner_wallet_address ON plots_2(owner_wallet_address);

-- Create index on land_data_object_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_plots_2_land_data_object_id ON plots_2(land_data_object_id);

-- Create index on coordinates for spatial queries
CREATE INDEX IF NOT EXISTS idx_plots_2_coordinates ON plots_2(x_coordinate, y_coordinate);

-- Create index on transaction_digest
CREATE INDEX IF NOT EXISTS idx_plots_2_transaction_digest ON plots_2(transaction_digest);

-- Create updated_at trigger function (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_plots_2_updated_at
  BEFORE UPDATE ON plots_2
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE plots_2 IS 'Stores blockchain land NFT purchase data';
COMMENT ON COLUMN plots_2.land_id IS 'Game land identifier (e.g., "13-99")';
COMMENT ON COLUMN plots_2.land_data_object_id IS 'Sui blockchain LandData objectId';
COMMENT ON COLUMN plots_2.rtokens IS 'RTOKEN balance (default 5000 on purchase)';
COMMENT ON COLUMN plots_2.transaction_digest IS 'Sui transaction digest for the mint transaction';

