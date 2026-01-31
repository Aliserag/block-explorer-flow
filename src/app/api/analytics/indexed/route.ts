import { NextResponse } from "next/server";
import {
  getDailyStats,
  getHourlyStats,
  getRecentContracts,
  isPonderAvailable,
  getPonderSyncStatus,
} from "@/lib/ponder";
import { isValidNetwork, type NetworkId } from "@/lib/chains";

export const dynamic = "force-dynamic";

interface AnalyticsResponse {
  available: boolean;
  synced: boolean;
  latestIndexedBlock: string | null;
  range: string;
  stats: {
    totalTransactions: number;
    totalBlocks: number;
    totalContractsDeployed: number;
    totalTokenTransfers: number;
    avgTxPerBlock: number;
    avgGasPrice: string;
  };
  timeSeries: Array<{
    period: string;
    transactionCount: number;
    blockCount: number;
    contractsDeployed: number;
    tokenTransferCount: number;
    totalGasUsed: string;
    avgGasPrice: string;
  }>;
  recentContracts: Array<{
    address: string;
    deployer: string;
    txHash: string;
    blockNumber: string;
    timestamp: string;
  }>;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const range = searchParams.get("range") || "24h";

  // Network param (defaults to mainnet)
  const networkParam = searchParams.get("network") || "mainnet";
  const network: NetworkId = isValidNetwork(networkParam) ? networkParam : "mainnet";

  // For testnet, indexed data is not available (Ponder only runs on mainnet)
  if (network === "testnet") {
    return NextResponse.json<AnalyticsResponse>({
      available: false,
      synced: false,
      latestIndexedBlock: null,
      range,
      stats: {
        totalTransactions: 0,
        totalBlocks: 0,
        totalContractsDeployed: 0,
        totalTokenTransfers: 0,
        avgTxPerBlock: 0,
        avgGasPrice: "0",
      },
      timeSeries: [],
      recentContracts: [],
    });
  }

  // Check if Ponder is available
  const ponderAvailable = await isPonderAvailable();

  if (!ponderAvailable) {
    return NextResponse.json<AnalyticsResponse>({
      available: false,
      synced: false,
      latestIndexedBlock: null,
      range,
      stats: {
        totalTransactions: 0,
        totalBlocks: 0,
        totalContractsDeployed: 0,
        totalTokenTransfers: 0,
        avgTxPerBlock: 0,
        avgGasPrice: "0",
      },
      timeSeries: [],
      recentContracts: [],
    });
  }

  try {
    // Get sync status
    const syncStatus = await getPonderSyncStatus();

    // Determine how much data to fetch based on range
    let timeSeries: Array<{
      period: string;
      transactionCount: number;
      blockCount: number;
      contractsDeployed: number;
      tokenTransferCount: number;
      totalGasUsed: string;
      avgGasPrice: string;
    }>;

    if (range === "1h") {
      // Get last hour of hourly stats (we might not have minute granularity)
      const hourlyData = await getHourlyStats(1);
      timeSeries = hourlyData.map((h) => ({
        period: h.hour,
        transactionCount: h.transactionCount,
        blockCount: h.blockCount,
        contractsDeployed: h.contractsDeployed,
        tokenTransferCount: h.tokenTransferCount,
        totalGasUsed: h.totalGasUsed,
        avgGasPrice: h.avgGasPrice,
      }));
    } else if (range === "24h") {
      const hourlyData = await getHourlyStats(24);
      timeSeries = hourlyData.map((h) => ({
        period: h.hour,
        transactionCount: h.transactionCount,
        blockCount: h.blockCount,
        contractsDeployed: h.contractsDeployed,
        tokenTransferCount: h.tokenTransferCount,
        totalGasUsed: h.totalGasUsed,
        avgGasPrice: h.avgGasPrice,
      }));
    } else if (range === "7d") {
      const dailyData = await getDailyStats(7);
      timeSeries = dailyData.map((d) => ({
        period: d.date,
        transactionCount: d.transactionCount,
        blockCount: d.blockCount,
        contractsDeployed: d.contractsDeployed,
        tokenTransferCount: d.tokenTransferCount,
        totalGasUsed: d.totalGasUsed,
        avgGasPrice: d.avgGasPrice,
      }));
    } else {
      // 30d default
      const dailyData = await getDailyStats(30);
      timeSeries = dailyData.map((d) => ({
        period: d.date,
        transactionCount: d.transactionCount,
        blockCount: d.blockCount,
        contractsDeployed: d.contractsDeployed,
        tokenTransferCount: d.tokenTransferCount,
        totalGasUsed: d.totalGasUsed,
        avgGasPrice: d.avgGasPrice,
      }));
    }

    // Calculate aggregate stats from time series
    const stats = {
      totalTransactions: timeSeries.reduce((sum, t) => sum + t.transactionCount, 0),
      totalBlocks: timeSeries.reduce((sum, t) => sum + t.blockCount, 0),
      totalContractsDeployed: timeSeries.reduce((sum, t) => sum + t.contractsDeployed, 0),
      totalTokenTransfers: timeSeries.reduce((sum, t) => sum + t.tokenTransferCount, 0),
      avgTxPerBlock: 0,
      avgGasPrice: "0",
    };

    if (stats.totalBlocks > 0) {
      stats.avgTxPerBlock = Math.round((stats.totalTransactions / stats.totalBlocks) * 100) / 100;
    }

    // Calculate average gas price
    const validGasPrices = timeSeries.filter((t) => BigInt(t.avgGasPrice) > 0n);
    if (validGasPrices.length > 0) {
      const totalGasPrice = validGasPrices.reduce(
        (sum, t) => sum + BigInt(t.avgGasPrice),
        0n
      );
      stats.avgGasPrice = (totalGasPrice / BigInt(validGasPrices.length)).toString();
    }

    // Get recent contracts
    const contracts = await getRecentContracts(10);
    const recentContracts = contracts.map((c) => ({
      address: c.address,
      deployer: c.deployerAddress,
      txHash: c.deploymentTxHash,
      blockNumber: c.blockNumber,
      timestamp: c.timestamp,
    }));

    // Reverse time series so oldest is first (for charts)
    timeSeries.reverse();

    return NextResponse.json<AnalyticsResponse>({
      available: true,
      synced: syncStatus.synced,
      latestIndexedBlock: syncStatus.latestBlock,
      range,
      stats,
      timeSeries,
      recentContracts,
    });
  } catch (error) {
    console.error("Analytics indexed error:", error);
    return NextResponse.json(
      { error: "Failed to fetch indexed analytics" },
      { status: 500 }
    );
  }
}
