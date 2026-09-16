-- NordOne ApArt Hotel still carried the old "ring-apart-hotel" slug in its URL.
UPDATE public.properties
   SET slug = 'nordone-apart-hotel-premium'
 WHERE id = '27ece8b1-a313-432e-9152-6cacdc29f6d4'
   AND slug = 'ring-apart-hotel-spacious-deluxe';