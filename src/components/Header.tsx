import { Button } from "@/components/ui/button";
import { Menu, X, Shield, Heart } from "lucide-react";
import { useState, useEffect, lazy, Suspense } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { useLanguage } from "@/i18n/LanguageContext";
import { useFavorites } from "@/hooks/useFavorites";
import { supabase } from "@/lib/supabaseClient";
import LanguageSwitcher from "./LanguageSwitcher";
import ThemeToggle from "./ThemeToggle";

// Lazy-load non-critical header sub-components
const AnimationToggle = lazy(() => import("./AnimationToggle"));
const NotificationBell = lazy(() => import("./NotificationBell"));
const PropertyCodeSearch = lazy(() => import("./PropertyCodeSearch"));
// Tooltip removed — not used in Header, avoids loading vendor-ui-core eagerly

const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  
  const { t, language } = useLanguage();
  const { favorites } = useFavorites();
  const location = useLocation();
  const navigate = useNavigate();

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
    };
    
    checkAuth();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Track active section based on scroll position — throttled via rAF
  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
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

        if (window.scrollY < 100) {
          setActiveSection("/");
        }
      });
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
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

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      return true;
    }
    return false;
  };

  const waitForElementAndScroll = (sectionId: string, maxAttempts = 20) => {
    let attempts = 0;
    const tryScroll = () => {
      if (scrollToSection(sectionId)) return;
      attempts++;
      if (attempts < maxAttempts) {
        requestAnimationFrame(tryScroll);
      }
    };
    // Start after a small delay to let React render
    setTimeout(tryScroll, 50);
  };

  const handleAnchorClick = (e: React.MouseEvent, anchor: string) => {
    e.preventDefault();
    const sectionId = anchor.replace("#", "");
    
    if (location.pathname === "/") {
      // Already on homepage, just scroll
      scrollToSection(sectionId);
    } else {
      // Navigate to homepage, then wait for element and scroll
      navigate("/");
      waitForElementAndScroll(sectionId);
    }
    setMobileMenuOpen(false);
  };

  const navLinks = [
    { href: "/", label: t.nav.home, isHome: true },
    { href: "/pentru-proprietari", label: language === "ro" ? "Pentru Proprietari" : "For Owners", isPage: true },
    { href: "/preturi", label: language === "ro" ? "Prețuri & Pachete" : "Pricing & Packages", isPage: true },
    { href: "/pentru-oaspeti", label: language === "ro" ? "Închiriere & Cazare Regim Hotelier" : "Rental & Hotel Accommodation", isPage: true },
    { href: "/complexe", label: language === "ro" ? "Ansambluri & Complexuri Rezidențiale" : "Residential Complexes", isPage: true },
    { href: "/imobiliare", label: t.nav.realEstate, isPage: true },
    { href: "/investitii", label: language === "ro" ? "Investiții Premium" : "Premium Investments", isPage: true },
    { href: "/blog", label: language === "ro" ? "Blog (Sfaturi, noutăți și ghiduri)" : "Blog (Tips, news & guides)", isPage: true },
    { href: "/despre-noi", label: t.nav.aboutUs, isPage: true },
    { href: "#contact", label: t.nav.contact },
  ];

  // Desktop nav link styling - optimized for 1024px+ screens
  // Ultra-compact on lg (1024-1279), compact on xl (1280-1535), comfortable on 2xl (1536+)
  const desktopLinkBaseClasses =
    "relative px-0.5 md:px-1 lg:px-1.5 xl:px-2 2xl:px-2.5 text-[9px] md:text-[10px] lg:text-[11px] xl:text-xs 2xl:text-sm font-medium transition-all duration-300 ease-out after:absolute after:bottom-[-4px] after:left-0 after:h-[2px] after:bg-primary after:transition-all after:duration-300 after:ease-out hover:-translate-y-0.5 hover:drop-shadow-[0_4px_8px_hsl(var(--primary)/0.2)] whitespace-nowrap";
  const desktopLinkActiveClasses =
    "text-primary font-semibold scale-105 animate-glow-pulse after:w-full -translate-y-0.5 drop-shadow-[0_4px_8px_hsl(var(--primary)/0.3)]";
  const desktopLinkInactiveClasses =
    "text-foreground/70 dark:text-muted-foreground hover:text-foreground hover:scale-105 after:w-0 hover:after:w-full";

  return (
    <>
      {/* Backdrop blur when mobile menu is open — CSS only, no framer-motion */}
      <div
        className={`fixed inset-0 bg-gradient-to-b from-amber-900/50 via-black/50 to-amber-900/50 backdrop-blur-sm z-40 transition-opacity duration-300 ${mobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setMobileMenuOpen(false)}
      />
      
      <header className="fixed top-0 left-0 right-0 z-50">

      <div className="glass border-b border-border/50 dark:border-border shadow-sm dark:shadow-none">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16 md:h-20 gap-2">
          {/* Logo - 3 lines layout centered */}
          <a href="/" className="group relative flex flex-col items-center gap-0 transition-all duration-300 hover:scale-105 hover:-rotate-1 hover:-translate-y-0.5 hover:drop-shadow-[0_8px_20px_hsl(45_100%_50%/0.3)] flex-shrink-0 mr-1 md:mr-2 lg:mr-3">
            {/* Shimmer overlay */}
            <span className="pointer-events-none absolute inset-0 -translate-x-full group-hover:animate-shimmer-sweep bg-gradient-to-r from-transparent via-amber-400/40 to-transparent skew-x-12 z-10" />
            {/* Line 1: RealTrust & */}
            <span className="text-sm lg:text-base xl:text-lg 2xl:text-xl font-serif font-semibold text-foreground leading-tight text-center">
              <span className="dark:animate-text-glow group-hover:animate-none group-hover:[text-shadow:0_0_20px_hsl(45_100%_50%/0.8),0_0_40px_hsl(45_100%_50%/0.5),0_0_60px_hsl(45_100%_50%/0.3)] transition-all duration-300">Real<span className="text-primary font-bold group-hover:text-amber-400 transition-colors duration-300">Trust</span></span>
              <span className="text-muted-foreground font-normal italic"> &</span>
            </span>
            {/* Line 2: ApArt Hotel */}
            <span className="text-sm lg:text-base xl:text-lg 2xl:text-xl font-serif font-semibold text-foreground leading-tight text-center dark:animate-text-glow group-hover:animate-none group-hover:[text-shadow:0_0_20px_hsl(45_100%_50%/0.8),0_0_40px_hsl(45_100%_50%/0.5),0_0_60px_hsl(45_100%_50%/0.3)] transition-all duration-300">
              <span className="text-primary font-bold group-hover:text-amber-400 transition-colors duration-300">ApArt</span> Hotel
            </span>
            {/* Line 3: Services */}
            <span className="text-[8px] lg:text-[9px] xl:text-[10px] font-semibold text-foreground/70 dark:text-foreground/80 tracking-widest uppercase leading-tight text-center transition-all duration-500 group-hover:tracking-[0.2em] group-hover:text-foreground">
              Imobiliare & Regim Hotelier
            </span>
          </a>
          
          {/* Navigation moved to hamburger menu on all resolutions */}

          {/* Right side container - search and actions */}
          <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
            {/* Tagline - All screens */}
            <p className="text-[8px] sm:text-[9px] md:text-[10px] lg:text-[11px] xl:text-xs 2xl:text-sm leading-tight text-muted-foreground font-medium hidden sm:block">
              {language === "ro"
                ? <>De la achiziție la venit hotelier — <span className="font-bold text-foreground bg-gradient-to-r from-primary to-amber-500 bg-clip-text text-transparent animate-text-glow">1 sistem complet</span>, orientat spre randament</>
                : <>From acquisition to hotel revenue — <span className="font-bold text-foreground bg-gradient-to-r from-primary to-amber-500 bg-clip-text text-transparent animate-text-glow">1 complete system</span>, yield-oriented</>}
            </p>
          
            {/* Favorites link */}
            {favorites.length > 0 && (
              <Link to="/favorite" aria-label={language === 'ro' ? `Favorite (${favorites.length})` : `Favorites (${favorites.length})`}>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="relative w-11 h-11 min-w-[44px] min-h-[44px] p-0 text-muted-foreground hover:text-foreground transition-all duration-300 hover:scale-110 hover:-translate-y-0.5 hover:drop-shadow-[0_4px_12px_hsl(0_80%_50%/0.3)]"
                  aria-label={language === 'ro' ? `Favorite (${favorites.length})` : `Favorites (${favorites.length})`}
                >
                  <Heart className="w-5 h-5 fill-red-500 text-red-500" />
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary text-primary-foreground text-[10px] rounded-full flex items-center justify-center">
                    {favorites.length}
                  </span>
                </Button>
              </Link>
            )}
            {/* Notifications - hidden on mobile, visible md+ only for authenticated admins */}
            {isAuthenticated === true && <div className="hidden md:block"><Suspense fallback={null}><NotificationBell /></Suspense></div>}
            {/* Animation toggle - hidden on mobile */}
            <div className="hidden md:block"><Suspense fallback={null}><AnimationToggle /></Suspense></div>
            {/* Theme toggle - visible on all screens */}
            <ThemeToggle />
            {/* Language switcher - visible on all screens */}
            <LanguageSwitcher />
            {isAuthenticated && (
              <Link to="/auth" aria-label={language === 'ro' ? 'Panou administrare' : 'Admin panel'}>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="hidden lg:inline-flex min-w-[44px] min-h-[44px] text-muted-foreground hover:text-foreground transition-all duration-300 hover:scale-105 hover:-translate-y-0.5 hover:drop-shadow-[0_4px_12px_hsl(var(--primary)/0.3)]"
                  aria-label={language === 'ro' ? 'Panou administrare' : 'Admin panel'}
                >
                  <Shield className="w-5 h-5 md:mr-0 lg:mr-0 xl:mr-1.5" />
                  <span className="hidden xl:inline">Admin</span>
                </Button>
              </Link>
            )}
            {/* Owners CTA - distinct gold button - visible only on 2xl+ */}
            <Button 
              variant="default" 
              size="default" 
              className="hidden 2xl:inline-flex bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-semibold shadow-lg shadow-amber-500/25 border-0 transition-all duration-300 hover:scale-105 hover:-rotate-1 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-amber-500/40"
              onClick={() => document.getElementById('calculator')?.scrollIntoView({ behavior: 'smooth' })}
            >
              <span className="mr-1.5">🏠</span>
              {t.nav.listProperty || 'Proprietari: Listează'}
            </Button>
            
            {/* Mobile menu button */}
            <button
              className="flex items-center gap-2 px-4 py-2.5 min-h-[48px] rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold shadow-lg shadow-amber-500/30 hover:from-amber-400 hover:to-amber-500 transition-all duration-200 border border-amber-400/50 min-w-[100px] justify-center"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? (language === 'ro' ? 'Închide meniul' : 'Close menu') : (language === 'ro' ? 'Deschide meniul' : 'Open menu')}
            >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <><Menu className="w-5 h-5" /><span className="text-sm font-extrabold tracking-wider">MENIU</span></>}
            </button>
          </div>
        </div>
        </div>
        {/* Mobile Navigation */}
        {/* Mobile Navigation — CSS transitions only */}
        <nav
          className={`py-4 px-4 border-t border-border origin-top overflow-hidden bg-background transition-all duration-300 ease-out ${mobileMenuOpen ? 'max-h-[80vh] opacity-100 scale-y-100' : 'max-h-0 opacity-0 scale-y-95 py-0 border-t-0'}`}
          style={{ transformOrigin: 'top' }}
        >
          {mobileMenuOpen && (
              <Suspense fallback={null}>
              <div className="flex flex-col gap-4">
                
                {/* Property Code Search - Mobile */}
                <div className="pb-3 border-b border-border/50">
                  <PropertyCodeSearch className="w-full" />
                </div>

                {navLinks.map((link) => {
                  const isActive = activeSection === link.href;
                  const baseClasses = "relative text-sm font-medium py-2 transition-all duration-300 ease-out before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-4 before:w-[2px] before:bg-primary before:transition-all before:duration-300 before:ease-out hover:scale-105 hover:drop-shadow-[0_2px_8px_hsl(var(--primary)/0.2)]";
                  const activeClasses = isActive 
                    ? "text-primary font-semibold translate-x-2 scale-105 before:opacity-100 drop-shadow-[0_2px_8px_hsl(var(--primary)/0.3)]" 
                    : "text-foreground/70 dark:text-muted-foreground hover:text-foreground hover:translate-x-2 before:opacity-0 hover:before:opacity-100";

                  return (
                    <div key={link.href}>
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
                          onClick={(e) => handleAnchorClick(e, link.href)}
                        >
                          {link.label}
                        </a>
                      )}
                    </div>
                  );
                })}
                
                {/* Admin link in mobile menu - only for authenticated */}
                {isAuthenticated && (
                  <div>
                    <Link
                      to="/auth"
                      className="relative text-sm font-medium py-2 transition-all duration-300 ease-out flex items-center gap-2 text-foreground/70 dark:text-muted-foreground hover:text-foreground hover:translate-x-2"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Shield className="w-4 h-4" />
                      Admin
                    </Link>
                  </div>
                )}

                {/* Mobile settings row */}
                <div className="flex items-center gap-2 pt-4 border-t border-border">
                  <span className="text-xs text-muted-foreground mr-2">
                    {language === 'ro' ? 'Setări:' : 'Settings:'}
                  </span>
                  {isAuthenticated && <NotificationBell />}
                  <AnimationToggle />
                  <ThemeToggle />
                  <LanguageSwitcher />
                </div>
              </div>
              </Suspense>
          )}
        </nav>
      </div>
      
      </header>
    </>
  );
};

export default Header;
