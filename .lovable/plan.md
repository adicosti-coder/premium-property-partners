
Ce am constatat

Nu pare doar o “buclă” de conținut. Sunt două probleme diferite care se suprapun:

1. Domeniul live `www.realtrust.ro` încă servește SEO prerender vechi față de preview / published app.
   - Preview-ul și URL-ul public Lovable arată varianta nouă.
   - Custom domain-ul încă expune heading/meta vechi în HTML-ul prerandat.
   - Asta explică de ce auditul repetă aceleași observații chiar după modificări.

2. SEO AI Optimizer parsează fragil meta description-ul.
   - În raport apare `Actual: Aeroport. Calculează ROI gratuit!`, deși pagina live are alt text mai lung.
   - Deci funcția de audit nu doar citește conținut vechi, ci uneori extrage greșit meta-ul.

Plan de remediere

1. Unific sursa SEO pentru homepage
   - Mut titlul, meta description și H1 într-o singură constantă comună.
   - O folosesc în:
     - `src/pages/Index.tsx`
     - `src/components/SEOHead.tsx`
     - `plugins/vite-prerender-seo.ts`
     - `index.html` static shell
   - Scop: să nu mai existe 3-4 variante diferite pentru aceeași pagină.

2. Elimin conflictul dintre prerender, static shell și React Hero
   - Verific cine produce semantic primul heading.
   - Păstrez un singur H1 clar și consecvent.
   - Transform heading-urile auxiliare din shell/prerender în H2 sau text simplu unde e cazul.
   - Fac textul H1 mai SEO, dar natural, fără keyword stuffing.

3. Curăț structura meta description
   - Elimin sursele duplicate care pot concatena sau trunchia descrierea.
   - Setez un singur meta description final pentru homepage.
   - Îl aliniez cu varianta recomandată de audit și cu CTA clar.

4. Refac parserul din SEO AI Optimizer
   - În `supabase/functions/seo-ai-optimizer/index.ts` schimb extracția meta din regex fragil în logică robustă:
     - colectează toate meta `description`
     - verifică și `og:description` / `twitter:description`
     - normalizează fără să “taie” agresiv după virgule
     - alege candidatul cel mai complet și valid
   - Adaug debug fields utile în răspuns:
     - title detectat
     - meta candidates găsite
     - meta final aleasă
     - sursa scrape-ului (Firecrawl/direct fetch)

5. Fac o versiune “premium” pentru SEO AI Optimizer
   - În `SEOOptimizerManager.tsx` adaug un mod de diagnostic:
     - “ce a citit efectiv auditul”
     - H1/H2 count detectat
     - meta description brută
     - sursa auditului
     - indicator clar dacă auditul vine din cache sau din live fetch
   - Astfel vedem imediat dacă problema e în site sau în audit tool.

6. Reduc riscul de keyword stuffing pe homepage
   - Simplific blocurile SEO ascunse care sunt prea dense.
   - Păstrez keyword-urile importante, dar mai natural distribuite.
   - Mă concentrez pe:
     - agenție imobiliară Timișoara
     - apartamente de închiriat Timișoara studenți
     - apartamente noi Timișoara
     - apartamente de vânzare Timișoara Centru
     - cazare temporară Timișoara
   - Fără suprapuneri inutile între prerender block și React block.

7. Verificarea finală după implementare
   - Compar din nou:
     - preview URL
     - published Lovable URL
     - `www.realtrust.ro`
   - Confirm că toate trei expun aceeași combinație:
     - title
     - meta description
     - H1
     - conținut SEO principal
   - Apoi rulez din nou auditul forțat și verific dacă:
     - meta “Actual” nu mai e trunchiată
     - H1 e detectat corect
     - recomandările nu mai repetă aceleași probleme false

Detalii tehnice

```text
Problemă actuală
custom-domain HTML != preview HTML
optimizer parser meta = fragil
=> audit repetitiv + rezultate par “blocate”
```

Fișiere pe care le voi atinge
- `src/pages/Index.tsx`
- `src/components/SEOHead.tsx`
- `src/components/Hero.tsx`
- `index.html`
- `plugins/vite-prerender-seo.ts`
- `supabase/functions/seo-ai-optimizer/index.ts`
- `src/components/admin/SEOOptimizerManager.tsx`

Rezultatul urmărit
- un singur set coerent de semnale SEO pe homepage
- audit care citește corect pagina live
- panou SEO AI Optimizer mult mai transparent pentru debugging
- ieșire din blocajul artificial de la 92, sau cel puțin un raport nou care reflectă real schimbările făcute
