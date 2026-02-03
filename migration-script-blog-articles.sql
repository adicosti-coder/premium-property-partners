-- =====================================================
-- SCRIPT MIGRARE BLOG ARTICLES
-- Proiect destinație: wmctsupnbibchdohbtvl
-- Rulează acest script în SQL Editor din Supabase Dashboard
-- =====================================================

-- 1. CREARE TABELĂ blog_articles
-- =====================================================
CREATE TABLE IF NOT EXISTS public.blog_articles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    title_en TEXT,
    excerpt TEXT NOT NULL,
    excerpt_en TEXT,
    content TEXT NOT NULL,
    content_en TEXT,
    cover_image TEXT,
    category TEXT NOT NULL DEFAULT 'general',
    tags TEXT[] NOT NULL DEFAULT '{}',
    author_name TEXT NOT NULL DEFAULT 'RealTrust',
    is_published BOOLEAN NOT NULL DEFAULT false,
    is_premium BOOLEAN NOT NULL DEFAULT false,
    published_at TIMESTAMP WITH TIME ZONE,
    view_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. ENABLE ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE public.blog_articles ENABLE ROW LEVEL SECURITY;

-- 3. CREATE app_role ENUM (dacă nu există deja)
-- =====================================================
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
    END IF;
END $$;

-- 4. CREATE user_roles TABLE (dacă nu există deja)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 5. CREATE has_role FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 6. RLS POLICIES pentru blog_articles
-- =====================================================

-- Articole publice (non-premium, publicate) sunt vizibile pentru toți
CREATE POLICY "Public articles are publicly readable"
ON public.blog_articles
FOR SELECT
USING ((is_published = true) AND (is_premium = false));

-- Utilizatorii autentificați pot vedea toate articolele publicate (inclusiv premium)
CREATE POLICY "Authenticated users can read all published articles"
ON public.blog_articles
FOR SELECT
USING ((is_published = true) AND (auth.uid() IS NOT NULL));

-- Adminii pot vedea toate articolele
CREATE POLICY "Admins can read all articles"
ON public.blog_articles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Adminii pot insera articole
CREATE POLICY "Admins can insert articles"
ON public.blog_articles
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Adminii pot actualiza articole
CREATE POLICY "Admins can update articles"
ON public.blog_articles
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Adminii pot șterge articole
CREATE POLICY "Admins can delete articles"
ON public.blog_articles
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- 7. RLS POLICIES pentru user_roles
-- =====================================================
CREATE POLICY "Admins can manage roles"
ON public.user_roles
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
USING ((public.has_role(auth.uid(), 'admin')) OR (auth.uid() = user_id));

-- 8. CREATE TRIGGER pentru updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_blog_articles_updated_at ON public.blog_articles;
CREATE TRIGGER update_blog_articles_updated_at
BEFORE UPDATE ON public.blog_articles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 9. INSERT ARTICOLE DE BLOG
-- =====================================================

-- Articolul 1: Timișoara - Investiții Imobiliare
INSERT INTO public.blog_articles (id, slug, title, title_en, excerpt, excerpt_en, content, content_en, cover_image, category, tags, author_name, is_published, is_premium, published_at, view_count, created_at, updated_at)
VALUES (
    '2f129689-5479-4b75-980d-17ab330aee51',
    'timisoara-investitii-imobiliare',
    'Timișoara: Destinația Ideală pentru Investiții Imobiliare',
    'Timișoara: The Ideal Destination for Real Estate Investments',
    'De ce Timișoara devine hub-ul principal pentru investițiile în proprietăți de închiriat din România.',
    'Why Timișoara is becoming the main hub for rental property investments in Romania.',
    '<h2>Potențialul Timișoarei</h2><p>Capitala Banatului se transformă rapid într-una dintre cele mai atractive destinații pentru investiții imobiliare din România.</p><h2>Turism în Creștere</h2><p>După titlul de Capitală Europeană a Culturii 2023, fluxul de turiști a crescut semnificativ, generând cerere pentru cazare de calitate.</p><h2>Hub IT și Business</h2><p>Companiile tech și multinaționalele aduc constant profesioniști care caută cazare pe termen scurt și mediu.</p><h2>Infrastructură în Dezvoltare</h2><p>Aeroportul internațional, autostrăzile și transportul public modern fac orașul accesibil și atractiv.</p><h2>Prețuri Competitive</h2><p>Comparativ cu București sau Cluj, prețurile proprietăților oferă încă oportunități excelente de investiție.</p>',
    '<h2>Timișoara''s Potential</h2><p>The capital of Banat is rapidly transforming into one of Romania''s most attractive destinations for real estate investments.</p><h2>Growing Tourism</h2><p>After the title of European Capital of Culture 2023, tourist flow has increased significantly, generating demand for quality accommodation.</p><h3>Key Tourism Drivers</h3><ul><li>Cultural events and festivals throughout the year</li><li>Historic architecture and pedestrian-friendly city center</li><li>Growing gastronomic scene with excellent restaurants</li><li>Proximity to natural attractions (mountains, thermal spas)</li></ul><h2>IT and Business Hub</h2><p>Tech companies and multinationals constantly bring professionals looking for short and medium-term accommodation.</p><h3>Major Companies Present</h3><ul><li>Continental, Nokia, Flex - technology and automotive</li><li>Atos, Accenture, CGS - IT services</li><li>Procter & Gamble, Linde - industrial operations</li></ul><h2>Developing Infrastructure</h2><p>The international airport, highways, and modern public transport make the city accessible and attractive.</p><h3>Infrastructure Highlights</h3><ul><li>Timișoara Traian Vuia International Airport - direct flights to major European cities</li><li>A1 Highway connection to Bucharest (under expansion)</li><li>New tram lines and modernized public transport</li><li>E-bike sharing and pedestrian areas</li></ul><h2>Competitive Prices</h2><p>Compared to Bucharest or Cluj, property prices still offer excellent investment opportunities.</p><h3>Investment Comparison (Average per sqm, 2026)</h3><ul><li>Bucharest city center: €2,500-3,500/sqm</li><li>Cluj-Napoca center: €2,800-3,800/sqm</li><li>Timișoara center: €1,800-2,500/sqm</li></ul><h2>Rental Yield Potential</h2><ul><li>Short-term rentals: 8-12% annual gross yield</li><li>Long-term rentals: 5-7% annual gross yield</li><li>Appreciation potential: 5-10% annually</li></ul><p><strong>Conclusion:</strong> Timișoara offers a unique combination of growing demand, competitive prices, and excellent infrastructure - making it ideal for both new and experienced property investors.</p>',
    NULL,
    'piață',
    ARRAY['Timișoara', 'investiții', 'imobiliare'],
    'RealTrust',
    true,
    false,
    '2025-12-27 07:33:22.029475+00',
    1,
    '2026-01-03 07:33:22.029475+00',
    '2026-01-31 10:59:08.249285+00'
);

-- Articolul 2: 5 Greșeli Comune
INSERT INTO public.blog_articles (id, slug, title, title_en, excerpt, excerpt_en, content, content_en, cover_image, category, tags, author_name, is_published, is_premium, published_at, view_count, created_at, updated_at)
VALUES (
    '5b20b31f-c9c4-4d29-8e10-5a1884b9177b',
    '5-greseli-comune-administrare',
    '5 Greșeli Comune în Administrarea Proprietăților de Închiriat',
    '5 Common Mistakes in Rental Property Management',
    'Evită aceste greșeli frecvente care pot costa mii de euro pe an proprietarii de apartamente.',
    'Avoid these frequent mistakes that can cost property owners thousands of euros per year.',
    '<h2>Greșelile care îți afectează profitul</h2><p>Mulți proprietari pierd bani din cauza unor greșeli ușor de evitat. Iată care sunt cele mai comune:</p><h2>1. Prețuri Statice</h2><p>Menținerea aceluiași preț tot anul înseamnă pierderi în sezonul de vârf și rate de ocupare scăzute în extrasezon.</p><h2>2. Comunicare Lentă</h2><p>Oaspeții se așteaptă la răspunsuri rapide. Un timp de răspuns de peste o oră poate duce la pierderea rezervării.</p><h2>3. Lipsa Check-in-ului Flexibil</h2><p>Self check-in-ul 24/7 poate crește rezervările cu până la 30%, mai ales pentru călătorii de business.</p><h2>4. Fotografii Neprofesionale</h2><p>Prima impresie contează enorm. Fotografiile slabe pot reduce rata de conversie cu peste 50%.</p><h2>5. Ignorarea Recenziilor</h2><p>Nerespingerea la recenzii negative afectează reputația și clasamentul în rezultatele căutărilor.</p>',
    '<h2>Mistakes That Affect Your Profit</h2><p>Many owners lose money due to easily avoidable mistakes. Here are the most common ones and how to fix them:</p><h2>1. Static Pricing</h2><p>Maintaining the same price all year means losses during peak season and low occupancy rates during off-season.</p><h3>The Solution</h3><ul><li>Implement dynamic pricing based on demand</li><li>Increase rates 20-40% during peak periods</li><li>Offer discounts for longer stays in slow periods</li><li>Use pricing tools or hire a manager who optimizes pricing</li></ul><h2>2. Slow Communication</h2><p>Guests expect fast responses. A response time of over one hour can lead to losing the booking.</p><h3>The Solution</h3><ul><li>Set up auto-responders for common questions</li><li>Use templates for frequent inquiries</li><li>Enable mobile notifications for new messages</li><li>Aim for under 15-minute response during business hours</li></ul><h2>3. Lack of Flexible Check-in</h2><p>Self check-in 24/7 can increase bookings by up to 30%, especially for business travelers.</p><h3>The Solution</h3><ul><li>Install a smart lock (€150-300 investment)</li><li>Create clear video instructions for entry</li><li>Have backup access method ready</li><li>Test the system before going live</li></ul><h2>4. Unprofessional Photos</h2><p>First impression matters enormously. Poor photos can reduce conversion rate by over 50%.</p><h3>The Solution</h3><ul><li>Invest €150-300 in professional photography</li><li>Stage the property before shooting</li><li>Use natural lighting</li><li>Update photos seasonally</li></ul><h2>5. Ignoring Reviews</h2><p>Not responding to negative reviews affects reputation and search ranking.</p><h3>The Solution</h3><ul><li>Respond to EVERY review - positive and negative</li><li>Thank guests for positive feedback</li><li>Address concerns professionally in negative reviews</li><li>Show what you''ve improved based on feedback</li></ul><h2>Bonus: 3 More Common Mistakes</h2><h3>6. Incomplete Listings</h3><p>Missing amenities, vague descriptions, or outdated info hurts conversions.</p><h3>7. Neglecting Maintenance</h3><p>Small issues become big problems. Preventive maintenance saves money.</p><h3>8. Poor Neighbor Relations</h3><p>One complaint can lead to rental restrictions. Communicate with neighbors proactively.</p><p><strong>Key takeaway:</strong> These mistakes are all fixable with attention and process. The difference between average and excellent performance often comes down to avoiding these common pitfalls.</p>',
    NULL,
    'sfaturi',
    ARRAY['greșeli', 'management', 'proprietăți'],
    'RealTrust',
    true,
    false,
    '2026-01-01 07:33:22.029475+00',
    0,
    '2026-01-03 07:33:22.029475+00',
    '2026-01-31 10:59:44.068324+00'
);

-- Articolul 3: Automatizarea în Industria Ospitalității
INSERT INTO public.blog_articles (id, slug, title, title_en, excerpt, excerpt_en, content, content_en, cover_image, category, tags, author_name, is_published, is_premium, published_at, view_count, created_at, updated_at)
VALUES (
    '54eed1bf-dd32-4c7a-af78-4f2c84f3d2f7',
    'automatizare-industria-ospitalitatii',
    'Automatizarea în Industria Ospitalității: Viitorul Este Aici',
    'Automation in Hospitality: The Future Is Here',
    'Cum tehnologia transformă modul în care administrăm proprietățile de închiriat pe termen scurt.',
    'How technology is transforming the way we manage short-term rental properties.',
    '<h2>Revoluția Automatizării</h2><p>Tehnologia schimbă fundamental industria ospitalității. De la check-in automat la prețuri dinamice bazate pe AI, automatizarea devine esențială.</p><h2>Smart Locks și Self Check-in</h2><p>Încuietorile inteligente permit oaspeților să ajungă oricând, eliminând necesitatea predării cheilor în persoană.</p><h2>Sisteme de Mesagerie Automatizată</h2><p>Răspunsurile automate pot gestiona întrebările frecvente, economisind ore întregi zilnic.</p><h2>Pricing Dinamic cu AI</h2><p>Algoritmii analizează cererea, competiția și evenimentele locale pentru a seta prețul optim în timp real.</p><h2>Curățenie Coordonată</h2><p>Aplicațiile de coordonare a curățeniei asigură că apartamentul este pregătit la timp pentru fiecare oaspete.</p>',
    '<h2>The Automation Revolution</h2><p>Technology is fundamentally changing the hospitality industry. From automatic check-in to AI-based dynamic pricing, automation is becoming essential.</p><h2>Smart Locks and Self Check-in</h2><p>Smart locks allow guests to arrive anytime, eliminating the need for in-person key handover.</p><h3>Benefits of Smart Locks</h3><ul><li>24/7 guest flexibility - no waiting for host</li><li>Unique codes per booking - enhanced security</li><li>Remote access management - change codes instantly</li><li>Activity logs - know when guests arrive and leave</li></ul><h2>Automated Messaging Systems</h2><p>Automatic responses can handle frequent questions, saving entire hours daily.</p><h3>Message Automation Workflow</h3><ol><li><strong>Booking confirmation:</strong> Instant thank you + what to expect</li><li><strong>Pre-arrival (24h):</strong> Check-in instructions and directions</li><li><strong>Day of arrival:</strong> Access codes and parking info</li><li><strong>During stay:</strong> Response templates for common questions</li><li><strong>Post-checkout:</strong> Thank you + review request</li></ol><h2>Dynamic Pricing with AI</h2><p>Algorithms analyze demand, competition, and local events to set the optimal price in real time.</p><h3>Factors AI Pricing Considers</h3><ul><li>Local events and conferences</li><li>Competitor pricing changes</li><li>Historical booking patterns</li><li>Lead time to booking date</li><li>Day of week and seasonality</li></ul><h2>Coordinated Cleaning</h2><p>Cleaning coordination apps ensure the apartment is prepared on time for each guest.</p><h3>Cleaning App Features</h3><ul><li>Automatic task assignment after checkout</li><li>Photo checklists for quality control</li><li>Real-time status updates</li><li>Inventory and supply tracking</li></ul><h2>Channel Managers</h2><p>Synchronize availability across Booking, Airbnb, VRBO, and direct bookings automatically.</p><h2>Getting Started with Automation</h2><ol><li>Start with automated messaging (lowest cost, highest impact)</li><li>Add smart lock for self check-in flexibility</li><li>Implement dynamic pricing when you have booking history</li><li>Scale with cleaning coordination and channel management</li></ol><p><strong>Key insight:</strong> Automation is not about replacing human touch - it''s about freeing time for what truly matters: exceptional guest experiences.</p>',
    NULL,
    'tehnologie',
    ARRAY['automatizare', 'tehnologie', 'smart home'],
    'RealTrust',
    true,
    false,
    '2025-12-29 07:33:22.029475+00',
    0,
    '2026-01-03 07:33:22.029475+00',
    '2026-01-31 10:59:25.549081+00'
);

-- Articolul 4: Ghid Maximizare Venituri
INSERT INTO public.blog_articles (id, slug, title, title_en, excerpt, excerpt_en, content, content_en, cover_image, category, tags, author_name, is_published, is_premium, published_at, view_count, created_at, updated_at)
VALUES (
    '72d5191d-85ef-4c2c-8714-0cd70be676ae',
    'ghid-maximizare-venituri-inchirieri',
    'Ghid Complet: Cum să Maximizezi Veniturile din Închirieri pe Termen Scurt',
    'Complete Guide: How to Maximize Revenue from Short-Term Rentals',
    'Descoperă strategiile esențiale pentru a-ți crește veniturile din închirierile pe termen scurt în Timișoara.',
    'Discover essential strategies to increase your short-term rental income in Timișoara.',
    '<h2>Introducere</h2><p>Închirierea pe termen scurt a devenit una dintre cele mai profitabile modalități de a valorifica o proprietate imobiliară. În acest ghid, vom explora strategiile cheie pentru maximizarea veniturilor.</p><h2>1. Prețuri Dinamice</h2><p>Ajustarea prețurilor în funcție de cerere, sezon și evenimente locale poate crește veniturile cu până la 40%. Utilizează instrumente de pricing dinamic pentru a rămâne competitiv.</p><h2>2. Fotografii Profesionale</h2><p>Proprietățile cu fotografii profesionale primesc cu 24% mai multe rezervări. Investiția în fotografii de calitate se amortizează rapid.</p><h2>3. Amenajare și Curățenie</h2><p>Un apartament bine amenajat și impecabil de curat primește recenzii excelente, care la rândul lor atrag mai mulți oaspeți.</p><h2>Concluzie</h2><p>Succesul în închirierile pe termen scurt necesită atenție la detalii și adaptare constantă la piață.</p>',
    '<h2>Introduction</h2><p>Short-term renting has become one of the most profitable ways to leverage a real estate property. In this guide, we explore key strategies for maximizing revenue.</p><h2>1. Dynamic Pricing</h2><p>Adjusting prices based on demand, season, and local events can increase revenue by up to 40%. Use dynamic pricing tools to stay competitive.</p><h3>Pricing Strategy Framework</h3><ul><li><strong>Base rate:</strong> Your standard weekday price covering all costs + desired margin</li><li><strong>Weekend premium:</strong> +15-25% on Friday and Saturday nights</li><li><strong>Event pricing:</strong> +30-100% during festivals, conferences, major events</li><li><strong>Low season discount:</strong> -10-20% with increased minimum stay</li><li><strong>Last minute:</strong> Consider discounts 3-7 days out if calendar is empty</li></ul><h2>2. Professional Photography</h2><p>Properties with professional photos receive 24% more bookings. The investment in quality photos pays off quickly.</p><h3>Photo Checklist</h3><ul><li>Wide-angle hero shot of living area</li><li>Bedroom with perfectly made bed</li><li>Kitchen highlighting key appliances</li><li>Bathroom - clean and bright</li><li>Any special features (balcony, view, workspace)</li><li>Building exterior and surroundings</li></ul><h2>3. Furnishing and Cleanliness</h2><p>A well-furnished and spotlessly clean apartment receives excellent reviews, which in turn attract more guests.</p><h3>Essential Amenities</h3><ul><li>Fast WiFi (100+ Mbps)</li><li>Quality mattress and linens</li><li>Air conditioning and heating</li><li>Fully equipped kitchen</li><li>Smart TV with streaming</li><li>Work desk for remote workers</li></ul><h2>4. Optimized Listing Description</h2><p>Your description should highlight unique features and answer guest questions before they ask.</p><h3>Description Structure</h3><ol><li>Compelling opening highlighting main benefit</li><li>Space description (rooms, layout, sleeping arrangements)</li><li>Key amenities and features</li><li>Location benefits (nearby attractions, transport)</li><li>What makes you different from competitors</li></ol><h2>5. Guest Experience Excellence</h2><p>Exceeding expectations leads to 5-star reviews and repeat bookings.</p><h3>Experience Enhancers</h3><ul><li>Welcome message with local tips</li><li>Small welcome gift (local treats)</li><li>Digital guidebook with recommendations</li><li>Fast response to any questions or issues</li></ul><h2>Conclusion</h2><p>Success in short-term rentals requires attention to detail and constant market adaptation. The properties that consistently outperform combine great pricing, excellent presentation, and outstanding guest service.</p>',
    NULL,
    'ghiduri',
    ARRAY['închirieri', 'venituri', 'strategii'],
    'RealTrust',
    true,
    false,
    '2026-01-03 07:33:22.029475+00',
    0,
    '2026-01-03 07:33:22.029475+00',
    '2026-01-31 11:00:02.730953+00'
);

