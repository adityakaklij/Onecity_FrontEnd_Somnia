-- Create permits table to store permit applications and voting data
CREATE TABLE IF NOT EXISTS permits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  permit_id TEXT NOT NULL UNIQUE, -- Unique permit identifier from blockchain
  land_id TEXT NOT NULL, -- The game land ID (e.g., "13-99")
  land_data_object_id TEXT NOT NULL, -- The LandData objectId from Sui blockchain
  owner_wallet_address TEXT NOT NULL, -- Wallet address of the permit applicant
  description TEXT NOT NULL, -- Description of the construction project
  building_type TEXT, -- Type of building (house, apartment, shop, etc.)
  floors INTEGER NOT NULL DEFAULT 1, -- Number of floors
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected, construction_started
  permit_fee INTEGER NOT NULL DEFAULT 500, -- Permit fee in RTOKENs (500 RTOKENs)
  upvotes INTEGER NOT NULL DEFAULT 0, -- Number of upvotes
  downvotes INTEGER NOT NULL DEFAULT 0, -- Number of downvotes
  minimum_upvotes INTEGER NOT NULL DEFAULT 2, -- Minimum upvotes required for approval
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMP WITH TIME ZONE,
  transaction_digest TEXT, -- Transaction digest for permit application
  vote_transaction_digests TEXT[], -- Array of transaction digests for votes
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  FOREIGN KEY (land_id) REFERENCES plots(land_id) ON DELETE CASCADE
);

-- Create votes table to track individual votes
CREATE TABLE IF NOT EXISTS permit_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  permit_id UUID NOT NULL REFERENCES permits(id) ON DELETE CASCADE,
  voter_wallet_address TEXT NOT NULL, -- Wallet address of the voter
  vote_type TEXT NOT NULL CHECK (vote_type IN ('upvote', 'downvote')), -- Type of vote
  transaction_digest TEXT NOT NULL, -- Transaction digest for the vote
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(permit_id, voter_wallet_address) -- Prevent duplicate votes from same user
);

-- Create permit_transactions table to store all blockchain transactions
CREATE TABLE IF NOT EXISTS permit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  permit_id UUID NOT NULL REFERENCES permits(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('apply', 'vote', 'update', 'start_construction')),
  transaction_digest TEXT NOT NULL UNIQUE,
  wallet_address TEXT NOT NULL,
  transaction_data JSONB, -- Store additional transaction data
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_permits_land_id ON permits(land_id);
CREATE INDEX IF NOT EXISTS idx_permits_owner_wallet_address ON permits(owner_wallet_address);
CREATE INDEX IF NOT EXISTS idx_permits_status ON permits(status);
CREATE INDEX IF NOT EXISTS idx_permits_submitted_at ON permits(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_permits_land_data_object_id ON permits(land_data_object_id);
CREATE INDEX IF NOT EXISTS idx_permit_votes_permit_id ON permit_votes(permit_id);
CREATE INDEX IF NOT EXISTS idx_permit_votes_voter ON permit_votes(voter_wallet_address);
CREATE INDEX IF NOT EXISTS idx_permit_transactions_permit_id ON permit_transactions(permit_id);
CREATE INDEX IF NOT EXISTS idx_permit_transactions_digest ON permit_transactions(transaction_digest);

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_permits_updated_at
  BEFORE UPDATE ON permits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE permits IS 'Stores permit applications and voting data';
COMMENT ON TABLE permit_votes IS 'Stores individual votes on permits';
COMMENT ON TABLE permit_transactions IS 'Stores all blockchain transactions related to permits';

