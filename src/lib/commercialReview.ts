import { MANAGEMENT_POLICY } from './managementPolicy';
import { BRAND, HOTEL_BRAND_NAME } from './orgIdentity';

/** Review-only configuration. Never import into public copy before approval. */
export const COMMERCIAL_REVIEW = {
  activation: 'pending_admin_confirmation',
  identity: { brand: BRAND.name, lodgingBrand: HOTEL_BRAND_NAME, legalName: BRAND.legalName, taxID: BRAND.taxID },
  previouslyApprovedPolicy: MANAGEMENT_POLICY,
  metrics: {
    activeStays: { value: null, definition: "Active accommodation listings; exclude sales and long-term rentals", source: "properties filtered by is_active and listing_type=cazare", requiresConfirmation: true },
    managedProperties: { value: null, definition: 'Properties with an active management agreement; not equivalent to accommodation inventory', source: null, requiresConfirmation: true },
    promotedProperties: { value: null, definition: 'Active marketed listings across listing categories; not managed portfolio', source: 'properties filtered by is_active', requiresConfirmation: true },
  },
  packageVariants: [
    { source: 'owner-pricing-cards', packages: [{ name: 'Management Esențial', rate: .15 }, { name: 'ApArt Hotel Complet', rate: .20 }, { name: 'Full Service Premium', rate: .20 }] },
    { source: 'owner-page-schema-summary', packages: [{ name: 'Starter', rate: .15 }, { name: 'Esențial', rate: .18 }, { name: 'Standard', rate: .20 }] },
    { source: 'owner-prerender', packages: [{ name: 'Lite', rate: .15 }, { name: 'Standard', rate: .20 }, { name: 'Premium', rate: .20 }] },
  ],
  unresolved: ['package catalogue and VAT', 'cleaning payer per calculator', 'tax assumptions', 'documented historical occupancy and yield', 'insurance coverage and damage fund', 'service response commitments', 'management portfolio definition and official count'],
} as const;

/** Pure arithmetic audit, not a pricing or operational forecast. */
export function annualIllustrativeGross(input: { monthlyRent: number; adr: number; occupancy: number; daysPerMonth: number }) {
  return { classicGross: input.monthlyRent * 12, hotelGross: input.adr * input.occupancy * input.daysPerMonth * 12 };
}