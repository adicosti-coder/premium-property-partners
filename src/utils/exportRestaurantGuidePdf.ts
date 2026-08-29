export interface RestaurantGuideItem {
  name: string;
  category: string;
  address: string | null;
  phone?: string | null;
  website?: string | null;
  walkMinutes: number;
  walkMeters: number;
  property: string;
  rating?: number | null;
  guestRating?: number | null;
  guestReviews?: number;
}

/** Branded, guest-friendly PDF with the saved restaurants for the stay. */
export const exportRestaurantGuidePdf = async (items: RestaurantGuideItem[]) => {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 18;
  let y = 22;

  doc.setFillColor(16, 42, 67);
  doc.rect(0, 0, pageWidth, 30, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.text('Ghidul meu culinar - Timisoara', margin, 19);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(212, 175, 55);
  doc.text('ApArt Hotel by RealTrust', pageWidth - margin, 19, { align: 'right' });

  y = 42;
  doc.setTextColor(90, 90, 90);
  doc.setFontSize(9);
  doc.text(
    `Generat pe ${new Date().toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })} - ${items.length} locatii salvate`,
    margin,
    y,
  );
  y += 10;

  items.forEach((item, index) => {
    if (y > 258) {
      doc.addPage();
      y = 22;
    }
    doc.setTextColor(16, 42, 67);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(`${index + 1}. ${item.name}`, margin, y);
    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(60, 60, 60);
    const walk =
      item.walkMeters < 1000 ? `${item.walkMeters} m` : `${(item.walkMeters / 1000).toFixed(1)} km`;
    doc.text(
      `${item.category === 'cafe' ? 'Cafenea' : 'Restaurant'} - ${item.walkMinutes} min pe jos (${walk}) de la ${item.property}`,
      margin,
      y,
    );
    y += 5;

    if (item.address) {
      doc.text(doc.splitTextToSize(`Adresa: ${item.address}`, pageWidth - margin * 2), margin, y);
      y += 5;
    }
    if (item.phone) {
      doc.text(`Telefon: ${item.phone}`, margin, y);
      y += 5;
    }
    const ratingBits: string[] = [];
    if (item.rating) ratingBits.push(`Rating Google: ${item.rating}/5`);
    if (item.guestRating) ratingBits.push(`Oaspeti ApArt: ${item.guestRating}/5 (${item.guestReviews ?? 0})`);
    if (ratingBits.length) {
      doc.text(ratingBits.join('  |  '), margin, y);
      y += 5;
    }
    if (item.website) {
      doc.setTextColor(21, 101, 192);
      doc.text(doc.splitTextToSize(item.website, pageWidth - margin * 2), margin, y);
      y += 5;
    }
    doc.setDrawColor(225, 225, 225);
    doc.line(margin, y, pageWidth - margin, y);
    y += 7;
  });

  if (y > 250) {
    doc.addPage();
    y = 22;
  }
  doc.setTextColor(120, 120, 120);
  doc.setFontSize(8.5);
  doc.text(
    'Recomandari selectate de gazdele ApArt Hotel. Detalii si harta interactiva: realtrust.ro',
    margin,
    y + 4,
  );

  doc.save('ghid-restaurante-timisoara.pdf');
};

/** WhatsApp-friendly plain-text version of the saved list. */
export const buildRestaurantGuideWhatsAppText = (items: RestaurantGuideItem[]) => {
  const lines = [
    '*Ghidul meu culinar - Timisoara* (ApArt Hotel by RealTrust)',
    '',
    ...items.map(
      (item, i) =>
        `${i + 1}. ${item.name} - ${item.walkMinutes} min pe jos de la ${item.property}${
          item.address ? ` | ${item.address}` : ''
        }`,
    ),
    '',
    'Harta interactiva: https://realtrust.ro/blog/top-15-restaurante-din-timisoara-in-2026-ghid-complet-pentru-oaspeti',
  ];
  return lines.join('\n');
};
