import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

type Row = {
  id: string; created_at: string; platform: string; status: string;
  title: string | null; property_slug: string | null; external_id: string | null; error_message: string | null;
};

export default function SocialAutopostLogs() {
  const { data, isLoading } = useQuery({
    queryKey: ["social-autopost-logs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("social_autopost_logs" as never).select("*")
        .order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return (data as unknown as Row[]) ?? [];
    },
    staleTime: 30_000,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Postări automate Facebook / Instagram</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? <Loader2 className="h-5 w-5 animate-spin" aria-label="Se încarcă" /> :
          !data?.length ? <p className="text-sm text-muted-foreground">Nicio postare automată încă.</p> : (
            <ul className="divide-y divide-border">
              {data.map((r) => (
                <li key={r.id} className="py-2 flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-muted-foreground">{new Date(r.created_at).toLocaleString("ro-RO")}</span>
                  <Badge variant="secondary">{r.platform === "instagram" ? "Instagram" : "Facebook"}</Badge>
                  <Badge variant={r.status === "posted" ? "default" : "destructive"}>
                    {r.status === "posted" ? "Postat" : "Eșuat → draft"}
                  </Badge>
                  <span className="font-medium">{r.title ?? r.property_slug}</span>
                  {r.error_message && <span className="w-full text-destructive break-words">{r.error_message}</span>}
                </li>
              ))}
            </ul>
          )}
      </CardContent>
    </Card>
  );
}
