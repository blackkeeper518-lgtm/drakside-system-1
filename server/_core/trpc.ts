import { initTRPC } from "@trpc/server";
import superjson from "superjson";

export type AppContext = { req: unknown; res: unknown; user: null };

export const t = initTRPC.context<AppContext>().create({ transformer: superjson });
export const publicProcedure = t.procedure;
export const router = t.router;

export function createContext(opts: { req: unknown; res: unknown }): AppContext {
  return { req: opts.req, res: opts.res, user: null };
}
