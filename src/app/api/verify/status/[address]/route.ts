import { NextRequest, NextResponse } from 'next/server';
import { getVerifiedContract } from '@/lib/verified-contracts-db';
import { isAddress, getAddress } from 'viem';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await params;

    if (!address || !isAddress(address)) {
      return NextResponse.json(
        { error: 'Invalid address format' },
        { status: 400 }
      );
    }

    const checksumAddress = getAddress(address);
    const contract = await getVerifiedContract(checksumAddress);

    if (!contract) {
      return NextResponse.json({
        verified: false,
        address: checksumAddress,
      });
    }

    return NextResponse.json({
      verified: true,
      address: checksumAddress,
      contractName: contract.contractName,
      compilerVersion: contract.compilerVersion,
      optimizationEnabled: contract.optimizationEnabled,
      optimizationRuns: contract.optimizationRuns,
      evmVersion: contract.evmVersion,
      matchType: contract.matchType,
      verifiedAt: contract.verifiedAt,
      sourceFileCount: Object.keys(contract.sourceFiles).length,
      abiItemCount: contract.abi.length,
    });
  } catch (error) {
    console.error('Error checking verification status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
