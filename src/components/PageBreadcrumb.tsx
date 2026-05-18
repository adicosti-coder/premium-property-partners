import { Link } from "react-router-dom";
import { Home } from "lucide-react";
import { Helmet } from "react-helmet-async";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { useLanguage } from "@/i18n/LanguageContext";

const BASE_URL = "https://realtrust.ro";

interface BreadcrumbItemType {
  label: string;
  href?: string;
}

interface PageBreadcrumbProps {
  items: BreadcrumbItemType[];
  className?: string;
}

const PageBreadcrumb = ({ items, className = "" }: PageBreadcrumbProps) => {
  const { language } = useLanguage();
  const homeLabel = language === "ro" ? "Acasă" : "Home";

  // Build BreadcrumbList JSON-LD
  const schemaItems = [
    { name: homeLabel, url: BASE_URL },
    ...items.map((item) => ({
      name: item.label,
      url: item.href ? `${BASE_URL}${item.href}` : undefined,
    })),
  ];

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: schemaItems.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      ...(item.url ? { item: item.url } : {}),
    })),
  };

  return (
    <>
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify(breadcrumbSchema)}
        </script>
      </Helmet>
      <Breadcrumb className={className}>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/" className="flex items-center gap-1.5 hover:text-primary transition-colors">
                <Home className="w-4 h-4" />
                <span className="sr-only md:not-sr-only">{homeLabel}</span>
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          
          {items.map((item, index) => (
            <BreadcrumbItem key={index}>
              <BreadcrumbSeparator />
              {item.href ? (
                <BreadcrumbLink asChild>
                  <Link to={item.href} className="hover:text-primary transition-colors">
                    {item.label}
                  </Link>
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage>{item.label}</BreadcrumbPage>
              )}
            </BreadcrumbItem>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
    </>
  );
};

export default PageBreadcrumb;