-- Articolul 5: Smart Locks Ghid Complet
INSERT INTO public.blog_articles (id, slug, title, title_en, excerpt, excerpt_en, content, content_en, cover_image, category, tags, author_name, is_published, is_premium, published_at, view_count, created_at, updated_at)
VALUES (
    '8b08fa79-0f67-469a-89d4-6d19fa53b91c',
    'smart-locks-ghid-complet',
    'Smart locks: ghidul complet',
    'Smart Locks: The Complete Guide',
    'Tot ce trebuie să știi despre încuietorile inteligente pentru apartamente în regim hotelier.',
    'Everything you need to know about choosing, installing, and managing smart locks for your rental property.',
    '<h2>De ce smart locks</h2><p>Încuietorile inteligente sunt o investiție care se amortizează rapid prin eficiența operațională și flexibilitatea oferită oaspeților.</p><h2>Tipuri de Smart Locks</h2><h3>1. Cu Cod Numeric (Keypad)</h3><ul><li>Cod unic pentru fiecare oaspete</li><li>Funcționează pe baterii</li><li>Nu necesită internet</li><li>Cel mai simplu și fiabil tip</li></ul><h3>2. Cu Bluetooth</h3><ul><li>Acces prin smartphone</li><li>Log de activitate</li><li>Control de aproape</li><li>Necesită aplicație mobilă</li></ul><h3>3. Cu WiFi</h3><ul><li>Control în timp real de oriunde</li><li>Integrare cu PMS și channel managers</li><li>Schimbat coduri remote</li><li>Notificări la intrare/ieșire</li></ul><h3>4. Combinate</h3><ul><li>Mai multe opțiuni de acces (cod + Bluetooth + cheie)</li><li>Redundanță pentru siguranță</li><li>Flexibilitate maximă</li></ul><h2>Mărci Recomandate</h2><h3>Nuki (European)</h3><ul><li>Popular în Europa, ușor de instalat</li><li>Se montează peste yala existentă</li><li>Preț: 200-350 EUR</li><li>Pro: Nu schimbi ușa/yala</li></ul><h3>Yale (Tradițional + Modern)</h3><ul><li>Brand de încredere, fiabilitate</li><li>Diverse opțiuni pentru diferite uși</li><li>Preț: 150-400 EUR</li><li>Pro: Suport și service bun</li></ul><h3>Tedee (Compact)</h3><ul><li>Design minimalist</li><li>Foarte compact și discret</li><li>Preț: 250-350 EUR</li><li>Pro: Nu atrage atenția</li></ul><h3>August (Design Elegant)</h3><ul><li>Estetic și funcțional</li><li>Integrare bună cu smart home</li><li>Preț: 200-300 EUR</li></ul><h2>Considerații Importante</h2><h3>Durata Bateriei</h3><ul><li>Majoritatea durează 6-12 luni</li><li>Setează reminder pentru schimbare</li><li>Păstrează baterii de rezervă în apartament</li></ul><h3>Metoda de Backup</h3><ul><li>Cheie fizică în lockbox extern</li><li>Cheie la vecin de încredere</li><li>Cod master pentru situații de urgență</li></ul><h3>Compatibilitate Ușă</h3><ul><li>Verifică tipul de yală (euro-cilindru, etc.)</li><li>Măsoară grosimea ușii</li><li>Unele necesită uși speciale</li></ul><h2>Integrare cu Platforme</h2><p>Smart lock-urile pot fi conectate la:</p><ul><li>Channel managers pentru coduri automate</li><li>Sisteme PMS</li><li>Airbnb și Booking.com direct (unele modele)</li></ul><h2>Investiție și ROI</h2><ul><li><strong>Cost:</strong> 150-400 EUR per unitate</li><li><strong>Amortizare:</strong> 6-12 luni prin economia de timp</li><li><strong>Beneficii:</strong> Flexibilitate, profesionalism, scalabilitate</li></ul><p><strong>Concluzie:</strong> O încuietoare smart este prima ta „angajată virtuală" - lucrează 24/7, nu face greșeli și nu cere salariu.</p>',
    '<h2>Why Smart Locks</h2><p>Smart locks are an investment that pays off quickly through operational efficiency and the flexibility offered to guests.</p><h2>Types of Smart Locks</h2><h3>1. Keypad (Numeric Code)</h3><ul><li>Unique code for each guest</li><li>Battery operated</li><li>No internet required</li><li>Simplest and most reliable type</li></ul><h3>2. Bluetooth</h3><ul><li>Smartphone access</li><li>Activity log</li><li>Nearby control</li><li>Requires mobile app</li></ul><h3>3. WiFi Connected</h3><ul><li>Real-time control from anywhere</li><li>Integration with PMS and channel managers</li><li>Remote code changing</li><li>Entry/exit notifications</li></ul><h3>4. Combined</h3><ul><li>Multiple access options (code + Bluetooth + key)</li><li>Redundancy for safety</li><li>Maximum flexibility</li></ul><h2>Recommended Brands</h2><h3>Nuki (European)</h3><ul><li>Popular in Europe, easy to install</li><li>Mounts over existing lock</li><li>Price: €200-350</li><li>Pro: No door/lock changes needed</li></ul><h3>Yale (Traditional + Modern)</h3><ul><li>Trusted brand, reliability</li><li>Various options for different doors</li><li>Price: €150-400</li><li>Pro: Good support and service</li></ul><h3>Tedee (Compact)</h3><ul><li>Minimalist design</li><li>Very compact and discreet</li><li>Price: €250-350</li><li>Pro: Doesn''t attract attention</li></ul><h3>August (Elegant Design)</h3><ul><li>Aesthetic and functional</li><li>Good smart home integration</li><li>Price: €200-300</li></ul><h2>Important Considerations</h2><h3>Battery Life</h3><ul><li>Most last 6-12 months</li><li>Set reminder for replacement</li><li>Keep spare batteries in apartment</li></ul><h3>Backup Access Method</h3><ul><li>Physical key in external lockbox</li><li>Key with trusted neighbor</li><li>Master code for emergencies</li></ul><h3>Door Compatibility</h3><ul><li>Check lock type (euro-cylinder, etc.)</li><li>Measure door thickness</li><li>Some require special doors</li></ul><h2>Platform Integration</h2><p>Smart locks can connect to:</p><ul><li>Channel managers for automatic codes</li><li>PMS systems</li><li>Airbnb and Booking.com directly (some models)</li></ul><h2>Investment and ROI</h2><ul><li><strong>Cost:</strong> €150-400 per unit</li><li><strong>Payback:</strong> 6-12 months through time savings</li><li><strong>Benefits:</strong> Flexibility, professionalism, scalability</li></ul><p><strong>Conclusion:</strong> A smart lock is your first "virtual employee" - works 24/7, makes no mistakes, and doesn''t ask for salary.</p>',
    '/src/assets/blog/smart-locks.jpg',
    'Imobiliare',
    ARRAY['smart-lock', 'tehnologie', 'automatizare'],
    'RealTrust',
    true,
    false,
    '2026-01-23 18:32:17.661831+00',
    0,
    '2026-01-23 18:32:17.661831+00',
    '2026-01-31 11:01:08.444625+00'
);

-- Articolul 6: Pricing Weekends
INSERT INTO public.blog_articles (id, slug, title, title_en, excerpt, excerpt_en, content, content_en, cover_image, category, tags, author_name, is_published, is_premium, published_at, view_count, created_at, updated_at)
VALUES (
    'e020808e-3976-432f-81d8-0761025c07ef',
    'pricing-weekends-strategii-profitabile',
    'Pricing weekends: strategii pentru weekenduri profitabile',
    'Weekend Pricing: Strategies for Profitable Weekends',
    'Cum să optimizezi prețurile pentru weekend și să maximizezi veniturile din zilele cu cerere mare.',
    'Learn how to optimize your weekend rates to maximize revenue throughout the year.',
    '<h2>Dinamica weekendurilor</h2><p>Weekendurile reprezintă o oportunitate de aur pentru proprietarii de apartamente în regim hotelier. Vineri-duminică au adesea pattern-uri de cerere diferite față de zilele săptămânii.</p><h2>Factori de Considerat</h2><h3>1. Evenimentele Locale</h3><ul><li>Concerte, festivaluri, conferințe</li><li>Meciuri sportive și competiții</li><li>Târguri și expoziții</li><li>Monitorizează calendarul local constant</li></ul><h3>2. Sărbătorile</h3><ul><li>Zile libere și weekenduri prelungite</li><li>1 Mai, 1 Decembrie, Paște, Crăciun</li><li>Sărbători minore = micro-creșteri de cerere</li></ul><h3>3. Sezonalitatea</h3><ul><li>Vara: turism de leisure dominant</li><li>Iarna: cerere mai scăzută, focus pe business</li><li>Toamna: cel mai activ sezon business</li></ul><h3>4. Competiția</h3><ul><li>Ce fac alți proprietari din zonă</li><li>Monitorizează prețurile competitorilor</li><li>Poziționează-te strategic</li></ul><h2>Strategii de Pricing pentru Weekend</h2><h3>Tarife Premium Weekend</h3><ul><li>Vineri și sâmbătă: +15-25% față de zilele de lucru</li><li>Duminică: similar sau ușor sub weekend</li><li>Evenimente speciale: +30-100%</li></ul><h3>Sejur Minim (Min-Stay)</h3><ul><li>Weekend standard: minim 2 nopți</li><li>Evenimente mari: minim 3 nopți</li><li>Reduce turnover și costurile de curățenie</li></ul><h3>Gap Night Discounts</h3><p>Dacă joi e liber înainte de un check-in vineri, oferă discount pentru a umple:</p><ul><li>-10-15% pentru noaptea de joi</li><li>Comunică proactiv cu potențialii oaspeți</li></ul><h3>Last Minute Weekend</h3><ul><li>Dacă e gol cu 3 zile înainte, reduce puțin</li><li>Nu sacrifica prea mult - weekend gol e rar</li><li>Atenție la rezervările de party (risc ridicat)</li></ul><h2>Ajustări Sezoniere</h2><h3>Weekenduri de Vară</h3><ul><li>Premium maxim (+25-40%)</li><li>Min-stay: 2-3 nopți obligatoriu</li><li>Focus pe familii și grupuri</li></ul><h3>Weekenduri de Iarnă</h3><ul><li>Focus pe sejururi mai lungi</li><li>Oferă discounturi pentru 3+ nopți</li><li>Excepție: sărbătorile de iarnă</li></ul><h3>Weekenduri cu Evenimente</h3><ul><li>Pricing dinamic bazat pe cerere</li><li>Ajustează cu 2-3 săptămâni înainte</li><li>Monitorizează rata de ocupare din zonă</li></ul><h2>Instrumente Recomandate</h2><ul><li>Software de pricing dinamic (PriceLabs, Wheelhouse)</li><li>Calendar de evenimente locale</li><li>Alerte pentru competitori</li><li>Statistici din platforme (Booking, Airbnb)</li></ul><h2>Metrici de Urmărit</h2><ul><li>Ocupare weekend vs. săptămână</li><li>ADR weekend vs. săptămână</li><li>Lead time pentru rezervări weekend</li><li>Sursă rezervări (direct vs. platforme)</li></ul><p><strong>Concluzie:</strong> Prețul corect la momentul corect face diferența între 70% și 95% ocupare. Weekendurile sunt cele mai valoroase nopți - tratează-le ca atare.</p>',
    '<h2>Weekend Dynamics</h2><p>Weekends represent a golden opportunity for short-term rental property owners. Friday-Sunday often have different demand patterns compared to weekdays.</p><h2>Factors to Consider</h2><h3>1. Local Events</h3><ul><li>Concerts, festivals, conferences</li><li>Sports matches and competitions</li><li>Fairs and exhibitions</li><li>Constantly monitor the local calendar</li></ul><h3>2. Holidays</h3><ul><li>Bank holidays and extended weekends</li><li>National holidays, Easter, Christmas</li><li>Minor holidays = micro demand increases</li></ul><h3>3. Seasonality</h3><ul><li>Summer: dominant leisure tourism</li><li>Winter: lower demand, business focus</li><li>Autumn: most active business season</li></ul><h3>4. Competition</h3><ul><li>What other owners in the area are doing</li><li>Monitor competitor prices</li><li>Position yourself strategically</li></ul><h2>Weekend Pricing Strategies</h2><h3>Premium Weekend Rates</h3><ul><li>Friday and Saturday: +15-25% over weekdays</li><li>Sunday: similar or slightly below weekend</li><li>Special events: +30-100%</li></ul><h3>Minimum Stay (Min-Stay)</h3><ul><li>Standard weekend: minimum 2 nights</li><li>Major events: minimum 3 nights</li><li>Reduces turnover and cleaning costs</li></ul><h3>Gap Night Discounts</h3><p>If Thursday is empty before a Friday check-in, offer discount to fill:</p><ul><li>-10-15% for Thursday night</li><li>Proactively communicate with potential guests</li></ul><h3>Last Minute Weekend</h3><ul><li>If empty 3 days before, reduce slightly</li><li>Don''t sacrifice too much - empty weekend is rare</li><li>Beware of party bookings (high risk)</li></ul><h2>Seasonal Adjustments</h2><h3>Summer Weekends</h3><ul><li>Maximum premium (+25-40%)</li><li>Min-stay: 2-3 nights mandatory</li><li>Focus on families and groups</li></ul><h3>Winter Weekends</h3><ul><li>Focus on longer stays</li><li>Offer discounts for 3+ nights</li><li>Exception: winter holidays</li></ul><h3>Event Weekends</h3><ul><li>Dynamic pricing based on demand</li><li>Adjust 2-3 weeks in advance</li><li>Monitor area occupancy rate</li></ul><h2>Recommended Tools</h2><ul><li>Dynamic pricing software (PriceLabs, Wheelhouse)</li><li>Local events calendar</li><li>Competitor alerts</li><li>Platform statistics (Booking, Airbnb)</li></ul><h2>Metrics to Track</h2><ul><li>Weekend vs. weekday occupancy</li><li>Weekend vs. weekday ADR</li><li>Lead time for weekend bookings</li><li>Booking source (direct vs. platforms)</li></ul><p><strong>Conclusion:</strong> The right price at the right time makes the difference between 70% and 95% occupancy. Weekends are the most valuable nights - treat them as such.</p>',
    '/src/assets/blog/pricing-weekends.jpg',
    'Imobiliare',
    ARRAY['pricing', 'weekend', 'strategie'],
    'RealTrust',
    true,
    false,
    '2026-01-23 18:32:17.661831+00',
    0,
    '2026-01-23 18:32:17.661831+00',
    '2026-01-31 11:03:04.016075+00'
);

