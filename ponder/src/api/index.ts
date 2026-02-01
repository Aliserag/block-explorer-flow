import { Hono } from "hono";
import { graphql } from "ponder";
import { db } from "ponder:api";
import * as schema from "ponder:schema";

const app = new Hono();

// Serve GraphQL API at root
app.use("/", graphql({ db, schema }));

// Health check endpoint
app.get("/health", (c) => c.json({ status: "ok" }));

export default app;
