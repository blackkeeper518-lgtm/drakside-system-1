import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import { supabaseGet, supabasePost } from "./_core/env";

const threadInput = z.object({ pageId: z.string().min(1), threadId: z.string().min(1) });

export const appRouter = router({
  health: publicProcedure.query(() => ({ ok: true, service: "drakside-system", time: new Date().toISOString() })),

  orders: router({
    threads: publicProcedure.query(async () => {
      return supabaseGet<unknown[]>("vw_chat_threads?select=*&order=occurred_at.desc");
    }),
    forThread: publicProcedure.input(threadInput).query(async ({ input }) => {
      const page = encodeURIComponent(input.pageId);
      const thread = encodeURIComponent(input.threadId);
      return supabaseGet<unknown[]>(`vw_payload_room_status?page_id=eq.${page}&conversation_key=eq.${thread}&select=*`);
    }),
    chatEvidence: publicProcedure.input(threadInput).query(async ({ input }) => {
      const page = encodeURIComponent(input.pageId);
      const thread = encodeURIComponent(input.threadId);
      return supabaseGet<unknown[]>(`chat_customer_evidence?page_id=eq.${page}&conversation_key=eq.${thread}&select=*&order=occurred_at.asc`);
    }),
    generateSummary: publicProcedure.input(threadInput).mutation(async ({ input }) => ({
      orderNumber: "",
      customerName: "",
      phone: "",
      address: "",
      product: "",
      cod: "",
      copyText: `${input.pageId}\n${input.threadId}`,
      timingMs: { total: 0, parse: 0, dataLookup: 0, audit: 0 },
    })),
    summaryTimings: publicProcedure.input(z.object({ limit: z.number().int().min(1).max(100).default(8) })).query(() => []),
    confirmations: publicProcedure.query(() => []),
    confirmFromChat: publicProcedure.input(threadInput.extend({ customerName: z.string().optional(), customerId: z.string().optional(), evidenceText: z.string().optional() })).mutation(({ input }) => ({ ok: true, ...input })),
  }),

  chat: router({
    messages: publicProcedure.input(threadInput).query(async ({ input }) => {
      const page = encodeURIComponent(input.pageId);
      const thread = encodeURIComponent(input.threadId);
      return supabaseGet<unknown[]>(`chat_customer_messages?page_id=eq.${page}&conversation_key=eq.${thread}&select=*&order=occurred_at.asc`);
    }),
    sendReply: publicProcedure.input(z.object({ pageId: z.string(), threadId: z.string(), recipientId: z.string(), text: z.string().optional(), imageUrl: z.string().optional(), stickerId: z.string().optional() })).mutation(() => ({ ok: false, status: "not_configured", message: "Connect Meta send API before enabling outbound replies" })),
    simulateSend: publicProcedure.input(z.object({ pageId: z.string(), threadId: z.string(), recipientId: z.string(), kind: z.enum(["text", "image"]), text: z.string().optional(), imageUrl: z.string().optional() })).mutation(({ input }) => ({ dryRun: true, payload: input })),
    uploadImage: publicProcedure.input(z.object({ fileName: z.string(), contentType: z.string(), base64: z.string() })).mutation(() => ({ url: "", status: "not_configured" })),
    metaErrors: publicProcedure.query(() => []),
  }),

  delivery: router({
    pending: publicProcedure.input(z.object({ roomKey: z.string().optional() }).optional()).query(async ({ input }) => {
      const filter = input?.roomKey ? `&room_key=eq.${encodeURIComponent(input.roomKey)}` : "";
      return supabaseGet<unknown[]>(`vw_room_delivery_pending?select=*${filter}&order=created_at.asc&limit=100`);
    }),
    claim: publicProcedure.input(z.object({ roomKey: z.string(), worker: z.string().default("vercel") })).mutation(({ input }) => supabasePost<unknown>("rpc/claim_room_delivery", { p_room_key: input.roomKey, p_worker: input.worker })),
  }),
});

export type AppRouter = typeof appRouter;