-- Articolul 7: Housekeeping și QC
INSERT INTO public.blog_articles (id, slug, title, title_en, excerpt, excerpt_en, content, content_en, cover_image, category, tags, author_name, is_published, is_premium, published_at, view_count, created_at, updated_at)
VALUES (
    'a2da4b17-ced5-4dd2-81c4-9a37c1f3dc28',
    'housekeeping-standarde-hoteliere',
    'Housekeeping: standarde hoteliere pentru apartamente',
    'Housekeeping: Hotel Standards for Apartments',
    'Checklisturi complete și proceduri de quality control pentru curățenie la nivel de hotel.',
    'Complete checklists and quality control procedures for hotel-level cleaning.',
    '<h2>Standardul nostru</h2><p>Fiecare apartament este pregătit ca și cum ar fi prima dată când primește oaspeți. Standardele hoteliere nu sunt opționale - sunt minimul acceptabil.</p><h2>De Ce Contează Standardele Hoteliere</h2><ul><li>Oaspeții compară cu hotelurile</li><li>Curățenia e criteriul #1 în recenzii</li><li>Consistența construiește reputație</li><li>Detaliile transformă experiența</li></ul><h2>Checklist Complet de Curățenie</h2><h3>Bucătărie</h3><ul><li>Electrocasnice: interior și exterior curățat</li><li>Aragaz: fără urme de grăsime sau arsuri</li><li>Frigider: gol, curat, fără mirosuri</li><li>Dulapuri: interior curat, veselă aranjată</li><li>Chiuvetă: strălucitoare, fără resturi</li><li>Gunoi: sac nou, coș dezinfectat</li></ul><h3>Baie</h3><ul><li>Toaletă: dezinfectată complet, inclusiv baza</li><li>Duș/cadă: fără calcar, fără mucegai</li><li>Chiuvetă: strălucitoare, robinete curate</li><li>Oglindă: fără pete sau urme</li><li>Prosoape: proaspete, împăturite uniform</li><li>Podea: curată, uscată</li></ul><h3>Dormitor</h3><ul><li>Lenjerie: proaspătă, fără pete sau fire trase</li><li>Perne și plapumă: scuturate, aranjate simetric</li><li>Sub pat: aspirat, fără praf</li><li>Noptiere: șterse, organizate</li><li>Dulapuri: golite pentru oaspeți, umerașe pregătite</li></ul><h3>Living</h3><ul><li>Canapea: aspirată, perne aranjate</li><li>Mese: curate, fără urme de pahare</li><li>Televizor: ecran fără amprente</li><li>Telecomenzile: dezinfectate</li><li>Ferestre: curate interior (exterior periodic)</li></ul><h2>Staging (Aranjare)</h2><h3>Elemente Esențiale</h3><ul><li>Prosoape rulou decorativ în baie</li><li>Welcome kit: cafea, ceai, dulciuri locale</li><li>Ghid digital pregătit (QR code vizibil)</li><li>Termostat setat la temperatura confortabilă</li><li>Toate luminile funcționale</li></ul><h3>Tușe Premium</h3><ul><li>Flori proaspete (opțional dar apreciat)</li><li>Difuzor cu miros plăcut, discret</li><li>Pături decorative pe canapea</li><li>Lumânări (doar decorative, nu aprinse)</li></ul><h2>Controlul Calității (QC)</h2><h3>Photo Checklist</h3><p>Echipa de curățenie trimite după fiecare pregătire:</p><ol><li>Foto living - vedere generală</li><li>Foto dormitor - pat aranjat</li><li>Foto baie - toaletă și prosoape</li><li>Foto bucătărie - aragaz și chiuvetă</li></ol><h3>Verificare Pre-Check-in</h3><ul><li>Verificare finală cu 2-3 ore înainte</li><li>Test funcționare: lumini, AC, WiFi</li><li>Miros plăcut la intrare</li><li>Temperatură confortabilă</li></ul><h2>Kit Standard de Consumabile</h2><ul><li>Săpun lichid premium (nu cel mai ieftin)</li><li>Șampon și gel de duș</li><li>Hârtie igienică (minim 2 role)</li><li>Prosop de bucătărie</li><li>Săculeți de gunoi</li><li>Capsule cafea (dacă ai espressor)</li><li>Apă îmbuteliată în frigider</li></ul><h2>Timeline Standard</h2><ul><li>Curățenie completă: 2-3 ore (în funcție de mărime)</li><li>Inspecție și staging: 20-30 minute</li><li>Buffer înainte de check-in: minim 2 ore</li></ul><p><strong>Concluzie:</strong> Curățenia impecabilă nu este un bonus, este minimul acceptabil. Fiecare oaspete merită să găsească apartamentul perfect.</p>',
    '<h2>Our Standard</h2><p>Every apartment is prepared as if it were the first time receiving guests. Hotel standards are not optional - they are the acceptable minimum.</p><h2>Why Hotel Standards Matter</h2><ul><li>Guests compare with hotels</li><li>Cleanliness is criterion #1 in reviews</li><li>Consistency builds reputation</li><li>Details transform the experience</li></ul><h2>Complete Cleaning Checklist</h2><h3>Kitchen</h3><ul><li>Appliances: interior and exterior cleaned</li><li>Stove: no grease marks or burns</li><li>Refrigerator: empty, clean, odor-free</li><li>Cabinets: interior clean, dishes arranged</li><li>Sink: sparkling, no residue</li><li>Trash: new bag, disinfected bin</li></ul><h3>Bathroom</h3><ul><li>Toilet: completely disinfected, including base</li><li>Shower/tub: no limescale, no mold</li><li>Sink: sparkling, clean faucets</li><li>Mirror: no spots or marks</li><li>Towels: fresh, uniformly folded</li><li>Floor: clean, dry</li></ul><h3>Bedroom</h3><ul><li>Linens: fresh, no stains or loose threads</li><li>Pillows and duvet: fluffed, symmetrically arranged</li><li>Under bed: vacuumed, dust-free</li><li>Nightstands: wiped, organized</li><li>Closets: emptied for guests, hangers ready</li></ul><h3>Living Room</h3><ul><li>Sofa: vacuumed, pillows arranged</li><li>Tables: clean, no glass marks</li><li>TV: screen fingerprint-free</li><li>Remote controls: disinfected</li><li>Windows: clean interior (exterior periodically)</li></ul><h2>Staging</h2><h3>Essential Elements</h3><ul><li>Decorative towel rolls in bathroom</li><li>Welcome kit: coffee, tea, local treats</li><li>Digital guide ready (visible QR code)</li><li>Thermostat set to comfortable temperature</li><li>All lights functional</li></ul><h3>Premium Touches</h3><ul><li>Fresh flowers (optional but appreciated)</li><li>Diffuser with pleasant, discreet scent</li><li>Decorative blankets on sofa</li><li>Candles (decorative only, not lit)</li></ul><h2>Quality Control (QC)</h2><h3>Photo Checklist</h3><p>Cleaning team sends after each preparation:</p><ol><li>Living room photo - general view</li><li>Bedroom photo - made bed</li><li>Bathroom photo - toilet and towels</li><li>Kitchen photo - stove and sink</li></ol><h3>Pre-Check-in Verification</h3><ul><li>Final check 2-3 hours before</li><li>Function test: lights, AC, WiFi</li><li>Pleasant scent upon entry</li><li>Comfortable temperature</li></ul><h2>Standard Supply Kit</h2><ul><li>Premium liquid soap (not the cheapest)</li><li>Shampoo and shower gel</li><li>Toilet paper (minimum 2 rolls)</li><li>Kitchen towel</li><li>Trash bags</li><li>Coffee capsules (if you have espresso machine)</li><li>Bottled water in refrigerator</li></ul><h2>Standard Timeline</h2><ul><li>Complete cleaning: 2-3 hours (depending on size)</li><li>Inspection and staging: 20-30 minutes</li><li>Buffer before check-in: minimum 2 hours</li></ul><p><strong>Conclusion:</strong> Impeccable cleanliness is not a bonus, it is the acceptable minimum. Every guest deserves to find the apartment perfect.</p>',
    '/src/assets/blog/housekeeping-qc.jpg',
    'Imobiliare',
    ARRAY['housekeeping', 'curățenie', 'QC', 'standarde'],
    'RealTrust',
    true,
    false,
    '2026-01-23 18:32:17.661831+00',
    0,
    '2026-01-23 18:32:17.661831+00',
    '2026-01-31 11:02:05.249285+00'
);

-- Articolul 8: Staging și Curățenie
INSERT INTO public.blog_articles (id, slug, title, title_en, excerpt, excerpt_en, content, content_en, cover_image, category, tags, author_name, is_published, is_premium, published_at, view_count, created_at, updated_at)
VALUES (
    '4f53a1c2-8b32-4c17-9e2f-7d6a8b9c0d12',
    'staging-curatenie-apartament-inchiriat',
    'Staging și curățenie: pregătirea apartamentului pentru oaspeți',
    'Staging and Cleaning: Preparing Your Apartment for Guests',
    'Cum să pregătești apartamentul pentru a oferi o experiență de 5 stele oaspeților tăi.',
    'How to prepare your apartment to deliver a 5-star experience to your guests.',
    '<h2>Importanța primei impresii</h2><p>Momentul în care oaspetele intră pe ușă setează tonul întregului sejur. Un apartament impecabil și atent aranjat creează instantaneu o experiență premium.</p><h2>Checklist de Staging</h2><ul><li>Lumini aprinse în zonele cheie</li><li>Temperatura confortabilă (21-23°C)</li><li>Miros plăcut și subtil</li><li>Prosoape fresh, aranjate decorativ</li><li>Lenjerie de pat impecabilă</li><li>Welcome kit vizibil</li></ul><h2>Kit de Bun Venit</h2><ul><li>Cafea și ceai de calitate</li><li>Ciocolată sau dulciuri locale</li><li>Apă îmbuteliată</li><li>Fructe proaspete (opțional)</li><li>Notă de bun venit personalizată</li></ul><p><strong>Regula de aur:</strong> Tratează fiecare check-in ca pe o premieră de hotel 5 stele.</p>',
    '<h2>The Importance of First Impressions</h2><p>The moment the guest walks in sets the tone for the entire stay. An impeccable and thoughtfully arranged apartment instantly creates a premium experience.</p><h2>Staging Checklist</h2><ul><li>Lights on in key areas</li><li>Comfortable temperature (21-23°C)</li><li>Pleasant and subtle scent</li><li>Fresh towels, decoratively arranged</li><li>Impeccable bed linens</li><li>Visible welcome kit</li></ul><h2>Welcome Kit</h2><ul><li>Quality coffee and tea</li><li>Chocolate or local sweets</li><li>Bottled water</li><li>Fresh fruit (optional)</li><li>Personalized welcome note</li></ul><p><strong>Golden rule:</strong> Treat every check-in like a 5-star hotel premiere.</p>',
    '/src/assets/blog/staging-cleaning.jpg',
    'Imobiliare',
    ARRAY['staging', 'curățenie', 'prima impresie'],
    'RealTrust',
    true,
    false,
    '2026-01-23 18:32:17.661831+00',
    0,
    '2026-01-23 18:32:17.661831+00',
    '2026-01-31 11:02:30.249285+00'
);

-- Articolul 9: Titlu Booking
INSERT INTO public.blog_articles (id, slug, title, title_en, excerpt, excerpt_en, content, content_en, cover_image, category, tags, author_name, is_published, is_premium, published_at, view_count, created_at, updated_at)
VALUES (
    'f2c8a9d7-3b5e-4f1a-8c2d-9e7b6a5c4d3e',
    'titlu-booking-optimizare',
    'Cum să scrii un titlu care convertește pe Booking și Airbnb',
    'How to Write a Title That Converts on Booking and Airbnb',
    'Tehnici de copywriting pentru titluri care atrag atenția și cresc rata de click.',
    'Copywriting techniques for attention-grabbing titles that increase click-through rates.',
    '<h2>De ce contează titlul</h2><p>Titlul este primul lucru pe care îl vede un potențial oaspete. În 2-3 secunde decide dacă dă click sau trece mai departe.</p><h2>Structura ideală</h2><p>Format recomandat: [Tip proprietate] + [Caracteristică unică] + [Locație/Beneficiu]</p><h2>Exemple bune</h2><ul><li>„Studio Modern • Vedere Panoramică • Centru Timișoara"</li><li>„Apartament 2 Camere • Parcare Privată • 5 min de Iulius Mall"</li><li>„Penthouse Lux • Terasă Mare • Opera 300m"</li></ul><h2>Ce să eviți</h2><ul><li>Titluri generice: „Apartament frumos în Timișoara"</li><li>Prea multe adjective: „Super mega apartament lux exclusivist"</li><li>Informații irelevante</li></ul><p><strong>Test:</strong> Dacă ai 10 opțiuni similare, al tău iese în evidență?</p>',
    '<h2>Why the Title Matters</h2><p>The title is the first thing a potential guest sees. In 2-3 seconds they decide whether to click or move on.</p><h2>Ideal Structure</h2><p>Recommended format: [Property type] + [Unique feature] + [Location/Benefit]</p><h2>Good Examples</h2><ul><li>"Modern Studio • Panoramic View • Timișoara Center"</li><li>"2-Bedroom Apartment • Private Parking • 5 min from Iulius Mall"</li><li>"Luxury Penthouse • Large Terrace • 300m from Opera"</li></ul><h2>What to Avoid</h2><ul><li>Generic titles: "Beautiful apartment in Timișoara"</li><li>Too many adjectives: "Super mega luxury exclusive apartment"</li><li>Irrelevant information</li></ul><p><strong>Test:</strong> If there are 10 similar options, does yours stand out?</p>',
    '/src/assets/blog/titlu-booking.jpg',
    'Imobiliare',
    ARRAY['titlu', 'booking', 'copywriting', 'conversie'],
    'RealTrust',
    true,
    false,
    '2026-01-23 18:32:17.661831+00',
    0,
    '2026-01-23 18:32:17.661831+00',
    '2026-01-31 11:02:45.249285+00'
);

-- Articolul 10: Photo Upgrade
INSERT INTO public.blog_articles (id, slug, title, title_en, excerpt, excerpt_en, content, content_en, cover_image, category, tags, author_name, is_published, is_premium, published_at, view_count, created_at, updated_at)
VALUES (
    '8a7b6c5d-4e3f-2a1b-0c9d-8e7f6a5b4c3d',
    'photo-upgrade-fotografii-profesionale',
    'Photo upgrade: de la poze cu telefonul la fotografii profesionale',
    'Photo Upgrade: From Phone Shots to Professional Photography',
    'Ghid pas cu pas pentru fotografii care vând, cu sau fără fotograf profesionist.',
    'Step-by-step guide to photos that sell, with or without a professional photographer.',
    '<h2>Impactul fotografiilor</h2><p>Proprietățile cu fotografii profesionale primesc cu 24% mai multe rezervări și pot cere tarife mai mari.</p><h2>DIY vs. Profesionist</h2><h3>Când merită profesionist:</h3><ul><li>Buget: 150-300 EUR pentru o ședință</li><li>Proprietăți premium sau noi</li><li>Când vrei imagini de marketing</li></ul><h3>Când poți face singur:</h3><ul><li>Telefon bun (iPhone 12+ sau echivalent)</li><li>Lumină naturală abundentă</li><li>Staging pregătit în avans</li></ul><h2>Tips pentru fotografii DIY</h2><ul><li>Fotografiază dimineața (9-11) pentru lumină optimă</li><li>Curăță și aranjează totul ÎNAINTE</li><li>Folosește modul wide-angle</li><li>Ține telefonul drept (orizontal)</li><li>Evită oglindile (reflectă fotograful)</li></ul><h2>Ordinea fotografiilor</h2><ol><li>Living/spațiul principal (hero shot)</li><li>Dormitor cu pat aranjat</li><li>Baie (curată, luminoasă)</li><li>Bucătărie</li><li>Alte camere/spații</li><li>Balcon/vedere (dacă e cazul)</li><li>Exterior/intrare</li></ol><p><strong>Investiție minimă, impact maxim:</strong> Fotografiile bune sunt cel mai bun ROI în marketing imobiliar.</p>',
    '<h2>The Impact of Photography</h2><p>Properties with professional photos receive 24% more bookings and can charge higher rates.</p><h2>DIY vs. Professional</h2><h3>When a professional is worth it:</h3><ul><li>Budget: €150-300 for a session</li><li>Premium or new properties</li><li>When you want marketing images</li></ul><h3>When you can do it yourself:</h3><ul><li>Good phone (iPhone 12+ or equivalent)</li><li>Abundant natural light</li><li>Staging prepared in advance</li></ul><h2>Tips for DIY Photography</h2><ul><li>Photograph in the morning (9-11) for optimal light</li><li>Clean and arrange everything BEFORE</li><li>Use wide-angle mode</li><li>Hold phone straight (horizontal)</li><li>Avoid mirrors (they reflect the photographer)</li></ul><h2>Photo Order</h2><ol><li>Living/main space (hero shot)</li><li>Bedroom with made bed</li><li>Bathroom (clean, bright)</li><li>Kitchen</li><li>Other rooms/spaces</li><li>Balcony/view (if applicable)</li><li>Exterior/entrance</li></ol><p><strong>Minimal investment, maximum impact:</strong> Good photos are the best ROI in real estate marketing.</p>',
    '/src/assets/blog/photo-upgrade.jpg',
    'Imobiliare',
    ARRAY['fotografii', 'marketing', 'vizual'],
    'RealTrust',
    true,
    false,
    '2026-01-23 18:32:17.661831+00',
    0,
    '2026-01-23 18:32:17.661831+00',
    '2026-01-31 11:03:00.249285+00'
);

-- Articolul 11: Sezonalitate Timișoara
INSERT INTO public.blog_articles (id, slug, title, title_en, excerpt, excerpt_en, content, content_en, cover_image, category, tags, author_name, is_published, is_premium, published_at, view_count, created_at, updated_at)
VALUES (
    '3e4f5a6b-7c8d-9e0f-1a2b-3c4d5e6f7a8b',
    'sezonalitate-timisoara-calendar',
    'Sezonalitatea în Timișoara: calendar de evenimente și cerere',
    'Seasonality in Timișoara: Event Calendar and Demand',
    'Când crește și scade cererea în Timișoara și cum să te pregătești pentru fiecare sezon.',
    'When demand rises and falls in Timișoara and how to prepare for each season.',
    '<h2>Sezonul înalt (aprilie-octombrie)</h2><ul><li>Turism cultural activ</li><li>Festivaluri și evenimente</li><li>Conferințe și business travel</li><li>Prețuri: +20-40% față de bază</li></ul><h2>Sezonul mediu (martie, noiembrie)</h2><ul><li>Tranziție între sezoane</li><li>Cerere business constantă</li><li>Weekenduri încă active</li><li>Prețuri: bază sau +10%</li></ul><h2>Sezonul scăzut (decembrie-februarie)</h2><ul><li>Sărbătorile de iarnă: excepție cu cerere mare</li><li>Ianuarie-februarie: cel mai slab</li><li>Focus pe sejururi lungi și corporate</li><li>Prețuri: -10-20% (cu min-stay crescut)</li></ul><h2>Evenimente majore Timișoara</h2><ul><li>JazzTM (mai)</li><li>Festivalul Inimilor (iunie)</li><li>Zilele Orașului (vara)</li><li>Untold/Electric Castle nearby</li><li>Conferințe IT (toamna)</li></ul><p><strong>Sfat:</strong> Creează un calendar anual și ajustează prețurile cu 2-4 săptămâni înainte de fiecare eveniment major.</p>',
    '<h2>High Season (April-October)</h2><ul><li>Active cultural tourism</li><li>Festivals and events</li><li>Conferences and business travel</li><li>Prices: +20-40% from base</li></ul><h2>Medium Season (March, November)</h2><ul><li>Transition between seasons</li><li>Steady business demand</li><li>Weekends still active</li><li>Prices: base or +10%</li></ul><h2>Low Season (December-February)</h2><ul><li>Winter holidays: exception with high demand</li><li>January-February: lowest</li><li>Focus on long stays and corporate</li><li>Prices: -10-20% (with increased min-stay)</li></ul><h2>Major Timișoara Events</h2><ul><li>JazzTM (May)</li><li>Festival of Hearts (June)</li><li>City Days (summer)</li><li>Untold/Electric Castle nearby</li><li>IT Conferences (autumn)</li></ul><p><strong>Tip:</strong> Create an annual calendar and adjust prices 2-4 weeks before each major event.</p>',
    '/src/assets/blog/sezonalitate-timisoara.jpg',
    'Imobiliare',
    ARRAY['sezonalitate', 'evenimente', 'calendar', 'Timișoara'],
    'RealTrust',
    true,
    false,
    '2026-01-23 18:32:17.661831+00',
    0,
    '2026-01-23 18:32:17.661831+00',
    '2026-01-31 11:03:15.249285+00'
);

-- Articolul 12: WhatsApp pentru Leads
INSERT INTO public.blog_articles (id, slug, title, title_en, excerpt, excerpt_en, content, content_en, cover_image, category, tags, author_name, is_published, is_premium, published_at, view_count, created_at, updated_at)
VALUES (
    '7c8d9e0f-1a2b-3c4d-5e6f-7a8b9c0d1e2f',
    'whatsapp-leads-comunicare',
    'WhatsApp Business pentru lead-uri: template-uri și best practices',
    'WhatsApp Business for Leads: Templates and Best Practices',
    'Cum să folosești WhatsApp pentru a converti mai mulți proprietari interesați în clienți.',
    'How to use WhatsApp to convert more interested property owners into clients.',
    '<h2>De ce WhatsApp</h2><ul><li>Rată de deschidere 98% (vs 20% email)</li><li>Răspuns rapid așteptat</li><li>Personal dar profesionist</li><li>Integrare cu CRM-uri</li></ul><h2>Template Mesaj Inițial</h2><blockquote>„Salut [Nume]! 👋 Sunt [Nume tău] de la RealTrust. Am primit cererea ta pentru apartamentul din [zonă]. Ai un moment să discutăm câteva detalii? Durează 2-3 minute."</blockquote><h2>Template Follow-up (la 24h)</h2><blockquote>„Bună [Nume]! Am încercat să te contactez ieri. Ai reușit să te uiți peste informațiile trimise? Sunt disponibil să răspund la orice întrebare."</blockquote><h2>Best Practices</h2><ul><li>Răspunde în maxim 1 oră în timpul programului</li><li>Folosește emoji-uri (moderatamente)</li><li>Personalizează fiecare mesaj</li><li>Nu trimite mesaje seara/weekendul devreme</li><li>Salvează răspunsurile frecvente ca template</li></ul><p><strong>Obiectiv:</strong> Fiecare lead trebuie să se simtă important și unic.</p>',
    '<h2>Why WhatsApp</h2><ul><li>98% open rate (vs 20% email)</li><li>Fast response expected</li><li>Personal but professional</li><li>CRM integration</li></ul><h2>Initial Message Template</h2><blockquote>"Hi [Name]! 👋 I''m [Your name] from RealTrust. I received your request for the apartment in [area]. Do you have a moment to discuss some details? Takes 2-3 minutes."</blockquote><h2>Follow-up Template (at 24h)</h2><blockquote>"Hi [Name]! I tried to contact you yesterday. Did you manage to look at the information sent? I''m available to answer any questions."</blockquote><h2>Best Practices</h2><ul><li>Respond within 1 hour during business hours</li><li>Use emojis (moderately)</li><li>Personalize each message</li><li>Don''t send messages in the evening/early weekend</li><li>Save frequent responses as templates</li></ul><p><strong>Goal:</strong> Every lead should feel important and unique.</p>',
    '/src/assets/blog/whatsapp-leads.jpg',
    'Imobiliare',
    ARRAY['whatsapp', 'leads', 'comunicare', 'vânzări'],
    'RealTrust',
    true,
    false,
    '2026-01-23 18:32:17.661831+00',
    0,
    '2026-01-23 18:32:17.661831+00',
    '2026-01-31 11:03:30.249285+00'
);

