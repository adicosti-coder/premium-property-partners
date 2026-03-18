
-- Premium property listing fields
ALTER TABLE public.properties
  -- Balcoane, terasă, boxă, pivniță
  ADD COLUMN IF NOT EXISTS balconies integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS terrace_area numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS has_storage boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_cellar boolean DEFAULT false,
  
  -- Orientare, vedere, luminozitate
  ADD COLUMN IF NOT EXISTS orientation text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS view_type text DEFAULT NULL,
  
  -- Lift, interfon, AC
  ADD COLUMN IF NOT EXISTS has_elevator boolean DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS intercom_type text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS has_ac boolean DEFAULT NULL,
  
  -- Suprafață utilă vs. construită, teren
  ADD COLUMN IF NOT EXISTS usable_area numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS built_area numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS land_area numeric DEFAULT NULL,
  
  -- Preț pe mp, taxe/an, costuri întreținere
  ADD COLUMN IF NOT EXISTS price_per_sqm numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS annual_tax numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS monthly_maintenance numeric DEFAULT NULL,
  
  -- An renovare, stare imobil
  ADD COLUMN IF NOT EXISTS renovation_year integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS property_condition text DEFAULT NULL,
  
  -- Regim înălțime, nr. apartamente bloc
  ADD COLUMN IF NOT EXISTS total_building_floors integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS apartments_in_building integer DEFAULT NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.properties.balconies IS 'Număr balcoane';
COMMENT ON COLUMN public.properties.terrace_area IS 'Suprafață terasă (mp)';
COMMENT ON COLUMN public.properties.has_storage IS 'Boxă la subsol';
COMMENT ON COLUMN public.properties.has_cellar IS 'Pivniță';
COMMENT ON COLUMN public.properties.orientation IS 'Orientare cardinală: N, S, E, V, NE, NV, SE, SV';
COMMENT ON COLUMN public.properties.view_type IS 'Tip vedere: strada, curte, parc, panoramic';
COMMENT ON COLUMN public.properties.has_elevator IS 'Lift în bloc';
COMMENT ON COLUMN public.properties.intercom_type IS 'interfon, videointerfon';
COMMENT ON COLUMN public.properties.has_ac IS 'Aer condiționat';
COMMENT ON COLUMN public.properties.usable_area IS 'Suprafață utilă (mp)';
COMMENT ON COLUMN public.properties.built_area IS 'Suprafață construită (mp)';
COMMENT ON COLUMN public.properties.land_area IS 'Suprafață teren (mp) - pentru case/vile';
COMMENT ON COLUMN public.properties.price_per_sqm IS 'Preț per mp (€)';
COMMENT ON COLUMN public.properties.annual_tax IS 'Impozit anual estimat (€)';
COMMENT ON COLUMN public.properties.monthly_maintenance IS 'Costuri lunare întreținere (€)';
COMMENT ON COLUMN public.properties.renovation_year IS 'Anul ultimei renovări';
COMMENT ON COLUMN public.properties.property_condition IS 'Stare: nou, renovat, de_renovat, buna';
COMMENT ON COLUMN public.properties.total_building_floors IS 'Nr. total etaje bloc';
COMMENT ON COLUMN public.properties.apartments_in_building IS 'Nr. total apartamente în bloc/scară';
