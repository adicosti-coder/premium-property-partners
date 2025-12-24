import { jsPDF } from "jspdf";
import { Property } from "@/data/properties";

interface ExportOptions {
  title: string;
  properties: Property[];
  language: "ro" | "en";
  labels: {
    guests: string;
    bedroom: string;
    bedrooms: string;
    reviews: string;
    features: string;
    rating: string;
    location: string;
    generatedOn: string;
  };
}

export const exportFavoritesPdf = ({ title, properties, language, labels }: ExportOptions) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let yPosition = 20;

  // Title
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(title, pageWidth / 2, yPosition, { align: "center" });
  yPosition += 15;

  // Date
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(128, 128, 128);
  const date = new Date().toLocaleDateString(language === "ro" ? "ro-RO" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  doc.text(`${labels.generatedOn}: ${date}`, pageWidth / 2, yPosition, { align: "center" });
  yPosition += 20;

  doc.setTextColor(0, 0, 0);

  // Properties
  properties.forEach((property, index) => {
    // Check if we need a new page
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }

    // Property name
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(`${index + 1}. ${property.name}`, margin, yPosition);
    yPosition += 7;

    // Location and rating
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`${labels.location}: ${property.location} | ${labels.rating}: ${property.rating} ⭐ (${property.reviews} ${labels.reviews})`, margin, yPosition);
    yPosition += 6;

    // Capacity
    const bedroomText = property.bedrooms === 1 ? labels.bedroom : labels.bedrooms;
    doc.text(`${property.capacity} ${labels.guests} | ${property.bedrooms} ${bedroomText}`, margin, yPosition);
    yPosition += 6;

    // Description
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    const description = language === "en" ? property.descriptionEn : property.description;
    const splitDescription = doc.splitTextToSize(description, pageWidth - 2 * margin);
    doc.text(splitDescription, margin, yPosition);
    yPosition += splitDescription.length * 4 + 2;

    // Features
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.text(`${labels.features}: ${property.features.join(", ")}`, margin, yPosition);
    yPosition += 12;

    // Separator
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPosition - 4, pageWidth - margin, yPosition - 4);
  });

  // Save the PDF
  const fileName = `favorites-${new Date().toISOString().split("T")[0]}.pdf`;
  doc.save(fileName);
};
