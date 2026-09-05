import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { useLanguage } from "@/i18n/LanguageContext";

const LegalPage = ({ type }: { type: "terms" | "privacy" }) => {
  const { language } = useLanguage();

  const content = {
    terms: {
      titleRo: "Termeni și Condiții | RealTrust",
      titleEn: "Terms & Conditions | RealTrust",
      headingRo: "Termeni și Condiții",
      headingEn: "Terms & Conditions",
      bodyRo: `
## 1. Informații Generale
Acest site web este operat de Imo Business Centrum SRL (CUI: RO14380627), cu sediul în Timișoara, str. Samuil Micu Nr.14, ap.4. Prin accesarea și utilizarea site-ului www.realtrust.ro, acceptați acești termeni și condiții.

## 2. Serviciile Noastre
RealTrust & ApArt Hotel oferă servicii de administrare a proprietăților în regim hotelier, consultanță imobiliară și intermediere în tranzacții imobiliare în Timișoara și împrejurimi.

## 3. Estimări și Calculatoare
Calculatoarele de randament și estimările de venit prezentate pe acest site sunt orientative și bazate pe date istorice de piață. Rezultatele reale pot varia în funcție de condițiile de piață, locație, starea proprietății și alți factori.

## 4. Proprietate Intelectuală
Conținutul acestui site (texte, imagini, design, logo-uri) este protejat de drepturile de autor și aparține Imo Business Centrum SRL. Reproducerea fără acord scris este interzisă.

## 5. Limitarea Răspunderii
RealTrust nu garantează acuratețea absolută a informațiilor prezentate pe site. Deciziiile de investiție trebuie luate după consultarea cu specialiști.

## 6. Contact
Pentru orice întrebări legate de acești termeni, ne puteți contacta la info@realtrust.ro sau la telefon 0799 069 256.

*Ultima actualizare: Martie 2026*
      `,
      bodyEn: `
## 1. General Information
This website is operated by Imo Business Centrum SRL (Tax ID: RO14380627), headquartered in Timișoara, str. Samuil Micu Nr.14, ap.4. By accessing and using www.realtrust.ro, you accept these terms and conditions.

## 2. Our Services
RealTrust & ApArt Hotel provides property management services for short-term rentals, real estate consulting, and transaction brokerage in Timișoara and surrounding areas.

## 3. Estimates and Calculators
The yield calculators and revenue estimates on this site are indicative and based on historical market data. Actual results may vary depending on market conditions, location, property condition, and other factors.

## 4. Intellectual Property
The content of this website (texts, images, design, logos) is protected by copyright and belongs to Imo Business Centrum SRL. Reproduction without written consent is prohibited.

## 5. Limitation of Liability
RealTrust does not guarantee the absolute accuracy of information presented on the site. Investment decisions should be made after consulting with specialists.

## 6. Contact
For any questions regarding these terms, you can contact us at info@realtrust.ro or by phone at +40 799 069 256.

*Last updated: March 2026*
      `,
    },
    privacy: {
      titleRo: "Politica de Confidențialitate | RealTrust",
      titleEn: "Privacy Policy | RealTrust",
      headingRo: "Politica de Confidențialitate",
      headingEn: "Privacy Policy",
      bodyRo: `
## 1. Operatorul de Date
Imo Business Centrum SRL (CUI: RO14380627), cu sediul în Timișoara, str. Samuil Micu Nr.14, ap.4, este operatorul datelor dumneavoastră personale.

## 2. Date Colectate
Colectăm următoarele categorii de date personale:
- **Date de contact**: nume, adresă email, număr de telefon (când ne contactați prin formulare)
- **Date de navigare**: adresă IP anonimizată, tip browser, pagini vizitate (prin Google Analytics)
- **Date de cont**: email și nume (când vă creați un cont pe platformă)

## 3. Scopul Prelucrării
Datele sunt utilizate pentru:
- Furnizarea serviciilor solicitate
- Comunicări comerciale (cu consimțământ explicit)
- Îmbunătățirea experienței pe site
- Conformarea cu obligațiile legale

## 4. Baza Legală
Prelucrarea datelor se bazează pe: consimțământul dvs., executarea contractului, interesul nostru legitim sau obligații legale.

## 5. Durata Stocării
Datele sunt stocate pe durata necesară îndeplinirii scopurilor pentru care au fost colectate, dar nu mai mult de 3 ani de la ultima interacțiune.

## 6. Drepturile Dumneavoastră (GDPR)
Aveți dreptul la: acces, rectificare, ștergere, restricționare, portabilitate și opoziție. Pentru exercitarea acestor drepturi, contactați-ne la info@realtrust.ro.

## 7. Cookie-uri
Utilizăm cookie-uri esențiale pentru funcționarea site-ului și cookie-uri analitice (Google Analytics) cu consimțământul dvs. Puteți gestiona preferințele prin bannerul de cookie-uri.

## 8. Securitatea Datelor
Implementăm măsuri tehnice și organizatorice adecvate: criptare SSL/TLS, anonimizare IP, acces restricționat la date.

## 9. Contact DPO
Pentru întrebări privind protecția datelor: info@realtrust.ro, tel. 0799 069 256.

*Ultima actualizare: Martie 2026*
      `,
      bodyEn: `
## 1. Data Controller
Imo Business Centrum SRL (Tax ID: RO14380627), headquartered in Timișoara, str. Samuil Micu Nr.14, ap.4, is the controller of your personal data.

## 2. Data Collected
We collect the following categories of personal data:
- **Contact data**: name, email address, phone number (when you contact us through forms)
- **Browsing data**: anonymized IP address, browser type, pages visited (via Google Analytics)
- **Account data**: email and name (when you create an account on the platform)

## 3. Purpose of Processing
Data is used for:
- Providing requested services
- Commercial communications (with explicit consent)
- Improving website experience
- Compliance with legal obligations

## 4. Legal Basis
Data processing is based on: your consent, contract execution, our legitimate interest, or legal obligations.

## 5. Storage Duration
Data is stored for the duration necessary to fulfill the purposes for which it was collected, but no longer than 3 years from the last interaction.

## 6. Your Rights (GDPR)
You have the right to: access, rectification, erasure, restriction, portability, and objection. To exercise these rights, contact us at info@realtrust.ro.

## 7. Cookies
We use essential cookies for site functionality and analytical cookies (Google Analytics) with your consent. You can manage preferences via the cookie banner.

## 8. Data Security
We implement appropriate technical and organizational measures: SSL/TLS encryption, IP anonymization, restricted data access.

## 9. DPO Contact
For data protection inquiries: info@realtrust.ro, phone +40 799 069 256.

*Last updated: March 2026*
      `,
    },
  };

  const c = content[type];
  const title = language === "ro" ? c.titleRo : c.titleEn;
  const heading = language === "ro" ? c.headingRo : c.headingEn;
  const body = language === "ro" ? c.bodyRo : c.bodyEn;

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title={title} noIndex={true} />
      <Header />
      <main className="container mx-auto px-6 py-16 max-w-3xl">
        <h1 className="text-3xl font-serif font-semibold text-foreground mb-8">{heading}</h1>
        <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground">
          {body.split('\n').map((line, i) => {
            if (line.startsWith('## ')) {
              return <h2 key={i} className="text-lg font-semibold text-foreground mt-8 mb-3">{line.replace('## ', '')}</h2>;
            }
            if (line.startsWith('- **')) {
              const match = line.match(/- \*\*(.+?)\*\*: (.+)/);
              if (match) return <p key={i} className="ml-4 mb-1"><strong className="text-foreground">{match[1]}</strong>: {match[2]}</p>;
            }
            if (line.startsWith('- ')) {
              return <p key={i} className="ml-4 mb-1">• {line.replace('- ', '')}</p>;
            }
            if (line.startsWith('*') && line.endsWith('*')) {
              return <p key={i} className="text-xs mt-6 italic">{line.replace(/\*/g, '')}</p>;
            }
            if (line.trim()) return <p key={i} className="mb-3">{line}</p>;
            return null;
          })}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default LegalPage;