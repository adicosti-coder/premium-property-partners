/** Preserve legacy room strings while treating building categories separately. */
export function getLeadPropertyDetails(d: {
  property_type?: string;
  property_type_label?: string;
  tip_proprietate?: string;
  numar_camere?: string;
}) {
  const label = d.property_type_label ?? d.tip_proprietate;
  return {
    property_type: d.property_type ?? null,
    property_type_label: label ?? null,
    tip_proprietate: label ?? null,
    rooms: d.numar_camere ?? null,
    numar_camere: d.numar_camere ?? null,
  };
}

export function getLeadLocationDetails(d: { location_mode?: "local" | "regional"; zona: string }) {
  return {
    location_mode: d.location_mode ?? null,
    location: d.zona.trim(),
    service_tag: d.location_mode === "regional" ? "[Consultanță / Regional]" : d.location_mode === "local" ? "[Administrare Locală]" : null,
  };
}

export function getLocationLeadMessage(d: { location_mode?: "local" | "regional"; zona: string; property_type_label?: string; tip_proprietate?: string }) {
  const details = getLeadLocationDetails(d);
  if (!details.service_tag) return null;
  return [
    details.service_tag,
    `Locație: ${details.location} | Tip: ${d.property_type_label ?? d.tip_proprietate ?? "Proprietate"}`,
    d.location_mode === "regional"
      ? "Bună ziua! Am primit proiecția proprietății dumneavoastră pentru consultanță regională. Revenim aici pe WhatsApp pentru a rafina estimarea în funcție de piața locală, capacitate și sezonalitate."
      : "Bună ziua! Am primit proiecția proprietății dumneavoastră pentru administrare locală în Timișoara și zona metropolitană. Revenim aici pe WhatsApp pentru a rafina estimarea și detaliile proprietății.",
  ].join("\n\n");
}