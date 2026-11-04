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