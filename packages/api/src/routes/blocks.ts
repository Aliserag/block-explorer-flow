import { Router, type Request, type Response } from "express";
import { type Hex } from "viem";
import * as rpc from "../services/rpc.js";
import { getCached, setCache, cacheKeys, BLOCK_TTL, DEFAULT_TTL } from "../services/cache.js";
import type { NetworkId } from "../services/chains.js";

const router: Router = Router();

// Get latest blocks
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const network = (req.query.network as NetworkId) ?? "mainnet";
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

    const latestNumber = await rpc.getLatestBlockNumber(network);
    const blocks = await rpc.getBlocks(latestNumber, limit, network);

    res.json({
      blocks: blocks.map(rpc.formatBlockResponse),
      latestBlock: latestNumber.toString(),
    });
  } catch (error) {
    console.error("Error fetching blocks:", error);
    res.status(500).json({ error: "Failed to fetch blocks" });
  }
});

// Get block by number or hash
router.get("/:blockId", async (req: Request, res: Response): Promise<void> => {
  try {
    const blockId = req.params.blockId as string;
    const network = (req.query.network as NetworkId) ?? "mainnet";
    const includeTransactions = req.query.includeTxs === "true";

    // Check cache first
    const cacheKey = cacheKeys.block(network, blockId);
    const cached = await getCached(cacheKey);
    if (cached && !includeTransactions) {
      res.json(cached);
      return;
    }

    // Determine if blockId is a hash or number
    const isHash = blockId.startsWith("0x") && blockId.length === 66;
    const blockIdParsed = isHash ? (blockId as Hex) : BigInt(blockId);

    const block = await rpc.getBlock(blockIdParsed, network, includeTransactions);

    if (!block) {
      res.status(404).json({ error: "Block not found" });
      return;
    }

    const response = {
      ...rpc.formatBlockResponse(block),
      transactions: includeTransactions
        ? block.transactions.map((tx) =>
            typeof tx === "string" ? tx : rpc.formatTransactionResponse(tx)
          )
        : block.transactions,
    };

    // Cache confirmed blocks longer
    const latestNumber = await rpc.getLatestBlockNumber(network);
    const confirmations = block.number ? latestNumber - block.number : 0n;
    const ttl = confirmations > 12n ? BLOCK_TTL : DEFAULT_TTL;
    await setCache(cacheKey, response, ttl);

    res.json(response);
  } catch (error) {
    console.error("Error fetching block:", error);
    res.status(500).json({ error: "Failed to fetch block" });
  }
});

// Get block transactions
router.get("/:blockId/transactions", async (req: Request, res: Response): Promise<void> => {
  try {
    const blockId = req.params.blockId as string;
    const network = (req.query.network as NetworkId) ?? "mainnet";

    const isHash = blockId.startsWith("0x") && blockId.length === 66;
    const blockIdParsed = isHash ? (blockId as Hex) : BigInt(blockId);

    const block = await rpc.getBlock(blockIdParsed, network, true);

    if (!block) {
      res.status(404).json({ error: "Block not found" });
      return;
    }

    const transactions = block.transactions.map((tx) =>
      typeof tx === "string" ? { hash: tx } : rpc.formatTransactionResponse(tx)
    );

    res.json({
      blockNumber: block.number?.toString(),
      blockHash: block.hash,
      transactionCount: transactions.length,
      transactions,
    });
  } catch (error) {
    console.error("Error fetching block transactions:", error);
    res.status(500).json({ error: "Failed to fetch block transactions" });
  }
});

export default router;
