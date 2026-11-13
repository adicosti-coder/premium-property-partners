/**
 * Old top-level apartment addresses. Each permanently points to its single
 * canonical page under /proprietate/<slug>, so Google never indexes two
 * addresses (with different structured data) for the same apartment.
 */
export const LEGACY_PROPERTY_REDIRECTS: Record<string, string> = {
  "/nordone-apart-hotel-premium": "/proprietate/nordone-apart-hotel-premium",
  "/ring-apart-hotel-spacious-deluxe": "/proprietate/nordone-apart-hotel-premium",
  "/green-forest-apart-hotel": "/proprietate/green-forest-apart-hotel",
  "/fructus-plaza-ultracentral-apart-hotel": "/proprietate/fructus-plaza-ultracentral-apart-hotel",
  "/fullview-studio-deluxe": "/proprietate/fullview-studio-deluxe",
  "/avenue-of-mara-apart-hotel": "/proprietate/avenue-of-mara-apart-hotel",
  "/helios-apart-hotel": "/proprietate/helios-apart-hotel",
  "/ateneo-trevi-2-apart-hotel": "/proprietate/ateneo-trevi-2-apart-hotel",
  "/sunset-da-ra-studio-deluxe": "/proprietate/sunset-da-ra-studio-deluxe",
  "/ateneo-apart-hotel-studio-deluxe": "/proprietate/ateneo-apart-hotel-studio-deluxe",
  "/modern-studio-apart-hotel": "/proprietate/modern-studio-apart-hotel",
  "/moonlight-emerald-suite": "/proprietate/moonlight-emerald-suite",
  "/xcity-3-apart-hotel": "/proprietate/xcity-3-apart-hotel",
  "/ring-residence-apart-hotel": "/proprietate/ring-residence-apart-hotel",
};
