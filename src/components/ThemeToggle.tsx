import { useTheme } from "@/hooks/useTheme";
import { Button } from "@/components/ui/button";

const SunIcon = () => (
  <svg width="20" height="20" className="w-5 h-5 transition-transform hover:rotate-45" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
  </svg>
);

const MoonIcon = () => (
  <svg width="20" height="20" className="w-5 h-5 transition-transform hover:-rotate-12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 3a6 6 0 0 0 9 7.5A9 9 0 1 1 12 3Z" />
  </svg>
);

const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleTheme}
      className="w-11 h-11 min-w-[44px] min-h-[44px] p-0 text-muted-foreground hover:text-foreground transition-colors"
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
    </Button>
  );
};

export default ThemeToggle;