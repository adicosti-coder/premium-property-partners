
-- Add financial and scoring columns to property_listings
ALTER TABLE public.property_listings
  ADD COLUMN IF NOT EXISTS estimated_monthly_revenue NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS annual_operating_costs NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS initial_setup_cost NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS roi_percentage NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS investment_score INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Create the ROI calculation trigger function
CREATE OR REPLACE FUNCTION public.calculate_listing_roi()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_annual_revenue NUMERIC;
  v_roi NUMERIC;
  v_score INTEGER;
  v_tags TEXT[];
BEGIN
  -- Only process regim_hotelier listings
  IF NEW.listing_category::text != 'regim_hotelier' THEN
    -- Reset ROI fields for non-hotelier listings
    NEW.roi_percentage := 0;
    NEW.investment_score := 0;
    NEW.tags := '{}';
    RETURN NEW;
  END IF;

  -- Skip if financial data is incomplete
  IF COALESCE(NEW.estimated_monthly_revenue, 0) <= 0
     OR COALESCE(NEW.initial_setup_cost, 0) <= 0 THEN
    RETURN NEW;
  END IF;

  -- Calculate annual revenue
  v_annual_revenue := NEW.estimated_monthly_revenue * 12;

  -- Calculate ROI: ((Revenue * 12) - Operating Costs) / Setup Cost * 100
  v_roi := ((v_annual_revenue - COALESCE(NEW.annual_operating_costs, 0)) / NEW.initial_setup_cost) * 100;

  -- Clamp ROI to reasonable bounds
  IF v_roi < 0 THEN v_roi := 0; END IF;
  IF v_roi > 500 THEN v_roi := 500; END IF;

  NEW.roi_percentage := ROUND(v_roi, 2);

  -- Calculate investment score (1-100)
  -- ROI 70% -> score 90, linear scale
  IF v_roi >= 70 THEN
    -- 70% ROI = 90 score, each additional 10% adds ~3 points, cap at 100
    v_score := LEAST(90 + ROUND((v_roi - 70) / 10 * 3), 100)::INTEGER;
  ELSE
    -- Below 70%: proportional (0% -> 0, 70% -> 90)
    v_score := GREATEST(ROUND((v_roi / 70) * 90), 1)::INTEGER;
  END IF;

  NEW.investment_score := v_score;

  -- Auto-tag based on ROI
  v_tags := '{}';
  IF v_roi >= 70 THEN
    v_tags := ARRAY['ROI_EXCELENT', 'PRETABIL_ADMINISTRARE'];
  ELSIF v_roi >= 50 THEN
    v_tags := ARRAY['ROI_BUN'];
  END IF;

  NEW.tags := v_tags;

  RETURN NEW;
END;
$$;

-- Create trigger on INSERT and UPDATE
CREATE TRIGGER trg_calculate_listing_roi
  BEFORE INSERT OR UPDATE ON public.property_listings
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_listing_roi();

-- Add index for tag-based queries
CREATE INDEX IF NOT EXISTS idx_property_listings_tags ON public.property_listings USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_property_listings_investment_score ON public.property_listings (investment_score);
