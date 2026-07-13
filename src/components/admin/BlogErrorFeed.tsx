import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, RefreshCw, Trash2, Copy, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ro } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";

type ErrorRow = {
  id: string;
  correlation_id: string;
  scope: string;
  level: string;
  route: string | null;
  message: string;
  user_agent: string | null;
  meta: Record<string, unknown> | null;
  created_at: string;
};

const SCOPES = ["all", "blog_article_fetch", "blog_list_fetch", "form:lead", "listings", "other"];

export default function BlogErrorFeed() {
  const [rows, setRows] = useState<ErrorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState<string>("blog_article_fetch");
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from("frontend_error_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (scope !== "all") q = q.eq("scope", scope);
    const { data, error } = await q;
    if (error) {
      toast({ title: "Nu am putut încărca erorile", description: error.message, variant: "destructive" });
    } else {
      setRows((data ?? []) as ErrorRow[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope]);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.trim().toLowerCase();
    return rows.filter(
      (r) =>
        r.correlation_id.toLowerCase().includes(q) ||
        (r.route ?? "").toLowerCase().includes(q) ||
        r.message.toLowerCase().includes(q) ||
        JSON.stringify(r.meta ?? {}).toLowerCase().includes(q),
    );
  }, [rows, search]);

  const slugOf = (r: ErrorRow): string | null => {
    const s = (r.meta as { slug?: string } | null)?.slug;
    return typeof s === "string" ? s : null;
  };

  const totals = useMemo(() => {
    const total = rows.length;
    const accessDenied = rows.filter(
      (r) => (r.meta as { isAccessDenied?: boolean } | null)?.isAccessDenied,
    ).length;
    const uniqueSlugs = new Set(rows.map(slugOf).filter(Boolean)).size;
    return { total, accessDenied, uniqueSlugs };
  }, [rows]);

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Copiat", description: text });
    } catch {
      /* ignore */
    }
  };

  const remove = async (id: string) => {
    setBusyId(id);
    const { error } = await supabase.from("frontend_error_logs").delete().eq("id", id);
    setBusyId(null);
    if (error) {
      toast({ title: "Nu am putut șterge", description: error.message, variant: "destructive" });
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-warning" />
            Feed erori frontend
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Erori raportate prin <code className="text-xs">reportError()</code> — inclusiv
            barierele de acces 401/403 pe pagini publice de blog.
          </p>
        </div>
        <Button onClick={() => void load()} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Reîmprospătează
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total (200 max)</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">{totals.total}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Access denied</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold text-destructive">
            {totals.accessDenied}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Slug-uri unice</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">{totals.uniqueSlugs}</CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select value={scope} onValueChange={setScope}>
          <SelectTrigger className="w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SCOPES.map((s) => (
              <SelectItem key={s} value={s}>
                {s === "all" ? "Toate scopurile" : s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          placeholder="Caută slug, correlation ID, mesaj..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Se încarcă...</p>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Niciun eveniment înregistrat pentru filtrul curent.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => {
            const slug = slugOf(r);
            const isAccessDenied = (r.meta as { isAccessDenied?: boolean } | null)?.isAccessDenied;
            const code = (r.meta as { code?: string } | null)?.code;
            return (
              <Card key={r.id} className="hover:border-primary/40 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <Badge variant={isAccessDenied ? "destructive" : "secondary"}>
                          {r.scope}
                        </Badge>
                        {isAccessDenied && <Badge variant="destructive">access_denied</Badge>}
                        {code && <Badge variant="outline">code: {code}</Badge>}
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(r.created_at), {
                            addSuffix: true,
                            locale: ro,
                          })}
                        </span>
                      </div>
                      <p className="text-sm font-medium break-words">{r.message}</p>
                      <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                        <button
                          onClick={() => copy(r.correlation_id)}
                          className="font-mono hover:text-foreground inline-flex items-center gap-1"
                          title="Copiază correlation ID"
                        >
                          <Copy className="w-3 h-3" />
                          {r.correlation_id}
                        </button>
                        {slug && (
                          <a
                            href={`/blog/${slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 hover:text-foreground"
                          >
                            <ExternalLink className="w-3 h-3" />
                            /blog/{slug}
                          </a>
                        )}
                        {r.route && !slug && (
                          <span className="truncate max-w-md">route: {r.route}</span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => void remove(r.id)}
                      disabled={busyId === r.id}
                      title="Șterge"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
