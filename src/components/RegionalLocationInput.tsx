import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getRegionalSuggestions } from "@/lib/calculatorAnalytics";

export function RegionalLocationInput({ value, onChange, error, language }: {
  value: string; onChange: (value: string) => void; error?: string; language: "ro" | "en";
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  // Keep results synchronous; focus and active-option changes reuse the same search.
  const suggestions = useMemo(() => getRegionalSuggestions(value), [value]);
  const expanded = open && suggestions.length > 0;
  const query = value.trim();
  const noMatches = open && query.length >= 2 && suggestions.length === 0;
  const status = noMatches
    ? (language === "ro" ? `Nicio sugestie pentru „${query}”. Poți păstra localitatea scrisă.` : `No suggestions for “${query}”. You can keep the location you typed.`)
    : expanded
      ? (language === "ro" ? `${suggestions.length} ${suggestions.length === 1 ? "sugestie disponibilă" : "sugestii disponibile"}.` : `${suggestions.length} ${suggestions.length === 1 ? "suggestion" : "suggestions"} available.`)
      : "";
  const choose = (name: string) => { onChange(name); setOpen(false); setActive(-1); };
  return (
    <div className="relative">
      <Input id="uc-location" role="combobox" autoComplete="off" maxLength={120} value={value}
        aria-autocomplete="list" aria-expanded={expanded} aria-controls="uc-location-suggestions"
        aria-activedescendant={expanded && active >= 0 ? `uc-location-option-${active}` : undefined}
        aria-invalid={!!error} aria-describedby={[error ? "uc-location-error" : null, "uc-location-status"].filter(Boolean).join(" ")}
        onFocus={() => setOpen(true)} onBlur={(event) => {
          if (event.relatedTarget instanceof Node && event.currentTarget.parentElement?.contains(event.relatedTarget)) return;
          setOpen(false); setActive(-1);
        }}
        onChange={(event) => { onChange(event.target.value); setOpen(true); setActive(-1); }}
        onKeyDown={(event) => {
          if (event.key === "Escape") { setOpen(false); setActive(-1); }
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault(); setOpen(true);
            setActive((index) => event.key === "ArrowDown" ? Math.min(index + 1, suggestions.length - 1) : Math.max(index - 1, 0));
          }
          if (event.key === "Enter" && expanded && active >= 0) {
            const name = suggestions[active];
            if (name) { event.preventDefault(); choose(name); }
          }
        }} />
      <p id="uc-location-status" role="status" aria-live="polite" aria-atomic="true" className={noMatches ? "mt-1 text-sm text-muted-foreground" : "sr-only"}>{status}</p>
      {expanded && <div id="uc-location-suggestions" role="listbox" aria-label={language === "ro" ? "Sugestii de localități" : "Location suggestions"}
        className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-border bg-popover p-1 shadow-md">
        {suggestions.map((name, index) => <Button key={name} id={`uc-location-option-${index}`} role="option" aria-selected={active === index}
          type="button" variant="ghost" tabIndex={-1} onMouseDown={(event) => event.preventDefault()} onClick={() => choose(name)}
          className={`min-h-12 w-full justify-start whitespace-normal text-left ${active === index ? "bg-accent text-accent-foreground" : "text-popover-foreground"}`}>{name}</Button>)}
      </div>}
    </div>
  );
}