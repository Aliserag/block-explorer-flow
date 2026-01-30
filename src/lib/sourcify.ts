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
 * Check if a contract is verified on Sourcify
 */
export async function checkVerification(address: string): Promise<VerificationStatus> {
  try {
    const response = await fetch(
      `${SOURCIFY_API}/check-by-addresses?addresses=${address}&chainIds=${FLOW_MAINNET_CHAIN_ID}`,
      { next: { revalidate: 60 } }
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
    console.error('Error checking Sourcify verification:', error);
    return 'none';
  }
}

/**
 * Get verified source files from Sourcify
 */
export async function getVerifiedSources(address: string): Promise<VerifiedContract | null> {
  try {
    const response = await fetch(
      `${SOURCIFY_API}/files/${FLOW_MAINNET_CHAIN_ID}/${address}`,
      { next: { revalidate: 300 } }
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

          // Extract compiler version
          if (metadata.compiler?.version) {
            compiler = `solc ${metadata.compiler.version}`;
          }

          // Extract contract name from compilation target
          if (metadata.settings?.compilationTarget) {
            const targets = Object.values(metadata.settings.compilationTarget);
            if (targets.length > 0) {
              contractName = targets[0] as string;
            }
          }

          // Extract ABI
          if (metadata.output?.abi) {
            abi = metadata.output.abi;
          }
        } catch {
          // Ignore metadata parsing errors
        }
      } else if (file.name.endsWith('.sol')) {
        // Store source file with clean path
        const cleanPath = file.path?.replace(/^.*\/sources\//, '') || file.name;
        sources[cleanPath] = file.content;
      }
    }

    // If we didn't find ABI in metadata, look for a separate JSON file
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
    console.error('Error fetching verified sources:', error);
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
