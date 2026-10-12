import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ExternalLink } from "lucide-react";

type Row = {
  id: string; created_at: string; platform: string; status: string;
  title: string | null; property_slug: string | null; external_id: string | null;
};

function postUrl(platform: string, externalId: string | null): string | null {
  if (!externalId) return null;
  if (platform === "instagram") return `https://www.instagram.com/p/${externalId}/`;
  // Facebook feed ids look like "<pageId>_<postId>"
  const postId = externalId.includes("_") ? externalId.split("_")[1] : externalId;
  return `https://www.facebook.com/${postId}`;
}

export default function SocialPublishedPosts() {
  const { data, isLoading } = useQuery({
    queryKey: ["social-published-posts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("social_autopost_logs" as never).select("*")
        .eq("status", "posted")
        .order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return (data as unknown as Row[]) ?? [];
    },
    staleTime: 30_000,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Postări publicate Facebook / Instagram</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? <Loader2 className="h-5 w-5 animate-spin" aria-label="Se încarcă" /> :
          !data?.length ? <p className="text-sm text-muted-foreground">Nicio postare publicată încă.</p> : (
            <ul className="divide-y divide-border">
              {data.map((r) => {
                const url = postUrl(r.platform, r.external_id);
                const d = new Date(r.created_at);
                return (
                  <li key={r.id} className="py-3 flex flex-wrap items-center gap-2 text-sm">
                    <span className="text-muted-foreground">
                      {d.toLocaleDateString("ro-RO")} · {d.toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <Badge variant="secondary">{r.platform === "instagram" ? "Instagram" : "Facebook"}</Badge>
                    <span className="font-medium">{r.title ?? r.property_slug}</span>
                    {url && (
                      <Button asChild variant="outline" size="sm" className="ml-auto min-h-[48px]">
                        <a href={url} target="_blank" rel="noopener noreferrer" aria-label={`Deschide postarea pe ${r.platform === "instagram" ? "Instagram" : "Facebook"}`}>
                          <ExternalLink className="h-4 w-4 mr-1" /> Vezi postarea
                        </a>
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
      </CardContent>
    </Card>
  );
}
