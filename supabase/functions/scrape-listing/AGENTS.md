# scrape-listing rules
- `scrape-listing` cleans tracking/redirect URLs, reads the page directly first (JSON-LD/OpenGraph + one AI pass) and uses Scrape.do only when that fails; mode `quick` saves an inactive draft in one call — cheaper, faster imports from server-rendered sites.
