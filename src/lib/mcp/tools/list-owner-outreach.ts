import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_owner_outreach",
  title: "List owner outreach",
  description: "List recent private-owner prospects and their WhatsApp outreach status (admins only, enforced by database policies).",
  inputSchema: {
    status: z.enum(["outreach_pending", "whatsapp_sent", "call_completed", "failed"]).optional().describe("Filter by outreach status."),
    limit: z.number().int().min(1).max(50).optional().describe("Max results (default 20)."),
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async ({ status, limit }, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("Not authenticated");
    let q = supabaseForUser(ctx)
      .from("prospect_listings")
      .select("id, title, zone, price, category, outreach_status, outreach_status_at, source_url")
      .not("outreach_status", "is", null)
      .order("outreach_status_at", { ascending: false })
      .limit(limit ?? 20);
    if (status) q = q.eq("outreach_status", status);
    const { data, error } = await q;
    if (error) throw new ToolError(error.message);
    const rows = (data ?? []).map((r: any) => ({
      id: String(r.id),
      title: r.title ?? null,
      zone: r.zone ?? null,
      price: r.price ?? null,
      category: r.category ?? null,
      outreach_status: r.outreach_status ?? null,
      outreach_status_at: r.outreach_status_at ?? null,
      source_url: r.source_url ?? null,
    }));
    return { content: [{ type: "text", text: rows.length ? JSON.stringify(rows) : "No prospects visible for this account." }], structuredContent: { prospects: rows } };
  },
});