-- Articolul 13: Security Deposit
INSERT INTO public.blog_articles (id, slug, title, title_en, excerpt, excerpt_en, content, content_en, cover_image, category, tags, author_name, is_published, is_premium, published_at, view_count, created_at, updated_at)
VALUES (
    'f8917efc-29f4-49e9-851a-75bebc594966',
    'security-deposit-protejeaza-investitia',
    'Security deposit: protejează-ți investiția',
    'Security Deposit: Protect Your Investment',
    'Cum să implementezi corect garanția pentru daune și să îți protejezi proprietatea.',
    'Best practices for collecting and managing security deposits in short-term rentals.',
    '<h2>De ce ai nevoie de depozit</h2><p>Depozitul de securitate descurajează comportamentul problematic și îți oferă o plasă de siguranță în caz de daune.</p><h2>Sumă recomandată</h2><ul><li>Apartament standard: 150-200 EUR</li><li>Proprietate premium: 250-400 EUR</li><li>Evenimente/grupuri mari: 300-500 EUR</li></ul><h2>Metode de colectare</h2><h3>Pre-autorizare card (recomandat)</h3><ul><li>Suma e blocată, nu încasată</li><li>Se eliberează automat după check-out</li><li>Cel mai profesionist și convenabil</li></ul><h3>Transfer bancar</h3><ul><li>Necesită mai multă încredere din partea oaspetelui</li><li>Returnare manuală (poate dura)</li><li>Recomandat pentru sejururi lungi</li></ul><h2>Politică clară</h2><h3>Ce comunici în anunț</h3><ul><li>Suma depozitului</li><li>Metoda de colectare</li><li>Când se returnează</li><li>Ce poate duce la reținere</li></ul><h3>Exemplu politică</h3><blockquote>„Un depozit de securitate de 150€ va fi pre-autorizat pe cardul dumneavoastră la check-in. Suma va fi eliberată în 48h după check-out, în urma verificării apartamentului. Depozitul poate fi reținut parțial sau total pentru: daune materiale, obiecte lipsă, curățenie excesivă necesară sau încălcări ale regulilor casei."</blockquote><h2>Documentare corectă</h2><h3>La check-in</h3><ul><li>Fotografii/video ale apartamentului</li><li>Trimite oaspeților pentru a confirma starea</li><li>Notează orice probleme existente</li></ul><h3>La check-out</h3><ul><li>Verifică apartamentul în aceeași zi</li><li>Fotografii comparative dacă e nevoie</li><li>Documentează orice daună imediat</li></ul><h2>Gestionarea disputelor</h2><h3>Proces corect</h3><ol><li>Lista detaliată a daunelor cu poze</li><li>Dă oaspetelui șansa să răspundă</li><li>Comunică suma reținută și motivele</li><li>Folosește medierea platformei dacă e nevoie</li></ol><h3>Ce să eviți</h3><ul><li>Rețineri fără dovezi clare</li><li>Supraestimarea costurilor</li><li>Atitudine agresivă sau acuzatoare</li></ul><h2>Când să nu ceri depozit</h2><ul><li>Oaspeți cu istoric excelent (Superhost pe Airbnb)</li><li>Sejururi foarte scurte (1-2 nopți, risc mic)</li><li>Clienți corporate de încredere</li></ul><p><strong>Concluzie:</strong> Prevenția și transparența sunt cele mai bune arme împotriva daunelor. Comunică clar, documentează totul și tratează disputele profesionist.</p>',
    '<h2>Why You Need a Deposit</h2><p>The security deposit discourages problematic behavior and provides a safety net in case of damage.</p><h2>Recommended Amount</h2><ul><li>Standard apartment: €150-200</li><li>Premium property: €250-400</li><li>Events/large groups: €300-500</li></ul><h2>Collection Methods</h2><h3>Card Pre-authorization (recommended)</h3><ul><li>Amount is blocked, not charged</li><li>Released automatically after checkout</li><li>Most professional and convenient</li></ul><h3>Bank Transfer</h3><ul><li>Requires more trust from the guest</li><li>Manual return (can take time)</li><li>Recommended for long stays</li></ul><h2>Clear Policy</h2><h3>What to Communicate in Listing</h3><ul><li>Deposit amount</li><li>Collection method</li><li>When it''s returned</li><li>What can lead to retention</li></ul><h3>Policy Example</h3><blockquote>"A €150 security deposit will be pre-authorized on your card at check-in. The amount will be released within 48 hours after check-out, following apartment verification. The deposit may be partially or fully retained for: property damage, missing items, excessive cleaning required, or house rule violations."</blockquote><h2>Proper Documentation</h2><h3>At Check-in</h3><ul><li>Photos/video of the apartment</li><li>Send to guests to confirm condition</li><li>Note any existing issues</li></ul><h3>At Check-out</h3><ul><li>Check apartment same day</li><li>Comparative photos if needed</li><li>Document any damage immediately</li></ul><h2>Dispute Management</h2><h3>Fair Process</h3><ol><li>Detailed damage list with photos</li><li>Give guest chance to respond</li><li>Communicate retained amount and reasons</li><li>Use platform mediation if needed</li></ol><h3>What to Avoid</h3><ul><li>Retentions without clear evidence</li><li>Overestimating costs</li><li>Aggressive or accusatory attitude</li></ul><h2>When Not to Request Deposit</h2><ul><li>Guests with excellent history (Superhost on Airbnb)</li><li>Very short stays (1-2 nights, low risk)</li><li>Trusted corporate clients</li></ul><p><strong>Conclusion:</strong> Prevention and transparency are the best weapons against damage. Communicate clearly, document everything, and handle disputes professionally.</p>',
    '/src/assets/blog/security-deposit.jpg',
    'Imobiliare',
    ARRAY['garantie', 'protectie', 'daune'],
    'RealTrust',
    true,
    false,
    '2026-01-23 18:32:17.661831+00',
    0,
    '2026-01-23 18:32:17.661831+00',
    '2026-01-31 11:04:24.14095+00'
);

-- Articolul 14: Plăți Transparente
INSERT INTO public.blog_articles (id, slug, title, title_en, excerpt, excerpt_en, content, content_en, cover_image, category, tags, author_name, is_published, is_premium, published_at, view_count, created_at, updated_at)
VALUES (
    'e9232640-27a6-4366-911b-2d3e91d6ad67',
    'plati-transparente-tu-incasezi-noi-operam',
    'Plăți transparente: tu încasezi, noi operăm',
    'Transparent Payments: You Collect, We Operate',
    'Cum funcționează un model corect de administrare: banii intră direct la tine, iar noi operăm și optimizăm tot restul.',
    'Discover how transparent payment works in short-term rental management and why it builds trust between owners and operators.',
    '## Ideea principală

Dacă vrei rezultate stabile în regim hotelier, ai nevoie de sistem (nu improvizație).

### Ce să faci (simplu)

- **Setează standarde** (dotări, curățenie, mentenanță) și respectă-le
- **Optimizează conversia** (titlu, descriere, poze, reguli clare)
- **Ajustează prețul** pe cerere/seasonalitate și păstrează controlul pe KPI

### Cum funcționează modelul nostru

Plățile intră direct în contul tău. Structura este transparentă, fără obligații ascunse. Tu încasezi, noi operăm și optimizăm tot restul.

### Ce evităm

- Promisiuni de randament nerealiste
- Termeni tehnici prea devreme
- Haos operațional

> "Succesul în regim hotelier vine din consistență, nu din noroc."',
    '## The Core Idea

In property management, transparency is essential. Guests pay directly into the owner''s account, and the operator invoices only the management commission.

## Key Benefits

**For Owners:**
- Real-time visibility of all transactions
- Lower operational costs
- Full financial control

**For Guests:**
- Secure payments
- Receipts sent automatically

## Implementation

This model requires clear processes and consistent communication. The monthly reports show every income and expense.',
    '/src/assets/blog/plati-transparente.jpg',
    'Proprietari',
    ARRAY['administrare', 'plati', 'transparenta'],
    'RealTrust',
    true,
    false,
    '2026-01-23 18:32:17.661831+00',
    0,
    '2026-01-23 18:32:17.661831+00',
    '2026-01-23 18:37:45.348457+00'
);

-- Articolul 15: Raportare KPI
INSERT INTO public.blog_articles (id, slug, title, title_en, excerpt, excerpt_en, content, content_en, cover_image, category, tags, author_name, is_published, is_premium, published_at, view_count, created_at, updated_at)
VALUES (
    '52000ed2-142b-46ab-90df-d7d9655d7abe',
    'raportare-lunara-kpi-uri-care-conteaza',
    'Raportare lunară: ce KPI-uri contează cu adevărat',
    'Monthly Reporting: What KPIs Really Matter',
    'Descoperă indicatorii cheie de performanță care fac diferența în administrarea proprietății tale.',
    'Learn which key performance indicators you should track monthly to maximize your rental income.',
    '## De ce contează KPI-urile

În administrarea imobiliară în regim hotelier, măsurarea performanței nu este opțională - este esențială.

### KPI-uri esențiale

1. **Rata de ocupare** - procentul de nopți rezervate
2. **RevPAR** (Revenue Per Available Room) - venitul mediu per noapte disponibilă
3. **ADR** (Average Daily Rate) - tariful mediu per noapte rezervată
4. **Rating-ul oaspeților** - feedback-ul consolidat
5. **Timpul de răspuns** - viteza de comunicare cu oaspeții

### Raportare transparentă

Oferim rapoarte lunare detaliate care îți arată exact performanța proprietății tale.

> "Ce nu măsori, nu poți îmbunătăți."',
    '## Essential KPIs

Every property owner should monitor these indicators monthly:

### 1. Occupancy Rate
The percentage of booked nights out of total available nights. Target: above 70%.

### 2. Average Daily Rate (ADR)
Total revenue divided by number of booked nights.

### 3. RevPAR (Revenue Per Available Room)
Occupancy x ADR = the most important financial metric.

### 4. Review Score
Ratings on Booking.com, Airbnb and Google directly impact future bookings.

## Report Structure

A good monthly report should include:
- Revenue comparison with previous month
- Channel performance analysis
- Expense breakdown
- Revenue forecasts',
    '/src/assets/blog/raportare-kpi.jpg',
    'Proprietari',
    ARRAY['kpi', 'raportare', 'performanta'],
    'RealTrust',
    true,
    false,
    '2026-01-23 18:32:17.661831+00',
    0,
    '2026-01-23 18:32:17.661831+00',
    '2026-01-23 18:37:45.348457+00'
);

-- Articolul 16: Self Check-in
INSERT INTO public.blog_articles (id, slug, title, title_en, excerpt, excerpt_en, content, content_en, cover_image, category, tags, author_name, is_published, is_premium, published_at, view_count, created_at, updated_at)
VALUES (
    '20093815-81fe-44b1-b31c-8dc472a81827',
    'self-checkin-politica-elibereaza-timpul',
    'Self check-in: politica care îți eliberează timpul',
    'Self Check-in: The Policy That Frees Your Time',
    'Implementarea check-in-ului automat pentru o experiență fluidă și mai puțin stres operațional.',
    'How self check-in can reduce your operational costs and improve guest experience.',
    '<h2>Beneficiile self check-in</h2><p>Check-in-ul automat este standardul în industria ospitalității moderne. Oaspeții de azi se așteaptă la flexibilitate și autonomie.</p><h2>Avantajele Check-in-ului Automat</h2><ul><li><strong>Flexibilitate totală:</strong> oaspeții pot ajunge oricând, fără să coordoneze cu tine</li><li><strong>Eficiență operațională:</strong> nu mai e nevoie de prezență fizică la fiecare check-in</li><li><strong>Profesionalism:</strong> o experiență modernă apreciată de călători</li><li><strong>Scalabilitate:</strong> poți gestiona mai multe proprietăți simultan</li><li><strong>Reducere erori:</strong> sistemul trimite automat codurile și instrucțiunile</li></ul><h2>Componentele Necesare</h2><h3>1. Smart Lock (Încuietoare Inteligentă)</h3><ul><li>Cu cod numeric - simplu și fiabil</li><li>Cu Bluetooth - acces prin aplicație mobilă</li><li>Cu WiFi - control complet de la distanță</li><li>Investiție: 150-400 EUR per unitate</li></ul><h3>2. Instrucțiuni Clare</h3><ul><li>Video tutorial pas cu pas (1-2 minute)</li><li>PDF cu imagini pentru fiecare pas</li><li>Link Google Maps exact la intrarea în clădire</li><li>Informații despre parcare și transport</li></ul><h3>3. Backup Plan</h3><ul><li>Număr de telefon de urgență (24/7)</li><li>Cheie fizică la un vecin sau lockbox secundar</li><li>Plan B în caz de baterie descărcată sau eroare tehnică</li></ul><h3>4. Verificare Identitate Pre-sosire</h3><ul><li>Solicită copie după act de identitate prin platformă</li><li>Confirmă numărul de oaspeți</li><li>Verifică scopul călătoriei (opțional)</li></ul><h2>Flux de Comunicare Recomandat</h2><h3>Cu 24 de ore înainte</h3><blockquote>„Bună [Nume]! Mâine te așteptăm! Iată tot ce ai nevoie pentru check-in: [link instrucțiuni]. Codul de acces îl vei primi în dimineața check-in-ului. Orice întrebare, scrie-mi!"</blockquote><h3>În dimineața check-in-ului</h3><blockquote>„Codul pentru yală este: [XXXX]. Apartamentul e gata și te așteaptă! Dacă ai nevoie de ceva, sună-mă la [telefon]."</blockquote><h3>După sosire (2-3 ore)</h3><blockquote>„Totul în regulă? Ai găsit apartamentul ușor? Dacă ai nevoie de recomandări pentru restaurante sau activități, spune-mi!"</blockquote><h2>ROI-ul Self Check-in</h2><ul><li>Economisești 30-60 minute per check-in</li><li>Elimini coordonarea de programări</li><li>Crești rating-ul prin flexibilitate</li><li>Atragi mai mulți călători business și spontani</li></ul><p><strong>Concluzie:</strong> Tehnologia îți dă libertate. Folosește-o inteligent ca să oferi oaspeților o experiență modernă și să îți eliberezi timp pentru ce contează cu adevărat.</p>',
    '<h2>Benefits of Self Check-in</h2><p>Automatic check-in is the standard in the modern hospitality industry. Today''s guests expect flexibility and autonomy.</p><h2>Advantages of Automatic Check-in</h2><ul><li><strong>Total flexibility:</strong> guests can arrive anytime, without coordinating with you</li><li><strong>Operational efficiency:</strong> no need for physical presence at each check-in</li><li><strong>Professionalism:</strong> a modern experience appreciated by travelers</li><li><strong>Scalability:</strong> you can manage multiple properties simultaneously</li><li><strong>Error reduction:</strong> the system automatically sends codes and instructions</li></ul><h2>Necessary Components</h2><h3>1. Smart Lock</h3><ul><li>Numeric code - simple and reliable</li><li>Bluetooth - mobile app access</li><li>WiFi - complete remote control</li><li>Investment: €150-400 per unit</li></ul><h3>2. Clear Instructions</h3><ul><li>Step-by-step video tutorial (1-2 minutes)</li><li>PDF with images for each step</li><li>Google Maps link exactly to building entrance</li><li>Parking and transportation information</li></ul><h3>3. Backup Plan</h3><ul><li>Emergency phone number (24/7)</li><li>Physical key with a neighbor or secondary lockbox</li><li>Plan B in case of dead battery or technical error</li></ul><h3>4. Pre-Arrival Identity Verification</h3><ul><li>Request ID copy through the platform</li><li>Confirm number of guests</li><li>Verify travel purpose (optional)</li></ul><h2>Recommended Communication Flow</h2><h3>24 Hours Before</h3><blockquote>"Hi [Name]! We''re expecting you tomorrow! Here''s everything you need for check-in: [instructions link]. You''ll receive the access code the morning of check-in. Any questions, write to me!"</blockquote><h3>Morning of Check-in</h3><blockquote>"The lock code is: [XXXX]. The apartment is ready and waiting! If you need anything, call me at [phone]."</blockquote><h3>After Arrival (2-3 hours)</h3><blockquote>"Everything okay? Did you find the apartment easily? If you need restaurant or activity recommendations, let me know!"</blockquote><h2>Self Check-in ROI</h2><ul><li>Save 30-60 minutes per check-in</li><li>Eliminate appointment coordination</li><li>Increase rating through flexibility</li><li>Attract more business and spontaneous travelers</li></ul><p><strong>Conclusion:</strong> Technology gives you freedom. Use it smartly to offer guests a modern experience and free your time for what truly matters.</p>',
    '/src/assets/blog/self-checkin.jpg',
    'Proprietari',
    ARRAY['checkin', 'automatizare', 'smart-lock'],
    'RealTrust',
    true,
    false,
    '2026-01-23 18:32:17.661831+00',
    0,
    '2026-01-23 18:32:17.661831+00',
    '2026-01-31 11:00:36.951707+00'
);

