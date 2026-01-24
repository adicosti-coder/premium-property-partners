# 🔐 Security Documentation - RealTrust Platform

Acest document descrie toate măsurile de securitate implementate în platforma RealTrust.

---

## 📋 Cuprins

1. [Autentificare și Parole](#autentificare-și-parole)
2. [Protecție Anti-Spam (hCaptcha)](#protecție-anti-spam-hcaptcha)
3. [Validare Server-Side](#validare-server-side)
4. [Row Level Security (RLS)](#row-level-security-rls)
5. [Sanitizare Input](#sanitizare-input)
6. [Controlul Accesului](#controlul-accesului)
7. [Monitorizare și Alertare](#monitorizare-și-alertare)
8. [Bune Practici](#bune-practici)

---

## 🔑 Autentificare și Parole

### Cerințe Parole
Toate parolele trebuie să îndeplinească următoarele criterii:

| Criteriu | Descriere |
|----------|-----------|
| **Lungime minimă** | 8 caractere |
| **Literă mare** | Cel puțin o literă mare (A-Z) |
| **Literă mică** | Cel puțin o literă mică (a-z) |
| **Cifră** | Cel puțin o cifră (0-9) |
| **Parole comune** | Blocate automat |

### Parole Blocate
Sistemul blochează automat parolele comune precum:
- `password`, `123456`, `qwerty`, `admin`, `letmein`
- Variante cu numere (`password1`, `password123`)
- Secvențe predictibile (`111111`, `abcdef`)
- Pattern-uri cu ani sau date (`2024`, `01/01/2000`)

### Implementare
- **Componenta**: `src/components/PasswordStrengthIndicator.tsx`
- **Funcție exportabilă**: `validatePassword(password)` - returnează `{ isValid, strength, errors }`
- **Pagini protejate**: `/auth` (signup) și `/reset-password`

### Feedback Vizual
- Indicator de putere cu 5 nivele (Slabă → Foarte Puternică)
- Checklist în timp real pentru fiecare criteriu
- Recomandări specifice pentru îmbunătățire
- Buton de submit dezactivat până când parola e validă

---

## 🛡️ Protecție Anti-Spam (hCaptcha)

### Formulare Protejate
Toate formularele publice sunt protejate cu hCaptcha:

| Formular | Locație | Tip Protecție |
|----------|---------|---------------|
| `LeadCaptureForm` | Calculator profit | hCaptcha |
| `QuickLeadForm` | Formular rapid | hCaptcha |
| `BookingForm` | Rezervări | hCaptcha |
| `GuestReviewForm` | Recenzii oaspeți | hCaptcha |
| `RealEstateContactForm` | Contact imobiliare | hCaptcha |
| `ReferralBanner` | Program referral | hCaptcha |

### Verificare Server-Side
- **Edge Function**: `supabase/functions/verify-hcaptcha/index.ts`
- Validare token hCaptcha cu API-ul oficial
- Logging detaliat în baza de date (`captcha_logs`)

### Secrets Necesare
```
HCAPTCHA_SITE_KEY - Cheie publică pentru widget
HCAPTCHA_SECRET_KEY - Cheie privată pentru verificare server
```

---

## ✅ Validare Server-Side

### Edge Functions cu Validare
Toate Edge Functions care procesează date de la utilizatori implementează:

#### 1. Sanitizare HTML
```typescript
const escapeHtml = (text: string): string => {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};
```

#### 2. Validare Telefon
```typescript
const sanitizePhone = (phone: string): string => {
  return phone.replace(/[^0-9+\-\s()]/g, '').slice(0, 20);
};
```

#### 3. Validare Email
```typescript
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
};
```

#### 4. Validare URL
```typescript
const isValidUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
};
```

### Edge Functions Protejate
- `send-lead-notification` - Notificări lead-uri
- `send-booking-notification` - Notificări rezervări
- `send-referral-notification` - Notificări referral
- `send-review-notification` - Notificări recenzii

---

## 🔒 Row Level Security (RLS)

### Principii
1. **Toate tabelele au RLS activat**
2. **Date sensibile** - acces restricționat la admin sau proprietar
3. **Formulare publice** - INSERT permis cu protecție hCaptcha
4. **Date publice** - SELECT permis pentru conținut public (blog, proprietăți)

### Tabele cu Acces Restricționat

| Tabel | Politică | Acces |
|-------|----------|-------|
| `leads` | Admin only | Doar utilizatori cu rol `admin` |
| `referrals` | Admin + Owner | Admin sau referrer-ul propriu |
| `bookings` | Admin only | Doar utilizatori cu rol `admin` |
| `cta_analytics` | Admin only | Doar utilizatori cu rol `admin` |
| `owner_properties` | Owner | Proprietarul sau admin |
| `financial_records` | Owner | Proprietarul proprietății |

### Funcție de Verificare Rol
```sql
CREATE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$ LANGUAGE sql SECURITY DEFINER;
```

---

## 🧹 Sanitizare Input

### Client-Side (Zod)
Toate formularele folosesc validare Zod:

```typescript
const contactSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(255),
  phone: z.string().regex(/^[0-9+\-\s()]+$/).max(20),
  message: z.string().trim().min(1).max(1000),
});
```

### Limite de Lungime
| Câmp | Limită |
|------|--------|
| Nume | 100 caractere |
| Email | 255 caractere |
| Telefon | 20 caractere |
| Mesaj | 1000-5000 caractere |
| Parolă | 8-72 caractere |

### Protecție XSS
- **Nu se folosește** `dangerouslySetInnerHTML` cu input utilizator
- Toate datele afișate sunt escaped automat de React
- Conținut HTML (blog) este sanitizat înainte de stocare

---

## 👥 Controlul Accesului

### Roluri Disponibile
```typescript
type AppRole = "admin" | "moderator" | "user" | "owner";
```

### Pagini Protejate
| Pagină | Rol Necesar |
|--------|-------------|
| `/admin` | `admin` |
| `/portal-proprietar` | `owner` |
| `/profil` | autentificat |
| `/setari` | autentificat |

### Hook de Verificare
```typescript
const { isAdmin, isLoading } = useAdminRole();
```

### Trigger-e de Securitate
- `handle_new_user` - Creează profil automat la înregistrare
- `sync_user_email` - Sincronizează email-ul în profiles
- `create_welcome_notifications` - Notificări de bun venit

---

## 📊 Monitorizare și Alertare

### Dashboard Admin - Captcha Logs
- **Locație**: `/admin` → Tab "Captcha"
- Vizualizare încercări în timp real
- Statistici succes/spam
- Export CSV pentru audit

### Alerte Automate
1. **Rată Spam Ridicată**
   - Prag: 20% spam în ultimele 24h
   - Edge Function: `check-spam-rate-alert`
   - Notificare: Slack + Email admin

2. **Rată Conversie Scăzută**
   - Prag: configurabil în `site_settings`
   - Edge Function: `check-conversion-rate-alert`

3. **Follow-up Reminders**
   - Edge Function: `check-follow-up-reminders`
   - Referral-uri pending > 48h

### Logging
Toate Edge Functions au logging detaliat pentru debugging:
```typescript
console.log(`[${functionName}] Processing request for: ${userId}`);
console.error(`[${functionName}] Error: ${error.message}`);
```

---

## 📝 Bune Practici

### Pentru Dezvoltatori

1. **Nu stocați secrete în cod**
   - Folosiți Supabase Secrets pentru API keys
   - Nu commit-ați `.env` în repository

2. **Validați întotdeauna pe server**
   - Nu vă bazați doar pe validarea client-side
   - Edge Functions trebuie să valideze toate input-urile

3. **Folosiți RLS pentru toate tabelele noi**
   - Activați RLS imediat după creare
   - Definiți politici explicite pentru fiecare operație

4. **Testați cu date malițioase**
   - Încercați SQL injection
   - Testați XSS cu `<script>` tags
   - Verificați limita de caractere

### Checklist Securitate pentru Features Noi

- [ ] RLS activat pe tabele noi
- [ ] Validare Zod pe client
- [ ] Sanitizare în Edge Functions
- [ ] hCaptcha pentru formulare publice
- [ ] Limite de lungime pe câmpuri
- [ ] Logging pentru debugging
- [ ] Verificare rol pentru pagini protejate

---

## 🔄 Actualizări

| Data | Versiune | Modificări |
|------|----------|------------|
| 2026-01-24 | 1.0 | Documentație inițială |

---

## 📞 Contact Securitate

Pentru raportarea vulnerabilităților sau întrebări de securitate:
- **Email**: security@realtrust.ro
- **Response Time**: < 24h pentru probleme critice

---

*Acest document este actualizat la fiecare modificare majoră de securitate.*
