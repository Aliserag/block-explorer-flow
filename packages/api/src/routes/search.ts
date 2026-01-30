import { Router, type Request, type Response } from "express";
import { isAddress, type Hex } from "viem";
import * as rpc from "../services/rpc.js";
import type { NetworkId } from "../services/chains.js";

const router: Router = Router();

type SearchResultType = "block" | "transaction" | "address" | "unknown";

interface SearchResult {
  type: SearchResultType;
  query: string;
  found: boolean;
  data?: {
    blockNumber?: string;
    transactionHash?: string;
    address?: string;
    isContract?: boolean;
  };
}

// Universal search endpoint
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const query = req.query.q as string | undefined;
    const network = (req.query.network as NetworkId) ?? "mainnet";

    if (!query || typeof query !== "string") {
      res.status(400).json({ error: "Search query is required" });
      return;
    }

    const trimmedQuery = query.trim();
    const result = await identifyAndSearch(trimmedQuery, network);

    res.json(result);
  } catch (error) {
    console.error("Error searching:", error);
    res.status(500).json({ error: "Search failed" });
  }
});

async function identifyAndSearch(
  query: string,
  network: NetworkId
): Promise<SearchResult> {
  // Check if it's a valid address (42 chars, starts with 0x)
  if (isAddress(query)) {
    const code = await rpc.getCode(query as `0x${string}`, network);
    const isContract = code !== "0x" && code.length > 2;

    return {
      type: "address",
      query,
      found: true,
      data: {
        address: query,
        isContract,
      },
    };
  }

  // Check if it's a transaction hash (66 chars, starts with 0x)
  if (query.startsWith("0x") && query.length === 66) {
    const tx = await rpc.getTransaction(query as Hex, network);
    if (tx) {
      return {
        type: "transaction",
        query,
        found: true,
        data: {
          transactionHash: query,
          blockNumber: tx.blockNumber?.toString(),
        },
      };
    }
  }

  // Check if it's a block number
  if (/^\d+$/.test(query)) {
    const blockNumber = BigInt(query);
    const block = await rpc.getBlock(blockNumber, network);
    if (block) {
      return {
        type: "block",
        query,
        found: true,
        data: {
          blockNumber: block.number?.toString(),
        },
      };
    }
  }

  // Check if it's a block hash (66 chars, starts with 0x)
  if (query.startsWith("0x") && query.length === 66) {
    const block = await rpc.getBlock(query as Hex, network);
    if (block) {
      return {
        type: "block",
        query,
        found: true,
        data: {
          blockNumber: block.number?.toString(),
        },
      };
    }
  }

  // Not found
  return {
    type: "unknown",
    query,
    found: false,
  };
}

export default router;
