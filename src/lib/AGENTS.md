# Lib rules
- Company facts (start years, contact hours and their Schema.org form) live only in `businessFacts.ts`, alias-free so prerender and scripts import it — pages never hardcode years of experience or contact hours, preventing contradictory claims.
