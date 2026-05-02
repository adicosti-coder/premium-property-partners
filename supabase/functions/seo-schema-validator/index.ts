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

function validateNode(node: any, parent = ""): { errors: string[]; warnings: string[]; types: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const types: string[] = [];
  if (!node || typeof node !== "object") return { errors, warnings, types };
  if (Array.isArray(node)) {
    for (const it of node) {
      const r = validateNode(it, parent);
      errors.push(...r.errors); warnings.push(...r.warnings); types.push(...r.types);
    }
    return { errors, warnings, types };
  }
  const t = node["@type"];
  const typeList = Array.isArray(t) ? t : (t ? [t] : []);
  types.push(...typeList);
  for (const tt of typeList) {
    const required = REQUIRED_FIELDS[tt];
    if (required) {
      for (const f of required) {
        if (node[f] === undefined || node[f] === null || node[f] === "") {
          errors.push(`${tt}: lipsește câmpul obligatoriu "${f}"`);
        }
      }
    }
  }
  if (typeList.length === 0 && !node["@graph"]) {
    warnings.push(`${parent || "node"}: lipsă @type`);
  }
  if (node["@graph"] && Array.isArray(node["@graph"])) {
    for (const g of node["@graph"]) {
      const r = validateNode(g, "@graph");
      errors.push(...r.errors); warnings.push(...r.warnings); types.push(...r.types);
    }
  }
  // Recurse on object values
  for (const [k, v] of Object.entries(node)) {
    if (k.startsWith("@")) continue;
    if (v && typeof v === "object") {
      const r = validateNode(v, k);
      errors.push(...r.errors); warnings.push(...r.warnings); types.push(...r.types);
    }
  }
  return { errors, warnings, types };
}

async function validateUrl(url: string): Promise<ValidationResult> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 RealTrustBot SEO Validator" }, signal: AbortSignal.timeout(15000) });
    if (!res.ok) return { status: "error", errors: [`HTTP ${res.status}`], warnings: [], schema_types: [] };
    const html = await res.text();
    const blocks = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
    if (blocks.length === 0) {
      return { status: "warnings", errors: [], warnings: ["Nu există blocuri JSON-LD pe pagină"], schema_types: [] };
    }
    const allErrors: string[] = [];
    const allWarnings: string[] = [];
    const allTypes: string[] = [];
    for (let i = 0; i < blocks.length; i++) {
      const raw = blocks[i][1].trim();
      try {
        const obj = JSON.parse(raw);
        const r = validateNode(obj, `block#${i + 1}`);
        allErrors.push(...r.errors);
        allWarnings.push(...r.warnings);
        allTypes.push(...r.types);
      } catch (e) {
        allErrors.push(`block#${i + 1}: JSON invalid (${(e as Error).message.slice(0, 80)})`);
      }
    }
    const uniqTypes = [...new Set(allTypes)];
    if (allErrors.length > 0) return { status: "invalid", errors: allErrors, warnings: allWarnings, schema_types: uniqTypes };
    if (allWarnings.length > 0) return { status: "warnings", errors: [], warnings: allWarnings, schema_types: uniqTypes };
    return { status: "valid", errors: [], warnings: [], schema_types: uniqTypes };
  } catch (e) {
    return { status: "error", errors: [(e as Error).message], warnings: [], schema_types: [] };
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
