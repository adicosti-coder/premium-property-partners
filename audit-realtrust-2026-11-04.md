# RealTrust — audit prioritar și remedieri, 4 noiembrie 2026

## Verdict

Remedieri tehnice confirmate implementate în proiect; nu sunt încă publicate. Auditul comercial rămâne deschis pentru confirmări și documente. Nu este o certificare completă a tuturor paginilor, formularelor sau afirmațiilor financiare.

## Dovezi separate

- **Cod:** inspectate mecanismul limbilor, emiterea conversiilor, calculatoarele principale, pachetele proprietarilor, identitatea juridică și prerandarea SEO.
- **Date actuale:** citire fără modificări: 13 cazări active, 6 închirieri, 19 investiții și 16 vânzări. Aceste categorii NU stabilesc numărul proprietăților administrate contractual.
- **Producție:** 14 vizite la cele șapte rute solicitate, fiecare în RO și EN; canonical unic, description unic, robots unic, title prezent și H1 unic. Româna index, follow; engleza noindex, follow. Fără erori JS captate ori depășire orizontală la 384×709 în aceste probe. Sitemap index și ambele fișiere componente răspund 200; 27 + 161 URL-uri, fără variante lang=en.
- **Proiect după remedieri:** aceleași 14 probe RO/EN; schimbare EN→RO→reîncărcare și RO→EN→reîncărcare trecută; vizitele și reîncărcările /multumire nu emit Lead. O vizualizare GA4 manuală pentru accesul inițial, fără emitent automat suplimentar în configurație.
- **Nu folosim rezultate Google indexate ca dovadă de conținut actual.**

## 1. Portofoliu și identitate

Homepage are 15 în RO și 14 în EN (Index.tsx:307–308). Pagina proprietarilor amestecă 13 cazări și 15 proprietăți administrate; AboutUs are 13 static. Lista statică de 13 elemente nu dovedește contracte de management.

orgIdentity.ts centralizează RealTrust, SC Imo Business Centrum SRL și ApArt Hotel ca brand de cazare. Mențiunea FullViewTour într-o descriere trebuie confirmată ca partener/serviciu, nu înlocuită arbitrar.

Configurație pregătită în commercialReview.ts: cazări active, proprietăți administrate și anunțuri promovate sunt metrici distincte, cu valori nealese și surse/definiții de confirmat. Nu este conectată la textele publice.

## 2. Comisioane și pachete

Referința existentă managementPolicy.ts: 15–20% din baza netă (brut minus canale și utilități), menaj separat. Nu a fost modificată.

Variante actuale contradictorii:
- Carduri: Management Esențial 15%, ApArt Hotel Complet 20%, Full Service Premium 20%.
- Rezumat/schema proprietari: Starter 15%, Esențial 18%, Standard 20%.
- Prerandare: Lite 15%, Standard 20%, Premium 20%.

Configurația de revizie le inventariază, fără activare sau eliminare de pachete. Sunt necesare catalogul aprobat, precizarea TVA, responsabilitatea menajului și consumabilelor, utilitățile, reparațiile și comisioanele fiecărui canal. Procentele de canal sau ipotezele de taxare nu trebuie confundate cu procentul de management. Auditul nu certifică absența globală a oricărui 25% în toate datele dinamice, articolele și cache-urile.

## 3. Calculatoare și randament

ProfitCalculator folosește baza comună, dar utilitățile sunt 0 în formula locală și curățenia introdusă se scade din venitul proprietarului. Explicația veche afirma opusul, 75% ocupare și 9,4% net fără capital investit. Explicația RO/EN a fost aliniată strict la formula existentă: venit brut, costuri incluse, costuri neincluse, ocupare inițială 70%, fără procent ROI. Nicio valoare/formulă comercială nu a fost schimbată.

Alte calculatoare nu sunt perfect comparabile: InvestmentYieldCalculator folosește preț plus renovare; unele folosesc preț ×1,02. Compararea necesită o bază de capital și costuri aprobată. 65–75% este ipoteză anuală; 78% poate fi istoric numai cu perioadă și sursă; 1,6× venit brut nu dovedește randament net.

## 4. Engleză

Engleza este funcțională pe paginile verificate. Defect confirmat: schimbarea în RO păstra ?lang=en, deci reîncărcarea revenea în EN. Selectorul actualizează acum parametrul prin router, păstrând ceilalți parametri, fragmentul și starea paginii. Canonicalurile și URL-urile comerciale nu au fost restructurate.

PhraseTranslator urmărește acum și modificarea atributelor traductibile după încărcarea inițială; restaurarea la RO și protejarea modificărilor React rămân testate. Nu declarăm întregul site tradus complet. EN rămâne noindex, follow, fără variante EN în sitemap.

## 5. Promisiuni care necesită dovezi

