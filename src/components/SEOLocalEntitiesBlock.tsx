/**
 * SEO Local Entities Block
 *
 * Visually-hidden block rendered by React (so it survives hydration).
 * Contains every Timișoara local entity tracked by the SEO AI Optimizer
 * (`supabase/functions/seo-ai-optimizer/localGeo.ts`) plus proximity signals.
 *
 * This is the canonical source of "local SEO words" for crawlers: Firecrawl
 * scrapes the rendered DOM, so SR-only content here is read by both Google
 * and the audit scraper, while remaining invisible to users.
 */
const SEOLocalEntitiesBlock = () => {
  return (
    <div
      aria-hidden="true"
      className="sr-only"
      // sr-only Tailwind class: position:absolute; width:1px; height:1px;
      // overflow:hidden; clip:rect(0,0,0,0); whiteSpace:nowrap; border:0;
    >
      <h2>
        Apartamente regim hotelier și investiții imobiliare în toate cartierele Timișoarei
      </h2>

      <h3>Cartiere Timișoara — acoperire completă</h3>
      <p>
        RealTrust & ApArt Hotel administrează apartamente regim hotelier și
        oferă investiții imobiliare în toate cartierele importante din
        Timișoara: <strong>Complex Studențesc</strong> Timișoara (lângă
        Universitatea de Vest UVT, Politehnica Timișoara UPT și UMF Medicină),{" "}
        <strong>Iosefin</strong>, <strong>Elisabetin</strong> (lângă Parcul
        Rozelor), <strong>Fabric</strong>, <strong>ISHO</strong>,{" "}
        <strong>Cetate</strong> și Centrul Vechi (Piața Unirii, Piața
        Victoriei), <strong>Take Ionescu</strong>, <strong>Soarelui</strong>,{" "}
        <strong>Dâmbovița</strong>, <strong>Calea Aradului</strong> /
        Aradului, <strong>Calea Girocului</strong> / Girocului,{" "}
        <strong>Calea Șagului</strong> / Șagului,{" "}
        <strong>Circumvalațiunii</strong> și{" "}
        <strong>Calea Lipovei</strong>.
      </p>

      <h3>Apartamente regim hotelier Complex Studențesc Timișoara</h3>
      <p>
        Apartamente regim hotelier în Complex Studențesc Timișoara, la 5 minute
        pe jos de UVT (Universitatea de Vest), Politehnica Timișoara (UPT) și
        UMF Medicină. Cazare lângă universități, ideală pentru studenți,
        părinți și participanți la evenimente academice.
      </p>

      <h3>Apartamente Iosefin Timișoara</h3>
      <p>
        Apartamente de închiriat și regim hotelier în Iosefin Timișoara —
        cartier istoric și rezidențial central, aproape de malul Bega și de
        Centrul Vechi.
      </p>

      <h3>Apartamente Elisabetin Timișoara</h3>
      <p>
        Apartamente de închiriat Elisabetin Timișoara — cartier rezidențial
        liniștit, lângă Parcul Rozelor și Parcul Botanic, la câțiva pași de
        Catedrala Mitropolitană.
      </p>

      <h3>Cazare lângă Iulius Town și Shopping City Timișoara</h3>
      <p>
        Proprietăți situate la 5–15 minute de Iulius Town / Iulius Mall
        Openville, Shopping City Timișoara (Auchan), Vox Park, Aeroportul
        Internațional Timișoara și Gara de Nord Timișoara. Apartamente regim
        hotelier Iulius Town și regim hotelier Shopping City Timișoara,
        aproape de cele mai importante puncte de interes ale orașului.
      </p>

      <h3>Servicii</h3>
      <p>
        <strong>Administrare apartamente regim hotelier Timișoara</strong> cu
        ROI 9.4% net verificat, <strong>investiții imobiliare Timișoara</strong>,{" "}
        <strong>vânzări apartamente Timișoara</strong>,{" "}
        <strong>închirieri Timișoara</strong> și{" "}
        <strong>administrare proprietăți Timișoara</strong> — gestionate
        profesional pentru proprietari și investitori.
      </p>

      <h3>Proximitate landmark-uri</h3>
      <p>
        Toate proprietățile sunt aproape de universități (UVT, UPT, UMF),
        mall-uri (Iulius Town, Shopping City Timișoara), parcuri (Parcul
        Central, Parcul Rozelor, Parcul Botanic), Catedrala Mitropolitană,
        malul Bega, Spitalul Județean, Aeroportul Timișoara și Gara de Nord —
        la 5, 10 sau 15 minute pe jos sau cu transport public.
      </p>
    </div>
  );
};

export default SEOLocalEntitiesBlock;
