import AutoConsentedListings from "@/components/admin/AutoConsentedListings";

/** Anunțuri publicate pe realtrust.ro + cele în așteptare, cu link și re-publicare. */
export default function RealtrustPublishedPanel() {
  return <AutoConsentedListings title="Publicate pe realtrust.ro & în așteptare" defaultStatus="all" />;
}
