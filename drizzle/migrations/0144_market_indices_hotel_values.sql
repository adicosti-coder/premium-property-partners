ALTER TABLE public.timisoara_market_indices
  ADD COLUMN IF NOT EXISTS nightly_rate_eur numeric,
  ADD COLUMN IF NOT EXISTS hotel_occupancy numeric,
  ADD COLUMN IF NOT EXISTS hotel_net_min_eur_month numeric,
  ADD COLUMN IF NOT EXISTS hotel_net_max_eur_month numeric,
  ADD COLUMN IF NOT EXISTS hotel_source text;

ALTER TABLE public.timisoara_market_indices
  ADD CONSTRAINT timisoara_market_indices_nightly_range CHECK (nightly_rate_eur IS NULL OR nightly_rate_eur BETWEEN 15 AND 2000),
  ADD CONSTRAINT timisoara_market_indices_occupancy_range CHECK (hotel_occupancy IS NULL OR hotel_occupancy BETWEEN 0.3 AND 0.95),
  ADD CONSTRAINT timisoara_market_indices_hotel_net_range CHECK (
    (hotel_net_min_eur_month IS NULL OR hotel_net_min_eur_month BETWEEN 0 AND 50000)
    AND (hotel_net_max_eur_month IS NULL OR hotel_net_max_eur_month BETWEEN 0 AND 50000)
    AND (hotel_net_min_eur_month IS NULL OR hotel_net_max_eur_month IS NULL OR hotel_net_min_eur_month <= hotel_net_max_eur_month)
  );

COMMENT ON COLUMN public.timisoara_market_indices.nightly_rate_eur IS 'Reference nightly rate (EUR) for the row''s apartment reference, from the calculator grid.';
COMMENT ON COLUMN public.timisoara_market_indices.hotel_net_min_eur_month IS 'Owner net monthly hotel-regime income at the maximum management commission.';
COMMENT ON COLUMN public.timisoara_market_indices.hotel_net_max_eur_month IS 'Owner net monthly hotel-regime income at the minimum management commission.';