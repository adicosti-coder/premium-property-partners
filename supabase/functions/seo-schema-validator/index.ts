// SEO Schema Validator — fetches a URL, parses JSON-LD blocks and runs
// internal validation against schema.org common types. Saves the result
// in seo_schema_validations and updates seo_overrides.last_validation_status.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BASE_URL = "https://www.realtrust.ro";

interface ErrorLocation {
  block_index: number;
  line: number;
  column?: number;
  snippet: string;
  message: string;
  severity: "error" | "warning";
  field_path?: string;
}

interface RawBlock {
  index: number;
  source: string;
  parsed: any;
  parse_error?: string;
  types: string[];
}

interface ValidationResult {
  status: "valid" | "warnings" | "invalid" | "error";
  errors: string[];
  warnings: string[];
  schema_types: string[];
  error_locations: ErrorLocation[];
  raw_blocks: RawBlock[];
}

const REQUIRED_FIELDS: Record<string, string[]> = {
  Article: ["headline", "author", "datePublished"],
  BlogPosting: ["headline", "author", "datePublished"],
  Product: ["name", "image"],
  Organization: ["name", "url"],
  LocalBusiness: ["name", "address"],
  Apartment: ["name", "address"],
  RealEstateListing: ["name", "url"],
  Person: ["name"],
  WebPage: ["name"],
  WebSite: ["name", "url"],
  BreadcrumbList: ["itemListElement"],
  FAQPage: ["mainEntity"],
  Question: ["name", "acceptedAnswer"],
  Event: ["name", "startDate", "location"],
  Review: ["author", "reviewBody"],
  AggregateRating: ["ratingValue", "reviewCount"],
};

interface NodeIssue { message: string; severity: "error" | "warning"; field_path: string }

function validateNode(node: any, parent = ""): { issues: NodeIssue[]; types: string[] } {
  const issues: NodeIssue[] = [];
  const types: string[] = [];
  if (!node || typeof node !== "object") return { issues, types };
  if (Array.isArray(node)) {
    node.forEach((it, i) => {
      const r = validateNode(it, `${parent}[${i}]`);
      issues.push(...r.issues); types.push(...r.types);
    });
    return { issues, types };
  }
  const t = node["@type"];
  const typeList = Array.isArray(t) ? t : (t ? [t] : []);
  types.push(...typeList);
  for (const tt of typeList) {
    const required = REQUIRED_FIELDS[tt];
    if (required) {
      for (const f of required) {
        if (node[f] === undefined || node[f] === null || node[f] === "") {
          issues.push({
            message: `${tt}: lipsește câmpul obligatoriu "${f}"`,
            severity: "error",
            field_path: parent ? `${parent}.${f}` : f,
          });
        }
      }
    }
  }
  if (typeList.length === 0 && !node["@graph"]) {
    issues.push({ message: `${parent || "root"}: lipsă @type`, severity: "warning", field_path: parent || "@type" });
  }
  if (node["@graph"] && Array.isArray(node["@graph"])) {
    node["@graph"].forEach((g: any, i: number) => {
      const r = validateNode(g, `@graph[${i}]`);
      issues.push(...r.issues); types.push(...r.types);
    });
  }
  for (const [k, v] of Object.entries(node)) {
    if (k.startsWith("@")) continue;
    if (v && typeof v === "object") {
      const r = validateNode(v, parent ? `${parent}.${k}` : k);
      issues.push(...r.issues); types.push(...r.types);
    }
  }
  return { issues, types };
}

// Find the line/column inside a pretty-printed JSON string for a given dotted path.
function locateFieldInJson(prettyJson: string, fieldPath: string): { line: number; column: number; snippet: string } {
  if (!fieldPath) return { line: 1, column: 1, snippet: prettyJson.split("\n")[0] || "" };
  // Use the last segment as the search key (strip [n] indices).
  const segments = fieldPath.split(".").map((s) => s.replace(/\[\d+\]$/, ""));
  const lastKey = segments[segments.length - 1] || fieldPath;
  const lines = prettyJson.split("\n");
  // Try to find the key occurrence, preferring nested matches.
  const needle = `"${lastKey}"`;
  let bestLine = 1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(needle)) { bestLine = i + 1; break; }
  }
  const lineText = lines[bestLine - 1] || "";
  const col = Math.max(1, lineText.indexOf(needle) + 1);
  return { line: bestLine, column: col, snippet: lineText.trim().slice(0, 240) };
}

