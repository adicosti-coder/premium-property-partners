import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { cn } from "@/lib/utils";

interface HubSectionProps {
  badge: string;
  badgeIcon?: LucideIcon;
  title: string;
  titleHighlight?: string;
  subtitle: string;
  ctaText: string;
  ctaLink: string;
  secondaryCta?: {
    text: string;
    onClick: () => void;
  };
  children?: ReactNode;
  variant?: "default" | "alternate" | "dark";
  className?: string;
}

const HubSection = ({
  badge,
  badgeIcon: BadgeIcon,
  title,
  titleHighlight,
  subtitle,
  ctaText,
  ctaLink,
  secondaryCta,
  children,
  variant = "default",
  className,
}: HubSectionProps) => {
  const { ref: sectionRef, isVisible } = useScrollAnimation({ threshold: 0.1 });

  const bgClasses = {
    default: "bg-background",
    alternate: "bg-secondary/30",
    dark: "bg-card",
  };

  return (
    <section
      ref={sectionRef}
      className={cn(
        "py-16 md:py-20 relative overflow-hidden",
        bgClasses[variant],
        className
      )}
    >
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />

      <div className="container mx-auto px-6 relative z-10">
        <div
          className={cn(
            "max-w-4xl mx-auto text-center transition-all duration-700",
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          )}
        >
          {/* Badge */}
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6"
            style={{ transitionDelay: "100ms" }}
          >
            {BadgeIcon && <BadgeIcon className="w-4 h-4 text-primary" />}
            <span className="text-primary text-sm font-semibold">{badge}</span>
          </div>

          {/* Title */}
          <h2 className="text-3xl md:text-4xl font-serif font-semibold text-foreground mb-4">
            {title}{" "}
            {titleHighlight && (
              <span className="text-gradient-gold">{titleHighlight}</span>
            )}
          </h2>

          {/* Subtitle */}
          <p className="text-foreground/70 dark:text-muted-foreground max-w-2xl mx-auto mb-8 text-lg">
            {subtitle}
          </p>

          {/* Content slot */}
          {children && (
            <div
              className={cn(
                "mb-10 transition-all duration-700 delay-200",
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              )}
            >
              {children}
            </div>
          )}

          {/* CTAs */}
          <div
            className={cn(
              "flex flex-col sm:flex-row gap-4 justify-center transition-all duration-700 delay-300",
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            )}
          >
            <Button asChild variant="hero" size="xl" className="group">
              <Link to={ctaLink}>
                {ctaText}
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
            {secondaryCta && (
              <Button
                variant="heroOutline"
                size="xl"
                onClick={secondaryCta.onClick}
              >
                {secondaryCta.text}
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HubSection;
