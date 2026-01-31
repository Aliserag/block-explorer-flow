// Contract verification via Sourcify + local Blockscout verifier
// Note: Flow EVM (chain ID 747) is not yet supported by Sourcify.
// We use a local Blockscout verifier for Flow contracts.

// Dynamic import for server-side only DB operations
async function getLocalVerifiedContract(address: string) {
  // Only import the DB module server-side
  if (typeof window !== 'undefined') {
    return null; // Client-side: skip local DB check
  }
  const { getVerifiedContract } = await import('./verified-contracts-db');
  return getVerifiedContract(address);
}

const SOURCIFY_API = 'https://sourcify.dev/server';
const FLOW_MAINNET_CHAIN_ID = 747;

export type VerificationStatus = 'full' | 'partial' | 'none';

export interface VerifiedContract {
  name: string;
  compiler: string;
  sources: Record<string, string>; // filename -> source code
  abi: any[];
}

/**
 * Check if a contract is verified (local DB first, then Sourcify fallback)
 */
export async function checkVerification(address: string): Promise<VerificationStatus> {
  // 1. Check local verified_contracts table first
  try {
    const localContract = await getLocalVerifiedContract(address);
    if (localContract) {
      return localContract.matchType === 'partial' ? 'partial' : 'full';
    }
  } catch (error) {
    console.debug('Local verification check failed, trying Sourcify:', error);
  }

  // 2. Fall back to Sourcify (returns 'none' for Flow as it's not supported)
  try {
    const response = await fetch(
      `${SOURCIFY_API}/check-by-addresses?addresses=${address}&chainIds=${FLOW_MAINNET_CHAIN_ID}`,
      {
        next: { revalidate: 60 },
        signal: AbortSignal.timeout(5000),
      }
    );

    if (!response.ok) {
      return 'none';
    }

    const data = await response.json();

    if (!data || !Array.isArray(data) || data.length === 0) {
      return 'none';
    }

    const result = data[0];
    if (!result.chainIds || !Array.isArray(result.chainIds)) {
      return 'none';
    }

    const chainInfo = result.chainIds.find(
      (c: { chainId: string; status: string }) => c.chainId === String(FLOW_MAINNET_CHAIN_ID)
    );

    if (!chainInfo) {
      return 'none';
    }

    if (chainInfo.status === 'perfect' || chainInfo.status === 'full') {
      return 'full';
    }

    if (chainInfo.status === 'partial') {
      return 'partial';
    }

    return 'none';
  } catch (error) {
    console.debug('Sourcify verification check failed:', error);
    return 'none';
  }
}

/**
 * Get verified source files (local DB first, then Sourcify fallback)
 */
export async function getVerifiedSources(address: string): Promise<VerifiedContract | null> {
  // 1. Check local verified_contracts table first
  try {
    const localContract = await getLocalVerifiedContract(address);
    if (localContract) {
      return {
        name: localContract.contractName,
        compiler: `solc ${localContract.compilerVersion}`,
        sources: localContract.sourceFiles,
        abi: localContract.abi,
      };
    }
  } catch (error) {
    console.debug('Local sources fetch failed, trying Sourcify:', error);
  }

  // 2. Fall back to Sourcify
  try {
    const response = await fetch(
      `${SOURCIFY_API}/files/${FLOW_MAINNET_CHAIN_ID}/${address}`,
      {
        next: { revalidate: 300 },
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!response.ok) {
      return null;
    }

    const files = await response.json();

    if (!files || !Array.isArray(files)) {
      return null;
    }

    const sources: Record<string, string> = {};
    let abi: any[] = [];
    let contractName = '';
    let compiler = '';

    for (const file of files) {
      if (file.name === 'metadata.json') {
        try {
          const metadata = JSON.parse(file.content);

          if (metadata.compiler?.version) {
            compiler = `solc ${metadata.compiler.version}`;
          }

          if (metadata.settings?.compilationTarget) {
            const targets = Object.values(metadata.settings.compilationTarget);
            if (targets.length > 0) {
              contractName = targets[0] as string;
            }
          }

          if (metadata.output?.abi) {
            abi = metadata.output.abi;
          }
        } catch {
          // Ignore metadata parsing errors
        }
      } else if (file.name.endsWith('.sol')) {
        const cleanPath = file.path?.replace(/^.*\/sources\//, '') || file.name;
        sources[cleanPath] = file.content;
      }
    }

    if (abi.length === 0) {
      const abiFile = files.find((f: { name: string }) => f.name.endsWith('.json') && f.name !== 'metadata.json');
      if (abiFile) {
        try {
          abi = JSON.parse(abiFile.content);
        } catch {
          // Ignore ABI parsing errors
        }
      }
    }

    if (Object.keys(sources).length === 0) {
      return null;
    }

    return {
      name: contractName || 'Unknown Contract',
      compiler: compiler || 'Unknown Compiler',
      sources,
      abi,
    };
  } catch (error) {
    console.debug('Sourcify sources fetch failed:', error);
    return null;
  }
}

/**
 * Get just the ABI for a contract
 */
export async function getContractABI(address: string): Promise<any[] | null> {
  try {
    const contract = await getVerifiedSources(address);
    return contract?.abi ?? null;
  } catch {
    return null;
  }
}
