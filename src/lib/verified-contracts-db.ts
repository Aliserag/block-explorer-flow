// Database operations for verified contracts
// Uses the Ponder PostgreSQL database with a separate table

import { Pool } from 'pg';

// Lazy initialization of database pool
let pool: Pool | null = null;

function getPool(): Pool | null {
  if (!pool) {
    const databaseUrl = process.env.VERIFIED_CONTRACTS_DATABASE_URL || process.env.DATABASE_URL;

    if (!databaseUrl) {
      // Silently return null if database not configured (local dev without DB)
      return null;
    }

    pool = new Pool({
      connectionString: databaseUrl,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  }
  return pool;
}

export interface VerifiedContractRecord {
  address: string;
  contractName: string;
  compilerVersion: string;
  optimizationEnabled: boolean;
  optimizationRuns: number | null;
  evmVersion: string | null;
  sourceFiles: Record<string, string>;
  abi: any[];
  constructorArgs: string | null;
  matchType: 'full' | 'partial';
  verifiedAt: Date;
  submittedBy: string | null;
}

/**
 * Check if a contract is verified in the local database
 */
export async function isContractVerified(address: string): Promise<boolean> {
  try {
    const db = getPool();
    if (!db) return false;

    const result = await db.query(
      'SELECT 1 FROM verified_contracts WHERE LOWER(address) = LOWER($1)',
      [address]
    );
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error checking contract verification:', error);
    return false;
  }
}

/**
 * Get verified contract details from local database
 */
export async function getVerifiedContract(address: string): Promise<VerifiedContractRecord | null> {
  try {
    const db = getPool();
    if (!db) return null;

    const result = await db.query(
      `SELECT
        address,
        contract_name as "contractName",
        compiler_version as "compilerVersion",
        optimization_enabled as "optimizationEnabled",
        optimization_runs as "optimizationRuns",
        evm_version as "evmVersion",
        source_files as "sourceFiles",
        abi,
        constructor_args as "constructorArgs",
        match_type as "matchType",
        verified_at as "verifiedAt",
        submitted_by as "submittedBy"
      FROM verified_contracts
      WHERE LOWER(address) = LOWER($1)`,
      [address]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0] as VerifiedContractRecord;
  } catch (error) {
    console.error('Error getting verified contract:', error);
    return null;
  }
}

/**
 * Store a newly verified contract
 */
export async function storeVerifiedContract(contract: {
  address: string;
  contractName: string;
  compilerVersion: string;
  optimizationEnabled?: boolean;
  optimizationRuns?: number | null;
  evmVersion?: string | null;
  sourceFiles: Record<string, string>;
  abi: any[];
  constructorArgs?: string | null;
  matchType?: 'full' | 'partial';
  submittedBy?: string | null;
}): Promise<boolean> {
  try {
    const db = getPool();
    if (!db) return false;

    await db.query(
      `INSERT INTO verified_contracts (
        address,
        contract_name,
        compiler_version,
        optimization_enabled,
        optimization_runs,
        evm_version,
        source_files,
        abi,
        constructor_args,
        match_type,
        submitted_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (address) DO UPDATE SET
        contract_name = EXCLUDED.contract_name,
        compiler_version = EXCLUDED.compiler_version,
        optimization_enabled = EXCLUDED.optimization_enabled,
        optimization_runs = EXCLUDED.optimization_runs,
        evm_version = EXCLUDED.evm_version,
        source_files = EXCLUDED.source_files,
        abi = EXCLUDED.abi,
        constructor_args = EXCLUDED.constructor_args,
        match_type = EXCLUDED.match_type,
        verified_at = NOW(),
        submitted_by = EXCLUDED.submitted_by`,
      [
        contract.address.toLowerCase(),
        contract.contractName,
        contract.compilerVersion,
        contract.optimizationEnabled ?? false,
        contract.optimizationRuns ?? null,
        contract.evmVersion ?? null,
        JSON.stringify(contract.sourceFiles),
        JSON.stringify(contract.abi),
        contract.constructorArgs ?? null,
        contract.matchType ?? 'full',
        contract.submittedBy ?? null,
      ]
    );
    return true;
  } catch (error) {
    console.error('Error storing verified contract:', error);
    return false;
  }
}

/**
 * Delete a verified contract (for re-verification)
 */
export async function deleteVerifiedContract(address: string): Promise<boolean> {
  try {
    const db = getPool();
    if (!db) return false;

    await db.query(
      'DELETE FROM verified_contracts WHERE LOWER(address) = LOWER($1)',
      [address]
    );
    return true;
  } catch (error) {
    console.error('Error deleting verified contract:', error);
    return false;
  }
}

/**
 * Get recently verified contracts
 */
export async function getRecentlyVerifiedContracts(limit: number = 10): Promise<VerifiedContractRecord[]> {
  try {
    const db = getPool();
    if (!db) return [];

    const result = await db.query(
      `SELECT
        address,
        contract_name as "contractName",
        compiler_version as "compilerVersion",
        optimization_enabled as "optimizationEnabled",
        optimization_runs as "optimizationRuns",
        evm_version as "evmVersion",
        source_files as "sourceFiles",
        abi,
        constructor_args as "constructorArgs",
        match_type as "matchType",
        verified_at as "verifiedAt",
        submitted_by as "submittedBy"
      FROM verified_contracts
      ORDER BY verified_at DESC
      LIMIT $1`,
      [limit]
    );
    return result.rows;
  } catch (error) {
    console.error('Error getting recently verified contracts:', error);
    return [];
  }
}

/**
 * Initialize the verified_contracts table if it doesn't exist
 */
export async function initializeVerifiedContractsTable(): Promise<boolean> {
  try {
    const db = getPool();
    if (!db) return false;

    await db.query(`
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

      CREATE INDEX IF NOT EXISTS idx_verified_contracts_name
        ON verified_contracts(contract_name);

      CREATE INDEX IF NOT EXISTS idx_verified_contracts_verified_at
        ON verified_contracts(verified_at DESC);
    `);
    return true;
  } catch (error) {
    console.error('Error initializing verified_contracts table:', error);
    return false;
  }
}
