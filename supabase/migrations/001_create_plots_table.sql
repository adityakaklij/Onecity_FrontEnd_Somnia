-- Create plots table to store land NFT purchase data
CREATE TABLE IF NOT EXISTS plots (
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
CREATE INDEX IF NOT EXISTS idx_plots_owner_wallet_address ON plots(owner_wallet_address);

-- Create index on land_data_object_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_plots_land_data_object_id ON plots(land_data_object_id);

-- Create index on coordinates for spatial queries
CREATE INDEX IF NOT EXISTS idx_plots_coordinates ON plots(x_coordinate, y_coordinate);

-- Create index on transaction_digest
CREATE INDEX IF NOT EXISTS idx_plots_transaction_digest ON plots(transaction_digest);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_plots_updated_at
  BEFORE UPDATE ON plots
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE plots IS 'Stores blockchain land NFT purchase data';
COMMENT ON COLUMN plots.land_id IS 'Game land identifier (e.g., "13-99")';
COMMENT ON COLUMN plots.land_data_object_id IS 'Sui blockchain LandData objectId';
COMMENT ON COLUMN plots.rtokens IS 'RTOKEN balance (default 5000 on purchase)';
COMMENT ON COLUMN plots.transaction_digest IS 'Sui transaction digest for the mint transaction';

