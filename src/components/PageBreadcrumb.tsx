import { Link } from "react-router-dom";
import { Fragment } from "react";
import { Home } from "lucide-react";
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

  // NOTE: no JSON-LD here. BreadcrumbList is emitted once per page by
  // SEOHead (breadcrumbItems) or by the page's own jsonLd graph, so this
  // component only renders the visible breadcrumb trail.

  return (
    <>
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
            <Fragment key={index}>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
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
            </Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
    </>
  );
};

export default PageBreadcrumb;
