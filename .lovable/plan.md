# Optimizare imagine principală pentru LCP/FCP

## Ce modific
- Generez variante WebP dimensionate pentru mobil și desktop, păstrând fotografia și încadrarea actuală.
- Limitez telefoanele la imaginile mobile, inclusiv pe ecrane cu densitate mare, pentru a evita descărcarea accidentală a variantei desktop.
- Folosesc preîncărcări separate prin media query și aceeași selecție în imaginea statică inițială și în pagina React, evitând cereri duplicate.
- Păstrez imaginea ca element LCP; videoclipul desktop va porni numai după prima interacțiune, ca să nu înlocuiască târziu LCP-ul.

## Verificare
- Verific aspectul la 384×709 și 1280×1800.
- Verific cererile de rețea pentru a confirma fișierul corect pe fiecare ecran.
- Rulez verificarea TypeScript și controlez jurnalul de compilare.

## Detalii tehnice
- Mobil: set dedicat 480w/800w, fără acces la variantele desktop.
- Desktop: set 960w/1280w/1600w, selectat după lățimea reală.
- `fetchpriority="high"`, dimensiuni explicite și raport stabil rămân pe imaginea inițială.