-- Articolul 17: Reviews Playbook
INSERT INTO public.blog_articles (id, slug, title, title_en, excerpt, excerpt_en, content, content_en, cover_image, category, tags, author_name, is_published, is_premium, published_at, view_count, created_at, updated_at)
VALUES (
    '2a3b4c5d-6e7f-8a9b-0c1d-2e3f4a5b6c7d',
    'reviews-playbook-5-stele',
    'Reviews playbook: cum obții 5 stele constant',
    'Reviews Playbook: How to Consistently Get 5 Stars',
    'Strategii practice pentru a genera recenzii excelente și a gestiona feedback-ul negativ.',
    'Practical strategies to generate excellent reviews and manage negative feedback.',
    '<h2>Importanța recenziilor</h2><p>Recenziile sunt noua monedă în industria ospitalității. Un rating de 4.8+ (sau 9.5+ pe Booking) poate crește rezervările cu 25% și îți permite prețuri premium.</p><h2>Impactul Rating-ului</h2><h3>Proprietățile cu 9.0+ pe Booking.com primesc:</h3><ul><li>Poziționare mai bună în căutări</li><li>20-30% mai multe rezervări</li><li>Posibilitatea de a taxa tarife premium</li><li>Badge-uri de excelență vizibile</li></ul><h2>Cum Obții Recenzii de 5 Stele</h2><h3>Înainte de Sosire</h3><ul><li>Comunicare clară și promptă</li><li>Descriere precisă a proprietății (nu exagera)</li><li>Instrucțiuni de check-in ușor de urmat</li><li>Răspunde la întrebări rapid</li></ul><h3>În Timpul Sejurului</h3><ul><li>Răspuns rapid la întrebări sau probleme</li><li>Rezolvare proactivă a oricărei probleme</li><li>Recomandări locale personalizate</li><li>Un mesaj la jumătatea sejurului: „E totul ok?"</li></ul><h3>După Check-out</h3><ul><li>Mesaj de mulțumire în aceeași zi</li><li>Cerere prietenoasă de review</li><li>Adresează orice nemulțumire imediat</li></ul><h2>Detalii Care Fac Diferența</h2><h3>1. Depășește Așteptările</h3><ul><li>Oferă mai mult decât promite anunțul</li><li>Welcome kit cu produse locale</li><li>Un mic cadou surpriză (ciocolată, vin local)</li></ul><h3>2. Comunicare Proactivă</h3><ul><li>Întreabă dacă totul e în regulă înainte să te întrebe ei</li><li>Oferă ajutor fără să ți se ceară</li></ul><h3>3. Rezolvare Rapidă</h3><ul><li>Problemele se întâmplă - răspunsul contează</li><li>Rezolvă în ore, nu zile</li><li>Compensează pentru inconveniențe majore</li></ul><h3>4. Detalii Memorabile</h3><ul><li>Dulciuri locale la sosire</li><li>Ghid personalizat cu restaurantele tale preferate</li><li>Notă scrisă de mână (opțional, dar memorabil)</li></ul><h2>Gestionarea Recenziilor Negative</h2><h3>Răspunde ÎNTOTDEAUNA</h3><ul><li>Calm și profesionist</li><li>Recunoaște problema</li><li>Explică ce ai îmbunătățit</li><li>Nu te certa sau nu găsi scuze</li></ul><h3>Template Răspuns Negativ</h3><blockquote>„Mulțumim pentru feedback, [Nume]. Ne pare rău că experiența nu a fost la nivelul așteptărilor. Am luat măsuri pentru [problema menționată] și sperăm să avem ocazia să demonstrăm îmbunătățirile într-o vizită viitoare."</blockquote><h3>Recenzii Pozitive</h3><ul><li>Mulțumește-le și evidențiază ce le-a plăcut</li><li>Invită-i să revină</li><li>Fii personal, nu generic</li></ul><h2>Generarea de Review-uri</h2><h3>Mesaj Post-Checkout (24h după plecare)</h3><blockquote>„Mulțumim că ai stat la noi! 🙏 Sperăm că ai avut o experiență plăcută. Dacă ai un moment, am aprecia mult un review - feedback-ul tău ne ajută să ne îmbunătățim constant. [link către review]"</blockquote><h2>Metrici de Urmărit</h2><ul><li>Rating global pe fiecare platformă</li><li>Rating pe categorii (curățenie, locație, comunicare)</li><li>Rata de răspuns la review-uri</li><li>Trend-uri în feedback (ce se repetă?)</li></ul><p><strong>Concluzie:</strong> O recenzie negativă gestionată corect poate deveni o oportunitate de fidelizare. Fiecare interacțiune contează.</p>',
    '<h2>The Importance of Reviews</h2><p>Reviews are the new currency in the hospitality industry. A 4.8+ rating (or 9.5+ on Booking) can increase bookings by 25% and allows you to charge premium prices.</p><h2>Rating Impact</h2><h3>Properties with 9.0+ on Booking.com receive:</h3><ul><li>Better positioning in searches</li><li>20-30% more bookings</li><li>Ability to charge premium rates</li><li>Visible excellence badges</li></ul><h2>How to Get 5-Star Reviews</h2><h3>Before Arrival</h3><ul><li>Clear and prompt communication</li><li>Accurate property description (don''t exaggerate)</li><li>Easy-to-follow check-in instructions</li><li>Respond to questions quickly</li></ul><h3>During Stay</h3><ul><li>Fast response to questions or issues</li><li>Proactive problem solving</li><li>Personalized local recommendations</li><li>Mid-stay message: "Is everything okay?"</li></ul><h3>After Checkout</h3><ul><li>Thank you message same day</li><li>Friendly review request</li><li>Address any concerns immediately</li></ul><h2>Details That Make the Difference</h2><h3>1. Exceed Expectations</h3><ul><li>Offer more than the listing promises</li><li>Welcome kit with local products</li><li>Small surprise gift (chocolate, local wine)</li></ul><h3>2. Proactive Communication</h3><ul><li>Ask if everything is okay before they ask you</li><li>Offer help without being asked</li></ul><h3>3. Fast Resolution</h3><ul><li>Problems happen - the response matters</li><li>Resolve in hours, not days</li><li>Compensate for major inconveniences</li></ul><h3>4. Memorable Details</h3><ul><li>Local sweets upon arrival</li><li>Personalized guide with your favorite restaurants</li><li>Handwritten note (optional, but memorable)</li></ul><h2>Managing Negative Reviews</h2><h3>ALWAYS Respond</h3><ul><li>Calmly and professionally</li><li>Acknowledge the problem</li><li>Explain what you''ve improved</li><li>Don''t argue or make excuses</li></ul><h3>Negative Response Template</h3><blockquote>"Thank you for the feedback, [Name]. We''re sorry the experience did not meet expectations. We have taken steps regarding [mentioned issue] and hope to have the opportunity to demonstrate improvements on a future visit."</blockquote><h3>Positive Reviews</h3><ul><li>Thank them and highlight what they liked</li><li>Invite them to return</li><li>Be personal, not generic</li></ul><h2>Generating Reviews</h2><h3>Post-Checkout Message (24h after departure)</h3><blockquote>"Thank you for staying with us! 🙏 We hope you had a pleasant experience. If you have a moment, we would really appreciate a review - your feedback helps us constantly improve. [review link]"</blockquote><h2>Metrics to Track</h2><ul><li>Overall rating on each platform</li><li>Rating by categories (cleanliness, location, communication)</li><li>Review response rate</li><li>Feedback trends (what repeats?)</li></ul><p><strong>Conclusion:</strong> A correctly handled negative review can become a loyalty opportunity. Every interaction counts.</p>',
    '/src/assets/blog/reviews-playbook.jpg',
    'Imobiliare',
    ARRAY['reviews', 'rating', 'feedback', 'recenzii'],
    'RealTrust',
    true,
    false,
    '2026-01-23 18:32:17.661831+00',
    0,
    '2026-01-23 18:32:17.661831+00',
    '2026-01-31 11:04:00.249285+00'
);

-- Articolul 18: Dotări ROI
INSERT INTO public.blog_articles (id, slug, title, title_en, excerpt, excerpt_en, content, content_en, cover_image, category, tags, author_name, is_published, is_premium, published_at, view_count, created_at, updated_at)
VALUES (
    '9d89266b-8d64-4d6c-bf93-b37c270a6e44',
    'dotari-roi-top-investitii',
    'Dotări cu ROI mare: în ce să investești și ce să eviți',
    'High-ROI Amenities: What to Invest in and What to Avoid',
    'Echipamente și dotări care cresc cu adevărat valoarea percepută și rezervările.',
    'Equipment and amenities that truly increase perceived value and bookings.',
    '<h2>Dotări care fac diferența</h2><p>Nu toate investițiile au același impact. Unele dotări cresc dramatic percepția de valoare, altele sunt bani aruncați.</p><h2>Top 10 dotări cu ROI mare</h2><h3>1. WiFi rapid (100+ Mbps)</h3><ul><li>Cost: 20-40€/lună</li><li>Impact: ESENȚIAL pentru toți oaspeții</li><li>Fără WiFi bun, rating-ul scade garantat</li></ul><h3>2. Espressor cafea de calitate</h3><ul><li>Cost: 150-400€ (o dată)</li><li>Impact: „Feel premium" imediat</li><li>Capsule incluse = experiență completă</li></ul><h3>3. Lenjerie de calitate</h3><ul><li>Cost: 100-200€ (schimb complet)</li><li>Impact: Dormitul e 30% din experiență</li><li>Alb, fără modele, aspect hotel</li></ul><h3>4. Saltea bună</h3><ul><li>Cost: 300-600€</li><li>Impact: Cel mai menționat în reviews</li><li>Nu economisi aici!</li></ul><h3>5. Smart TV cu streaming</h3><ul><li>Cost: 200-400€</li><li>Impact: Standard azi, nu lux</li><li>Netflix pre-logat = bonus</li></ul><h3>6. Aer condiționat</h3><ul><li>Cost: 500-1000€ (instalare)</li><li>Impact: Deal-breaker în sezon cald</li><li>Must-have, nu opțional</li></ul><h3>7. Încărcător wireless lângă pat</h3><ul><li>Cost: 20-40€</li><li>Impact: Detaliu modern apreciat</li><li>Investiție mică, efect mare</li></ul><h3>8. Uscător de rufe</h3><ul><li>Cost: 200-400€</li><li>Impact: Diferențiator pentru sejururi lungi</li><li>Rar în apartamente, foarte dorit</li></ul><h3>9. Masă și scaun de birou</h3><ul><li>Cost: 100-200€</li><li>Impact: ESENȚIAL pentru remote workers</li><li>Work from anywhere = segment în creștere</li></ul><h3>10. Blackout curtains</h3><ul><li>Cost: 50-100€</li><li>Impact: Somn mai bun = reviews mai bune</li></ul><h2>Ce să eviți</h2><ul><li>Decorațiuni excesive (gust personal ≠ universal)</li><li>Mobilier prea delicat (se strică repede)</li><li>Echipamente complicate (confuzie = reviews negative)</li><li>Investiții „luxoase" fără utilitate (jacuzzi în baie mică)</li></ul><p><strong>Regula de aur:</strong> Investește în ce folosesc oaspeții zilnic, nu în ce arată bine în poze.</p>',
    '<h2>Amenities That Make a Difference</h2><p>Not all investments have the same impact. Some amenities dramatically increase perceived value, others are wasted money.</p><h2>Top 10 High-ROI Amenities</h2><h3>1. Fast WiFi (100+ Mbps)</h3><ul><li>Cost: €20-40/month</li><li>Impact: ESSENTIAL for all guests</li><li>Without good WiFi, rating will drop guaranteed</li></ul><h3>2. Quality Coffee Machine</h3><ul><li>Cost: €150-400 (one-time)</li><li>Impact: Immediate "premium feel"</li><li>Included capsules = complete experience</li></ul><h3>3. Quality Linens</h3><ul><li>Cost: €100-200 (complete change)</li><li>Impact: Sleep is 30% of the experience</li><li>White, no patterns, hotel look</li></ul><h3>4. Good Mattress</h3><ul><li>Cost: €300-600</li><li>Impact: Most mentioned in reviews</li><li>Don''t save here!</li></ul><h3>5. Smart TV with Streaming</h3><ul><li>Cost: €200-400</li><li>Impact: Standard today, not luxury</li><li>Pre-logged Netflix = bonus</li></ul><h3>6. Air Conditioning</h3><ul><li>Cost: €500-1000 (installation)</li><li>Impact: Deal-breaker in hot season</li><li>Must-have, not optional</li></ul><h3>7. Wireless Charger by Bed</h3><ul><li>Cost: €20-40</li><li>Impact: Appreciated modern detail</li><li>Small investment, big effect</li></ul><h3>8. Dryer</h3><ul><li>Cost: €200-400</li><li>Impact: Differentiator for long stays</li><li>Rare in apartments, highly desired</li></ul><h3>9. Desk and Office Chair</h3><ul><li>Cost: €100-200</li><li>Impact: ESSENTIAL for remote workers</li><li>Work from anywhere = growing segment</li></ul><h3>10. Blackout Curtains</h3><ul><li>Cost: €50-100</li><li>Impact: Better sleep = better reviews</li></ul><h2>What to Avoid</h2><ul><li>Excessive decorations (personal taste ≠ universal)</li><li>Too delicate furniture (breaks quickly)</li><li>Complicated equipment (confusion = negative reviews)</li><li>"Luxury" investments without utility (jacuzzi in small bathroom)</li></ul><p><strong>Golden rule:</strong> Invest in what guests use daily, not what looks good in photos.</p>',
    '/src/assets/blog/dotari-roi.jpg',
    'Imobiliare',
    ARRAY['dotări', 'investiții', 'ROI', 'echipamente'],
    'RealTrust',
    true,
    false,
    '2026-01-23 18:32:17.661831+00',
    0,
    '2026-01-23 18:32:17.661831+00',
    '2026-01-31 11:04:15.249285+00'
);

-- Articolul 19: Perceptie Premium
INSERT INTO public.blog_articles (id, slug, title, title_en, excerpt, excerpt_en, content, content_en, cover_image, category, tags, author_name, is_published, is_premium, published_at, view_count, created_at, updated_at)
VALUES (
    '4b5c6d7e-8f9a-0b1c-2d3e-4f5a6b7c8d9e',
    'perceptie-premium-detalii',
    'Percepție premium: detalii mici cu impact mare',
    'Premium Perception: Small Details with Big Impact',
    'Cum detaliile mici transformă experiența oaspeților și justifică prețuri mai mari.',
    'How small details transform guest experience and justify higher prices.',
    '<h2>De ce contează percepția</h2><p>Două apartamente identice pot avea rating-uri și prețuri foarte diferite. Diferența? Percepția de calitate și atenție la detalii.</p><h2>Detalii care costă puțin dar impresionează</h2><h3>La sosire</h3><ul><li>Miros plăcut (nu artificial, subtil)</li><li>Temperatură confortabilă (deja setată)</li><li>Lumini aprinse în punctele cheie</li><li>Welcome note personalizată cu numele oaspetelui</li></ul><h3>În baie</h3><ul><li>Prosoape pliate decorativ</li><li>Produse de igienă aranjate frumos</li><li>Oglindă perfectă, fără urme</li><li>Un extras: dischete demachiante, șervetele</li></ul><h3>În dormitor</h3><ul><li>Perne suplimentare disponibile</li><li>Încărcător telefon lângă pat</li><li>Noptieră ordonată, fără clutter</li><li>Blackout complet (sau măcar aproape)</li></ul><h3>În bucătărie</h3><ul><li>Cafea și ceai de calitate (nu instant)</li><li>Apă îmbuteliată în frigider</li><li>Câteva dulciuri locale</li><li>Instrucțiuni clare pentru electrocasnice</li></ul><h2>Investiții mici, impact mare</h2><ul><li>Difuzor aromă: 20-30€</li><li>Set prosoape premium: 50€</li><li>Welcome kit dulciuri: 5-10€ per oaspete</li><li>Notă personalizată: 0€ (doar efort)</li></ul><p><strong>Concluzie:</strong> Premium nu înseamnă scump. Înseamnă atent. Tratează fiecare oaspete ca pe un prieten drag care îți vizitează casa.</p>',
    '<h2>Why Perception Matters</h2><p>Two identical apartments can have very different ratings and prices. The difference? Perception of quality and attention to detail.</p><h2>Details That Cost Little but Impress</h2><h3>Upon Arrival</h3><ul><li>Pleasant scent (not artificial, subtle)</li><li>Comfortable temperature (already set)</li><li>Lights on in key spots</li><li>Personalized welcome note with guest''s name</li></ul><h3>In the Bathroom</h3><ul><li>Decoratively folded towels</li><li>Nicely arranged hygiene products</li><li>Perfect mirror, no marks</li><li>An extra: makeup remover pads, tissues</li></ul><h3>In the Bedroom</h3><ul><li>Extra pillows available</li><li>Phone charger by bed</li><li>Organized nightstand, no clutter</li><li>Complete blackout (or nearly)</li></ul><h3>In the Kitchen</h3><ul><li>Quality coffee and tea (not instant)</li><li>Bottled water in fridge</li><li>Some local sweets</li><li>Clear instructions for appliances</li></ul><h2>Small Investments, Big Impact</h2><ul><li>Aroma diffuser: €20-30</li><li>Premium towel set: €50</li><li>Welcome kit sweets: €5-10 per guest</li><li>Personalized note: €0 (just effort)</li></ul><p><strong>Conclusion:</strong> Premium does not mean expensive. It means thoughtful. Treat every guest like a dear friend visiting your home.</p>',
    '/src/assets/blog/perceptie-premium.jpg',
    'Imobiliare',
    ARRAY['premium', 'detalii', 'experiență', 'calitate'],
    'RealTrust',
    true,
    false,
    '2026-01-23 18:32:17.661831+00',
    0,
    '2026-01-23 18:32:17.661831+00',
    '2026-01-31 11:04:30.249285+00'
);