function locateJsonParseError(rawJson: string, errMsg: string): { line: number; column: number; snippet: string } {
  // Most JS engines emit "at position N" or "line X column Y".
  const posMatch = errMsg.match(/position\s+(\d+)/i);
  const lcMatch = errMsg.match(/line\s+(\d+)\s+column\s+(\d+)/i);
  const lines = rawJson.split("\n");
  let line = 1, column = 1;
  if (lcMatch) {
    line = parseInt(lcMatch[1], 10);
    column = parseInt(lcMatch[2], 10);
  } else if (posMatch) {
    const pos = parseInt(posMatch[1], 10);
    let acc = 0;
    for (let i = 0; i < lines.length; i++) {
      if (acc + lines[i].length + 1 > pos) { line = i + 1; column = pos - acc + 1; break; }
      acc += lines[i].length + 1;
    }
  }
  const snippet = (lines[line - 1] || "").trim().slice(0, 240);
  return { line, column, snippet };
}

async function validateUrl(url: string): Promise<ValidationResult> {
  const empty: ValidationResult = { status: "warnings", errors: [], warnings: [], schema_types: [], error_locations: [], raw_blocks: [] };
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 RealTrustBot SEO Validator" }, signal: AbortSignal.timeout(15000) });
    if (!res.ok) return { ...empty, status: "error", errors: [`HTTP ${res.status}`], warnings: [] };
    const html = await res.text();
    const blocks = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
    if (blocks.length === 0) {
      return { ...empty, status: "warnings", warnings: ["Nu există blocuri JSON-LD pe pagină"] };
    }
    const allErrors: string[] = [];
    const allWarnings: string[] = [];
    const allTypes: string[] = [];
    const errorLocations: ErrorLocation[] = [];
    const rawBlocks: RawBlock[] = [];

    for (let i = 0; i < blocks.length; i++) {
      const raw = blocks[i][1].trim();
      try {
        const obj = JSON.parse(raw);
        const pretty = JSON.stringify(obj, null, 2);
        const { issues, types } = validateNode(obj, "");
        rawBlocks.push({ index: i, source: pretty, parsed: obj, types: [...new Set(types)] });
        for (const iss of issues) {
          const loc = locateFieldInJson(pretty, iss.field_path);
          errorLocations.push({
            block_index: i,
            line: loc.line,
            column: loc.column,
            snippet: loc.snippet,
            message: iss.message,
            severity: iss.severity,
            field_path: iss.field_path,
          });
          if (iss.severity === "error") allErrors.push(`block#${i + 1} L${loc.line}: ${iss.message}`);
          else allWarnings.push(`block#${i + 1} L${loc.line}: ${iss.message}`);
        }
        allTypes.push(...types);
      } catch (e) {
        const msg = (e as Error).message;
        const loc = locateJsonParseError(raw, msg);
        const errStr = `block#${i + 1} L${loc.line}: JSON invalid (${msg.slice(0, 80)})`;
        allErrors.push(errStr);
        errorLocations.push({
          block_index: i,
          line: loc.line,
          column: loc.column,
          snippet: loc.snippet,
          message: `JSON invalid: ${msg.slice(0, 200)}`,
          severity: "error",
        });
        rawBlocks.push({ index: i, source: raw.slice(0, 8000), parsed: null, parse_error: msg, types: [] });
      }
    }
    const uniqTypes = [...new Set(allTypes)];
    let status: ValidationResult["status"] = "valid";
    if (allErrors.length > 0) status = "invalid";
    else if (allWarnings.length > 0) status = "warnings";
    return { status, errors: allErrors, warnings: allWarnings, schema_types: uniqTypes, error_locations: errorLocations, raw_blocks: rawBlocks };
  } catch (e) {
    return { ...empty, status: "error", errors: [(e as Error).message] };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const sb = createClient(SUPABASE_URL, SERVICE_KEY);
    const auth = req.headers.get("Authorization") || "";
    const token = auth.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Missing auth" }, 401);
    const { data: u } = await sb.auth.getUser(token);
    if (!u?.user) return json({ error: "Invalid token" }, 401);
    const { data: role } = await sb.from("user_roles").select("role").eq("user_id", u.user.id).eq("role", "admin").maybeSingle();
    if (!role) return json({ error: "Forbidden" }, 403);

    const { url_path, override_id, history_id } = await req.json();
    if (!url_path) return json({ error: "url_path required" }, 400);
    const fullUrl = url_path.startsWith("http") ? url_path : `${BASE_URL}${url_path}`;

    const result = await validateUrl(fullUrl);
    const inserted = await sb.from("seo_schema_validations").insert({
      url_path,
      override_id: override_id || null,
      history_id: history_id || null,
      status: result.status,
      errors: result.errors,
      warnings: result.warnings,
      schema_types: result.schema_types,
      error_locations: result.error_locations,
      raw_blocks: result.raw_blocks,
      validator: "internal_jsonld",
    }).select().single();

    if (override_id) {
      await sb.from("seo_overrides").update({
        last_validated_at: new Date().toISOString(),
        last_validation_status: result.status,
      }).eq("id", override_id);
    }

    return json({ ok: true, ...result, validation_id: inserted.data?.id });
  } catch (e) {
    console.error("[schema-validator]", e);
    return json({ ok: false, error: (e as Error).message }, 500);
  }
});
