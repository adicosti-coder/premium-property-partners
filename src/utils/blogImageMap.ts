// Blog cover images mapping
import platiTransparente from "@/assets/blog/plati-transparente.jpg";
import raportareKpi from "@/assets/blog/raportare-kpi.jpg";
import selfCheckin from "@/assets/blog/self-checkin.jpg";
import smartLocks from "@/assets/blog/smart-locks.jpg";
import sezonalitateTm from "@/assets/blog/sezonalitate-timisoara.jpg";
import photoUpgrade from "@/assets/blog/photo-upgrade.jpg";
import pricingWeekends from "@/assets/blog/pricing-weekends.jpg";
import stagingCleaning from "@/assets/blog/staging-cleaning.jpg";
import securityDeposit from "@/assets/blog/security-deposit.jpg";
import reviewsPlaybook from "@/assets/blog/reviews-playbook.jpg";
import whatsappLeads from "@/assets/blog/whatsapp-leads.jpg";
import taxe2026 from "@/assets/blog/taxe-2026.jpg";
import titluBooking from "@/assets/blog/titlu-booking.jpg";
import perceptiePremium from "@/assets/blog/perceptie-premium.jpg";
import mixCanale from "@/assets/blog/mix-canale.jpg";
import dotariRoi from "@/assets/blog/dotari-roi.jpg";
// New images
import preturiDinamice from "@/assets/blog/preturi-dinamice-2026.jpg";
import housekeepingQc from "@/assets/blog/housekeeping-qc.jpg";
import minStayStrategie from "@/assets/blog/min-stay-strategie.jpg";
import mentenantaPreventiva from "@/assets/blog/mentenanta-preventiva.jpg";
import mesajeAutomate from "@/assets/blog/mesaje-automate.jpg";
import veciniReguli from "@/assets/blog/vecini-reguli.jpg";
import onboardingProprietar from "@/assets/blog/onboarding-proprietar.jpg";
import faqObiectii from "@/assets/blog/faq-obiectii.jpg";
import brandPremium from "@/assets/blog/brand-premium.jpg";
import rezervariDirecte from "@/assets/blog/rezervari-directe.jpg";
import ghidMaximizare from "@/assets/blog/ghid-maximizare.jpg";
import greseliComune from "@/assets/blog/greseli-comune.jpg";
import automatizareOspitalitate from "@/assets/blog/automatizare-ospitalitate.jpg";
import timisoaraInvestitii from "@/assets/blog/timisoara-investitii.jpg";
import regimHotelierForfetar from "@/assets/blog/regim-hotelier-forfetar.jpg";
import nzebChiriiTermenLung from "@/assets/blog/nzeb-chirii-termen-lung.jpg";
import zoneHotTimisoara from "@/assets/blog/zone-hot-timisoara.jpg";
import analizaRoiTimisoara from "@/assets/blog/analiza-roi-timisoara.jpg";
import diversificarePortofoliu from "@/assets/blog/diversificare-portofoliu.jpg";
import ghidPrimulApartament from "@/assets/blog/ghid-primul-apartament.jpg";
import checklistDueDiligence from "@/assets/blog/checklist-due-diligence.jpg";
import fiscalitateRegimHotelier from "@/assets/blog/fiscalitate-regim-hotelier.jpg";
import studiuCazRoi from "@/assets/blog/studiu-caz-roi.jpg";
import ghidTuristicTimisoara from "@/assets/blog/ghid-turistic-timisoara.jpg";

export const blogImageMap: Record<string, string> = {
  // Existing mappings
  "plati-transparente-tu-incasezi-noi-operam": platiTransparente,
  "raportare-lunara-kpi-uri-care-conteaza": raportareKpi,
  "self-checkin-politica-elibereaza-timpul": selfCheckin,
  "smart-locks-ghid-complet": smartLocks,
  "sezonalitate-timisoara-profita-fiecare-perioada": sezonalitateTm,
  "photo-upgrade-fotografii-care-vand": photoUpgrade,
  "pricing-weekends-strategii-profitabile": pricingWeekends,
  "staging-cleaning-standarde-hoteliere": stagingCleaning,
  "security-deposit-protejeaza-investitia": securityDeposit,
  "reviews-playbook-ghid-recenzii": reviewsPlaybook,
  "whatsapp-leads-comunicare-eficienta": whatsappLeads,
  "taxe-2026-ce-trebuie-sa-stii": taxe2026,
  "titlu-booking-care-vinde": titluBooking,
  "perceptie-premium-fara-costuri-inutile": perceptiePremium,
  "mix-canale-reduce-dependenta-booking": mixCanale,
  "dotari-cresc-conversia-roi": dotariRoi,
  // New mappings
  "preturi-dinamice-2026-ghid": preturiDinamice,
  "housekeeping-qc-checklist-hotel": housekeepingQc,
  "min-stay-strategie-adr-ocupare": minStayStrategie,
  "mentenanta-preventiva-checklist-lunar": mentenantaPreventiva,
  "mesaje-automate-checkin-template": mesajeAutomate,
  "vecini-zgomot-reguli-bloc": veciniReguli,
  "onboarding-proprietar-7-pasi": onboardingProprietar,
  "faq-obiectii-proprietari-raspunsuri": faqObiectii,
  "brand-premium-regim-hotelier": brandPremium,
  "rezervari-directe-ghid-complet": rezervariDirecte,
  "ghid-maximizare-venituri-inchirieri": ghidMaximizare,
  "5-greseli-comune-administrare": greseliComune,
  "automatizare-industria-ospitalitatii": automatizareOspitalitate,
  "timisoara-investitii-imobiliare": timisoaraInvestitii,
  "regim-hotelier-2026-sistem-forfetar-taxe": regimHotelierForfetar,
  "chirii-termen-lung-apartamente-nzeb-timisoara": nzebChiriiTermenLung,
  "zone-hot-investitii-timisoara-2026": zoneHotTimisoara,
  "analiza-roi-apartamente-timisoara-2026": analizaRoiTimisoara,
  "diversificare-portofoliu-imobiliar": diversificarePortofoliu,
  "ghid-primul-apartament-investitie": ghidPrimulApartament,
  "checklist-due-diligence-achizitie-apartament-investitie": checklistDueDiligence,
  "ghid-complet-fiscalitate-regim-hotelier-2026": fiscalitateRegimHotelier,
  "studiu-caz-roi-apartament-2-camere-2026": studiuCazRoi,
  "ghid-turistic-timisoara-atractii-activitati": ghidTuristicTimisoara,
};

export const getBlogCoverImage = (slug: string, dbCoverImage: string | null): string | null => {
  // First check if we have a local image for this slug
  if (blogImageMap[slug]) {
    return blogImageMap[slug];
  }
  // Otherwise return the database cover image (could be a storage URL or null)
  return dbCoverImage;
};
