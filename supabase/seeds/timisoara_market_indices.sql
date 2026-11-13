-- Seed: reference €/mp (sale) and monthly rent for the calculator's tier-2 fallback.
-- Re-runnable (upsert on zone_key + rooms). rooms = 0 means "all room counts".
-- Values are asking-price medians for 2-room apartments unless stated otherwise.
-- Complex → district mapping: the portal district most often listed for that complex in collected listings.
INSERT INTO public.timisoara_market_indices (zone_key, rooms, sale_eur_sqm, rent_eur_month, source, source_url, period_month)
VALUES
  ('torontalului',       0, 2253, 500, 'VDI.ro oct. 2026 · Torontalului (126 anunțuri vânzare, 117 chirie)', 'https://vdi.ro/presa/octombrie-2026/timisoara', '2026-10-01'),
  ('ring-residence',     0, 2253, 500, 'VDI.ro oct. 2026 · Torontalului (zona ansamblului Ring)', 'https://vdi.ro/presa/octombrie-2026/timisoara', '2026-10-01'),
  ('ateneo',             0, 2253, 500, 'VDI.ro oct. 2026 · Torontalului (zona din anunțurile Ateneo)', 'https://vdi.ro/presa/octombrie-2026/timisoara', '2026-10-01'),
  ('city-of-mara',       0, 2287, 460, 'VDI.ro oct. 2026 · Circumvalațiunii (zona din anunțurile City of Mara)', 'https://vdi.ro/presa/octombrie-2026/timisoara', '2026-10-01'),
  ('fructus',            0, 2287, 460, 'VDI.ro oct. 2026 · Circumvalațiunii (zona din anunțurile Fructus Plaza)', 'https://vdi.ro/presa/octombrie-2026/timisoara', '2026-10-01'),
  ('paltim',             0, 2287, 460, 'VDI.ro oct. 2026 · Circumvalațiunii (zona din anunțurile Paltim)', 'https://vdi.ro/presa/octombrie-2026/timisoara', '2026-10-01'),
  ('vivalia',            0, 2325, 550, 'VDI.ro oct. 2026 · Take Ionescu (zona din anunțurile Vivalia; 42 anunțuri vânzare, 35 chirie)', 'https://vdi.ro/presa/octombrie-2026/timisoara', '2026-10-01'),
  ('xcity',              0, 2380, 550, 'Anunțuri publice XCity Towers sept.–nov. 2026 (mediana prețurilor cerute 2.189–2.927 €/mp); chirie: anunțuri 2 camere colectate', 'https://www.imobiliare.ro/ansamblu-rezidential/xcity-towers-torontalului', '2026-10-01'),
  ('nordone',            0, 2180, NULL, 'Cubix Estate oct. 2026 · Iulius Town (zona din anunțurile NordOne)', 'https://www.cubixestate.ro/blog/pret-apartamente-timisoara-pe-cartiere-noiembrie-2026/', '2026-10-01'),
  ('monarch',            0, 2180, NULL, 'Cubix Estate oct. 2026 · Iulius Town (Monarch folosește reperele NordOne)', 'https://www.cubixestate.ro/blog/pret-apartamente-timisoara-pe-cartiere-noiembrie-2026/', '2026-10-01'),
  ('denya-forest',       0, 1935, 420, 'VDI.ro oct. 2026 · Lipovei (zona Pădurea Verde)', 'https://vdi.ro/presa/octombrie-2026/timisoara', '2026-10-01'),
  ('future-residence',   0, 1800, 350, 'VDI.ro oct. 2026 · Dâmbovița (zona din anunțurile Future Residence)', 'https://vdi.ro/presa/octombrie-2026/timisoara', '2026-10-01'),
  ('central',            0, 1807, 430, 'VDI.ro oct. 2026 · Cetății + Iosefin, medie ponderată după numărul de anunțuri', 'https://vdi.ro/presa/octombrie-2026/timisoara', '2026-10-01'),
  ('complex-studentesc', 0, 2190, 380, 'VDI.ro oct. 2026 · Complex Studențesc', 'https://vdi.ro/presa/octombrie-2026/timisoara', '2026-10-01'),
  ('alenia',             0, 1984, NULL, 'Indicele Imobiliare.ro sept. 2026 · media Timișoara (fără date pe ansamblu)', 'https://propgenius.ro/blog/pret-apartamente-timisoara', '2026-09-01'),
  ('alta-zona',          0, 1984, NULL, 'Indicele Imobiliare.ro sept. 2026 · media Timișoara', 'https://propgenius.ro/blog/pret-apartamente-timisoara', '2026-09-01')
ON CONFLICT (zone_key, rooms) DO UPDATE SET
  sale_eur_sqm = EXCLUDED.sale_eur_sqm,
  rent_eur_month = EXCLUDED.rent_eur_month,
  source = EXCLUDED.source,
  source_url = EXCLUDED.source_url,
  period_month = EXCLUDED.period_month,
  updated_at = now();
