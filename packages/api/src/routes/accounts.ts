import { Router, type Request, type Response } from "express";
import { type Address, isAddress } from "viem";
import * as rpc from "../services/rpc.js";
import { getCached, setCache, cacheKeys, DEFAULT_TTL } from "../services/cache.js";
import type { NetworkId } from "../services/chains.js";

const router: Router = Router();

// Get account info
router.get("/:address", async (req: Request, res: Response): Promise<void> => {
  try {
    const address = req.params.address as string;
    const network = (req.query.network as NetworkId) ?? "mainnet";

    // Validate address format
    if (!isAddress(address)) {
      res.status(400).json({ error: "Invalid address format" });
      return;
    }

    const addr = address as Address;

    // Check cache first
    const cacheKey = cacheKeys.account(network, address);
    const cached = await getCached(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }

    // Fetch account data in parallel
    const [balance, transactionCount, code] = await Promise.all([
      rpc.getBalance(addr, network),
      rpc.getTransactionCount(addr, network),
      rpc.getCode(addr, network),
    ]);

    const isContract = code !== "0x" && code.length > 2;

    const response = {
      address: address,
      balance: balance.wei.toString(),
      balanceFormatted: balance.formatted,
      transactionCount,
      isContract,
      code: isContract ? code : undefined,
    };

    await setCache(cacheKey, response, DEFAULT_TTL);

    res.json(response);
  } catch (error) {
    console.error("Error fetching account:", error);
    res.status(500).json({ error: "Failed to fetch account" });
  }
});

// Get account balance
router.get("/:address/balance", async (req: Request, res: Response): Promise<void> => {
  try {
    const address = req.params.address as string;
    const network = (req.query.network as NetworkId) ?? "mainnet";

    if (!isAddress(address)) {
      res.status(400).json({ error: "Invalid address format" });
      return;
    }

    const balance = await rpc.getBalance(address as Address, network);

    res.json({
      address,
      balance: balance.wei.toString(),
      balanceFormatted: balance.formatted,
      symbol: "FLOW",
    });
  } catch (error) {
    console.error("Error fetching balance:", error);
    res.status(500).json({ error: "Failed to fetch balance" });
  }
});

// Get account code (for contracts)
router.get("/:address/code", async (req: Request, res: Response): Promise<void> => {
  try {
    const address = req.params.address as string;
    const network = (req.query.network as NetworkId) ?? "mainnet";

    if (!isAddress(address)) {
      res.status(400).json({ error: "Invalid address format" });
      return;
    }

    const code = await rpc.getCode(address as Address, network);

    res.json({
      address,
      code,
      isContract: code !== "0x" && code.length > 2,
    });
  } catch (error) {
    console.error("Error fetching code:", error);
    res.status(500).json({ error: "Failed to fetch contract code" });
  }
});

export default router;
