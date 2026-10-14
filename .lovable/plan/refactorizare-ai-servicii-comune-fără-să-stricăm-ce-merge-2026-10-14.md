# Refactorizare AI: servicii comune, fără să stricăm ce merge

## Ce propun
Cererea are două părți cu riscuri foarte diferite:

- **Partea sigură, cu câștig real:** analiza pozelor și textele AI (descrieri, SEO, traduceri). Aici apar apelurile repetate și costurile.
- **Partea riscantă, cu câștig mic:** Andrei, scanarea anunțurilor și WhatsApp/e-mail. Adresele lor sunt înregistrate la Meta (WhatsApp), Twilio, Make.com și în programările automate. Dacă le mutăm, mesajele și apelurile se pot opri fără niciun avertisment.

Așa că le fac în etape. Adresele vechi rămân active, dar trimit cererile către serviciile noi. Nimic din exterior nu trebuie reconfigurat.

## Etapa 1: baza comună (pentru toate funcțiile)
- Un modul comun pentru apelurile AI: cheia, modelul principal, modelul de rezervă (gpt-6-luna), reîncercări la 429/5xx, limită de timp și aceleași mesaje de eroare (402 = credite epuizate, 429 = prea multe cereri).
- Aceeași verificare de admin sau apel intern peste tot (există deja; o folosesc uniform).
- Același răspuns de eroare și aceleași jurnale.

## Etapa 2: `ai-vision`
- O singură funcție cu un singur apel AI care întoarce, după o schemă fixă: titlul, descrierea, camerele, dotările, starea, stilul, scorul, sugestiile și textul alternativ pentru fiecare poză.
- Îmbunătățirea pozelor (lumină, mobilare virtuală, curățare de obiecte, amurg) devine o acțiune separată în același serviciu.
- Funcțiile vechi de analiză a pozelor, descrierile de poze și scorul pozelor rămân doar ca intrare care trimite cererea mai departe.

## Etapa 3: `ai-text-generation`
- Parametrul `action` poate fi TRANSLATE, SEO_OPTIMIZE, GENERATE_DESCRIPTION sau EXTRACT_AMENITIES.
- Memorare rezultate: un tabel nou, accesibil doar backendului. Cheia este amprenta textului sursă + acțiune + limbă + versiunea instrucțiunilor. Înainte să apeleze AI-ul, serviciul caută acolo. Dacă găsește, răspunde imediat, fără cost.
- Traducerile, rescrierile de descrieri și completarea meta-datelor SEO trec prin acest serviciu.

## Etapa 4 (opțională, după confirmarea ta): Andrei, scanarea și WhatsApp
- Aici doar mut codul repetat în modulele comune din etapa 1.
- Funcțiile rămân separate, cu aceleași adrese. Nu le comasez în 3 servicii mari, pentru că nu ar scădea vizibil timpul de răspuns, dar riscul de oprire ar fi mare.

## Verificare
- Teste pentru amprenta textului, schema răspunsului și modelul de rezervă.
- Pe site-ul live, cu contul de admin: o analiză de poză, o îmbunătățire de poză și aceeași traducere de două ori (a doua trebuie să vină din memorie). Plus jurnalele fără erori.
- Nu trimit mesaje WhatsApp reale și nu public nimic pe rețelele sociale.

## Detalii tehnice
- `_shared/aiClient.ts` (callAI cu structured output prin json_schema/tools și fallback), `_shared/http.ts` (cors, json, erori).
- Tabelul `ai_text_cache` (hash sha256, action, lang, prompt_version, output, created_at), cu RLS activ, fără politici publice; acces doar service role. Indexul este unic pe hash.
- Funcțiile vechi devin redirecționări subțiri, pentru compatibilitate cu clientul, cu cron și cu webhookurile. Codul duplicat se șterge doar după 2 săptămâni fără trafic.