Nu au fost șterse automat: echipa de 12 persoane, răspuns/intervenții 24h sau 24/7, limite sub 100/200 pentru intervenții (moneda și aplicabilitatea cer confirmare), scutirea de comision după ocupare, depozite oaspeți, protecție daune/asigurare, fond de intervenții, transferabilitatea conturilor de platformă, portal și rapoarte financiare. Surse principale: AboutUs, OwnerPricingPackages, OwnerExitDamagePolicy, OwnerRisksLimits și pagina proprietarilor.

Referința contractuală existentă este 12 luni, probă 90 zile, preaviz 30 zile; nu a fost rescrisă. Pagina evaluării susține o bază proprie de peste 500 tranzacții și exemple recente; sursa și caracterul real/ilustrativ trebuie documentate. Nu există verificare de asigurare sau de executare efectivă a tuturor SLA-urilor în acest audit.

## 6. Aritmetică demonstrată

- 480 ×12 = 5.760 €/an brut: corect.
- 5.760 /95.000 = 6,063% brut: aproximarea 6,1% este corectă.
- 65 ×78% ×30 ×12 = 18.252 €/an brut: ipoteză de luni de 30 zile, nu istoric.
- 14.800 /95.000 = 15,579%, nu 9,4%.
- 9,4% ×95.000 = 8.930 €/an.
- 1.130 /480 −1 = 135,417% creștere, fără demonstrație net-net.
- Ilustrativ, cu 15% canale, 120 €/lună utilități și 20% administrare: (18.252 −2.737,80 −1.440) ×80% = 11.259,36 €/an, înainte de menaj și taxe. Nu este ofertă sau estimare aprobată.

Prerandarea avea „14.800 net ≈9,4%” și compara net hotelier cu brut clasic. A fost înlocuită cu aritmetica brut-brut verificabilă folosind aceleași ADR/ocupare/preț, marcate ilustrative; nu s-a inventat un net nou. Exemplul complet net și estimările pe 2–3 camere rămân de validat cu ipoteze comerciale/documente.

## 7. SEO, conversii și formulare

GA4 păstrat, inclusiv întârzierea și consimțământul. Configurația scriptului nu mai emite automat prima page_view; emitentul SPA existent rămâne responsabil.

OwnerContactLeadForm emitea mai multe evenimente mapate la Meta Lead pentru aceeași salvare, inclusiv opțiuni de analiză. Acum emite un singur Lead_Submit după succes, opțiunile devenind atribute. EvaluareGratuita emite conversia după salvarea confirmată; ThankYou nu mai creează Lead la vizitare/reîncărcare. ID-ul comun Pixel/CAPI și consimțământul sunt păstrate prin helperul existent.

Formularul gol de evaluare nu poate avansa, verificat în browser. **Salvarea reală urmată de citire în interfață nu este verificată**: nu au fost create cereri care ar trimite notificări operaționale, nici ocolit captcha. Recepția reală GA4/Meta, notificările și atribuirea externă nu sunt certificate. Protecția submitLead care cere leadId la fluxul protejat a fost inspectată; fluxurile alternative și toate CTA-urile nu au primit o verificare completă end-to-end.

## Fișiere și teste

Modificate: LanguageSwitcher.tsx, languagePolicy.ts și testul său, PhraseTranslator.tsx și testul său, OwnerContactLeadForm.tsx, EvaluareGratuita.tsx, ThankYou.tsx, YieldTransparencyNote.tsx, index.html (doar configurarea GA4), plugins/vite-prerender-seo.ts, AGENTS.md și roadmap.md.

Adăugate: ownerLeadConversion.ts/test, commercialReview.ts/test, ThankYou.test.tsx și acest raport.

**58 fișiere de teste, 378 teste trecute.** Ultima stare disponibilă în jurnalul compilării: build OK. Nu s-a rulat manual build/typecheck; platforma verifică compilarea automat. Capturi verificate: homepage EN mobil și desktop, formular evaluare cu pasul următor dezactivat. Explicația calculatorului nu a primit o captură reușită, deci verificarea sa vizuală rămâne deschisă.

## Restanțe și decizii

1. Confirmarea numărului de proprietăți administrate contractual și a perioadei de referință; cele 13 cazări active sunt fapt de inventar, nu echivalență.
2. Catalogul oficial de pachete, procente/bază/TVA și distribuția costurilor; configurația nu se activează până la răspuns.
3. Documente pentru echipă, SLA, asigurări/daune/fond, istoricul financiar și exemplele recente.
4. Probă reală autorizată de formular, cu contact de test și notificări controlate; citirea rezultatului salvat și verificarea conversiei externe.
5. Publicarea remedierilor și repetarea probelor pe realtrust.ro; verificările de producție din acest raport privesc versiunea anterioară remedierilor.
6. Audit extins pe toate rutele dinamice, articole, cache-uri, CTA-uri, linkuri, detalii proprietăți și toate calculatoarele; nu este acoperit de cele șapte pagini verificate.

Nu s-au schimbat schema bazei, redirecturile, identitatea juridică, tarifele ori politica contractuală. Nu s-au trimis mesaje, apeluri sau publicări sociale.