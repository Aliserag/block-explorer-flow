import { ponder } from "@/generated";
import { blocks, transactions, accounts } from "../ponder.schema";

// Index blocks as they arrive
ponder.on("FlowBlocks:block", async ({ event, context }) => {
  const { db } = context;
  const block = event.block;

  // Insert the block
  await db.insert(blocks).values({
    number: block.number,
    hash: block.hash,
    parentHash: block.parentHash,
    timestamp: block.timestamp,
    gasUsed: block.gasUsed,
    gasLimit: block.gasLimit,
    baseFeePerGas: block.baseFeePerGas ?? null,
    transactionCount: block.transactions.length,
    miner: block.miner,
    size: block.size ?? null,
    extraData: block.extraData ?? null,
  }).onConflictDoNothing();

  // Index transactions in this block
  for (let i = 0; i < block.transactions.length; i++) {
    const tx = block.transactions[i];

    // Skip if tx is just a hash (not full transaction)
    if (typeof tx === "string") continue;

    await db.insert(transactions).values({
      hash: tx.hash,
      blockNumber: block.number,
      blockHash: block.hash,
      transactionIndex: i,
      from: tx.from,
      to: tx.to ?? null,
      value: tx.value,
      gas: tx.gas,
      gasPrice: tx.gasPrice ?? null,
      maxFeePerGas: tx.maxFeePerGas ?? null,
      maxPriorityFeePerGas: tx.maxPriorityFeePerGas ?? null,
      input: tx.input,
      nonce: tx.nonce,
      type: tx.type ? Number(tx.type) : 0,
      status: null, // Would need receipt for this
      timestamp: block.timestamp,
    }).onConflictDoNothing();

    // Update account records
    await db.insert(accounts).values({
      address: tx.from,
      transactionCount: 1,
      firstSeenBlock: block.number,
      lastSeenBlock: block.number,
    }).onConflictDoUpdate((row) => ({
      transactionCount: row.transactionCount + 1,
      lastSeenBlock: block.number,
    }));

    if (tx.to) {
      await db.insert(accounts).values({
        address: tx.to,
        transactionCount: 0,
        firstSeenBlock: block.number,
        lastSeenBlock: block.number,
      }).onConflictDoUpdate(() => ({
        lastSeenBlock: block.number,
      }));
    }
  }
});
