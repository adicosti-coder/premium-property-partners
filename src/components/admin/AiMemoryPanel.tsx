import { Sparkles } from "lucide-react";
import { VisitorMemoryWidget } from "@/components/admin/VisitorMemoryWidget";

/**
 * Panou compozit pentru tab-ul „AI Memory". Extras pentru lazy-loading curat.
 */
export default function AiMemoryPanel() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <VisitorMemoryWidget />
      <div className="rounded-lg border border-border bg-muted/20 p-4 text-sm space-y-2">
        <h3 className="font-semibold flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" /> Cum funcționează
        </h3>
        <p className="text-muted-foreground text-xs">
          Sistemul AI Memory urmărește anonim sesiunile vizitatorilor (proprietăți vizionate, căutări,
          interacțiuni cu chatbot-ul) și deduce automat preferințe.
        </p>
        <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-1">
          <li><strong>+5</strong> per proprietate vizionată</li>
          <li><strong>+3</strong> per căutare semantică</li>
          <li><strong>+20</strong> dacă a declarat buget</li>
          <li><strong>+25</strong> dacă este autentificat</li>
        </ul>
      </div>
    </div>
  );
}
