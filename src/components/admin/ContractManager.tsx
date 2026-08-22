import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { AdminPageShell } from "./shared/AdminPageShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Copy, FilePlus2, Loader2, RefreshCw, AlertTriangle, FileSignature } from "lucide-react";

interface LineItem {
  price_id: string;
  label: string;
  amount_cents: number;
}

interface ContractRow {
  id: string;
  token: string;
  lead_id: string | null;
  owner_name: string;
  owner_email: string | null;
  owner_tax_id: string | null;
  owner_address: string | null;
  property_address: string | null;
  management_fee_percent: number;
  onboarding_fee_cents: number;
  photo_session_included: boolean;
  photo_session_fee_cents: number;
  currency: string;
  line_items: LineItem[] | null;
  status: string;
  signed_at: string | null;
  signature_name: string | null;
  paid_at: string | null;
  created_at: string;
}

interface EmailFailureRow {
  id: string;
  created_at: string;
  recipient: string;
  subject: string;
  error_message: string | null;
  source: string | null;
  acknowledged_at: string | null;
}

const CONTRACT_COLUMNS =
  "id, token, lead_id, owner_name, owner_email, owner_tax_id, owner_address, property_address, management_fee_percent, onboarding_fee_cents, photo_session_included, photo_session_fee_cents, currency, line_items, status, signed_at, signature_name, paid_at, created_at";

const totalCents = (row: ContractRow) =>
  (row.line_items ?? []).reduce((sum, item) => sum + (item.amount_cents ?? 0), 0) || row.onboarding_fee_cents;

const money = (cents: number, currency: string) =>
  `${(cents / 100).toLocaleString("ro-RO", { minimumFractionDigits: 2 })} ${currency.toUpperCase()}`;

const dt = (v: string | null) => (v ? new Date(v).toLocaleString("ro-RO") : "—");

function StatusBadge({ row }: { row: ContractRow }) {
  if (row.paid_at) return <Badge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700">Semnat & plătit</Badge>;
  if (row.status === "signed") return <Badge variant="secondary">Semnat</Badge>;
  return <Badge variant="outline">Draft</Badge>;
}

