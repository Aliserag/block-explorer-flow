import { NextResponse } from "next/server";
import { getBlocks, getLatestBlockNumber, formatBlock } from "@/lib/rpc";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 50);

    const latestBlockNumber = await getLatestBlockNumber();
    const blocks = await getBlocks(latestBlockNumber, limit);
    const formattedBlocks = blocks.map(formatBlock);

    return NextResponse.json({
      blocks: formattedBlocks,
      latestBlock: latestBlockNumber.toString(),
    });
  } catch (error) {
    console.error("Error fetching blocks:", error);
    return NextResponse.json({ error: "Failed to fetch blocks" }, { status: 500 });
  }
}
