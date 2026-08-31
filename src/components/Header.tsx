import { Button } from "@/components/ui/button";
import { useState, useEffect, lazy, Suspense, forwardRef } from "react";

// Inline SVG icons to avoid loading lucide-react in critical path (~25KB saving)
const MenuIcon = forwardRef<SVGSVGElement>((_props, ref) => <svg ref={ref} width="20" height="20" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>);
MenuIcon.displayName = "MenuIcon";
const XIcon = forwardRef<SVGSVGElement>((_props, ref) => <svg ref={ref} width="20" height="20" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>);
XIcon.displayName = "XIcon";
const PlusCircleIcon = forwardRef<SVGSVGElement>((_props, ref) => <svg ref={ref} width="16" height="16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/><path d="M12 8v8"/></svg>);
PlusCircleIcon.displayName = "PlusCircleIcon";
const ShieldIcon = forwardRef<SVGSVGElement, { className?: string }>(({ className = "w-5 h-5" }, ref) => <svg ref={ref} width="20" height="20" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/></svg>);
ShieldIcon.displayName = "ShieldIcon";
const HomeIcon = forwardRef<SVGSVGElement>((_props, ref) => <svg ref={ref} width="16" height="16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>);
HomeIcon.displayName = "HomeIcon";
const BuildingIcon = forwardRef<SVGSVGElement>((_props, ref) => <svg ref={ref} width="16" height="16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg>);
BuildingIcon.displayName = "BuildingIcon";
const BedIcon = forwardRef<SVGSVGElement>((_props, ref) => <svg ref={ref} width="16" height="16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/></svg>);
BedIcon.displayName = "BedIcon";
const TrendingIcon = forwardRef<SVGSVGElement>((_props, ref) => <svg ref={ref} width="16" height="16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>);
TrendingIcon.displayName = "TrendingIcon";
const BookOpenIcon = forwardRef<SVGSVGElement>((_props, ref) => <svg ref={ref} width="16" height="16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>);
BookOpenIcon.displayName = "BookOpenIcon";
const PhoneIcon = forwardRef<SVGSVGElement>((_props, ref) => <svg ref={ref} width="16" height="16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>);
PhoneIcon.displayName = "PhoneIcon";
const ScanIcon = forwardRef<SVGSVGElement>((_props, ref) => <svg ref={ref} width="16" height="16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><line x1="7" x2="17" y1="12" y2="12"/></svg>);
ScanIcon.displayName = "ScanIcon";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { useLanguage } from "@/i18n/LanguageContext";
// supabase imported dynamically below to keep vendor-supabase (~43KB) off critical path
import LanguageSwitcher from "./LanguageSwitcher";
import ThemeToggle from "./ThemeToggle";
import AnimationToggle from "./AnimationToggle";

// Lazy-load non-critical header sub-components
const NotificationBell = lazy(() => import("./NotificationBell"));
const PropertyCodeSearch = lazy(() => import("./PropertyCodeSearch"));
// Tooltip removed — not used in Header, avoids loading vendor-ui-core eagerly

const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  
  const { t, language } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();

  // Resolve auth as early as possible so the Admin entry is visible on desktop
  // without requiring a click/touch. The supabase client is still lazy-loaded.
  useEffect(() => {
    let cancelled = false;
    let subscription: { unsubscribe: () => void } | null = null;

    const init = async () => {
      const { supabase } = await import("@/lib/supabaseClient");

      if (cancelled) return;

      // Check current session
      const { data: { session } } = await supabase.auth.getSession();
      if (!cancelled) setIsAuthenticated(!!session);

      // Check admin role
      if (session?.user) {
        const { data: roleData } = await supabase.rpc("has_role", {
          _user_id: session.user.id,
          _role: "admin",
        });
        if (!cancelled) setIsAdmin(!!roleData);
      }

      // Listen for auth changes
      const { data } = supabase.auth.onAuthStateChange(async (_, session) => {
        if (cancelled) return;
        setIsAuthenticated(!!session);
        if (session?.user) {
          const { data: roleData } = await supabase.rpc("has_role", {
            _user_id: session.user.id,
            _role: "admin",
          });
          if (!cancelled) setIsAdmin(!!roleData);
        } else {
          setIsAdmin(false);
        }
      });
      subscription = data.subscription;
    };

    init().catch(() => {});

    return () => {
      cancelled = true;
      subscription?.unsubscribe();
    };
  }, []);

  // Track active section via IntersectionObserver — no forced reflow
  useEffect(() => {
    if (location.pathname !== "/") {
      setActiveSection(location.pathname);
      return;
    }

    const sectionIds = ["contact", "portofoliu", "calculator", "beneficii"];
    const visibleSections = new Set<string>();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const id = entry.target.id;
          if (entry.isIntersecting) {
            visibleSections.add(id);
          } else {
            visibleSections.delete(id);
          }
        });

        // Pick the first visible section in DOM order
        for (const id of sectionIds) {
          if (visibleSections.has(id)) {
            setActiveSection(`#${id}`);
            return;
          }
        }

        // No section visible — check if at top
        if (window.scrollY < 100) {
          setActiveSection("/");
        }
      },
      { rootMargin: "-80px 0px 0px 0px", threshold: 0 }
    );

    const elements = sectionIds
      .map((id) => document.getElementById(id))
      .filter(Boolean) as HTMLElement[];
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
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

  // Grouped nav links with icons for premium mobile menu
  const navGroups = [
    {
      label: language === "ro" ? "Principal" : "Main",
      links: [
        { href: "/", label: t.nav.home, isHome: true, icon: <HomeIcon /> },
      ],
    },
    {
      label: language === "ro" ? "Proprietari" : "Owners",
      links: [
        { href: "/servicii-imobiliare-timisoara", label: language === "ro" ? "Servicii Imobiliare" : "Real Estate Services", isPage: true, icon: <BuildingIcon /> },
        { href: "/pentru-proprietari", label: language === "ro" ? "Pentru Proprietari" : "For Owners", isPage: true, icon: <BuildingIcon /> },
        { href: "/preturi", label: language === "ro" ? "Prețuri & Pachete" : "Pricing & Packages", isPage: true, icon: <TrendingIcon /> },
        { href: "/analiza-proprietate", label: language === "ro" ? "HostScan AI" : "HostScan AI", isPage: true, icon: <ScanIcon /> },
      ],
    },
    {
      label: language === "ro" ? "Oaspeți" : "Guests",
      links: [
        { href: "/pentru-oaspeti", label: language === "ro" ? "Cazare Regim Hotelier" : "Hotel Accommodation", isPage: true, icon: <BedIcon /> },
        { href: "/complexe", label: language === "ro" ? "Complexuri Rezidențiale" : "Residential Complexes", isPage: true, icon: <BuildingIcon /> },
      ],
    },
    {
      label: language === "ro" ? "Investiții" : "Investments",
      links: [
        { href: "/investitii", label: language === "ro" ? "Investiții Premium" : "Premium Investments", isPage: true, icon: <TrendingIcon /> },
        { href: "/catalog-investitii", label: language === "ro" ? "Catalog Investiții 2026" : "Investment Catalog 2026", isPage: true, icon: <BookOpenIcon /> },
        { href: "/imobiliare", label: t.nav.realEstate, isPage: true, icon: <BuildingIcon /> },
        { href: "/imobiliare-timisoara", label: language === "ro" ? "Cartiere Timișoara" : "Timișoara Neighborhoods", isPage: true, icon: <BuildingIcon /> },
      ],
    },
    {
      label: language === "ro" ? "Informații" : "Info",
      links: [
        { href: "/blog", label: language === "ro" ? "Blog & Ghiduri" : "Blog & Guides", isPage: true, icon: <BookOpenIcon /> },
        { href: "/despre-noi", label: t.nav.aboutUs, isPage: true, icon: <HomeIcon /> },
        { href: "#contact", label: t.nav.contact, icon: <PhoneIcon /> },
      ],
    },
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
          <div className="flex items-center justify-between h-16 md:h-20 gap-2 overflow-visible">
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
          <div className="flex items-center gap-1 md:gap-2 flex-shrink min-w-0">
            {/* Tagline - All screens */}
            <p className="text-[8px] sm:text-[9px] md:text-[10px] lg:text-[11px] xl:text-xs 2xl:text-sm leading-tight text-muted-foreground font-medium hidden sm:block">
              {language === "ro"
                ? <>De la achiziție la venit lunar — <span className="font-bold text-foreground bg-gradient-to-r from-primary to-amber-500 bg-clip-text text-transparent animate-text-glow">un singur partener</span>, raportare clară</>
                : <>From acquisition to monthly income — <span className="font-bold text-foreground bg-gradient-to-r from-primary to-amber-500 bg-clip-text text-transparent animate-text-glow">a single partner</span>, clear reporting</>}
            </p>
          
            {/* Favorites link intentionally kept off the LCP header bundle; available in /favorite and property lists. */}
            {/* Notifications - hidden on mobile, visible md+ only for authenticated admins */}
            {/* Notifications + Animation toggle: render only after mobile menu interaction OR md+ viewport.
                Avoids loading non-critical chunks on mobile LCP path. */}
            {isAuthenticated === true && isAdmin && location.pathname.startsWith("/admin") && <div className="hidden md:block"><Suspense fallback={null}><NotificationBell /></Suspense></div>}
            <div className="hidden md:block"><Suspense fallback={null}><AnimationToggle /></Suspense></div>
            {/* Theme toggle - visible on all screens */}
            <ThemeToggle />
            {/* Language switcher - visible on all screens */}
            <LanguageSwitcher />
            {isAuthenticated === true && isAdmin && (
              <Link to="/admin/prospect-listings" aria-label="Prospect Listings AI">
                <Button
                  variant="ghost"
                  size="sm"
                  className="hidden md:inline-flex min-w-[44px] min-h-[44px] text-amber-600 hover:text-amber-500 transition-all duration-300 hover:scale-105"
                  aria-label="Prospect Listings AI"
                >
                  <span className="text-lg">📞</span>
                  <span className="hidden md:inline ml-1 text-xs font-semibold">Prospects</span>
                </Button>
              </Link>
            )}
            {isAuthenticated === true && (
              <Link to={isAdmin ? "/admin" : "/auth"} aria-label={language === 'ro' ? 'Panou administrare' : 'Admin panel'}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="hidden md:inline-flex min-w-[44px] min-h-[44px] text-muted-foreground hover:text-foreground transition-all duration-300 hover:scale-105 hover:-translate-y-0.5 hover:drop-shadow-[0_4px_12px_hsl(var(--primary)/0.3)]"
                  aria-label={language === 'ro' ? 'Panou administrare' : 'Admin panel'}
                >
                  <ShieldIcon className="w-5 h-5" />
                  <span className="hidden md:inline ml-1 text-xs font-semibold">Admin</span>
                </Button>
              </Link>
            )}
            {/* Owners CTA - high-contrast Amber/Gold investor button */}
            <Link to="/evaluare-gratuita" className="hidden 2xl:inline-flex">
              <Button
                variant="default"
                size="default"
                className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-blue-950 font-bold shadow-lg shadow-amber-500/30 border-0 transition-all duration-300 hover:scale-105 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-amber-500/50 gap-1.5"
              >
                <span aria-hidden>📈</span>
                {language === "ro" ? "Evaluează Profitul" : "Evaluate Profit"}
              </Button>
            </Link>

            {/* Add Listing CTA - prominent pill button */}
            <Link to="/adauga-anunt" className="hidden lg:inline-flex">
              <Button 
                variant="default" 
                size="sm" 
                className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-md shadow-primary/30 border-0 transition-all duration-300 hover:scale-105 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/40 gap-1.5 px-4"
              >
                <PlusCircleIcon />
                {language === "ro" ? "Adaugă Anunțul Tău" : "Add Your Listing"}
              </Button>
            </Link>
            
            {/* Mobile menu button */}
            <button
              className="flex items-center gap-2 px-4 py-2.5 min-h-[48px] rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold shadow-lg shadow-amber-500/30 hover:from-amber-400 hover:to-amber-500 transition-all duration-200 border border-amber-400/50 min-w-[100px] justify-center"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? (language === 'ro' ? 'Închide meniul' : 'Close menu') : (language === 'ro' ? 'Deschide meniul' : 'Open menu')}
            >
            {mobileMenuOpen ? <XIcon /> : <><MenuIcon /><span className="text-sm font-extrabold tracking-wider">MENIU</span></>}
            </button>
          </div>
        </div>
        </div>
        {/* Mobile Navigation */}
        {/* Mobile Navigation — CSS transitions only */}
        <nav
          className={`px-4 border-t border-border origin-top overflow-auto bg-background transition-all duration-300 ease-out ${mobileMenuOpen ? 'max-h-[80vh] opacity-100 scale-y-100 py-4' : 'max-h-0 opacity-0 scale-y-95 py-0 border-t-0 pointer-events-none'}`}
          style={{ transformOrigin: 'top' }}
          {...(!mobileMenuOpen ? { inert: '' as unknown as boolean } : {})}
        >
              <div className="flex flex-col gap-2">
                
                {/* Add Listing CTA - prominent at top of mobile menu */}
                <div className="pb-3 border-b border-border/50">
                  <Link 
                    to="/adauga-anunt" 
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-full bg-primary text-primary-foreground font-bold text-sm shadow-md shadow-primary/30 transition-all duration-200 hover:bg-primary/90 hover:shadow-lg"
                  >
                    <PlusCircleIcon />
                    {language === "ro" ? "Adaugă Anunțul Tău" : "Add Your Listing"}
                  </Link>
                </div>

                {/* Property Code Search - Mobile */}
                {mobileMenuOpen && (
                  <div className="pb-3 border-b border-border/50">
                    <Suspense fallback={null}><PropertyCodeSearch className="w-full" /></Suspense>
                  </div>
                )}

                {navGroups.map((group, gi) => (
                  <div key={group.label}>
                    {gi > 0 && <div className="h-px bg-border/50 my-1" />}
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 px-1 mb-1">
                      {group.label}
                    </p>
                    {group.links.map((link) => {
                      const isActive = activeSection === link.href;
                      const linkClasses = `flex items-center gap-3 text-sm font-medium py-2.5 px-3 rounded-lg transition-all duration-200 ${
                        isActive 
                          ? "text-primary bg-primary/10 font-semibold" 
                          : "text-foreground/70 hover:text-foreground hover:bg-muted/50"
                      }`;

                      return (
                        <div key={link.href}>
                          {link.isHome ? (
                            <a href={link.href} onClick={handleHomeClick} className={linkClasses}>
                              <span className="text-primary/70">{link.icon}</span>
                              {link.label}
                            </a>
                          ) : link.isPage ? (
                            <Link to={link.href} className={linkClasses} onClick={() => setMobileMenuOpen(false)}>
                              <span className="text-primary/70">{link.icon}</span>
                              {link.label}
                            </Link>
                          ) : (
                            <a href={link.href} className={linkClasses} onClick={(e) => handleAnchorClick(e, link.href)}>
                              <span className="text-primary/70">{link.icon}</span>
                              {link.label}
                            </a>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
                
                {/* Admin links in mobile menu - only for users with admin role */}
                {isAuthenticated === true && isAdmin && (
                  <>
                    <div className="h-px bg-border/50 my-1" />
                    <Link
                      to="/auth"
                      className="flex items-center gap-3 text-sm font-medium py-2.5 px-3 rounded-lg text-foreground/70 hover:text-foreground hover:bg-muted/50 transition-all duration-200"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <span className="text-primary/70"><ShieldIcon className="w-4 h-4" /></span>
                      Admin
                    </Link>
                    <Link
                      to="/admin/prospect-listings"
                      className="flex items-center gap-3 text-sm font-medium py-2.5 px-3 rounded-lg text-foreground/70 hover:text-foreground hover:bg-muted/50 transition-all duration-200"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <span className="text-primary/70">📞</span>
                      Prospect Listings (AI Calls)
                    </Link>
                  </>
                )}

                {/* Mobile settings row */}
                <div className="flex items-center gap-2 pt-3 mt-1 border-t border-border">
                  <span className="text-xs text-muted-foreground mr-2">
                    {language === 'ro' ? 'Setări:' : 'Settings:'}
                  </span>
                  {mobileMenuOpen && isAuthenticated === true && isAdmin && location.pathname.startsWith("/admin") && <Suspense fallback={null}><NotificationBell /></Suspense>}
                  {mobileMenuOpen && <Suspense fallback={null}><AnimationToggle /></Suspense>}
                  <ThemeToggle />
                  <LanguageSwitcher />
                </div>
              </div>
        </nav>
      </div>
      
      </header>
    </>
  );
};

export default Header;
