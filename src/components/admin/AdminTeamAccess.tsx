import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Loader2, UserPlus, RefreshCw, ShieldCheck, Trash2, KeyRound, Copy } from "lucide-react";

interface Member {
  user_id: string;
  email: string | null;
  name: string | null;
  created_at: string | null;
  last_sign_in_at: string | null;
  roles: string[];
}

const roDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("ro-RO", { timeZone: "Europe/Bucharest" }) : "—";

/** Parolă puternică, ușor de transmis colegului o singură dată. */
function generatePassword(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

const AdminTeamAccess = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const call = useCallback(async (body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke("admin-create-team-user", { body });
    if (error) throw new Error(error.message);
    if (data?.error) throw new Error(String(data.error));
    return data;
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await call({ action: "list" });
      setMembers((data?.members ?? []) as Member[]);
    } catch (e) {
      toast({ title: "Nu am putut încărca echipa", description: (e as Error).message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [call]);

  useEffect(() => { void load(); }, [load]);

  const create = async () => {
    if (!email.includes("@") || password.length < 10) {
      toast({
        title: "Date incomplete",
        description: "E-mail valid și parolă de minim 10 caractere.",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    try {
      const res = await call({ action: "create", email, password, name });
      toast({
        title: res?.created ? "Cont creat" : "Acces acordat contului existent",
        description: `${email} poate intra acum în Admin.`,
      });
      setName("");
      setEmail("");
      await load();
    } catch (e) {
      toast({ title: "Contul nu a fost creat", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const revoke = async (m: Member) => {
    if (!confirm(`Retragi accesul la Admin pentru ${m.email}?`)) return;
    try {
      await call({ action: "revoke", user_id: m.user_id });
      toast({ title: "Acces retras", description: m.email ?? "" });
      await load();
    } catch (e) {
      toast({ title: "Nu am putut retrage accesul", description: (e as Error).message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" aria-hidden="true" />
            Cont nou pentru un coleg RealTrust
          </CardTitle>
          <CardDescription>
            Contul primește rol de administrator: intră în Admin cu e-mail și parolă, plus codul de
            verificare trimis pe e-mail. Clienții nu pot intra — accesul se acordă doar de aici.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="team-name">Nume coleg</Label>
              <Input
                id="team-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Maria Popescu"
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="team-email">E-mail</Label>
              <Input
                id="team-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nume@realtrust.ro"
                autoComplete="off"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="team-password">Parolă</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="team-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="minim 10 caractere"
                autoComplete="new-password"
                className="font-mono"
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPassword(generatePassword())}
                  aria-label="Generează parolă"
                  className="min-h-12"
                >
                  <KeyRound className="w-4 h-4 mr-2" aria-hidden="true" />
                  Generează
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!password}
                  onClick={() => {
                    void navigator.clipboard.writeText(password);
                    toast({ title: "Parola a fost copiată" });
                  }}
                  aria-label="Copiază parola"
                  className="min-h-12"
                >
                  <Copy className="w-4 h-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Trimite parola colegului pe un canal privat. Și-o poate schimba oricând din pagina de cont.
            </p>
          </div>
          <Button onClick={create} disabled={saving} className="w-full sm:w-auto min-h-12">
            {saving
              ? <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
              : <UserPlus className="w-4 h-4 mr-2" aria-hidden="true" />}
            Creează contul și acordă acces
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>Colegi cu acces la Admin</CardTitle>
            <CardDescription>{members.length} persoane pot vedea discuțiile și rapoartele.</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => void load()} aria-label="Reîncarcă lista">
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Se încarcă…
            </div>
          ) : members.length === 0 ? (
            <p className="text-sm text-muted-foreground">Niciun cont încă.</p>
          ) : (
            <div className="space-y-3">
              {members.map((m) => (
                <div
                  key={m.user_id}
                  className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">{m.name || m.email}</p>
                    <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                    <p className="text-xs text-muted-foreground">
                      Creat: {roDate(m.created_at)} · Ultima intrare: {roDate(m.last_sign_in_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {m.roles.map((r) => (
                      <Badge key={r} variant={r === "super_admin" ? "default" : "secondary"}>
                        {r === "super_admin" ? "super admin" : "admin"}
                      </Badge>
                    ))}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void revoke(m)}
                      aria-label={`Retrage accesul pentru ${m.email ?? ""}`}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminTeamAccess;