export default function ContractManager() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    lead_id: "",
    owner_name: "",
    owner_email: "",
    owner_tax_id: "",
    owner_address: "",
    property_address: "",
    management_fee_percent: "20",
    onboarding_fee_lei: "500",
    photo_session_fee_lei: "500",
    photo_session_included: true,
  });

  const contracts = useQuery({
    queryKey: ["admin", "owner_contracts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("owner_contracts")
        .select(CONTRACT_COLUMNS)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as unknown as ContractRow[];
    },
  });

  const emailFailures = useQuery({
    queryKey: ["admin", "admin_email_failures"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_email_failures")
        .select("id, created_at, recipient, subject, error_message, source, acknowledged_at")
        .is("acknowledged_at", null)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as unknown as EmailFailureRow[];
    },
  });

  const createContract = useMutation({
    mutationFn: async () => {
      const payload = {
        lead_id: form.lead_id.trim() || null,
        owner_name: form.owner_name.trim(),
        owner_email: form.owner_email.trim() || null,
        owner_tax_id: form.owner_tax_id.trim() || null,
        owner_address: form.owner_address.trim() || null,
        property_address: form.property_address.trim() || null,
        management_fee_percent: Number(form.management_fee_percent) || 20,
        onboarding_fee_cents: Math.round((Number(form.onboarding_fee_lei) || 0) * 100),
        photo_session_fee_cents: Math.round((Number(form.photo_session_fee_lei) || 0) * 100),
        photo_session_included: form.photo_session_included,
      };
      if (payload.owner_name.length < 3) throw new Error("Numele proprietarului este obligatoriu.");
      const { data, error } = await supabase.functions.invoke("contract-create", { body: payload });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast({ title: "Contract generat", description: "Trimite proprietarului linkul de semnare." });
      setOpen(false);
      setForm((f) => ({
        ...f,
        lead_id: "",
        owner_name: "",
        owner_email: "",
        owner_tax_id: "",
        owner_address: "",
        property_address: "",
      }));
      void qc.invalidateQueries({ queryKey: ["admin", "owner_contracts"] });
    },
    onError: (e: Error) => toast({ title: "Nu am putut genera contractul", description: e.message, variant: "destructive" }),
  });

  const resolveFailure = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("admin_email_failures")
        .update({ acknowledged_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["admin", "admin_email_failures"] }),
    onError: (e: Error) => toast({ title: "Eroare", description: e.message, variant: "destructive" }),
  });

  const stats = useMemo(() => {
    const rows = contracts.data ?? [];
    return {
      total: rows.length,
      signed: rows.filter((r) => r.status === "signed" || r.paid_at).length,
      paid: rows.filter((r) => r.paid_at).length,
      revenue: rows.filter((r) => r.paid_at).reduce((s, r) => s + totalCents(r), 0),
    };
  }, [contracts.data]);

  const copyLink = async (token: string) => {
    const url = `${window.location.origin}/contract/${token}`;
    await navigator.clipboard.writeText(url);
    toast({ title: "Link copiat", description: url });
  };

  return (
    <AdminPageShell
      icon={FileSignature}
      title="Contracte & Plăți"
      description="Generează contracte de administrare pre-completate, urmărește semnăturile digitale și plata taxei de onboarding."
      actions={
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void contracts.refetch()}
            aria-label="Reîmprospătează lista de contracte"
          >
            <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" /> Reîmprospătează
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" aria-label="Generează contract nou">
                <FilePlus2 className="mr-2 h-4 w-4" aria-hidden="true" /> Contract nou
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Contract nou de administrare</DialogTitle>
                <DialogDescription>Datele apar pre-completate pe pagina publică de semnare.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField id="lead_id" label="Lead ID (opțional)" value={form.lead_id} onChange={(v) => setForm({ ...form, lead_id: v })} />
                <FormField id="owner_name" label="Nume proprietar" value={form.owner_name} onChange={(v) => setForm({ ...form, owner_name: v })} />
                <FormField id="owner_email" label="Email" value={form.owner_email} onChange={(v) => setForm({ ...form, owner_email: v })} />
                <FormField id="owner_tax_id" label="CNP / CUI" value={form.owner_tax_id} onChange={(v) => setForm({ ...form, owner_tax_id: v })} />
                <FormField id="owner_address" label="Adresă proprietar" value={form.owner_address} onChange={(v) => setForm({ ...form, owner_address: v })} />
                <FormField id="property_address" label="Adresă proprietate" value={form.property_address} onChange={(v) => setForm({ ...form, property_address: v })} />
                <FormField id="fee" label="Comision (%)" value={form.management_fee_percent} onChange={(v) => setForm({ ...form, management_fee_percent: v })} />
                <FormField id="onboarding" label="Taxă onboarding (RON)" value={form.onboarding_fee_lei} onChange={(v) => setForm({ ...form, onboarding_fee_lei: v })} />
                <div className="col-span-2 flex items-start gap-3 rounded-md border p-3">
                  <Checkbox
                    id="photo-session"
                    checked={form.photo_session_included}
                    onCheckedChange={(v) => setForm({ ...form, photo_session_included: v === true })}
                    aria-label="Include ședința foto în contract"
                  />
                  <div className="flex-1">
                    <Label htmlFor="photo-session" className="text-sm font-medium">
                      Include ședința foto profesională în suma de plată
                    </Label>
                    <p className="text-xs text-muted-foreground">Dacă este bifată, proprietarul plătește onboarding + ședința foto la semnare.</p>
                  </div>
                </div>
                {form.photo_session_included && (
                  <FormField id="photo-fee" label="Ședință foto (RON)" value={form.photo_session_fee_lei} onChange={(v) => setForm({ ...form, photo_session_fee_lei: v })} />
                )}
              </div>
              <DialogFooter>
                <Button onClick={() => createContract.mutate()} disabled={createContract.isPending}>
                  {createContract.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                  Generează contract
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      }
    >
      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Contracte" value={String(stats.total)} />
        <StatCard label="Semnate" value={String(stats.signed)} />
        <StatCard label="Plătite" value={String(stats.paid)} />
        <StatCard label="Încasat onboarding" value={money(stats.revenue, "ron")} />
      </div>

      {(emailFailures.data?.length ?? 0) > 0 && (
        <Card className="mt-6 border-amber-500/30 bg-amber-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-amber-600" aria-hidden="true" />
              Emailuri nelivrate ({emailFailures.data?.length})
            </CardTitle>
            <CardDescription>
              Notificări salvate ca fallback când Resend a eșuat (ex. domeniu neverificat). Contactează manual și marchează rezolvat.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {emailFailures.data?.map((f) => (
              <div key={f.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-background p-3 text-sm">
                <div>
                  <p className="font-medium">{f.subject}</p>
                  <p className="text-muted-foreground">
                    {f.recipient} · {f.source ?? "—"} · {dt(f.created_at)}
                  </p>
                  {f.error_message && <p className="text-xs text-destructive">{f.error_message}</p>}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => resolveFailure.mutate(f.id)}
                  aria-label={`Marchează rezolvat emailul către ${f.recipient}`}
                >
                  Marchează rezolvat
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Contracte</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Proprietar</TableHead>
                <TableHead>Proprietate</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Semnat</TableHead>
                <TableHead>Plătit</TableHead>
                <TableHead className="text-right">Link</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contracts.isLoading && (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                    <Loader2 className="mr-2 inline h-4 w-4 animate-spin" aria-hidden="true" /> Se încarcă contractele…
                  </TableCell>
                </TableRow>
              )}
              {contracts.error && (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-destructive">
                    Nu am putut încărca contractele: {(contracts.error as Error).message}
                  </TableCell>
                </TableRow>
              )}
              {!contracts.isLoading && !contracts.error && (contracts.data?.length ?? 0) === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                    Niciun contract generat încă. Creează primul contract dintr-un lead.
                  </TableCell>
                </TableRow>
              )}
              {contracts.data?.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <p className="font-medium">{row.owner_name}</p>
                    <p className="text-xs text-muted-foreground">{row.owner_email ?? "—"}</p>
                  </TableCell>
                  <TableCell className="max-w-[220px] truncate">{row.property_address ?? "—"}</TableCell>
                  <TableCell>{money(totalCents(row), row.currency)}</TableCell>
                  <TableCell><StatusBadge row={row} /></TableCell>
                  <TableCell className="text-xs">{dt(row.signed_at)}</TableCell>
                  <TableCell className="text-xs">{dt(row.paid_at)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => void copyLink(row.token)}
                      aria-label={`Copiază linkul de semnare pentru ${row.owner_name}`}
                    >
                      <Copy className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AdminPageShell>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="py-5">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

function FormField({
  id, label, value, onChange,
}: { id: string; label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs">{label}</Label>
      <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
