import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Bot, Building2, Phone as PhoneIcon, Globe, Hash, AlertTriangle, ShieldCheck, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

export interface AgencyExplainerInput {
  prospectId: string;
  contactName: string | null;
  phone: string | null;
  phoneNormalized: string | null;
  sourceUrl: string | null;
  isAgency: boolean;
  prospectType: string | null;
  phoneCount: number;
  suspicion: { level: 0 | 1 | 2 | 3; reasons: string[] };
  // The exact soft + hard keyword hits that triggered detection (computed by parent).
  hardKeywordHits: string[];
  softKeywordHits: string[];
  domain: string | null;
  domainBlocked: boolean; // matched by AGENCY_DOMAINS static list
  urlPatternBlocked: boolean;
  ownerSignalHits: string[];
}

interface BlocklistRow {
  id: string;
  phone_normalized: string | null;
  domain: string | null;
  reason: string;
  notes: string | null;
  created_at: string;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  data: AgencyExplainerInput | null;
  /**
   * Called when admin clicks "Marchează ca Proprietar". The parent should:
   *  - update prospect_listings.prospect_type = 'proprietar'
   *  - INSERT into agency_whitelist (phone + domain)
   *  - DELETE from agency_blocklist (phone + domain)
   *  - INSERT into admin_audit_log with action 'agency_manual_override'
   *  - close the dialog
   * Receives the explainer payload back so the parent has full context.
   */
  onForceOwner?: (data: AgencyExplainerInput) => Promise<void> | void;
}

const reasonLabels: Record<string, string> = {
  manual_admin: "Marcat manual de admin",
  manual: "Marcat manual",
  multi_listing: "Telefon recurent (>3 anunțuri în 14 zile)",
  static_list: "Domeniu cunoscut din listă statică",
};

