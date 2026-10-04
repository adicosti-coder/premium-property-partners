# Vizionare clienți în pași mici

## Ce construim
- Când un client cere o vizionare, Andrei solicită mai întâi doar zona dorită.
- După răspuns, solicită doar numărul de camere.
- Apoi solicită ziua preferată, iar la final ora.
- Confirmă pe scurt cererea completă și o păstrează în conversație pentru echipă.

## Reguli păstrate
- Fluxul se aplică doar clienților/cumpărătorilor/chiriașilor, nu proprietarilor legați de anunțuri.
- Nu se declanșează alerta URGENT destinată proprietarilor.
- STOP, refuzurile, consimțământul de publicare și deduplicarea rămân neschimbate.
- Fiecare răspuns conține o singură întrebare și cere o singură informație.

## Detalii tehnice
- Starea pasului se deduce din mesajele deja salvate în conversație, fără formular separat și fără date duplicate.
- Webhook-ul va recunoaște răspunsurile scurte contextuale, inclusiv o zonă, „2 camere”, o zi sau o oră.
- Se adaugă teste pentru ordinea completă, pentru reluarea conversației și pentru separarea proprietar/client.
- Se verifică compilarea, apoi se redeployează funcțiile WhatsApp afectate.