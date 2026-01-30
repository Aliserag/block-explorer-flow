import { NextRequest, NextResponse } from "next/server";
import { getBlocks, getLatestBlockNumber, getBlock } from "@/lib/rpc";
import { isPonderAvailable } from "@/lib/ponder";

export const dynamic = "force-dynamic";

// Time ranges in seconds
const TIME_RANGES = {
  "1h": 60 * 60,
  "24h": 24 * 60 * 60,
  "7d": 7 * 24 * 60 * 60,
  "30d": 30 * 24 * 60 * 60,
} as const;

// Estimated blocks per second on Flow EVM (~1 block/sec)
const BLOCKS_PER_SECOND = 1;

// Max blocks we can reasonably fetch via RPC (increased for better data)
const MAX_RPC_BLOCKS = 1000;

// Minimum data points for charts
const MIN_CHART_POINTS = 10;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const range = (searchParams.get("range") as keyof typeof TIME_RANGES) || "24h";

    const timeRange = TIME_RANGES[range] || TIME_RANGES["24h"];
    const latestBlockNumber = await getLatestBlockNumber();

    // Calculate how many blocks we need
    const estimatedBlocks = Math.min(
      timeRange * BLOCKS_PER_SECOND,
      MAX_RPC_BLOCKS
    );

    // Fetch blocks
    const blocks = await getBlocks(latestBlockNumber, estimatedBlocks);

    if (blocks.length < 2) {
      return NextResponse.json({ error: "Not enough blocks" }, { status: 500 });
    }

    // Sort blocks by timestamp descending
    const sortedBlocks = blocks.sort((a, b) =>
      Number(b.timestamp) - Number(a.timestamp)
    );

    // Get the actual time range we have data for
    const newestTimestamp = Number(sortedBlocks[0].timestamp);
    const oldestTimestamp = Number(sortedBlocks[sortedBlocks.length - 1].timestamp);
    const actualTimeSpan = newestTimestamp - oldestTimestamp;

    // Filter blocks within the requested time range
    const cutoffTime = newestTimestamp - timeRange;
    const filteredBlocks = sortedBlocks.filter(
      (b) => Number(b.timestamp) >= cutoffTime
    );

    // Calculate aggregate statistics
    let totalGasUsed = BigInt(0);
    let totalTransactions = 0;
    let totalValue = BigInt(0);
    const uniqueAddresses = new Set<string>();
    const blockTimes: number[] = [];

    for (let i = 0; i < filteredBlocks.length; i++) {
      const block = filteredBlocks[i];
      totalGasUsed += block.gasUsed;

      const txCount = block.transactions?.length ?? 0;
      totalTransactions += txCount;

      // Track unique addresses and value from transactions
      if (block.transactions) {
        for (const tx of block.transactions) {
          const txObj = tx as { from?: string; to?: string; value?: bigint };
          if (typeof tx === "object" && tx !== null) {
            if (txObj.from) uniqueAddresses.add(txObj.from.toLowerCase());
            if (txObj.to) uniqueAddresses.add(txObj.to.toLowerCase());
            if (txObj.value) totalValue += BigInt(txObj.value);
          }
        }
      }

      // Calculate block time
      if (i < filteredBlocks.length - 1) {
        const nextBlock = filteredBlocks[i + 1];
        const blockTime = Number(block.timestamp) - Number(nextBlock.timestamp);
        blockTimes.push(blockTime);
      }
    }

    const avgBlockTime = blockTimes.length > 0
      ? blockTimes.reduce((a, b) => a + b, 0) / blockTimes.length
      : 0;

    const avgGasUsed = filteredBlocks.length > 0
      ? totalGasUsed / BigInt(filteredBlocks.length)
      : BigInt(0);

    // Calculate TPS
    const dataTimeSpan = filteredBlocks.length > 1
      ? Number(filteredBlocks[0].timestamp) - Number(filteredBlocks[filteredBlocks.length - 1].timestamp)
      : 1;
    const tps = dataTimeSpan > 0 ? totalTransactions / dataTimeSpan : 0;

    // Determine bucket size based on ACTUAL data span, not requested range
    // This ensures we always have meaningful chart data
    let bucketSize: number;
    let bucketLabel: string;

    // Calculate ideal bucket size to get ~10-20 data points
    const idealBucketSize = Math.max(30, Math.floor(actualTimeSpan / MIN_CHART_POINTS));

    if (idealBucketSize <= 60) {
      bucketSize = 30; // 30 seconds
      bucketLabel = "30s";
    } else if (idealBucketSize <= 300) {
      bucketSize = 60; // 1 minute
      bucketLabel = "1min";
    } else if (idealBucketSize <= 600) {
      bucketSize = 5 * 60; // 5 minutes
      bucketLabel = "5min";
    } else if (idealBucketSize <= 1800) {
      bucketSize = 15 * 60; // 15 minutes
      bucketLabel = "15min";
    } else if (idealBucketSize <= 3600) {
      bucketSize = 30 * 60; // 30 minutes
      bucketLabel = "30min";
    } else {
      bucketSize = 60 * 60; // 1 hour
      bucketLabel = "hour";
    }

    // Group data into time buckets for charts
    const buckets = new Map<number, {
      transactions: number;
      gasUsed: bigint;
      blockCount: number;
      value: bigint;
    }>();

    for (const block of filteredBlocks) {
      const timestamp = Number(block.timestamp);
      const bucketKey = Math.floor(timestamp / bucketSize) * bucketSize;

      const existing = buckets.get(bucketKey) || {
        transactions: 0,
        gasUsed: BigInt(0),
        blockCount: 0,
        value: BigInt(0),
      };

      existing.transactions += block.transactions?.length ?? 0;
      existing.gasUsed += block.gasUsed;
      existing.blockCount += 1;

      if (block.transactions) {
        for (const tx of block.transactions) {
          const txObj = tx as { value?: bigint };
          if (typeof tx === "object" && txObj?.value) {
            existing.value += BigInt(txObj.value);
          }
        }
      }

      buckets.set(bucketKey, existing);
    }

    // Convert to arrays sorted by time
    const sortedBuckets = Array.from(buckets.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([timestamp, data], index) => ({
        timestamp,
        time: new Date(timestamp * 1000).toISOString(),
        transactions: data.transactions,
        gasUsed: Number(data.gasUsed) / 1e6, // in millions
        blockCount: data.blockCount,
        value: Number(data.value) / 1e18, // in FLOW
        index,
      }));

    // Calculate percentage changes (mock for now since we don't have previous period)
    const txChange = 0; // Would compare to previous period
    const gasChange = 0;
    const valueChange = 0;

    // Check Ponder availability for more data
    const ponderAvailable = await isPonderAvailable();

    return NextResponse.json({
      meta: {
        range,
        rangeLabel: getRangeLabel(range),
        actualTimeSpan,
        blocksAnalyzed: filteredBlocks.length,
        maxBlocks: MAX_RPC_BLOCKS,
        dataLimited: filteredBlocks.length >= MAX_RPC_BLOCKS,
        ponderAvailable,
        lastUpdated: new Date().toISOString(),
      },
      stats: {
        latestBlock: latestBlockNumber.toString(),
        totalTransactions,
        totalBlocks: filteredBlocks.length,
        uniqueAddresses: uniqueAddresses.size,
        totalValue: (Number(totalValue) / 1e18).toFixed(4),
        avgBlockTime: avgBlockTime.toFixed(2),
        avgGasUsed: avgGasUsed.toString(),
        tps: tps.toFixed(3),
        avgTxPerBlock: filteredBlocks.length > 0
          ? (totalTransactions / filteredBlocks.length).toFixed(2)
          : "0",
      },
      changes: {
        transactions: txChange,
        gas: gasChange,
        value: valueChange,
      },
      charts: {
        bucketLabel,
        transactions: sortedBuckets.map((b) => ({
          time: formatChartTime(b.timestamp, range),
          timestamp: b.timestamp,
          value: b.transactions,
        })),
        gasUsage: sortedBuckets.map((b) => ({
          time: formatChartTime(b.timestamp, range),
          timestamp: b.timestamp,
          value: b.gasUsed,
        })),
        volume: sortedBuckets.map((b) => ({
          time: formatChartTime(b.timestamp, range),
          timestamp: b.timestamp,
          value: b.value,
        })),
        blockActivity: sortedBuckets.map((b) => ({
          time: formatChartTime(b.timestamp, range),
          timestamp: b.timestamp,
          value: b.blockCount,
        })),
      },
    });
  } catch (error) {
    console.error("Analytics error:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}

function getRangeLabel(range: string): string {
  switch (range) {
    case "1h": return "Last Hour";
    case "24h": return "Last 24 Hours";
    case "7d": return "Last 7 Days";
    case "30d": return "Last 30 Days";
    default: return "Last 24 Hours";
  }
}

function formatChartTime(timestamp: number, range: string): string {
  const date = new Date(timestamp * 1000);

  if (range === "1h" || range === "24h") {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    });
  } else if (range === "7d") {
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      hour: "2-digit",
      hour12: false
    });
  } else {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric"
    });
  }
}
