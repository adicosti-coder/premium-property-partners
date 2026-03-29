
CREATE TABLE IF NOT EXISTS phone_intelligence (
    phone_number TEXT PRIMARY KEY,
    category TEXT,
    is_blacklisted BOOLEAN DEFAULT FALSE,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE scraper_leads ADD COLUMN IF NOT EXISTS phone TEXT;