-- Articolul 20: Mix Canale
INSERT INTO public.blog_articles (id, slug, title, title_en, excerpt, excerpt_en, content, content_en, cover_image, category, tags, author_name, is_published, is_premium, published_at, view_count, created_at, updated_at)
VALUES (
    '5c6d7e8f-9a0b-1c2d-3e4f-5a6b7c8d9e0f',
    'mix-canale-distributie-optima',
    'Mix de canale: cum să îți diversifici sursele de rezervări',
    'Channel Mix: How to Diversify Your Booking Sources',
    'Strategii pentru a nu depinde de o singură platformă și a maximiza ocuparea.',
    'Strategies to avoid depending on a single platform and maximize occupancy.',
    '<h2>Riscul unei singure platforme</h2><p>Dacă 100% din rezervări vin de pe Booking sau Airbnb, ești vulnerabil. Orice schimbare de algoritm te poate afecta drastic.</p><h2>Mixul ideal de canale</h2><ul><li>Booking.com: 40-50% (reach mare, conversie bună)</li><li>Airbnb: 25-35% (segment diferit, sejururi mai lungi)</li><li>Rezervări directe: 10-20% (marjă mai bună)</li><li>Corporate/B2B: 5-10% (constant, predictibil)</li></ul><h2>Cum să crești rezervările directe</h2><ul><li>Nu concura pe preț (rate parity)</li><li>Oferă beneficii exclusive: late checkout, welcome kit premium</li><li>Convertește oaspeții care revin</li><li>Pagină simplă de booking sau WhatsApp</li></ul><h2>Platforme secundare de considerat</h2><ul><li>VRBO/HomeAway (familii, grupuri)</li><li>Agoda (turiști asiatici)</li><li>Google Hotels (vizibilitate crescută)</li><li>Expedia Group (market global)</li></ul><h2>Channel Manager: da sau nu?</h2><h3>Da, dacă:</h3><ul><li>Ai 2+ proprietăți</li><li>Folosești 3+ canale</li><li>Nu ai timp pentru sincronizare manuală</li></ul><h3>Opțiuni populare:</h3><ul><li>Lodgify (pentru începători)</li><li>Hostaway (complet)</li><li>Guesty (profesional)</li></ul><p><strong>Regula de aur:</strong> Diversifică, dar nu te împrăștia. Mai bine să fii excelent pe 3 canale decât mediocru pe 7.</p>',
    '<h2>The Risk of a Single Platform</h2><p>If 100% of bookings come from Booking or Airbnb, you''re vulnerable. Any algorithm change can drastically affect you.</p><h2>The Ideal Channel Mix</h2><ul><li>Booking.com: 40-50% (large reach, good conversion)</li><li>Airbnb: 25-35% (different segment, longer stays)</li><li>Direct bookings: 10-20% (better margin)</li><li>Corporate/B2B: 5-10% (constant, predictable)</li></ul><h2>How to Increase Direct Bookings</h2><ul><li>Don''t compete on price (rate parity)</li><li>Offer exclusive benefits: late checkout, premium welcome kit</li><li>Convert returning guests</li><li>Simple booking page or WhatsApp</li></ul><h2>Secondary Platforms to Consider</h2><ul><li>VRBO/HomeAway (families, groups)</li><li>Agoda (Asian tourists)</li><li>Google Hotels (increased visibility)</li><li>Expedia Group (global market)</li></ul><h2>Channel Manager: Yes or No?</h2><h3>Yes, if:</h3><ul><li>You have 2+ properties</li><li>You use 3+ channels</li><li>You don''t have time for manual sync</li></ul><h3>Popular options:</h3><ul><li>Lodgify (for beginners)</li><li>Hostaway (complete)</li><li>Guesty (professional)</li></ul><p><strong>Golden rule:</strong> Diversify, but don''t spread too thin. Better to be excellent on 3 channels than mediocre on 7.</p>',
    '/src/assets/blog/mix-canale.jpg',
    'Imobiliare',
    ARRAY['canale', 'distribuție', 'Booking', 'Airbnb'],
    'RealTrust',
    true,
    false,
    '2026-01-23 18:32:17.661831+00',
    0,
    '2026-01-23 18:32:17.661831+00',
    '2026-01-31 11:04:45.249285+00'
);

-- Articolul 21: Taxe 2026
INSERT INTO public.blog_articles (id, slug, title, title_en, excerpt, excerpt_en, content, content_en, cover_image, category, tags, author_name, is_published, is_premium, published_at, view_count, created_at, updated_at)
VALUES (
    '9d89266b-8d64-4d6c-bf93-b37c270a6e45',
    'taxe-2026-ce-trebuie-sa-stii',
    'Taxe 2026: ce trebuie să știi',
    'Taxes 2026: What You Need to Know',
    'Ghid actualizat despre obligațiile fiscale pentru proprietarii de apartamente în regim hotelier.',
    'Updated tax information for short-term rental property owners in Romania.',
    '<h2>Obligații fiscale de bază</h2><p>Veniturile din regim hotelier sunt impozabile. Fiecare proprietar trebuie să înțeleagă cadrul fiscal pentru a evita surprizele.</p><h2>Opțiunile tale</h2><h3>Persoană fizică (PF)</h3><ul><li>Impozit pe venit: 10%</li><li>Contribuții sociale: CAS (25%) și CASS (10%) peste anumite praguri</li><li>Normă de venit sau real (contabilitate)</li></ul><h3>PFA sau Întreprindere Individuală</h3><ul><li>Flexibilitate mai mare</li><li>Deduceri cheltuieli</li><li>Contabilitate simplificată sau în partidă dublă</li></ul><h3>SRL (Micro-întreprindere)</h3><ul><li>Impozit 1-3% pe cifra de afaceri</li><li>TVA dacă depășești plafonul</li><li>Contabilitate completă obligatorie</li></ul><h2>Cheltuieli deductibile</h2><ul><li>Utilități</li><li>Servicii de curățenie</li><li>Comisioane platforme</li><li>Amortizare mobilier și echipamente</li><li>Asigurare proprietate</li><li>Taxe de administrare</li></ul><h2>Documente de păstrat</h2><ul><li>Toate confirmările de rezervare</li><li>Chitanțe de plată</li><li>Facturi cheltuieli</li><li>Extrase de cont</li></ul><h2>Sfat profesionist</h2><p>Legislația fiscală se schimbă frecvent. Consultă un contabil familiarizat cu închirierile pe termen scurt pentru îndrumare personalizată.</p>',
    '<h2>Basic Tax Obligations</h2><p>Income from short-term rentals is taxable. Every owner needs to understand the tax framework to avoid surprises.</p><h2>Your Options</h2><h3>Individual (Natural Person)</h3><ul><li>Income tax: 10%</li><li>Social contributions: CAS (25%) and CASS (10%) above certain thresholds</li><li>Income norm or actual (accounting)</li></ul><h3>Authorized Natural Person or Individual Enterprise</h3><ul><li>Greater flexibility</li><li>Expense deductions</li><li>Simplified or double-entry accounting</li></ul><h3>LLC (Micro-enterprise)</h3><ul><li>1-3% tax on turnover</li><li>VAT if you exceed the threshold</li><li>Complete accounting mandatory</li></ul><h2>Deductible Expenses</h2><ul><li>Utilities</li><li>Cleaning services</li><li>Platform commissions</li><li>Furniture and equipment depreciation</li><li>Property insurance</li><li>Management fees</li></ul><h2>Record Keeping</h2><p>Maintain:</p><ul><li>All booking confirmations</li><li>Payment receipts</li><li>Expense invoices</li><li>Bank statements</li></ul><h2>Professional Advice</h2><p>Tax laws change frequently. Consult an accountant familiar with short-term rentals for personalized guidance.</p>',
    '/src/assets/blog/taxe-2026.jpg',
    'Proprietari',
    ARRAY['taxe', 'fiscalitate', 'legislatie'],
    'RealTrust',
    true,
    false,
    '2026-01-23 18:33:02.472113+00',
    0,
    '2026-01-23 18:33:02.472113+00',
    '2026-01-23 18:38:29.969034+00'
);

-- Articolul 22: Min-Stay Strategie
INSERT INTO public.blog_articles (id, slug, title, title_en, excerpt, excerpt_en, content, content_en, cover_image, category, tags, author_name, is_published, is_premium, published_at, view_count, created_at, updated_at)
VALUES (
    'b7d6196a-6226-4873-9e0d-43550a72a448',
    'min-stay-strategie-adr-ocupare',
    'Min-stay inteligent: când 1 noapte te costă bani și când te ajută',
    'Smart Min-Stay: When 1 Night Costs You Money and When It Helps',
    'Reguli simple pe zile ale săptămânii, sezon și lead time.',
    'Simple rules by day of week, season and lead time.',
    '<h2>Problema rezervărilor de o singură noapte</h2><p>O rezervare de 1 noapte pare câștig, dar costurile ascunse sunt semnificative:</p><ul><li>Curățenie completă (aceleași 2-3 ore ca pentru 3 nopți)</li><li>Check-in și check-out (timp pierdut)</li><li>Uzură accelerată a lenjeriei</li><li>Risc mai mare de oaspeți problematici (petreceri)</li></ul><h2>Când să refuzi 1 noapte</h2><h3>Weekenduri</h3><p>Vineri-sâmbătă sunt cele mai căutate nopți. Setează minim 2 nopți:</p><ul><li>Captezi întreaga cerere de weekend</li><li>Reduci turnover-ul</li><li>ADR-ul per noapte poate fi mai mare</li></ul><h3>Evenimente și sezon înalt</h3><p>Când cererea explodează, minim 3-4 nopți:</p><ul><li>Oaspeții care vin pentru festival stau mai mult</li><li>Eviti „gap-uri" în calendar imposibil de umplut</li><li>Câștigi mai mult per eveniment</li></ul><h3>Last minute în weekend</h3><p>Dacă cineva caută cazare sâmbătă pentru sâmbătă seara = roșu. Risc ridicat de petrecere.</p><h2>Când 1 noapte e OK</h2><h3>Midweek în extrasezon</h3><p>Luni-joi în lunile slabe, orice ocupare e bună:</p><ul><li>Acceptă 1 noapte pentru business travelers</li><li>Compensează cu preț puțin mai mare per noapte</li></ul><h3>Fill the gap</h3><p>Ai o gaură de 1 noapte între 2 rezervări? Acceptă-o - altfel stă goală oricum.</p><h2>Implementare practică</h2><table><tr><th>Perioadă</th><th>Min-stay</th></tr><tr><td>Luni-Joi (extrasezon)</td><td>1 noapte OK</td></tr><tr><td>Vineri-Duminică</td><td>Minim 2 nopți</td></tr><tr><td>Evenimente/Sărbători</td><td>Minim 3-4 nopți</td></tr><tr><td>Sezon înalt</td><td>Minim 2-3 nopți</td></tr></table><p><strong>Concluzie:</strong> Min-stay nu e despre a refuza bani, ci despre a maximiza veniturile pe termen lung.</p>',
    '<h2>The Problem with Single Night Bookings</h2><p>A 1-night booking seems like a win, but hidden costs are significant:</p><ul><li>Full cleaning (same 2-3 hours as for 3 nights)</li><li>Check-in and check-out (lost time)</li><li>Accelerated linen wear</li><li>Higher risk of problematic guests (parties)</li></ul><h2>When to Refuse 1 Night</h2><h3>Weekends</h3><p>Friday-Saturday are the most sought-after nights. Set minimum 2 nights:</p><ul><li>Capture entire weekend demand</li><li>Reduce turnover</li><li>ADR per night can be higher</li></ul><h3>Events and High Season</h3><p>When demand explodes, minimum 3-4 nights:</p><ul><li>Festival guests stay longer</li><li>Avoid impossible-to-fill calendar "gaps"</li><li>Earn more per event</li></ul><h3>Last Minute on Weekends</h3><p>Someone looking for accommodation Saturday for Saturday night = red flag. High party risk.</p><h2>When 1 Night is OK</h2><h3>Midweek in Off-Season</h3><p>Monday-Thursday in slow months, any occupancy is good:</p><ul><li>Accept 1 night for business travelers</li><li>Compensate with slightly higher per-night price</li></ul><h3>Fill the Gap</h3><p>Have a 1-night gap between 2 reservations? Accept it - otherwise it stays empty anyway.</p><h2>Practical Implementation</h2><table><tr><th>Period</th><th>Min-stay</th></tr><tr><td>Monday-Thursday (off-season)</td><td>1 night OK</td></tr><tr><td>Friday-Sunday</td><td>Minimum 2 nights</td></tr><tr><td>Events/Holidays</td><td>Minimum 3-4 nights</td></tr><tr><td>High season</td><td>Minimum 2-3 nights</td></tr></table><p><strong>Conclusion:</strong> Min-stay is not about refusing money, but about maximizing long-term revenue.</p>',
    NULL,
    'Revenue Management',
    ARRAY['min-stay', 'ADR', 'ocupare', 'strategie'],
    'RealTrust',
    true,
    false,
    '2026-01-28 10:37:43.845597+00',
    0,
    '2026-01-31 10:37:43.845597+00',
    '2026-01-31 10:58:49.497566+00'
);

-- Articolul 23: Brand Premium
INSERT INTO public.blog_articles (id, slug, title, title_en, excerpt, excerpt_en, content, content_en, cover_image, category, tags, author_name, is_published, is_premium, published_at, view_count, created_at, updated_at)
VALUES (
    'b00ab0ae-eb7b-4936-a58c-ecb09f86a66a',
    'brand-premium-regim-hotelier',
    'Cum arată un brand premium în regim hotelier (fără să fie kitsch)',
    'What a Premium Brand Looks Like in Short-Term Rentals (Without Being Kitsch)',
    'Culori, ton, consistență, fotografii și elemente de încredere.',
    'Colors, tone, consistency, photography and trust elements.',
    '<h2>Ce înseamnă „premium" în regim hotelier</h2><p>Premium nu înseamnă scump sau lux exagerat. Înseamnă consistent, curat, profesionist. Oaspeții plătesc pentru predictibilitate.</p><h2>Elementele unui brand premium</h2><h3>1. Identitate vizuală consistentă</h3><ul><li>Logo simplu și profesionist</li><li>Paletă de culori (2-3 culori maximum)</li><li>Font consistent în toate materialele</li><li>Template-uri pentru mesaje și documente</li></ul><h3>2. Fotografii profesionale</h3><ul><li>Lumină naturală sau studio</li><li>Unghiuri care arată spațiul real</li><li>Styling consistent (lenjerie, prosoape, decorațiuni)</li><li>Fără clutter sau obiecte personale</li></ul><h3>3. Ton de comunicare</h3><ul><li>Profesionist dar prietenos</li><li>Răspuns rapid (sub 1 oră)</li><li>Fără greșeli gramaticale</li><li>Mesaje personalizate (folosește numele)</li></ul><h3>4. Experiența fizică</h3><ul><li>Miros plăcut la intrare</li><li>Temperatură confortabilă</li><li>Pat perfect aranjat</li><li>Baie impecabilă</li><li>Consumabile de calitate (nu cele mai ieftine)</li></ul><h3>5. Detalii care fac diferența</h3><ul><li>Kit de bun venit (cafea, snacks locale)</li><li>Manual digital cu recomandări</li><li>Încărcător telefon lângă pat</li><li>Produse de igienă de calitate</li></ul><h2>Ce să eviți (kitsch-ul)</h2><ul><li>Prea multe decorațiuni</li><li>Culori stridente</li><li>Fotografii cu filtre exagerate</li><li>Promisiuni nerealistice în descriere</li><li>Răspunsuri copy-paste impersonale</li></ul><h2>Investiție vs. percepție</h2><p>Nu ai nevoie de buget mare pentru percepție premium:</p><ul><li>Curățenie impecabilă: 0€ extra</li><li>Mesaje profesioniste: 0€ extra</li><li>Prosoape de calitate: 50€ o dată</li><li>Lenjerie bună: 100€ o dată</li><li>Miros plăcut: 10€/lună</li></ul><p><strong>Regula de aur:</strong> Premium = atenție la detalii + consistență. Nu înseamnă lux, înseamnă grijă.</p>',
    '<h2>What "Premium" Means in Short-Term Rentals</h2><p>Premium does not mean expensive or exaggerated luxury. It means consistent, clean, professional. Guests pay for predictability.</p><h2>Elements of a Premium Brand</h2><h3>1. Consistent Visual Identity</h3><ul><li>Simple and professional logo</li><li>Color palette (2-3 colors maximum)</li><li>Consistent font across all materials</li><li>Templates for messages and documents</li></ul><h3>2. Professional Photography</h3><ul><li>Natural or studio lighting</li><li>Angles that show real space</li><li>Consistent styling (linens, towels, decorations)</li><li>No clutter or personal items</li></ul><h3>3. Communication Tone</h3><ul><li>Professional but friendly</li><li>Fast response (under 1 hour)</li><li>No grammatical errors</li><li>Personalized messages (use the name)</li></ul><h3>4. Physical Experience</h3><ul><li>Pleasant scent upon entry</li><li>Comfortable temperature</li><li>Perfectly made bed</li><li>Spotless bathroom</li><li>Quality consumables (not the cheapest)</li></ul><h3>5. Details That Make the Difference</h3><ul><li>Welcome kit (coffee, local snacks)</li><li>Digital manual with recommendations</li><li>Phone charger by the bed</li><li>Quality hygiene products</li></ul><h2>What to Avoid (Kitsch)</h2><ul><li>Too many decorations</li><li>Strident colors</li><li>Photos with exaggerated filters</li><li>Unrealistic promises in description</li><li>Impersonal copy-paste responses</li></ul><h2>Investment vs. Perception</h2><p>You do not need a big budget for premium perception:</p><ul><li>Impeccable cleanliness: €0 extra</li><li>Professional messages: €0 extra</li><li>Quality towels: €50 one-time</li><li>Good linens: €100 one-time</li><li>Pleasant scent: €10/month</li></ul><p><strong>Golden rule:</strong> Premium = attention to detail + consistency. It does not mean luxury, it means care.</p>',
    NULL,
    'Branding',
    ARRAY['brand', 'premium', 'identitate', 'imagine'],
    'RealTrust',
    true,
    false,
    '2026-01-22 10:37:43.845597+00',
    0,
    '2026-01-31 10:37:43.845597+00',
    '2026-01-31 10:57:20.891493+00'
);

-- Articolul 24: Onboarding Proprietar
INSERT INTO public.blog_articles (id, slug, title, title_en, excerpt, excerpt_en, content, content_en, cover_image, category, tags, author_name, is_published, is_premium, published_at, view_count, created_at, updated_at)
VALUES (
    'd2cc69ce-79bf-4b9f-b014-dc702e250a99',
    'onboarding-proprietar-7-pasi',
    'Onboarding proprietar: 7 pași ca să începi colaborarea fără haos',
    'Owner Onboarding: 7 Steps to Start Collaboration Without Chaos',
    'Documente, inventar, chei/lock, regulile casei, calendar și prețuri.',
    'Documents, inventory, keys/lock, house rules, calendar and prices.',
    '<h2>De ce un onboarding structurat contează</h2><p>Primele săptămâni ale colaborării setează tonul pentru tot ce urmează. Un onboarding haotic = probleme continue.</p><h2>Cei 7 pași esențiali</h2><h3>Pasul 1: Documente și contract</h3><ul><li>Contract de administrare semnat</li><li>Copie act proprietate</li><li>Date facturare (dacă e cazul)</li><li>Contact de urgență proprietar</li></ul><h3>Pasul 2: Inventar foto + video</h3><ul><li>Fotografii detaliate ale fiecărei camere</li><li>Video walkthrough</li><li>Lista de inventar (mobilier, electrocasnice, veselă)</li><li>Starea inițială documentată</li></ul><h3>Pasul 3: Acces și chei</h3><ul><li>Minimum 3 seturi de chei</li><li>Instalare smart lock (recomandat)</li><li>Cod de acces pentru echipa de curățenie</li><li>Plan de backup dacă se blochează yala</li></ul><h3>Pasul 4: Utilități și furnizori</h3><ul><li>Contracte utilități pe numele proprietarului</li><li>Acces la conturile online (pentru monitorizare)</li><li>Contact administrator bloc</li><li>Furnizori preferați pentru reparații</li></ul><h3>Pasul 5: Regulile casei</h3><ul><li>Sunt permise animale?</li><li>Se poate fuma? (recomandat: NU)</li><li>Oaspeți extra permis?</li><li>Petreceri? (recomandat: NU)</li><li>Restricții specifice?</li></ul><h3>Pasul 6: Calendar și prețuri</h3><ul><li>Perioade blocate de proprietar</li><li>Prețuri de bază agreate</li><li>Flexibilitate pe discount-uri</li><li>Obiective de ocupare</li></ul><h3>Pasul 7: Setup listing-uri</h3><ul><li>Poze profesionale</li><li>Descriere optimizată</li><li>Configurare pe platforme</li><li>Primele rezervări</li></ul><h2>Timeline realist</h2><ul><li>Ziua 1-2: Documente și inventar</li><li>Ziua 3-5: Poze și descrieri</li><li>Ziua 6-7: Publicare pe platforme</li><li>Săptămâna 2: Primele rezervări</li></ul><p><strong>Pro tip:</strong> Documentează tot în scris. Ce nu e scris, nu există.</p>',
    '<h2>Why Structured Onboarding Matters</h2><p>The first weeks of collaboration set the tone for everything that follows. Chaotic onboarding = continuous problems.</p><h2>The 7 Essential Steps</h2><h3>Step 1: Documents and Contract</h3><ul><li>Signed management contract</li><li>Copy of ownership deed</li><li>Billing information (if applicable)</li><li>Owner emergency contact</li></ul><h3>Step 2: Photo + Video Inventory</h3><ul><li>Detailed photographs of each room</li><li>Video walkthrough</li><li>Inventory list (furniture, appliances, dishes)</li><li>Initial condition documented</li></ul><h3>Step 3: Access and Keys</h3><ul><li>Minimum 3 sets of keys</li><li>Smart lock installation (recommended)</li><li>Access code for cleaning team</li><li>Backup plan if lock jams</li></ul><h3>Step 4: Utilities and Providers</h3><ul><li>Utility contracts in owner''s name</li><li>Access to online accounts (for monitoring)</li><li>Building administrator contact</li><li>Preferred repair providers</li></ul><h3>Step 5: House Rules</h3><ul><li>Are pets allowed?</li><li>Can you smoke? (recommended: NO)</li><li>Extra guests allowed?</li><li>Parties? (recommended: NO)</li><li>Specific restrictions?</li></ul><h3>Step 6: Calendar and Pricing</h3><ul><li>Owner-blocked periods</li><li>Agreed base prices</li><li>Flexibility on discounts</li><li>Occupancy objectives</li></ul><h3>Step 7: Listing Setup</h3><ul><li>Professional photos</li><li>Optimized description</li><li>Platform configuration</li><li>First bookings</li></ul><h2>Realistic Timeline</h2><ul><li>Day 1-2: Documents and inventory</li><li>Day 3-5: Photos and descriptions</li><li>Day 6-7: Platform publication</li><li>Week 2: First bookings</li></ul><p><strong>Pro tip:</strong> Document everything in writing. What is not written does not exist.</p>',
    NULL,
    'Proprietari',
    ARRAY['onboarding', 'proprietar', 'colaborare', 'pași'],
    'RealTrust',
    true,
    false,
    '2026-01-24 10:37:43.845597+00',
    0,
    '2026-01-31 10:37:43.845597+00',
    '2026-01-31 10:57:51.799608+00'
);

