import express from "express";
import cors from "cors";
import blocksRouter from "./routes/blocks.js";
import transactionsRouter from "./routes/transactions.js";
import accountsRouter from "./routes/accounts.js";
import searchRouter from "./routes/search.js";

const app = express();
const PORT = process.env.API_PORT ?? 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get("/health", (_, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API info
app.get("/", (_, res) => {
  res.json({
    name: "Flow EVM Block Explorer API",
    version: "1.0.0",
    endpoints: {
      blocks: "/api/blocks",
      transactions: "/api/transactions",
      accounts: "/api/accounts",
      search: "/api/search",
    },
  });
});

// Routes
app.use("/api/blocks", blocksRouter);
app.use("/api/transactions", transactionsRouter);
app.use("/api/accounts", accountsRouter);
app.use("/api/search", searchRouter);

// Error handling
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.listen(PORT, () => {
  console.log(`Flow EVM Block Explorer API running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
