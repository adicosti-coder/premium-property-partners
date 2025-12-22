import { Button } from "@/components/ui/button";

const Header = () => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-primary/95 backdrop-blur-md border-b border-cream/10">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <a href="/" className="flex items-center gap-2">
            <span className="text-xl md:text-2xl font-serif font-semibold text-cream">
              Real<span className="text-gold">Trust</span>
            </span>
          </a>
          
          {/* Navigation - Desktop */}
          <nav className="hidden md:flex items-center gap-8">
            <a href="#beneficii" className="text-cream/70 hover:text-cream transition-colors text-sm font-medium font-sans">
              Beneficii
            </a>
            <a href="#cum-functioneaza" className="text-cream/70 hover:text-cream transition-colors text-sm font-medium font-sans">
              Cum Funcționează
            </a>
            <a href="#de-ce-noi" className="text-cream/70 hover:text-cream transition-colors text-sm font-medium font-sans">
              De Ce Noi
            </a>
          </nav>
          
          {/* CTA */}
          <Button variant="hero" size="default" className="hidden sm:inline-flex">
            Contactează-ne
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;
