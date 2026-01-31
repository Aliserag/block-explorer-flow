// Blockscout Smart Contract Verifier Integration
// https://github.com/blockscout/blockscout-rs/tree/main/smart-contract-verifier

const VERIFIER_URL = process.env.BLOCKSCOUT_VERIFIER_URL || '';

export interface VerifyRequest {
  bytecode: string;
  bytecodeType: 'DEPLOYED_BYTECODE' | 'CREATION_INPUT';
  compilerVersion: string;
  sourceFiles: Record<string, string>;
  evmVersion?: string;
  optimizationRuns?: number | null;
  libraries?: Record<string, string>;
}

export interface VerifyResponse {
  status: 'success' | 'failure';
  message?: string;
  sources?: Record<string, { content: string }>;
  compilationArtifacts?: {
    abi: any[];
    constructorArguments?: string;
    sources?: Record<string, any>;
  };
  matchType?: 'full' | 'partial';
}

export interface CompilerVersion {
  version: string;
  longVersion: string;
}

/**
 * Verify a Solidity contract using Blockscout verifier
 */
export async function verifyContract(req: VerifyRequest): Promise<VerifyResponse> {
  if (!VERIFIER_URL) {
    return { status: 'failure', message: 'Verifier service not configured' };
  }

  try {
    // Blockscout verifier expects the request in a specific format
    const requestBody = {
      bytecode: req.bytecode,
      bytecodeType: req.bytecodeType,
      compilerVersion: req.compilerVersion,
      sourceFiles: req.sourceFiles,
      evmVersion: req.evmVersion || 'default',
      optimizationRuns: req.optimizationRuns,
      libraries: req.libraries || {},
    };

    const response = await fetch(`${VERIFIER_URL}/api/v2/verifier/solidity/sources:verify-multi-part`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(60000), // 60 second timeout for compilation
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Verifier error response:', errorText);
      return {
        status: 'failure',
        message: `Verification failed: ${response.status} ${response.statusText}`,
      };
    }

    const data = await response.json();

    // Blockscout verifier returns sources and compilation artifacts on success
    if (data.sources || data.compilationArtifacts) {
      return {
        status: 'success',
        sources: data.sources,
        compilationArtifacts: data.compilationArtifacts,
        matchType: data.matchType || 'full',
      };
    }

    // Check for error message in response
    if (data.message || data.error) {
      return {
        status: 'failure',
        message: data.message || data.error,
      };
    }

    return {
      status: 'failure',
      message: 'Unknown verification error',
    };
  } catch (error) {
    console.error('Verifier request failed:', error);
    return {
      status: 'failure',
      message: error instanceof Error ? error.message : 'Failed to connect to verifier service',
    };
  }
}

/**
 * Verify a Solidity contract using standard JSON input
 */
export async function verifyContractStandardJson(
  bytecode: string,
  compilerVersion: string,
  standardJsonInput: string
): Promise<VerifyResponse> {
  if (!VERIFIER_URL) {
    return { status: 'failure', message: 'Verifier service not configured' };
  }

  try {
    const response = await fetch(`${VERIFIER_URL}/api/v2/verifier/solidity/sources:verify-standard-json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        bytecode,
        bytecodeType: 'DEPLOYED_BYTECODE',
        compilerVersion,
        input: standardJsonInput,
      }),
      signal: AbortSignal.timeout(60000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Verifier error response:', errorText);
      return {
        status: 'failure',
        message: `Verification failed: ${response.status} ${response.statusText}`,
      };
    }

    const data = await response.json();

    if (data.sources || data.compilationArtifacts) {
      return {
        status: 'success',
        sources: data.sources,
        compilationArtifacts: data.compilationArtifacts,
        matchType: data.matchType || 'full',
      };
    }

    return {
      status: 'failure',
      message: data.message || data.error || 'Unknown verification error',
    };
  } catch (error) {
    console.error('Verifier request failed:', error);
    return {
      status: 'failure',
      message: error instanceof Error ? error.message : 'Failed to connect to verifier service',
    };
  }
}

/**
 * Get list of available Solidity compiler versions
 */
export async function getCompilerVersions(): Promise<string[]> {
  if (!VERIFIER_URL) {
    console.warn('Verifier URL not configured');
    return [];
  }

  try {
    const response = await fetch(`${VERIFIER_URL}/api/v2/verifier/solidity/versions`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      next: { revalidate: 3600 }, // Cache for 1 hour
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      console.error('Failed to fetch compiler versions:', response.status);
      return [];
    }

    const data = await response.json();

    // Response format: { compilerVersions: ["v0.8.24+commit...", ...] }
    if (data.compilerVersions && Array.isArray(data.compilerVersions)) {
      return data.compilerVersions;
    }

    // Alternative format: array of version objects
    if (Array.isArray(data)) {
      return data.map((v: CompilerVersion | string) =>
        typeof v === 'string' ? v : v.version
      );
    }

    return [];
  } catch (error) {
    console.error('Failed to fetch compiler versions:', error);
    return [];
  }
}

/**
 * Get list of available Vyper compiler versions
 */
export async function getVyperVersions(): Promise<string[]> {
  if (!VERIFIER_URL) {
    return [];
  }

  try {
    const response = await fetch(`${VERIFIER_URL}/api/v2/verifier/vyper/versions`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();

    if (data.compilerVersions && Array.isArray(data.compilerVersions)) {
      return data.compilerVersions;
    }

    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Failed to fetch Vyper versions:', error);
    return [];
  }
}

/**
 * Check if the verifier service is healthy
 */
export async function checkVerifierHealth(): Promise<boolean> {
  if (!VERIFIER_URL) {
    return false;
  }

  try {
    const response = await fetch(`${VERIFIER_URL}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}