-- Articolul 25: FAQ Obiecții Proprietari
INSERT INTO public.blog_articles (id, slug, title, title_en, excerpt, excerpt_en, content, content_en, cover_image, category, tags, author_name, is_published, is_premium, published_at, view_count, created_at, updated_at)
VALUES (
    '27c82329-4d6a-4f37-bc73-e42e6a9fb56b',
    'faq-obiectii-proprietari-raspunsuri',
    'Obiecții frecvente ale proprietarilor (și răspunsuri scurte)',
    'Common Owner Objections (and Short Answers)',
    '„Cine încasează?", „Pot opri?", „Ce faceți extra-sezon?", „Preluați orice?".',
    '"Who collects payment?", "Can I stop?", "What do you do off-season?", "Do you take any property?".',
    '<h2>Cele mai frecvente obiecții și răspunsuri</h2><h3>„Cine încasează banii?"</h3><p><strong>Răspuns:</strong> Tu încasezi direct. Platformele (Booking, Airbnb) virează în contul tău. Noi ne ocupăm de operare și îți facturăm comisionul de administrare.</p><h3>„Ce se întâmplă dacă vreau să opresc?"</h3><p><strong>Răspuns:</strong> Ai libertate totală. Respectăm doar rezervările deja confirmate. Nu există penalizări de ieșire.</p><h3>„Ce faceți în extrasezon când nu sunt oaspeți?"</h3><p><strong>Răspuns:</strong> Ajustăm prețurile, creștem vizibilitatea, acceptăm sejururi mai lungi. Sezonalitatea face parte din model - important e să maximizăm când există cerere.</p><h3>„Preluați orice proprietate?"</h3><p><strong>Răspuns:</strong> Nu. Avem criterii: locație, stare, potențial de randament. Nu promitem rezultate pentru proprietăți nepotrivite.</p><h3>„De ce să plătesc comision când pot face singur?"</h3><p><strong>Răspuns:</strong> Poți. Dar ia în calcul: 15-20 ore/săptămână pentru un apartament activ. Mesaje, check-in-uri, curățenie, mentenanță, pricing. Noi îți eliberăm timpul și de obicei creștem veniturile cu 20-40% față de self-management.</p><h3>„Ce garanții am că nu îmi strică apartamentul?"</h3><p><strong>Răspuns:</strong> Selectăm oaspeții (verificare reviews), cerem depozit, avem asigurare, și documentăm starea la fiecare check-in/out. Risc zero nu există, dar îl minimizăm profesionist.</p><h3>„Cât câștig efectiv?"</h3><p><strong>Răspuns:</strong> Depinde de proprietate, locație, sezon. Oferim simulare gratuită bazată pe date reale din piață - fără promisiuni, doar estimări realiste.</p><h3>„Ce se întâmplă dacă un oaspete provoacă daune?"</h3><p><strong>Răspuns:</strong> Reținem din depozit, facem claim la platformă sau la asigurare. Documentăm totul cu poze. Te ținem la curent și rezolvăm noi.</p><h3>„Mă ajutați cu aspecte legale/fiscale?"</h3><p><strong>Răspuns:</strong> Oferim îndrumare generală și te punem în legătură cu specialiști. Nu oferim consultanță juridică sau fiscală profesională.</p><p><strong>Abordarea noastră:</strong> Transparență totală. Nu promitem ce nu putem livra. Preferăm să pierdem un client decât să îl dezamăgim ulterior.</p>',
    '<h2>Most Common Objections and Answers</h2><h3>"Who collects the money?"</h3><p><strong>Answer:</strong> You collect directly. Platforms (Booking, Airbnb) transfer to your account. We handle operations and invoice you the management commission.</p><h3>"What happens if I want to stop?"</h3><p><strong>Answer:</strong> You have complete freedom. We only honor already confirmed bookings. There are no exit penalties.</p><h3>"What do you do off-season when there are no guests?"</h3><p><strong>Answer:</strong> We adjust prices, increase visibility, accept longer stays. Seasonality is part of the model - what matters is maximizing when there is demand.</p><h3>"Do you take any property?"</h3><p><strong>Answer:</strong> No. We have criteria: location, condition, yield potential. We do not promise results for unsuitable properties.</p><h3>"Why pay commission when I can do it myself?"</h3><p><strong>Answer:</strong> You can. But consider: 15-20 hours/week for an active apartment. Messages, check-ins, cleaning, maintenance, pricing. We free your time and usually increase revenue by 20-40% compared to self-management.</p><h3>"What guarantees do I have that they will not damage my apartment?"</h3><p><strong>Answer:</strong> We screen guests (review verification), require deposit, have insurance, and document condition at every check-in/out. Zero risk does not exist, but we minimize it professionally.</p><h3>"How much do I actually earn?"</h3><p><strong>Answer:</strong> Depends on property, location, season. We offer a free simulation based on real market data - no promises, just realistic estimates.</p><h3>"What happens if a guest causes damage?"</h3><p><strong>Answer:</strong> We withhold from deposit, file a claim with the platform or insurance. We document everything with photos. We keep you informed and handle it ourselves.</p><h3>"Do you help with legal/tax aspects?"</h3><p><strong>Answer:</strong> We offer general guidance and connect you with specialists. We do not provide professional legal or tax advice.</p><p><strong>Our approach:</strong> Total transparency. We do not promise what we cannot deliver. We prefer to lose a client than to disappoint them later.</p>',
    NULL,
    'Proprietari',
    ARRAY['FAQ', 'obiecții', 'întrebări', 'proprietari'],
    'RealTrust',
    true,
    false,
    '2026-01-23 10:37:43.845597+00',
    0,
    '2026-01-31 10:37:43.845597+00',
    '2026-01-31 10:57:37.370647+00'
);

-- Articolul 26: Vecini, Zgomot, Reguli
INSERT INTO public.blog_articles (id, slug, title, title_en, excerpt, excerpt_en, content, content_en, cover_image, category, tags, author_name, is_published, is_premium, published_at, view_count, created_at, updated_at)
VALUES (
    '056384d4-d1a2-4a2e-b947-4d3e3d1772cd',
    'vecini-zgomot-reguli-bloc',
    'Vecini, zgomot și reguli: cum previi conflictul în bloc',
    'Neighbors, Noise and Rules: How to Prevent Building Conflicts',
    'Reguli de liniște, depozit, penalizări și comunicare fermă dar calmă.',
    'Quiet rules, deposit, penalties and firm but calm communication.',
    '<h2>Problema reală cu vecinii</h2><p>Cel mai mare risc în regim hotelier nu sunt oaspeții - sunt vecinii supărați. O reclamație la asociație poate duce la interdicție de închiriere.</p><h2>Prevenție: regulile clare din start</h2><h3>Ce comunici oaspeților ÎNAINTE de check-in</h3><ul><li>Program de liniște: 22:00 - 08:00</li><li>Fără petreceri sau grupuri mari</li><li>Respect pentru vecini</li><li>Penalizări pentru încălcări (200-500€ din depozit)</li></ul><h3>Afișaj în apartament</h3><p>Pune un afișaj vizibil cu regulile casei:</p><blockquote>„Te rugăm să respecți liniștea între 22:00-08:00. Imobilul este rezidențial și vecinii noștri apreciază discreția."</blockquote><h2>Când primești reclamație</h2><h3>Pasul 1: Răspunde calm vecinului</h3><blockquote>„Îmi pare rău pentru deranj. Am contactat oaspeții și am rezolvat situația. Vă mulțumesc că mi-ați spus."</blockquote><h3>Pasul 2: Contactează oaspetele ferm</h3><blockquote>„Am primit o reclamație de la vecini despre zgomot. Vă rog să respectați regulile de liniște. La a doua reclamație, vom fi nevoiți să anulăm rezervarea și să reținem depozitul."</blockquote><h3>Pasul 3: Documentează</h3><p>Salvează toate mesajele și notifică platforma (Booking/Airbnb) dacă e cazul.</p><h2>Relația cu asociația de proprietari</h2><ul><li>Informează-i că faci închirieri în regim hotelier</li><li>Dă-le un număr de contact pentru urgențe</li><li>Respectă regulile interne ale blocului</li><li>Participă la ședințe când poți</li></ul><h2>Depozitul - protecția ta</h2><p>Un depozit de 200-300€ descurajează comportamentul problematic:</p><ul><li>Reții pentru încălcări de reguli dovedite</li><li>Documentează cu poze/mesaje înainte de reținere</li><li>Comunică clar de la început ce atrage penalizări</li></ul><p><strong>Concluzie:</strong> Prevenția e mai ieftină decât conflictul. Comunică reguli clare și acționează rapid la primele semne.</p>',
    '<h2>The Real Problem with Neighbors</h2><p>The biggest risk in short-term rentals is not the guests - it is upset neighbors. A complaint to the building association can lead to rental bans.</p><h2>Prevention: Clear Rules from the Start</h2><h3>What to Communicate to Guests BEFORE Check-in</h3><ul><li>Quiet hours: 22:00 - 08:00</li><li>No parties or large groups</li><li>Respect for neighbors</li><li>Penalties for violations (€200-500 from deposit)</li></ul><h3>In-Apartment Signage</h3><p>Post a visible sign with house rules:</p><blockquote>"Please respect quiet hours between 22:00-08:00. The building is residential and our neighbors appreciate discretion."</blockquote><h2>When You Receive a Complaint</h2><h3>Step 1: Respond Calmly to the Neighbor</h3><blockquote>"I apologize for the disturbance. I have contacted the guests and resolved the situation. Thank you for letting me know."</blockquote><h3>Step 2: Contact the Guest Firmly</h3><blockquote>"I received a complaint from neighbors about noise. Please respect the quiet rules. At the second complaint, we will be forced to cancel the reservation and retain the deposit."</blockquote><h3>Step 3: Document</h3><p>Save all messages and notify the platform (Booking/Airbnb) if necessary.</p><h2>Relationship with the Owners Association</h2><ul><li>Inform them you do short-term rentals</li><li>Give them an emergency contact number</li><li>Respect internal building rules</li><li>Attend meetings when you can</li></ul><h2>The Deposit - Your Protection</h2><p>A €200-300 deposit discourages problematic behavior:</p><ul><li>Withhold for proven rule violations</li><li>Document with photos/messages before withholding</li><li>Communicate clearly from the start what triggers penalties</li></ul><p><strong>Conclusion:</strong> Prevention is cheaper than conflict. Communicate clear rules and act quickly at the first signs.</p>',
    NULL,
    'Operațional',
    ARRAY['vecini', 'zgomot', 'reguli', 'bloc'],
    'RealTrust',
    true,
    false,
    '2026-01-25 10:37:43.845597+00',
    0,
    '2026-01-31 10:37:43.845597+00',
    '2026-01-31 10:58:06.444376+00'
);

-- Articolul 27: Mentenanță Preventivă
INSERT INTO public.blog_articles (id, slug, title, title_en, excerpt, excerpt_en, content, content_en, cover_image, category, tags, author_name, is_published, is_premium, published_at, view_count, created_at, updated_at)
VALUES (
    'ac8200dc-dcb3-4bb5-af3c-83e111997461',
    'mentenanta-preventiva-checklist-lunar',
    'Mentenanță preventivă: ce verifici lunar ca să eviți reclamațiile',
    'Preventive Maintenance: Monthly Checks to Avoid Complaints',
    'Un plan de verificare în 30–45 minute/lună care reduce intervențiile urgente.',
    'A 30-45 minute/month verification plan that reduces urgent interventions.',
    '<h2>De ce mentenanța preventivă salvează bani</h2><p>O intervenție de urgență costă de 3-5 ori mai mult decât una planificată. Plus că riști recenzii negative dacă oaspetele găsește ceva stricat.</p><h2>Checklist-ul lunar (30-45 minute)</h2><h3>Instalații sanitare</h3><ul><li>Verifică scurgerea la toate chiuvetele și dușuri</li><li>Testează presiunea apei</li><li>Caută urme de umezeală sub chiuvete</li><li>Verifică toaleta (nu curge continuu?)</li><li>Curăță sifoanele de păr</li></ul><h3>Electrice</h3><ul><li>Testează toate prizele</li><li>Verifică toate becurile</li><li>Testează detectorul de fum</li><li>Verifică cablurile vizibile (nu sunt uzate?)</li></ul><h3>Electrocasnice</h3><ul><li>Curăță filtrul de la aerul condiționat</li><li>Verifică garnitura frigiderului</li><li>Testează aragazul (toate ochiurile)</li><li>Verifică mașina de spălat (furtune, garnituri)</li></ul><h3>Mobilier și finisaje</h3><ul><li>Verifică balamalele ușilor</li><li>Testează toate încuietorile</li><li>Caută urme de mucegai în baie</li><li>Verifică sigiliul geamurilor</li></ul><h2>Calendar de mentenanță sezonieră</h2><h3>Primăvară</h3><ul><li>Service AC înainte de sezonul cald</li><li>Verificare termopane (condensul iernii)</li></ul><h3>Toamnă</h3><ul><li>Verificare centrală/calorifere</li><li>Curățare canale ventilație</li></ul><h2>Când să chemi specialistul</h2><ul><li>Pete de umezeală în tavan = posibilă infiltrație</li><li>Miros persistent de mucegai</li><li>Prize care scânteiază</li><li>Apă caldă inconsistentă</li></ul><p><strong>Regula de aur:</strong> Mai bine repari acum când nu ai oaspete, decât în timpul sejurului.</p>',
    '<h2>Why Preventive Maintenance Saves Money</h2><p>An emergency intervention costs 3-5 times more than a planned one. Plus you risk negative reviews if the guest finds something broken.</p><h2>Monthly Checklist (30-45 minutes)</h2><h3>Plumbing</h3><ul><li>Check drainage at all sinks and showers</li><li>Test water pressure</li><li>Look for moisture traces under sinks</li><li>Check toilet (not running continuously?)</li><li>Clean hair from drains</li></ul><h3>Electrical</h3><ul><li>Test all outlets</li><li>Check all light bulbs</li><li>Test smoke detector</li><li>Check visible cables (not worn?)</li></ul><h3>Appliances</h3><ul><li>Clean air conditioning filter</li><li>Check refrigerator seal</li><li>Test stove (all burners)</li><li>Check washing machine (hoses, gaskets)</li></ul><h3>Furniture and Finishes</h3><ul><li>Check door hinges</li><li>Test all locks</li><li>Look for mold traces in bathroom</li><li>Check window seals</li></ul><h2>Seasonal Maintenance Calendar</h2><h3>Spring</h3><ul><li>AC service before hot season</li><li>Check windows (winter condensation)</li></ul><h3>Autumn</h3><ul><li>Check heating system/radiators</li><li>Clean ventilation channels</li></ul><h2>When to Call the Specialist</h2><ul><li>Moisture stains on ceiling = possible infiltration</li><li>Persistent mold smell</li><li>Sparking outlets</li><li>Inconsistent hot water</li></ul><p><strong>Golden rule:</strong> Better to fix now when you have no guest, than during their stay.</p>',
    NULL,
    'Mentenanță',
    ARRAY['mentenanță', 'preventiv', 'checklist', 'reparații'],
    'RealTrust',
    true,
    false,
    '2026-01-27 10:37:43.845597+00',
    0,
    '2026-01-31 10:37:43.845597+00',
    '2026-01-31 10:58:18.902799+00'
);

