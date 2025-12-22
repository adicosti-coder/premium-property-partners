const Footer = () => {
  return (
    <footer className="bg-primary py-12 border-t border-cream/10">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo */}
          <a href="/" className="flex items-center gap-2">
            <span className="text-xl font-serif font-semibold text-cream">
              Real<span className="text-gold">Trust</span>
            </span>
          </a>
          
          {/* Links */}
          <nav className="flex items-center gap-6 text-sm font-sans">
            <a href="#" className="text-cream/60 hover:text-cream transition-colors">
              Termeni și Condiții
            </a>
            <a href="#" className="text-cream/60 hover:text-cream transition-colors">
              Politica de Confidențialitate
            </a>
            <a href="#" className="text-cream/60 hover:text-cream transition-colors">
              Contact
            </a>
          </nav>
          
          {/* Copyright */}
          <p className="text-cream/40 text-sm font-sans">
            © 2024 RealTrust. Toate drepturile rezervate.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
