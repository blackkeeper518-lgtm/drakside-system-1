import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../routers";
import { createContext } from "./trpc";

export function createApp() {
  const app = express();
  app.use(express.json({ limit: "10mb" }));
  app.get("/api/health", (_req, res) => res.json({ ok: true, service: "drakside-system", time: new Date().toISOString() }));
  app.use("/api/trpc", createExpressMiddleware({ router: appRouter, createContext }));
  return app;
}

if (process.env.NODE_ENV !== "production") {
  const port = Number(process.env.PORT ?? 3000);
  createApp().listen(port, () => console.log(`API listening on http://localhost:${port}`));
}
