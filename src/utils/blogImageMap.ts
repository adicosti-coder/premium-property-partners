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

export const blogImageMap: Record<string, string> = {
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
};

export const getBlogCoverImage = (slug: string, dbCoverImage: string | null): string | null => {
  // First check if we have a local image for this slug
  if (blogImageMap[slug]) {
    return blogImageMap[slug];
  }
  // Otherwise return the database cover image (could be a storage URL or null)
  return dbCoverImage;
};
