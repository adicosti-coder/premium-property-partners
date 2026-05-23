ALTER TABLE public.properties ALTER COLUMN booking_url DROP NOT NULL;
ALTER TABLE public.properties ALTER COLUMN booking_url SET DEFAULT '';