export const AgencyExplainerDialog = ({ open, onOpenChange, data, onForceOwner }: Props) => {
  const [blockRows, setBlockRows] = useState<BlocklistRow[]>([]);
  const [loadingBlock, setLoadingBlock] = useState(false);

  useEffect(() => {
    if (!open || !data) return;
    const phone = data.phoneNormalized;
    const domain = data.domain;
    if (!phone && !domain) {
      setBlockRows([]);
      return;
    }
    setLoadingBlock(true);
    const filters: string[] = [];
    if (phone) filters.push(`phone_normalized.eq.${phone}`);
    if (domain) filters.push(`domain.eq.${domain}`);
    supabase
      .from("agency_blocklist" as any)
      .select("id,phone_normalized,domain,reason,notes,created_at")
      .or(filters.join(","))
      .then(({ data: rows, error }) => {
        if (error) {
          console.warn("[AgencyExplainer] blocklist query failed:", error.message);
          setBlockRows([]);
        } else {
          setBlockRows((rows as any) || []);
        }
        setLoadingBlock(false);
      });
  }, [open, data]);

  if (!data) return null;

  const verdict = data.isAgency
    ? { label: "🏢 Marcat AGENȚIE", tone: "amber" }
    : data.suspicion.level >= 3
    ? { label: "🤖 Probabil agenție (high)", tone: "red" }
    : data.suspicion.level === 2
    ? { label: "🤖 Suspect agenție (medium)", tone: "orange" }
    : data.suspicion.level === 1
    ? { label: "ℹ️ Suspiciune redusă", tone: "muted" }
    : { label: "✅ Curat (probabil proprietar)", tone: "green" };

  const toneClass: Record<string, string> = {
    amber: "border-amber-400 text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30",
    red: "border-red-400 text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/30",
    orange: "border-orange-400 text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-950/30",
    muted: "border-muted-foreground/40 text-muted-foreground",
    green: "border-green-400 text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-950/30",
  };

  const hasAnySignal =
    data.hardKeywordHits.length > 0 ||
    data.softKeywordHits.length > 0 ||
    data.domainBlocked ||
    data.urlPatternBlocked ||
    data.phoneCount > 1 ||
    blockRows.length > 0 ||
    data.prospectType === "agentie" ||
    data.prospectType === "dezvoltator";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            De ce a fost marcat?
          </DialogTitle>
          <DialogDescription>
            Detaliile complete ale semnalelor folosite de AI pentru clasificarea acestui prospect.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Verdict */}
          <div className={`rounded-lg border-2 p-3 ${toneClass[verdict.tone]}`}>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="font-semibold">{verdict.label}</div>
              <Badge variant="outline" className="text-xs">
                Nivel suspiciune: {data.suspicion.level} / 3
              </Badge>
            </div>
            <div className="text-xs mt-1 opacity-80">
              Contact: {data.contactName || "—"} · {data.phone || "fără telefon"}
            </div>
          </div>

          {/* Manual classification override */}
          {(data.prospectType === "agentie" || data.prospectType === "dezvoltator" || data.prospectType === "proprietar") && (
            <Section icon={<ShieldCheck className="h-4 w-4" />} title="1. Clasificare manuală (suprascrie tot)">
              <div className="text-sm">
                Acest prospect a fost marcat manual ca{" "}
                <Badge variant="outline" className="ml-1">{data.prospectType}</Badge>
                . Această alegere are prioritate absolută față de orice altă regulă.
              </div>
            </Section>
          )}

          {/* Owner signals (whitelist) */}
          {data.ownerSignalHits.length > 0 && (
            <Section icon={<ShieldCheck className="h-4 w-4 text-green-600" />} title={'Semnale „proprietar" (protejează lead-ul)'}>
              <KeywordList items={data.ownerSignalHits} tone="green" />
              <p className="text-xs text-muted-foreground mt-1">
                Aceste semnale sunt prezente în URL/titlu/descriere și împiedică marcarea automată ca agenție.
              </p>
            </Section>
          )}

          {/* Blocklist matches (cross-source) */}
          <Section
            icon={<AlertTriangle className="h-4 w-4 text-red-500" />}
            title="2. Potriviri în lista neagră (blocare permanentă)"
          >
            {loadingBlock ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Verific lista neagră…
              </div>
            ) : blockRows.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                Niciun telefon sau domeniu al acestui prospect nu se află în lista neagră.
              </div>
            ) : (
              <ul className="space-y-2">
                {blockRows.map((b) => (
                  <li key={b.id} className="text-xs border rounded p-2 bg-red-50/40 dark:bg-red-950/20">
                    <div className="flex items-center gap-2 flex-wrap">
                      {b.phone_normalized && (
                        <Badge variant="outline" className="font-mono">
                          <PhoneIcon className="h-3 w-3 mr-1" />
                          {b.phone_normalized}
                        </Badge>
                      )}
                      {b.domain && (
                        <Badge variant="outline">
                          <Globe className="h-3 w-3 mr-1" />
                          {b.domain}
                        </Badge>
                      )}
                      <Badge variant="outline" className="border-red-400 text-red-700 dark:text-red-300">
                        {reasonLabels[b.reason] || b.reason}
                      </Badge>
                    </div>
                    {b.notes && <div className="mt-1 text-muted-foreground">{b.notes}</div>}
                    <div className="mt-1 text-[10px] text-muted-foreground">
                      Adăugat: {new Date(b.created_at).toLocaleString("ro-RO")}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {/* Multi-listing */}
          <Section icon={<Hash className="h-4 w-4 text-orange-500" />} title="3. Recurență telefon (multi-listing)">
            {data.phoneCount <= 1 ? (
              <div className="text-sm text-muted-foreground">
                Telefonul apare pe un singur anunț în lista curentă (sau nu are telefon).
              </div>
            ) : (
              <div className="text-sm">
                Acest telefon apare pe{" "}
                <Badge
                  variant="outline"
                  className={
                    data.phoneCount >= 4
                      ? "border-red-400 text-red-700 dark:text-red-300"
                      : "border-amber-400 text-amber-700 dark:text-amber-300"
                  }
                >
                  ×{data.phoneCount} anunțuri
                </Badge>{" "}
                în setul curent.{" "}
                {data.phoneCount >= 4 && (
                  <span className="text-red-600 dark:text-red-400 font-medium">
                    ≥4 anunțuri → suspiciune maximă (probabil agent).
                  </span>
                )}
              </div>
            )}
          </Section>

          {/* Domain & URL */}
          <Section icon={<Globe className="h-4 w-4 text-purple-500" />} title="4. URL și domeniu sursă">
            <div className="text-sm space-y-1">
              <div>
                Domeniu:{" "}
                <Badge variant="outline" className="font-mono">
                  {data.domain || "—"}
                </Badge>{" "}
                {data.domainBlocked && (
                  <Badge variant="outline" className="border-red-400 text-red-700 dark:text-red-300 ml-1">
                    🚫 în lista statică de agenții
                  </Badge>
                )}
              </div>
              {data.urlPatternBlocked && (
                <div className="text-xs text-red-600 dark:text-red-400">
                  ⚠️ URL-ul conține un pattern de pagină de agenție (ex: /agentie/, /developer/).
                </div>
              )}
              {!data.domainBlocked && !data.urlPatternBlocked && (
                <div className="text-xs text-muted-foreground">URL-ul nu conține pattern-uri suspecte.</div>
              )}
            </div>
          </Section>

          {/* Keyword hits */}
          <Section icon={<Building2 className="h-4 w-4 text-amber-500" />} title="5. Cuvinte cheie găsite în titlu/descriere/contact">
            {data.hardKeywordHits.length === 0 && data.softKeywordHits.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                Niciun cuvânt cheie de agenție detectat.
              </div>
            ) : (
              <div className="space-y-2">
                {data.hardKeywordHits.length > 0 && (
                  <div>
                    <div className="text-xs font-medium mb-1 text-red-700 dark:text-red-300">
                      Hard hits ({data.hardKeywordHits.length}) — blochează automat:
                    </div>
                    <KeywordList items={data.hardKeywordHits} tone="red" />
                  </div>
                )}
                {data.softKeywordHits.length > 0 && (
                  <div>
                    <div className="text-xs font-medium mb-1 text-orange-700 dark:text-orange-300">
                      Soft hits ({data.softKeywordHits.length}) — cresc suspiciunea:
                    </div>
                    <KeywordList items={data.softKeywordHits} tone="orange" />
                  </div>
                )}
              </div>
            )}
          </Section>

          {/* Empty state */}
          {!hasAnySignal && (
            <div className="text-sm text-center text-muted-foreground py-4 border rounded-lg">
              ✅ Niciun semnal suspect — acest prospect arată curat.
            </div>
          )}

          {/* Summary reasons (from suspicion engine) */}
          {data.suspicion.reasons.length > 0 && (
            <Section icon={<Bot className="h-4 w-4 text-primary" />} title="Sinteză AI (semnale agregate)">
              <ul className="text-sm list-disc list-inside space-y-0.5">
                {data.suspicion.reasons.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </Section>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

const Section = ({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) => (
  <div className="border rounded-lg p-3">
    <div className="flex items-center gap-2 font-medium text-sm mb-2">
      {icon}
      {title}
    </div>
    {children}
  </div>
);

const KeywordList = ({ items, tone }: { items: string[]; tone: "red" | "orange" | "green" }) => {
  const cls: Record<string, string> = {
    red: "border-red-400 text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/30",
    orange: "border-orange-400 text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-950/30",
    green: "border-green-400 text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-950/30",
  };
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((kw, i) => (
        <Badge key={i} variant="outline" className={`text-[10px] font-mono ${cls[tone]}`}>
          {kw.trim()}
        </Badge>
      ))}
    </div>
  );
};
