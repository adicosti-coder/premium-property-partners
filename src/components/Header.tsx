import { Button } from "@/components/ui/button";
import { Menu, X, Shield, Heart } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { useFavorites } from "@/hooks/useFavorites";
import LanguageSwitcher from "./LanguageSwitcher";
import ThemeToggle from "./ThemeToggle";

const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { t } = useLanguage();
  const { favorites } = useFavorites();

  const navLinks = [
    { href: "#beneficii", label: t.nav.benefits },
    { href: "#calculator", label: "Calculator" },
    { href: "#portofoliu", label: t.nav.portfolio },
    { href: "/imobiliare", label: t.nav.realEstate, isPage: true },
    { href: "/oaspeti", label: t.nav.guests, isPage: true },
    { href: "#contact", label: t.nav.contact },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-border">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <a href="/" className="flex items-center gap-2">
            <span className="text-xl md:text-2xl font-serif font-semibold text-foreground">
              Real<span className="text-primary">Trust</span>
            </span>
          </a>
          
          {/* Navigation - Desktop */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              link.isPage ? (
                <Link
                  key={link.href}
                  to={link.href}
                  className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium"
                >
                  {link.label}
                </Link>
              ) : (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium"
                >
                  {link.label}
                </a>
              )
            ))}
          </nav>
          
          {/* CTA & Language & Mobile Menu */}
          <div className="flex items-center gap-2 md:gap-4">
            {/* Favorites link */}
            {favorites.length > 0 && (
              <Link to="/favorite">
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="relative text-muted-foreground hover:text-foreground"
                >
                  <Heart className="w-4 h-4 fill-red-500 text-red-500" />
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-primary-foreground text-[10px] rounded-full flex items-center justify-center">
                    {favorites.length}
                  </span>
                </Button>
              </Link>
            )}
            {/* Theme toggle */}
            <ThemeToggle />
            {/* Language switcher - visible on all screens */}
            <LanguageSwitcher />
            <Link to="/auth">
              <Button 
                variant="ghost" 
                size="sm"
                className="hidden sm:inline-flex text-muted-foreground hover:text-foreground"
              >
                <Shield className="w-4 h-4 mr-2" />
                Admin
              </Button>
            </Link>
            <Button 
              variant="hero" 
              size="default" 
              className="hidden sm:inline-flex"
              onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
            >
              {t.nav.contact}
            </Button>
            
            {/* Mobile menu button */}
            <button
              className="md:hidden text-foreground"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav className="md:hidden py-4 border-t border-border animate-fade-in">
            <div className="flex flex-col gap-4">
              {navLinks.map((link) => (
                link.isPage ? (
                  <Link
                    key={link.href}
                    to={link.href}
                    className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium py-2"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {link.label}
                  </Link>
                ) : (
                  <a
                    key={link.href}
                    href={link.href}
                    className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium py-2"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {link.label}
                  </a>
                )
              ))}
            </div>
          </nav>
        )}
      </div>
    </header>
  );
};

export default Header;
