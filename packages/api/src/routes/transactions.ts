import { Router, type Request, type Response } from "express";
import { type Hex } from "viem";
import * as rpc from "../services/rpc.js";
import { getCached, setCache, cacheKeys, BLOCK_TTL, DEFAULT_TTL } from "../services/cache.js";
import type { NetworkId } from "../services/chains.js";

const router: Router = Router();

// Get transaction by hash
router.get("/:hash", async (req: Request, res: Response): Promise<void> => {
  try {
    const hash = req.params.hash as string;
    const network = (req.query.network as NetworkId) ?? "mainnet";

    // Validate hash format
    if (!hash.startsWith("0x") || hash.length !== 66) {
      res.status(400).json({ error: "Invalid transaction hash format" });
      return;
    }

    // Check cache first
    const cacheKey = cacheKeys.transaction(network, hash);
    const cached = await getCached(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }

    const [tx, receipt] = await Promise.all([
      rpc.getTransaction(hash as Hex, network),
      rpc.getTransactionReceipt(hash as Hex, network),
    ]);

    if (!tx) {
      res.status(404).json({ error: "Transaction not found" });
      return;
    }

    const response = rpc.formatTransactionResponse(tx, receipt);

    // Cache confirmed transactions longer
    const ttl = receipt ? BLOCK_TTL : DEFAULT_TTL;
    await setCache(cacheKey, response, ttl);

    res.json(response);
  } catch (error) {
    console.error("Error fetching transaction:", error);
    res.status(500).json({ error: "Failed to fetch transaction" });
  }
});

// Get transaction receipt
router.get("/:hash/receipt", async (req: Request, res: Response): Promise<void> => {
  try {
    const hash = req.params.hash as string;
    const network = (req.query.network as NetworkId) ?? "mainnet";

    if (!hash.startsWith("0x") || hash.length !== 66) {
      res.status(400).json({ error: "Invalid transaction hash format" });
      return;
    }

    const receipt = await rpc.getTransactionReceipt(hash as Hex, network);

    if (!receipt) {
      res.status(404).json({ error: "Transaction receipt not found" });
      return;
    }

    res.json({
      transactionHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber?.toString(),
      blockHash: receipt.blockHash,
      transactionIndex: receipt.transactionIndex,
      from: receipt.from,
      to: receipt.to,
      contractAddress: receipt.contractAddress,
      status: receipt.status === "success" ? 1 : 0,
      gasUsed: receipt.gasUsed?.toString(),
      effectiveGasPrice: receipt.effectiveGasPrice?.toString(),
      cumulativeGasUsed: receipt.cumulativeGasUsed?.toString(),
      logs: receipt.logs.map((log) => ({
        address: log.address,
        topics: log.topics,
        data: log.data,
        logIndex: log.logIndex,
        blockNumber: log.blockNumber?.toString(),
      })),
      logsBloom: receipt.logsBloom,
      type: receipt.type,
    });
  } catch (error) {
    console.error("Error fetching receipt:", error);
    res.status(500).json({ error: "Failed to fetch transaction receipt" });
  }
});

export default router;
