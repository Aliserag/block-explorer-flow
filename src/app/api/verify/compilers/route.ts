import { NextResponse } from 'next/server';
import { getCompilerVersions } from '@/lib/blockscout-verifier';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const versions = await getCompilerVersions();

    if (versions.length === 0) {
      return NextResponse.json(
        { error: 'Failed to fetch compiler versions or verifier not configured' },
        { status: 503 }
      );
    }

    return NextResponse.json({ versions });
  } catch (error) {
    console.error('Error fetching compiler versions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
