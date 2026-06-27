
WITH new_keywords(keyword, platform) AS (
  VALUES
    -- OLX direct (short queries convert best on free engines)
    ('apartament proprietar timisoara',                           'olx.ro'),
    ('apartament 2 camere proprietar timisoara',                  'olx.ro'),
    ('apartament 3 camere proprietar timisoara',                  'olx.ro'),
    ('apartament vanzare cetate timisoara',                       'olx.ro'),
    ('apartament vanzare iosefin timisoara',                      'olx.ro'),
    ('apartament vanzare fabric timisoara',                       'olx.ro'),
    ('apartament vanzare dumbravita',                             'olx.ro'),
    ('apartament vanzare aradului timisoara',                     'olx.ro'),
    ('apartament vanzare lipovei timisoara',                      'olx.ro'),
    ('apartament vanzare girocului timisoara',                    'olx.ro'),
    ('apartament inchiriere lung timisoara proprietar',           'olx.ro'),
    ('garsoniera proprietar timisoara',                           'olx.ro'),
    ('penthouse timisoara proprietar',                            'olx.ro'),
    ('apartament nou predare timisoara',                          'olx.ro'),
    ('apartament finisat la cheie timisoara',                     'olx.ro'),
    -- Storia.ro
    ('apartament vanzare timisoara',                              'storia.ro'),
    ('apartament 2 camere timisoara',                             'storia.ro'),
    ('apartament 3 camere timisoara',                             'storia.ro'),
    ('apartament cetate timisoara',                               'storia.ro'),
    ('apartament iosefin timisoara',                              'storia.ro'),
    ('apartament dumbravita timisoara',                           'storia.ro'),
    ('apartament aradului timisoara',                             'storia.ro'),
    ('apartament nou timisoara dezvoltator',                      'storia.ro'),
    -- Imobiliare.ro
    ('apartament 2 camere proprietar timisoara site:imobiliare.ro',      'imobiliare.ro'),
    ('apartament 3 camere proprietar timisoara site:imobiliare.ro',      'imobiliare.ro'),
    ('apartament cetate proprietar timisoara site:imobiliare.ro',        'imobiliare.ro'),
    ('apartament iosefin proprietar timisoara site:imobiliare.ro',       'imobiliare.ro'),
    ('apartament dumbravita proprietar site:imobiliare.ro',              'imobiliare.ro'),
    ('penthouse proprietar timisoara site:imobiliare.ro',                'imobiliare.ro'),
    ('apartament investitie regim hotelier timisoara site:imobiliare.ro','imobiliare.ro'),
    -- Publi24
    ('apartament proprietar timisoara site:publi24.ro',                  'publi24.ro'),
    ('apartament vanzare cetate site:publi24.ro',                        'publi24.ro'),
    ('apartament vanzare dumbravita site:publi24.ro',                    'publi24.ro'),
    ('apartament investitie timisoara site:publi24.ro',                  'publi24.ro'),
    -- Complexuri Premium
    ('apartament isho timisoara proprietar',                      'General'),
    ('isho riverside vanzare proprietar',                         'General'),
    ('apartament paltim proprietar timisoara',                    'General'),
    ('paltim penthouse vanzare timisoara',                        'General'),
    ('apartament city of mara timisoara vanzare',                 'General'),
    ('vox vertical village apartament vanzare',                   'General'),
    ('ateneo apartament timisoara vanzare',                       'General'),
    ('fructus apartament timisoara proprietar',                   'General'),
    ('nord one timisoara apartament vanzare',                     'General'),
    ('xcity towers timisoara apartament proprietar',              'General'),
    ('openville apartament timisoara vanzare',                    'General'),
    ('united business center timisoara apartament',               'General'),
    ('complex studentesc apartament timisoara proprietar',        'General'),
    -- Piață / ROI
    ('apartament investitie regim hotelier timisoara',            'General'),
    ('apartament randament timisoara investitie',                 'General'),
    ('apartament cash-flow timisoara vanzare',                    'General'),
    ('apartament cu chirias timisoara vanzare',                   'General'),
    ('investitie imobiliara timisoara 2026',                      'General'),
    ('oportunitate investitie apartament timisoara',              'General'),
    -- Social Leads
    ('vand apartament timisoara whatsapp proprietar',                     'Facebook Marketplace'),
    ('apartament 2 camere timisoara site:facebook.com/marketplace',       'Facebook Marketplace'),
    ('apartament dumbravita site:facebook.com/marketplace',               'Facebook Marketplace'),
    ('apartament cetate site:facebook.com/marketplace',                   'Facebook Marketplace'),
    ('vand apartament timisoara proprietar "facebook.com/groups"',        'Grupuri Facebook'),
    ('apartament investitie timisoara "facebook.com/groups"',             'Grupuri Facebook'),
    ('imobiliare timisoara fara comision "facebook.com/groups"',          'Grupuri Facebook'),
    -- BursaImobiliara
    ('apartament proprietar timisoara site:bursaimobiliara.ro',           'BursaImobiliara.ro'),
    ('apartament vanzare dumbravita site:bursaimobiliara.ro',             'BursaImobiliara.ro'),
    ('penthouse timisoara site:bursaimobiliara.ro',                       'BursaImobiliara.ro')
)
INSERT INTO public.scraper_search_keywords (keyword, platform, is_active)
SELECT nk.keyword, nk.platform, true
FROM new_keywords nk
WHERE NOT EXISTS (
  SELECT 1 FROM public.scraper_search_keywords s
  WHERE lower(s.keyword) = lower(nk.keyword)
);
