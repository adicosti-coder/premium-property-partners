-- Clear AI-generated fake host replies from all scraped reviews
UPDATE property_reviews 
SET admin_reply = NULL, admin_reply_at = NULL 
WHERE source = 'booking.com' AND admin_reply IS NOT NULL;