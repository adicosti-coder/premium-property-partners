import { X, MapPin, Users, BedDouble, Star, Bath, Maximize, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useLanguage } from "@/i18n/LanguageContext";
import { Property } from "@/data/properties";
import { jsPDF } from "jspdf";

interface PropertyCompareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  properties: Property[];
  onRemoveProperty: (propertyId: number) => void;
}

const PropertyCompareModal = ({
  open,
  onOpenChange,
  properties,
  onRemoveProperty,
}: PropertyCompareModalProps) => {
  const { t, language } = useLanguage();

  if (properties.length === 0) return null;

  const compareRows = [
    {
      label: t.portfolio.compare.location,
      render: (p: Property) => (
        <span className="flex items-center gap-1">
          <MapPin className="w-4 h-4 text-primary" />
          {p.location}
        </span>
      ),
    },
    {
      label: t.portfolio.compare.rating,
      render: (p: Property) => (
        <span className="flex items-center gap-1">
          <Star className="w-4 h-4 fill-primary text-primary" />
          {p.rating} ({p.reviews} {t.portfolio.reviews})
        </span>
      ),
    },
    {
      label: t.portfolio.compare.capacity,
      render: (p: Property) => (
        <span className="flex items-center gap-1">
          <Users className="w-4 h-4 text-muted-foreground" />
          {p.capacity} {t.portfolio.guests}
        </span>
      ),
    },
    {
      label: t.portfolio.compare.bedrooms,
      render: (p: Property) => (
        <span className="flex items-center gap-1">
          <BedDouble className="w-4 h-4 text-muted-foreground" />
          {p.bedrooms} {p.bedrooms === 1 ? t.portfolio.bedroom : t.portfolio.bedrooms}
        </span>
      ),
    },
    {
      label: t.portfolio.compare.bathrooms,
      render: (p: Property) => (
        <span className="flex items-center gap-1">
          <Bath className="w-4 h-4 text-muted-foreground" />
          {p.bathrooms}
        </span>
      ),
    },
    {
      label: t.portfolio.compare.size,
      render: (p: Property) => (
        <span className="flex items-center gap-1">
          <Maximize className="w-4 h-4 text-muted-foreground" />
          {p.size} m²
        </span>
      ),
    },
    {
      label: t.portfolio.compare.checkIn,
      render: (p: Property) => p.checkInTime,
    },
    {
      label: t.portfolio.compare.checkOut,
      render: (p: Property) => p.checkOutTime,
    },
    {
      label: t.portfolio.filters.features,
      render: (p: Property) => (
        <div className="flex flex-wrap gap-1">
          {p.features.map((feature, idx) => (
            <span
              key={idx}
              className="inline-block px-2 py-0.5 rounded-md bg-secondary text-xs text-muted-foreground"
            >
              {feature}
            </span>
          ))}
        </div>
      ),
    },
    {
      label: t.portfolio.compare.amenities,
      render: (p: Property) => (
        <ul className="text-xs text-muted-foreground space-y-1">
          {(language === "en" ? p.amenitiesEn : p.amenities).slice(0, 5).map((amenity, idx) => (
            <li key={idx}>• {amenity}</li>
          ))}
          {p.amenities.length > 5 && (
            <li className="text-primary">+{p.amenities.length - 5} {t.portfolio.compare.more}</li>
          )}
        </ul>
      ),
    },
  ];

  const exportToPdf = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Title
    doc.setFontSize(18);
    doc.text(t.portfolio.compare.title, 14, 20);
    
    // Date
    doc.setFontSize(10);
    doc.text(`${t.portfolio.filters.generatedOn}: ${new Date().toLocaleDateString(language === "ro" ? "ro-RO" : "en-US")}`, 14, 28);
    
    let yPos = 40;
    const colWidth = (pageWidth - 50) / properties.length;
    const labelWidth = 35;
    
    // Property names header
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    properties.forEach((p, idx) => {
      const xPos = labelWidth + 14 + idx * colWidth;
      doc.text(p.name, xPos, yPos, { maxWidth: colWidth - 5 });
    });
    
    yPos += 15;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    
    // Comparison rows
    const rows = [
      { label: t.portfolio.compare.location, getValue: (p: Property) => p.location },
      { label: t.portfolio.compare.rating, getValue: (p: Property) => `${p.rating} (${p.reviews} ${t.portfolio.reviews})` },
      { label: t.portfolio.compare.capacity, getValue: (p: Property) => `${p.capacity} ${t.portfolio.guests}` },
      { label: t.portfolio.compare.bedrooms, getValue: (p: Property) => `${p.bedrooms}` },
      { label: t.portfolio.compare.bathrooms, getValue: (p: Property) => `${p.bathrooms}` },
      { label: t.portfolio.compare.size, getValue: (p: Property) => `${p.size} m²` },
      { label: t.portfolio.compare.checkIn, getValue: (p: Property) => p.checkInTime },
      { label: t.portfolio.compare.checkOut, getValue: (p: Property) => p.checkOutTime },
      { label: t.portfolio.filters.features, getValue: (p: Property) => p.features.join(", ") },
    ];
    
    rows.forEach((row, rowIdx) => {
      if (yPos > 180) {
        doc.addPage();
        yPos = 20;
      }
      
      // Alternate row background
      if (rowIdx % 2 === 0) {
        doc.setFillColor(245, 245, 245);
        doc.rect(14, yPos - 5, pageWidth - 28, 12, "F");
      }
      
      doc.setFont("helvetica", "bold");
      doc.text(row.label, 14, yPos);
      doc.setFont("helvetica", "normal");
      
      properties.forEach((p, idx) => {
        const xPos = labelWidth + 14 + idx * colWidth;
        const value = row.getValue(p);
        doc.text(value, xPos, yPos, { maxWidth: colWidth - 5 });
      });
      
      yPos += 12;
    });
    
    // Amenities section
    if (yPos > 140) {
      doc.addPage();
      yPos = 20;
    }
    
    yPos += 5;
    doc.setFont("helvetica", "bold");
    doc.text(t.portfolio.compare.amenities, 14, yPos);
    yPos += 8;
    doc.setFont("helvetica", "normal");
    
    properties.forEach((p, idx) => {
      const xPos = labelWidth + 14 + idx * colWidth;
      const amenities = (language === "en" ? p.amenitiesEn : p.amenities).slice(0, 6);
      amenities.forEach((amenity, aIdx) => {
        if (yPos + aIdx * 5 > 190) return;
        doc.text(`• ${amenity}`, xPos, yPos + aIdx * 5, { maxWidth: colWidth - 5 });
      });
    });
    
    doc.save(`comparison-${Date.now()}.pdf`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-[95vw] max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-xl font-serif">
            {t.portfolio.compare.title}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[calc(90vh-100px)]">
          <div className="p-6 pt-4">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr>
                    <th className="text-left p-3 bg-secondary/50 rounded-tl-lg w-[140px] sticky left-0 z-10">
                      {t.portfolio.compare.property}
                    </th>
                    {properties.map((property) => (
                      <th
                        key={property.id}
                        className="text-left p-3 bg-secondary/50 min-w-[200px] last:rounded-tr-lg"
                      >
                        <div className="relative">
                          <button
                            onClick={() => onRemoveProperty(property.id)}
                            className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-destructive/10 hover:bg-destructive/20 flex items-center justify-center transition-colors"
                          >
                            <X className="w-3 h-3 text-destructive" />
                          </button>
                          <img
                            src={property.images[0]}
                            alt={property.name}
                            loading="lazy"
                            decoding="async"
                            className="w-full h-24 object-cover rounded-lg mb-2"
                          />
                          <p className="font-medium text-sm pr-6">{property.name}</p>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {compareRows.map((row, rowIdx) => (
                    <tr
                      key={rowIdx}
                      className={rowIdx % 2 === 0 ? "bg-muted/30" : ""}
                    >
                      <td className="p-3 font-medium text-sm text-muted-foreground sticky left-0 bg-inherit">
                        {row.label}
                      </td>
                      {properties.map((property) => (
                        <td key={property.id} className="p-3 text-sm">
                          {row.render(property)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        <div className="p-4 border-t border-border flex justify-end gap-2">
          <Button variant="outline" onClick={exportToPdf}>
            <FileDown className="w-4 h-4 mr-2" />
            {t.portfolio.filters.exportPdf}
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t.portfolio.compare.close}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PropertyCompareModal;