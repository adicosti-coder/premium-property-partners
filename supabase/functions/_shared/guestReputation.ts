// Mirror of GUEST_REPUTATION in src/lib/businessFacts.ts (edge functions cannot
// import src/). A parity test keeps both identical — change them together.
export const GUEST_REPUTATION = {
  ratingValue: 9.7,
  bestRating: 10,
  reviewCount: 500,
} as const;

/** „9,7/10 pe Booking.com din peste 500 de recenzii verificate”. */
export const guestReputationSentenceRo = () =>
  `${String(GUEST_REPUTATION.ratingValue).replace(".", ",")}/${GUEST_REPUTATION.bestRating} pe Booking.com din peste ${GUEST_REPUTATION.reviewCount} de recenzii verificate`;
