# Lib rules
- Company facts (start years, contact hours and their Schema.org form) live only in `businessFacts.ts`, alias-free so prerender and scripts import it — pages never hardcode years of experience or contact hours, preventing contradictory claims.
- Shortcut destinations on the admin „Astăzi” screen come from `adminTodayRoutes.ts` (tested), and `WhatsappChat` opens the conversation given by `?phone=` — keeps cards and lists pointing at the step or filter that resolves them.
- Review/AggregateRating JSON-LD is built only by `reviewStructuredData.ts` (1–10 on-page scale, invalid reviews dropped) on a single LodgingBusiness node, and property pages emit it through the effect-managed `JsonLdScript`, not Helmet — prevents conflicting scales and stale duplicate rating nodes.
