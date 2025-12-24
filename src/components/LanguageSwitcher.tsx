import { useLanguage } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const LanguageSwitcher = () => {
  const { language, setLanguage } = useLanguage();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
          <Globe className="w-4 h-4" />
          <span className="uppercase font-medium">{language}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[120px]">
        <DropdownMenuItem 
          onClick={() => setLanguage('ro')}
          className={language === 'ro' ? 'bg-primary/10 text-primary' : ''}
        >
          <span className="mr-2">🇷🇴</span>
          Română
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setLanguage('en')}
          className={language === 'en' ? 'bg-primary/10 text-primary' : ''}
        >
          <span className="mr-2">🇬🇧</span>
          English
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSwitcher;