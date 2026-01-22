import { Button } from "@/components/ui/button";
import { Menu, X, Shield, Heart } from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { useFavorites } from "@/hooks/useFavorites";
import LanguageSwitcher from "./LanguageSwitcher";
import ThemeToggle from "./ThemeToggle";
import AnimationToggle from "./AnimationToggle";
import { AnimatePresence, motion } from "framer-motion";

const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("");
  const { t, language } = useLanguage();
  const { favorites } = useFavorites();
  const location = useLocation();
  const navigate = useNavigate();

  // Track active section based on scroll position
  useEffect(() => {
    const handleScroll = () => {
      if (location.pathname !== "/") {
        setActiveSection(location.pathname);
        return;
      }

      const sections = ["contact", "portofoliu", "calculator", "beneficii"];
      const scrollPosition = window.scrollY + 100;

      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(`#${section}`);
            return;
          }
        }
      }

      // If at top of page, set home as active
      if (window.scrollY < 100) {
        setActiveSection("/");
      }
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [location.pathname]);

  // Update active section when route changes
  useEffect(() => {
    if (location.pathname !== "/") {
      setActiveSection(location.pathname);
    }
  }, [location.pathname]);

  const handleHomeClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (location.pathname === "/") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      navigate("/");
    }
    setMobileMenuOpen(false);
  };

  const navLinks = [
    { href: "/", label: t.nav.home, isHome: true },
    { href: "#beneficii", label: t.nav.benefits },
    { href: "#calculator", label: "Calculator" },
    { href: "#portofoliu", label: t.nav.portfolio },
    { href: "/imobiliare", label: t.nav.realEstate, isPage: true },
    { href: "/oaspeti", label: t.nav.guests, isPage: true },
    { href: "/despre-noi", label: t.nav.aboutUs, isPage: true },
    { href: "/online-check-in", label: t.nav.onlineCheckIn, isPage: true },
    { href: "/blog", label: "Blog", isPage: true },
    { href: "/autentificare-proprietar", label: language === "ro" ? "Portal Proprietari" : "Owner Portal", isPage: true },
    { href: "#contact", label: t.nav.contact },
  ];

  return (
    <>
      {/* Backdrop blur when mobile menu is open */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            className="fixed inset-0 bg-gradient-to-b from-black/60 via-amber-950/40 to-black/70 backdrop-blur-sm z-40 md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={() => setMobileMenuOpen(false)}
          />
        )}
      </AnimatePresence>
      
      <header className="fixed top-0 left-0 right-0 z-50">
      {/* Main header bar */}
      <div className="glass border-b border-border">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <a href="/" className="group relative flex flex-col items-start gap-0 transition-all duration-300 overflow-hidden hover:scale-105 hover:-rotate-1 hover:-translate-y-0.5 hover:drop-shadow-[0_8px_20px_hsl(45_100%_50%/0.3)]">
            {/* Shimmer overlay */}
            <span className="pointer-events-none absolute inset-0 -translate-x-full group-hover:animate-shimmer-sweep bg-gradient-to-r from-transparent via-amber-400/40 to-transparent skew-x-12 z-10" />
            <span className="text-xl md:text-2xl font-serif font-semibold text-foreground">
              <span className="animate-text-glow group-hover:animate-none group-hover:[text-shadow:0_0_20px_hsl(45_100%_50%/0.8),0_0_40px_hsl(45_100%_50%/0.5),0_0_60px_hsl(45_100%_50%/0.3)] transition-all duration-300">Real<span className="text-primary group-hover:text-amber-400 transition-colors duration-300">Trust</span></span>
              <span className="text-muted-foreground"> & </span>
              <span className="text-foreground animate-text-glow group-hover:animate-none group-hover:[text-shadow:0_0_20px_hsl(45_100%_50%/0.8),0_0_40px_hsl(45_100%_50%/0.5),0_0_60px_hsl(45_100%_50%/0.3)] transition-all duration-300">ApArt Hotel</span>
            </span>
            <span className="text-[9px] md:text-[10px] text-muted-foreground tracking-wide mt-0.5 animate-text-glow group-hover:animate-none group-hover:[text-shadow:0_0_15px_hsl(45_100%_50%/0.6),0_0_30px_hsl(45_100%_50%/0.4)] transition-all duration-300">
              Vânzare · Administrare · Cazare <span className="text-primary/60">|</span> <span className="text-primary font-semibold group-hover:text-amber-400 transition-colors duration-300">1 singur sistem</span>
            </span>
          </a>
          
          {/* Navigation - Desktop */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => {
              const isActive = activeSection === link.href;
              const baseClasses = "relative text-sm font-medium transition-all duration-300 ease-out after:absolute after:bottom-[-4px] after:left-0 after:h-[2px] after:bg-primary after:transition-all after:duration-300 after:ease-out hover:-translate-y-0.5 hover:drop-shadow-[0_4px_8px_hsl(var(--primary)/0.2)]";
              const activeClasses = isActive 
                ? "text-primary font-semibold scale-105 animate-glow-pulse after:w-full -translate-y-0.5 drop-shadow-[0_4px_8px_hsl(var(--primary)/0.3)]" 
                : "text-muted-foreground hover:text-foreground hover:scale-110 after:w-0 hover:after:w-full";

              return link.isHome ? (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={handleHomeClick}
                  className={`${baseClasses} ${activeClasses}`}
                >
                  {link.label}
                </a>
              ) : link.isPage ? (
                <Link
                  key={link.href}
                  to={link.href}
                  className={`${baseClasses} ${activeClasses}`}
                >
                  {link.label}
                </Link>
              ) : (
                <a
                  key={link.href}
                  href={link.href}
                  className={`${baseClasses} ${activeClasses}`}
                >
                  {link.label}
                </a>
              );
            })}
          </nav>
          
          {/* CTA & Language & Mobile Menu */}
          <div className="flex items-center gap-2 md:gap-4">
            {/* Favorites link */}
            {favorites.length > 0 && (
              <Link to="/favorite">
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="relative text-muted-foreground hover:text-foreground transition-all duration-300 hover:scale-110 hover:-translate-y-0.5 hover:drop-shadow-[0_4px_12px_hsl(0_80%_50%/0.3)]"
                >
                  <Heart className="w-4 h-4 fill-red-500 text-red-500" />
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-primary-foreground text-[10px] rounded-full flex items-center justify-center">
                    {favorites.length}
                  </span>
                </Button>
              </Link>
            )}
            {/* Animation toggle */}
            <AnimationToggle />
            {/* Theme toggle */}
            <ThemeToggle />
            {/* Language switcher - visible on all screens */}
            <LanguageSwitcher />
            <Link to="/auth">
              <Button 
                variant="ghost" 
                size="sm"
                className="hidden sm:inline-flex text-muted-foreground hover:text-foreground transition-all duration-300 hover:scale-105 hover:-translate-y-0.5 hover:drop-shadow-[0_4px_12px_hsl(var(--primary)/0.3)]"
              >
                <Shield className="w-4 h-4 mr-2" />
                Admin
              </Button>
            </Link>
            {/* Owners CTA - distinct gold button */}
            <Button 
              variant="default" 
              size="default" 
              className="hidden lg:inline-flex bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-semibold shadow-lg shadow-amber-500/25 border-0 transition-all duration-300 hover:scale-105 hover:-rotate-1 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-amber-500/40"
              onClick={() => document.getElementById('calculator')?.scrollIntoView({ behavior: 'smooth' })}
            >
              <span className="mr-1.5">🏠</span>
              {t.nav.listProperty || 'Proprietari: Listează'}
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
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.nav 
              className="md:hidden py-4 border-t border-border origin-top overflow-hidden"
              initial={{ opacity: 0, height: 0, scaleY: 0.95 }}
              animate={{ opacity: 1, height: "auto", scaleY: 1 }}
              exit={{ opacity: 0, height: 0, scaleY: 0.95 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <div className="flex flex-col gap-4">
                {navLinks.map((link, index) => {
                  const isActive = activeSection === link.href;
                  const baseClasses = "relative text-sm font-medium py-2 transition-all duration-300 ease-out before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-4 before:w-[2px] before:bg-primary before:transition-all before:duration-300 before:ease-out hover:scale-105 hover:drop-shadow-[0_2px_8px_hsl(var(--primary)/0.2)]";
                  const activeClasses = isActive 
                    ? "text-primary font-semibold translate-x-2 scale-105 animate-glow-pulse before:opacity-100 drop-shadow-[0_2px_8px_hsl(var(--primary)/0.3)]" 
                    : "text-muted-foreground hover:text-foreground hover:translate-x-2 before:opacity-0 hover:before:opacity-100";

                  return (
                    <motion.div
                      key={link.href}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2, delay: index * 0.05 }}
                    >
                      {link.isHome ? (
                        <a
                          href={link.href}
                          onClick={handleHomeClick}
                          className={`${baseClasses} ${activeClasses}`}
                        >
                          {link.label}
                        </a>
                      ) : link.isPage ? (
                        <Link
                          to={link.href}
                          className={`${baseClasses} ${activeClasses}`}
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          {link.label}
                        </Link>
                      ) : (
                        <a
                          href={link.href}
                          className={`${baseClasses} ${activeClasses}`}
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          {link.label}
                        </a>
                      )}
                    </motion.div>
                  );
                })}
                
                {/* Mobile settings row */}
                <motion.div 
                  className="flex items-center gap-2 pt-4 border-t border-border"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2, delay: navLinks.length * 0.05 }}
                >
                  <span className="text-xs text-muted-foreground mr-2">
                    {language === 'ro' ? 'Setări:' : 'Settings:'}
                  </span>
                  <AnimationToggle />
                  <ThemeToggle />
                  <LanguageSwitcher />
                </motion.div>
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
        </div>
      </div>
      
      </header>
    </>
  );
};

export default Header;
