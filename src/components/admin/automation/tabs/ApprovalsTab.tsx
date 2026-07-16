import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Inbox, Loader2, Play } from "lucide-react";
import type { Approval } from "../types";

type Props = {
  approvals: Approval[];
  onChanged: () => void;
};

export function ApprovalsTab({ approvals, onChanged }: Props) {
  const [busyId, setBusyId] = useState<string | null>(null);

  const applyApproval = async (a: Approval) => {
    setBusyId(a.id);
    try {
      const proposal = a.proposal as Record<string, unknown>;
      const { data: { user } } = await supabase.auth.getUser();

      if (a.action_type === "auto_blacklist_agency" && a.entity_id) {
        const { error } = await supabase
          .from("prospect_listings")
          .update({
            do_not_call: true,
            do_not_call_at: new Date().toISOString(),
            do_not_call_reason: `Auto-blacklist agency (score ${proposal.score ?? "?"}): ${proposal.reason ?? ""}`.slice(0, 500),
            auto_blacklisted_at: new Date().toISOString(),
            auto_blacklist_reason: String(proposal.reason ?? "agency-suspect"),
          })
          .eq("id", a.entity_id);
        if (error) throw error;
      } else if (a.action_type === "apply_meta_draft" && typeof proposal.url_path === "string") {
        const { error } = await supabase
          .from("seo_overrides")
          .update({
            pending_review: false,
            is_active: true,
            applied_by: user?.id ?? null,
            applied_at: new Date().toISOString(),
          })
          .eq("url_path", proposal.url_path);
        if (error) throw error;
      }

      const { error: aErr } = await supabase
        .from("automation_approvals")
        .update({
          status: "approved",
          resolved_at: new Date().toISOString(),
          resolved_by: user?.id ?? null,
        })
        .eq("id", a.id);
      if (aErr) throw aErr;

      toast({ title: "Aprobat", description: "Acțiunea a fost aplicată." });
      onChanged();
    } catch (e: any) {
      console.error("Approval error:", e);
      const desc =
        e?.message || e?.error_description || e?.details || e?.hint ||
        (typeof e === "object" ? JSON.stringify(e) : String(e));
      toast({ title: "Eroare aprobare", description: desc, variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const rejectApproval = async (a: Approval) => {
    setBusyId(a.id);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("automation_approvals")
      .update({
        status: "rejected",
        resolved_at: new Date().toISOString(),
        resolved_by: user?.id ?? null,
      })
      .eq("id", a.id);
    setBusyId(null);
    if (error) {
      toast({ title: "Eroare", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Respinsă", description: "Propunerea a fost respinsă." });
    onChanged();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Acțiuni propuse de AI care așteaptă aprobare</CardTitle>
        <CardDescription>
          Propuneri AI cu impact (auto-blacklist agenții, aplicare meta SEO, investigare scor în scădere).
          Aprobă pentru a aplica acțiunea, sau respinge pentru a o ignora. Toate acțiunile sunt logate în audit.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {approvals.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Inbox className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Nicio acțiune în așteptare.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {approvals.map((a) => {
              const busy = busyId === a.id;
              const sev =
                a.severity === "critical" ? "destructive" :
                a.severity === "warning" ? "secondary" : "outline";
              return (
                <div key={a.id} className="p-3 border rounded-lg">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge>{a.action_type}</Badge>
                    <Badge variant="outline">{a.entity_type}</Badge>
                    <Badge variant={sev as "destructive" | "secondary" | "outline"}>
                      {a.severity}
                    </Badge>
                    <span className="text-xs text-muted-foreground ml-auto">
                      expiră {new Date(a.expires_at).toLocaleDateString("ro-RO")}
                    </span>
                  </div>
                  <pre className="text-xs mt-2 bg-muted/50 p-2 rounded overflow-x-auto max-h-48">
                    {JSON.stringify(a.proposal, null, 2)}
                  </pre>
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" variant="default" disabled={busy} onClick={() => applyApproval(a)} aria-label="Aprobă propunerea">
                      {busy ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Play className="w-3 h-3 mr-1" />}
                      Aprobă
                    </Button>
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => rejectApproval(a)} aria-label="Respinge propunerea">
                      Respinge
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
