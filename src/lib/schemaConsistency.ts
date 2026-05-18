/**
 * Schema consistency checks.
 *
 * Walks any JSON-LD object (or array / @graph) and verifies that every node
 * referencing the brand entities (Organization / RealEstateAgent /
 * LodgingBusiness — by `@id` or by `@type`) uses the canonical telephone,
 * email and address from `orgIdentity.ts`.
 *
 * Conflicting values fragment the Google Knowledge Graph entity. This
 * helper logs warnings in development so a divergent inline schema is
 * caught immediately when it's added.
 *
 * Intentionally a no-op in production builds.
 */

import {
  BRAND,
  ORG_ID,
  REAL_ESTATE_AGENT_ID,
  LODGING_BUSINESS_ID,
} from "@/lib/orgIdentity";

const BRAND_IDS = new Set<string>([
  ORG_ID,
  REAL_ESTATE_AGENT_ID,
  LODGING_BUSINESS_ID,
]);

const BRAND_TYPES = new Set<string>([
  "Organization",
  "RealEstateAgent",
  "LocalBusiness",
  "LodgingBusiness",
]);

type AnyObj = Record<string, unknown>;

const isBrandNode = (node: AnyObj): boolean => {
  const id = typeof node["@id"] === "string" ? (node["@id"] as string) : "";
  if (BRAND_IDS.has(id)) return true;

  const typeRaw = node["@type"];
  const types = Array.isArray(typeRaw) ? typeRaw : typeRaw ? [typeRaw] : [];
  return types.some(
    (t) => typeof t === "string" && BRAND_TYPES.has(t),
  );
};

interface Issue {
  field: string;
  expected: string;
  actual: string;
  nodeType: string;
  nodeId?: string;
}

const checkNode = (node: AnyObj, issues: Issue[]) => {
  if (!isBrandNode(node)) return;

  const nodeType = String(node["@type"] ?? "(no type)");
  const nodeId = typeof node["@id"] === "string" ? (node["@id"] as string) : undefined;

  const tel = node.telephone;
  if (typeof tel === "string" && tel.replace(/\s/g, "") !== BRAND.telephone) {
    issues.push({
      field: "telephone",
      expected: BRAND.telephone,
      actual: tel,
      nodeType,
      nodeId,
    });
  }

  const email = node.email;
  if (typeof email === "string" && email.toLowerCase() !== BRAND.email.toLowerCase()) {
    issues.push({
      field: "email",
      expected: BRAND.email,
      actual: email,
      nodeType,
      nodeId,
    });
  }

  const address = node.address as AnyObj | undefined;
  if (address && typeof address === "object") {
    const city = address.addressLocality;
    if (typeof city === "string" && city !== BRAND.address.addressLocality) {
      issues.push({
        field: "address.addressLocality",
        expected: BRAND.address.addressLocality,
        actual: city,
        nodeType,
        nodeId,
      });
    }
  }
};

const walk = (value: unknown, issues: Issue[]) => {
  if (!value) return;
  if (Array.isArray(value)) {
    value.forEach((v) => walk(v, issues));
    return;
  }
  if (typeof value !== "object") return;

  const node = value as AnyObj;
  checkNode(node, issues);

  // recurse into @graph + nested objects
  for (const key of Object.keys(node)) {
    walk(node[key], issues);
  }
};

/**
 * Validate a JSON-LD payload (object, array, or @graph). Logs warnings to
 * the console in development when nodes conflict with the canonical brand
 * identity. Returns the list of issues found so callers/tests can assert.
 */
export const validateJsonLdConsistency = (
  jsonLd: unknown,
  source = "unknown",
): Issue[] => {
  const issues: Issue[] = [];
  walk(jsonLd, issues);

  if (issues.length && import.meta.env?.DEV) {
    // eslint-disable-next-line no-console
    console.warn(
      `[schema-consistency] ${issues.length} brand-conflict(s) in JSON-LD (source: ${source}):`,
      issues,
    );
  }

  return issues;
};
