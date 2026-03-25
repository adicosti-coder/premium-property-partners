-- Remove duplicate POIs, keeping the original entries with correct coordinates
DELETE FROM points_of_interest WHERE id IN (
  '776a8e82-d1e9-4b99-8ead-9ad14487b4cd',
  'a5d332a1-a964-4f02-bd9d-00b24dfdde37',
  'f0e574f0-b5ab-48fe-93bf-579b05c18e23'
);