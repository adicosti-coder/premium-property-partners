ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS social_yield_override numeric(4,2)
  CHECK (social_yield_override IS NULL OR (social_yield_override > 0 AND social_yield_override <= 30));

COMMENT ON COLUMN public.properties.social_yield_override IS
  'Randament net estimat (%) setat explicit de admin pentru postările sociale automate. NULL = se folosește intervalul aprobat 6,5%–9,4% net estimat.';