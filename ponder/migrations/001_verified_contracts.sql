-- Migration: Create verified_contracts table
-- This table stores locally verified contracts (via Blockscout verifier)
-- separate from Ponder-managed tables

CREATE TABLE IF NOT EXISTS verified_contracts (
  address VARCHAR(42) PRIMARY KEY,
  contract_name VARCHAR(255) NOT NULL,
  compiler_version VARCHAR(100) NOT NULL,
  optimization_enabled BOOLEAN DEFAULT false,
  optimization_runs INTEGER,
  evm_version VARCHAR(50),
  source_files JSONB NOT NULL,
  abi JSONB NOT NULL,
  constructor_args TEXT,
  match_type VARCHAR(20) DEFAULT 'full',
  verified_at TIMESTAMPTZ DEFAULT NOW(),
  submitted_by VARCHAR(42)
);

-- Index for searching by contract name
CREATE INDEX IF NOT EXISTS idx_verified_contracts_name
  ON verified_contracts(contract_name);

-- Index for ordering by verification time
CREATE INDEX IF NOT EXISTS idx_verified_contracts_verified_at
  ON verified_contracts(verified_at DESC);

-- Add comment to table
COMMENT ON TABLE verified_contracts IS 'Stores locally verified smart contracts via Blockscout verifier';
