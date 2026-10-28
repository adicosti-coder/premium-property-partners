CREATE OR REPLACE FUNCTION public.developer_agency_signal(p_title text, p_description text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $$
  SELECT CASE
    WHEN t ~ 'dezvoltator' THEN 'dezvoltator'
    WHEN t ~ 'comision\s*0\s*%|0\s*%\s*comision' THEN 'comision 0%'
    WHEN t ~ 'tva\s+(inclus|included)' THEN 'TVA inclus'
    WHEN t ~ 'reprezentan[tțţ][aăe]' THEN 'reprezentanță'
    WHEN t ~ '\mansamblu' THEN 'ansamblu'
    WHEN t ~ 'showroom|birou de vanzari|birou de vânzări' THEN 'birou vânzări/showroom'
  END
  FROM (SELECT lower(coalesce(p_title,'') || ' ' || coalesce(p_description,'')) AS t) x
$$;