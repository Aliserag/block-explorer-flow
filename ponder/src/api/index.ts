import { Hono } from "hono";
import { graphql } from "ponder";
import { db } from "ponder:api";
import schema from "ponder:schema";

const app = new Hono();

// GraphQL API at /graphql (standard endpoint)
app.use("/graphql", graphql({ db, schema }));

// Health check endpoint
app.get("/health", (c) => c.json({ status: "ok" }));

// Redirect root to GraphQL for convenience
app.get("/", (c) => c.redirect("/graphql"));

export default app;
