import { NextRequest, NextResponse } from 'next/server';
import { verifyContract } from '@/lib/blockscout-verifier';
import { storeVerifiedContract, initializeVerifiedContractsTable } from '@/lib/verified-contracts-db';
import { createPublicClient, http, getAddress, isAddress } from 'viem';
import { chains, isValidNetwork, type NetworkId } from '@/lib/chains';

// Network-specific RPC URLs
function getRpcUrl(network: NetworkId): string {
  if (network === 'testnet') {
    return chains.testnet.rpcUrls.default.http[0];
  }
  return process.env.NEXT_PUBLIC_FLOW_RPC_URL || chains.mainnet.rpcUrls.default.http[0];
}

export const dynamic = 'force-dynamic';

interface VerifyRequestBody {
  address: string;
  compilerVersion: string;
  sourceFiles: Record<string, string>;
  contractName: string;
  optimizationEnabled?: boolean;
  optimizationRuns?: number;
  evmVersion?: string;
  constructorArgs?: string;
  libraries?: Record<string, string>;
  network?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: VerifyRequestBody = await request.json();

    // Validate required fields
    if (!body.address || !body.compilerVersion || !body.sourceFiles || !body.contractName) {
      return NextResponse.json(
        { error: 'Missing required fields: address, compilerVersion, sourceFiles, contractName' },
        { status: 400 }
      );
    }

    // Validate address format
    if (!isAddress(body.address)) {
      return NextResponse.json(
        { error: 'Invalid contract address format' },
        { status: 400 }
      );
    }

    const checksumAddress = getAddress(body.address);

    // Network param (defaults to mainnet)
    const network: NetworkId = isValidNetwork(body.network || '') ? (body.network as NetworkId) : 'mainnet';

    // Validate source files
    if (Object.keys(body.sourceFiles).length === 0) {
      return NextResponse.json(
        { error: 'At least one source file is required' },
        { status: 400 }
      );
    }

    // Fetch the deployed bytecode from the chain using network-specific RPC
    const client = createPublicClient({
      transport: http(getRpcUrl(network)),
    });

    const deployedBytecode = await client.getCode({ address: checksumAddress });

    if (!deployedBytecode || deployedBytecode === '0x') {
      return NextResponse.json(
        { error: 'No bytecode found at this address. Is it a contract?' },
        { status: 400 }
      );
    }

    // Call the Blockscout verifier
    const verifyResult = await verifyContract({
      bytecode: deployedBytecode,
      bytecodeType: 'DEPLOYED_BYTECODE',
      compilerVersion: body.compilerVersion,
      sourceFiles: body.sourceFiles,
      evmVersion: body.evmVersion,
      optimizationRuns: body.optimizationEnabled ? (body.optimizationRuns ?? 200) : null,
      libraries: body.libraries,
    });

    if (verifyResult.status !== 'success') {
      return NextResponse.json(
        {
          error: 'Verification failed',
          message: verifyResult.message || 'Bytecode does not match compiled source',
        },
        { status: 400 }
      );
    }

    // Extract ABI from compilation artifacts
    const abi = verifyResult.compilationArtifacts?.abi || [];

    // Ensure the verified_contracts table exists
    await initializeVerifiedContractsTable();

    // Store in our local database
    const stored = await storeVerifiedContract({
      address: checksumAddress,
      contractName: body.contractName,
      compilerVersion: body.compilerVersion,
      optimizationEnabled: body.optimizationEnabled ?? false,
      optimizationRuns: body.optimizationRuns ?? null,
      evmVersion: body.evmVersion ?? null,
      sourceFiles: body.sourceFiles,
      abi,
      constructorArgs: body.constructorArgs ?? null,
      matchType: verifyResult.matchType || 'full',
      submittedBy: null, // Could add wallet signature verification later
    });

    if (!stored) {
      return NextResponse.json(
        { error: 'Verification succeeded but failed to store in database' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      address: checksumAddress,
      contractName: body.contractName,
      matchType: verifyResult.matchType || 'full',
      message: 'Contract verified successfully',
    });
  } catch (error) {
    console.error('Verification error:', error);

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