-- Articolul 28: Rezervări Directe
INSERT INTO public.blog_articles (id, slug, title, title_en, excerpt, excerpt_en, content, content_en, cover_image, category, tags, author_name, is_published, is_premium, published_at, view_count, created_at, updated_at)
VALUES (
    '130347a7-ba27-4301-baf1-736c3da029ae',
    'rezervari-directe-ghid-complet',
    'Rezervări directe: cum le introduci fără să te lupți cu Booking',
    'Direct Bookings: How to Introduce Them Without Fighting Booking',
    'Politică de preț, beneficii, coduri promo și comunicare.',
    'Pricing policy, benefits, promo codes and communication.',
    '<h2>De ce să vrei rezervări directe</h2><p>Booking și Airbnb iau 15-20% comision. Rezervările directe îți cresc marja. Dar nu e vorba de a „lupta" cu platformele - e vorba de a diversifica.</p><h2>Strategia corectă</h2><h3>1. Nu concura pe preț cu platformele</h3><p>Booking are rată de paritate. Dacă ai preț mai mic direct, îți suspendă listing-ul. Soluția:</p><ul><li>Același preț, dar beneficii extra direct</li><li>Check-out tardiv gratuit</li><li>Kit de bun venit premium</li><li>Parcare inclusă (dacă ai)</li></ul><h3>2. Când să propui direct</h3><ul><li>Oaspeți care revin („data viitoare, direct")</li><li>Sejururi lungi (peste 7 nopți)</li><li>Corporate / business travel</li><li>Recomandări de la alți oaspeți</li></ul><h3>3. Cum să comunici</h3><p>După check-out, un mesaj simplu:</p><blockquote>„Mulțumim pentru sejur! Dacă vrei să revii, contactează-ne direct pentru beneficii exclusive: late checkout gratuit și surprize la check-in. WhatsApp: [număr]"</blockquote><h3>4. Instrumente necesare</h3><ul><li>Pagină simplă de booking (sau doar WhatsApp)</li><li>Contract de închiriere standard</li><li>Sistem de plată (transfer bancar sau card)</li><li>Depozit (obligatoriu fără protecția platformei)</li></ul><h2>Riscuri și cum le gestionezi</h2><h3>Fără review-uri pe platformă</h3><p>Colectează testimoniale și afișează-le pe site sau în descriere.</p><h3>Fără protecție la daune</h3><p>Depozit mai mare + asigurare proprie.</p><h3>Fără garanție de plată</h3><p>Plată integrală înainte de check-in sau cel puțin 50% avans.</p><h2>Obiectiv realist</h2><p>10-20% rezervări directe în primul an e un obiectiv bun. Nu încerca să elimini platformele - folosește-le pentru vizibilitate și convertește clienții fideli.</p><p><strong>Concluzie:</strong> Rezervările directe sunt un bonus, nu o înlocuire. Construiește relații, oferă valoare extra, și clienții vin înapoi direct.</p>',
    '<h2>Why You Want Direct Bookings</h2><p>Booking and Airbnb take 15-20% commission. Direct bookings increase your margin. But it is not about "fighting" platforms - it is about diversifying.</p><h2>The Right Strategy</h2><h3>1. Do Not Compete on Price with Platforms</h3><p>Booking has rate parity. If you have a lower price directly, they can suspend your listing. The solution:</p><ul><li>Same price, but extra benefits direct</li><li>Free late checkout</li><li>Premium welcome kit</li><li>Parking included (if available)</li></ul><h3>2. When to Propose Direct</h3><ul><li>Returning guests ("next time, direct")</li><li>Long stays (over 7 nights)</li><li>Corporate / business travel</li><li>Referrals from other guests</li></ul><h3>3. How to Communicate</h3><p>After checkout, a simple message:</p><blockquote>"Thank you for your stay! If you want to return, contact us directly for exclusive benefits: free late checkout and surprises at check-in. WhatsApp: [number]"</blockquote><h3>4. Necessary Tools</h3><ul><li>Simple booking page (or just WhatsApp)</li><li>Standard rental contract</li><li>Payment system (bank transfer or card)</li><li>Deposit (mandatory without platform protection)</li></ul><h2>Risks and How to Manage Them</h2><h3>No Reviews on Platform</h3><p>Collect testimonials and display them on your website or in descriptions.</p><h3>No Damage Protection</h3><p>Larger deposit + own insurance.</p><h3>No Payment Guarantee</h3><p>Full payment before check-in or at least 50% deposit.</p><h2>Realistic Objective</h2><p>10-20% direct bookings in the first year is a good goal. Do not try to eliminate platforms - use them for visibility and convert loyal customers.</p><p><strong>Conclusion:</strong> Direct bookings are a bonus, not a replacement. Build relationships, offer extra value, and customers come back directly.</p>',
    NULL,
    'Distribuție',
    ARRAY['direct', 'rezervări', 'booking', 'comision'],
    'RealTrust',
    true,
    false,
    '2026-01-21 10:37:43.845597+00',
    0,
    '2026-01-31 10:37:43.845597+00',
    '2026-01-31 10:58:34.202395+00'
);

-- Articolul 29: Housekeeping QC Checklist
INSERT INTO public.blog_articles (id, slug, title, title_en, excerpt, excerpt_en, content, content_en, cover_image, category, tags, author_name, is_published, is_premium, published_at, view_count, created_at, updated_at)
VALUES (
    '85face26-6f54-4c0a-aac5-3a8ce9984a6e',
    'housekeeping-qc-checklist-hotel',
    'Housekeeping ca la hotel: checklist, QC și foto-confirmări',
    'Hotel-Style Housekeeping: Checklist, QC and Photo Confirmations',
    'Standardizare: procese, control de calitate și consumabile, ca să menții 9+ constant.',
    'Standardization: processes, quality control and supplies to maintain 9+ ratings consistently.',
    '<h2>De ce contează standardele de curățenie</h2><p>În regim hotelier, curățenia este factorul #1 care influențează ratingul. Un apartament poate fi perfect amenajat, dar o singură problemă de curățenie duce la recenzii negative.</p><h2>Checklist-ul complet de curățenie</h2><h3>Living și dormitor</h3><ul><li>Aspirat și mopat (sub paturi și canapele)</li><li>Lenjerie proaspătă, fără pete sau fire trase</li><li>Perne și plapumă scuturate și aranjate</li><li>Suprafețe șterse (praf pe mobilă, pervaze)</li><li>Oglinzi și geamuri fără urme</li><li>Telecomenzile dezinfectate</li></ul><h3>Baie</h3><ul><li>Toaletă curățată și dezinfectată</li><li>Duș/cadă fără urme de calcar</li><li>Prosoape noi, împăturite uniform</li><li>Articole de toaletă complete și aranjate</li><li>Coș de gunoi gol cu sac nou</li><li>Canalizare verificată (fără mirosuri)</li></ul><h3>Bucătărie</h3><ul><li>Aragaz și cuptor curate (fără arsuri)</li><li>Frigider gol și curat (verificat și rafturile)</li><li>Vase spălate și aranjate</li><li>Chiuvetă strălucitoare</li><li>Gunoi evacuat, sac nou</li><li>Consumabile: săpun, burete, prosop de bucătărie</li></ul><h2>Sistemul de QC (Quality Control)</h2><h3>Foto-confirmări obligatorii</h3><p>După fiecare curățenie, echipa trimite:</p><ol><li>Foto living - vedere generală</li><li>Foto dormitor - pat aranjat</li><li>Foto baie - toaletă și prosoape</li><li>Foto bucătărie - aragaz și chiuvetă</li></ol><h3>Verificare aleatorie</h3><p>1 din 5 curățenii este verificată fizic de manager. Criteriile:</p><ul><li>Miros plăcut la intrare</li><li>Zero fire de păr în baie</li><li>Lenjerie perfectă</li><li>Toate luminile funcționale</li></ul><h2>Kit standard de consumabile</h2><ul><li>Săpun lichid premium</li><li>Șampon și gel de duș (nu cele ieftine)</li><li>Hârtie igienică (minim 2 role)</li><li>Prosop de bucătărie</li><li>Săculeți de gunoi</li><li>Capsule cafea (dacă ai espressor)</li></ul><p><strong>Regula de aur:</strong> Dacă nu ai sta tu acolo, nu e gata pentru oaspeți.</p>',
    '<h2>Why Cleaning Standards Matter</h2><p>In short-term rentals, cleanliness is the #1 factor affecting ratings. An apartment can be perfectly designed, but a single cleaning issue leads to negative reviews.</p><h2>Complete Cleaning Checklist</h2><h3>Living Room and Bedroom</h3><ul><li>Vacuumed and mopped (under beds and sofas)</li><li>Fresh linens, no stains or loose threads</li><li>Pillows and duvet fluffed and arranged</li><li>Surfaces wiped (dust on furniture, windowsills)</li><li>Mirrors and windows streak-free</li><li>Remote controls disinfected</li></ul><h3>Bathroom</h3><ul><li>Toilet cleaned and disinfected</li><li>Shower/tub without limescale marks</li><li>New towels, uniformly folded</li><li>Toiletries complete and arranged</li><li>Empty trash bin with new bag</li><li>Drains checked (no odors)</li></ul><p><strong>Golden rule:</strong> If you would not stay there yourself, it is not ready for guests.</p>',
    NULL,
    'Operațional',
    ARRAY['curățenie', 'housekeeping', 'QC', 'standarde'],
    'RealTrust',
    true,
    false,
    '2026-01-29 10:37:43.845597+00',
    1,
    '2026-01-31 10:37:43.845597+00',
    '2026-02-01 16:48:27.370301+00'
);

-- Articolul 30: Prețuri Dinamice 2026
INSERT INTO public.blog_articles (id, slug, title, title_en, excerpt, excerpt_en, content, content_en, cover_image, category, tags, author_name, is_published, is_premium, published_at, view_count, created_at, updated_at)
VALUES (
    'c99c262e-d2ce-423e-b91e-09f4c0b5561e',
    'preturi-dinamice-2026-ghid',
    'Prețuri dinamice în 2026: cum crești venitul fără să scazi ratingul',
    'Dynamic Pricing in 2026: How to Increase Revenue Without Lowering Your Rating',
    'Un cadru simplu pentru prețuri dinamice: ADR, ocupare, min-stay, evenimente și reguli de protecție a randamentului.',
    'A simple framework for dynamic pricing: ADR, occupancy, min-stay, events, and yield protection rules.',
    '<h2>De ce contează prețurile dinamice?</h2><p>Prețurile statice lasă bani pe masă. În regimul hotelier, cererea fluctuează constant în funcție de sezon, evenimente, zi a săptămânii și lead time. Prețurile dinamice te ajută să captezi valoarea maximă în perioadele de vârf și să menții ocuparea în perioadele lente.</p><h2>Cele 5 componente ale unui sistem de pricing eficient</h2><h3>1. ADR (Average Daily Rate) de bază</h3><p>Stabilește un preț de referință bazat pe:</p><ul><li>Comparabile din zonă (apartamente similare)</li><li>Costurile tale lunare (utilități, curățenie, mentenanță)</li><li>Marja de profit dorită</li></ul><h3>2. Ajustări pe cerere și sezon</h3><p>Regulile de bază:</p><ul><li><strong>Sezon înalt:</strong> +20-40% față de bază</li><li><strong>Weekenduri:</strong> +15-25% față de zilele de lucru</li><li><strong>Evenimente majore:</strong> +30-80% (UNTOLD, festivaluri, conferințe)</li><li><strong>Sezon mort:</strong> -10-20% (cu min-stay crescut)</li></ul><h3>3. Min-stay strategic</h3><p>Nu accepta rezervări de 1 noapte în perioadele de vârf. Reguli recomandate:</p><ul><li>Weekenduri: minim 2 nopți</li><li>Evenimente: minim 3 nopți</li><li>Sezon înalt: minim 2-4 nopți</li></ul><h3>4. Lead time pricing</h3><p>Ajustează prețul în funcție de cât de devreme se face rezervarea:</p><ul><li>Last minute (sub 7 zile): -5-10% sau menține prețul</li><li>Rezervări anticipate (peste 60 zile): oferte early bird -10%</li></ul><h3>5. Protecția ratingului</h3><p>Nu sacrifica experiența oaspeților pentru câțiva lei în plus:</p><ul><li>Menține standardele de curățenie indiferent de preț</li><li>Comunică clar ce include prețul</li><li>Nu crește prețul brusc pentru același oaspete care revine</li></ul><h2>Cum implementezi practic</h2><ol><li>Setează un calendar de prețuri pe 3 luni înainte</li><li>Revizuiește săptămânal performanța</li><li>Ajustează în funcție de ocupare (sub 50% = scade, peste 80% = crește)</li><li>Monitorizează competiția lunar</li></ol><p><strong>Concluzie:</strong> Prețurile dinamice nu înseamnă să fii lacom. Înseamnă să captezi valoarea corectă pentru ceea ce oferi, în momentul potrivit.</p>',
    '<h2>Why Dynamic Pricing Matters</h2><p>Static prices leave money on the table. In short-term rentals, demand fluctuates constantly based on season, events, day of the week, and lead time. Dynamic pricing helps you capture maximum value during peak periods and maintain occupancy during slow periods.</p><h2>The 5 Components of an Effective Pricing System</h2><h3>1. Base ADR (Average Daily Rate)</h3><p>Establish a reference price based on:</p><ul><li>Comparable listings in your area</li><li>Your monthly costs (utilities, cleaning, maintenance)</li><li>Desired profit margin</li></ul><h3>2. Demand and Season Adjustments</h3><p>Basic rules:</p><ul><li><strong>High season:</strong> +20-40% from base</li><li><strong>Weekends:</strong> +15-25% from weekdays</li><li><strong>Major events:</strong> +30-80% (festivals, conferences)</li><li><strong>Low season:</strong> -10-20% (with increased min-stay)</li></ul><h3>3. Strategic Min-Stay</h3><p>Do not accept 1-night bookings during peak periods. Recommended rules:</p><ul><li>Weekends: minimum 2 nights</li><li>Events: minimum 3 nights</li><li>High season: minimum 2-4 nights</li></ul><h3>4. Lead Time Pricing</h3><p>Adjust price based on how early the booking is made:</p><ul><li>Last minute (under 7 days): -5-10% or maintain price</li><li>Early bookings (over 60 days): early bird offers -10%</li></ul><h3>5. Rating Protection</h3><p>Do not sacrifice guest experience for a few extra euros:</p><ul><li>Maintain cleaning standards regardless of price</li><li>Clearly communicate what the price includes</li><li>Do not suddenly increase price for returning guests</li></ul><p><strong>Conclusion:</strong> Dynamic pricing does not mean being greedy. It means capturing the right value for what you offer, at the right time.</p>',
    NULL,
    'Administrare Hotelieră',
    ARRAY['pricing', 'revenue', 'ADR', 'dinamice'],
    'RealTrust',
    true,
    false,
    '2026-01-30 10:37:43.845597+00',
    0,
    '2026-01-31 10:37:43.845597+00',
    '2026-01-31 10:37:43.845597+00'
);

-- Articolul 31: Mesaje Automate
INSERT INTO public.blog_articles (id, slug, title, title_en, excerpt, excerpt_en, content, content_en, cover_image, category, tags, author_name, is_published, is_premium, published_at, view_count, created_at, updated_at)
VALUES (
    '86e85f94-2189-4af5-a2b1-d8e1d5a98310',
    'mesaje-automate-checkin-template',
    'Mesaje automate: 7 texte care reduc 80% din întrebări',
    'Automated Messages: 7 Texts That Reduce 80% of Questions',
    'Pre-sosire, check-in, Wi‑Fi, parcare, reguli, late checkout, review request.',
    'Pre-arrival, check-in, Wi-Fi, parking, rules, late checkout, review request.',
    '<h2>De ce automatizarea mesajelor e critică</h2><p>Fiecare întrebare pe care o primești înseamnă timp pierdut. Cu mesaje bine gândite, trimise automat, reduci dramatic volumul de comunicare.</p><h2>Cele 7 mesaje esențiale</h2><h3>1. Pre-sosire (24h înainte)</h3><p><em>Template:</em></p><blockquote>„Bună [Nume]! Mâine este ziua check-in-ului 🎉<br><br>📍 Adresa: [adresă completă]<br>🕐 Check-in: de la 15:00<br>🔑 Cod acces: [XXX] sau vei primi pe WhatsApp<br><br>Ai nevoie de ceva special? Scrie-mi!"</blockquote><h3>2. Instrucțiuni check-in (2h înainte sau la cerere)</h3><blockquote>„Salut! Iată pașii pentru check-in:<br><br>1. Ajungi la [adresă]<br>2. Intri în bloc cu codul [XXX]<br>3. Etaj [X], ușa [Y]<br>4. Cod yală: [ZZZZ]<br><br>Video tutorial: [link]<br>Orice problemă, sună-mă: [telefon]"</blockquote><h3>3. Wi-Fi și utilități (după check-in)</h3><blockquote>„Bine ai venit! 🏠<br><br>📶 Wi-Fi: [nume rețea] / Parolă: [parolă]<br>📺 TV: telecomanda e pe masă, Netflix inclus<br>❄️ AC: telecomanda în sertarul noptierei<br><br>Orice întrebare, sunt aici!"</blockquote><h3>4. Parcare (dacă e cazul)</h3><blockquote>„Despre parcare:<br><br>🅿️ Gratuit pe stradă după 18:00<br>🅿️ Parcarea privată: [locație] - locul [X]<br>📍 Cea mai apropiată parcare publică: [adresă]"</blockquote><h3>5. Reguli rapide (prima seară)</h3><blockquote>„Câteva reguli rapide:<br><br>🔇 Liniște după 22:00<br>🚭 Fumatul interzis (amendă 200€)<br>🐕 Fără animale (decât cu aprobare)<br>🎉 Fără petreceri<br><br>Mulțumim pentru înțelegere!"</blockquote><h3>6. Late checkout (în ziua plecării, dimineața)</h3><blockquote>„Bună dimineața! ☀️<br><br>⏰ Check-out: 11:00<br>🔑 Lasă cheile pe masă / Trage ușa după tine<br><br>Ai nevoie de late checkout? Scrie-mi, poate e disponibil (+10€/oră)."</blockquote><h3>7. Review request (24h după plecare)</h3><blockquote>„Mulțumim că ai stat la noi! 🙏<br><br>Sperăm că ți-a plăcut. Dacă ai 2 minute, ne-ar ajuta enorm o recenzie pe [Booking/Airbnb].<br><br>[Link direct review]<br><br>Drum bun și pe curând!"</blockquote><p><strong>Pro tip:</strong> Folosește placeholder-e [Nume], [Data] în sistemul de automatizare pentru personalizare.</p>',
    '<h2>Why Message Automation is Critical</h2><p>Every question you receive means lost time. With well-thought-out messages sent automatically, you dramatically reduce communication volume.</p><h2>The 7 Essential Messages</h2><h3>1. Pre-arrival (24h before)</h3><p><em>Template:</em></p><blockquote>"Hi [Name]! Tomorrow is check-in day 🎉<br><br>📍 Address: [full address]<br>🕐 Check-in: from 3:00 PM<br>🔑 Access code: [XXX]<br><br>Need anything special? Let me know!"</blockquote><p><strong>Pro tip:</strong> Use placeholders [Name], [Date] in your automation system for personalization.</p>',
    NULL,
    'Operațional',
    ARRAY['mesaje', 'automatizare', 'check-in', 'template'],
    'RealTrust',
    true,
    false,
    '2026-01-26 10:37:43.845597+00',
    0,
    '2026-01-31 10:37:43.845597+00',
    '2026-01-31 10:37:43.845597+00'
);

-- =====================================================
-- FINALIZARE
-- =====================================================

-- Opțional: Creare index pentru slug (performanță căutări)
CREATE INDEX IF NOT EXISTS idx_blog_articles_slug ON public.blog_articles(slug);

-- Opțional: Creare index pentru published_at (sortare cronologică)
CREATE INDEX IF NOT EXISTS idx_blog_articles_published_at ON public.blog_articles(published_at DESC);

-- Verificare finală
-- SELECT COUNT(*) as total_articles FROM public.blog_articles WHERE is_published = true;

-- =====================================================
-- SCRIPT GENERAT DE LOVABLE
-- Conține 30+ articole de blog cu conținut bilingv RO/EN
-- =====================================================
