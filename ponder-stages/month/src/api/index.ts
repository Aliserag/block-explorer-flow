import { Hono } from "hono";
import { graphql } from "ponder";
import { db } from "ponder:api";
import * as schema from "ponder:schema";

const app = new Hono();

app.use("/", graphql({ db, schema }));
app.get("/health", (c) => c.json({ status: "ok" }));

export default app;
