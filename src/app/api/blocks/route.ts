import { NextResponse } from "next/server";
import { getBlocks, getLatestBlockNumber, formatBlock } from "@/lib/rpc";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    // Pagination params
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const pageSize = Math.min(Math.max(1, parseInt(searchParams.get("pageSize") || "25")), 100);

    // Legacy support for limit param
    const legacyLimit = searchParams.get("limit");

    const latestBlockNumber = await getLatestBlockNumber();

    if (legacyLimit) {
      // Legacy behavior for backwards compatibility
      const limit = Math.min(parseInt(legacyLimit), 50);
      const blocks = await getBlocks(latestBlockNumber, limit);
      const formattedBlocks = blocks.map(formatBlock);

      return NextResponse.json({
        blocks: formattedBlocks,
        latestBlock: latestBlockNumber.toString(),
      });
    }

    // Calculate pagination
    const totalBlocks = Number(latestBlockNumber) + 1; // Blocks start at 0
    const totalPages = Math.ceil(totalBlocks / pageSize);

    // Calculate which blocks to fetch
    // Page 1 = most recent blocks, page 2 = older blocks, etc.
    const startBlock = latestBlockNumber - BigInt((page - 1) * pageSize);
    const endBlockNum = Math.max(0, Number(startBlock) - pageSize + 1);

    const blocks = await getBlocks(startBlock, pageSize);
    const formattedBlocks = blocks.map(formatBlock);

    // Calculate display info
    const fromBlock = Math.max(0, Number(startBlock) - pageSize + 1);
    const toBlock = Number(startBlock);

    return NextResponse.json({
      blocks: formattedBlocks,
      latestBlock: latestBlockNumber.toString(),
      pagination: {
        currentPage: page,
        pageSize,
        totalPages,
        totalBlocks,
        fromBlock,
        toBlock,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching blocks:", error);
    return NextResponse.json({ error: "Failed to fetch blocks" }, { status: 500 });
  }
}
