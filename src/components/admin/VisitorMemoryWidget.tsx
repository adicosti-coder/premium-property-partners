import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, Eye, Search, Target } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

/* High-intent anonymous visitors with inferred preferences */
export function VisitorMemoryWidget() {
  const { data: visitors } = useQuery({
    queryKey: ["visitor-memory-top"],
    queryFn: async () => {
      const { data } = await supabase
        .from("visitor_memory")
        .select("*")
        .gte("lead_score", 30)
        .order("lead_score", { ascending: false })
        .order("last_seen_at", { ascending: false })
        .limit(10);
      return data || [];
    },
    refetchInterval: 60000,
  });

  if (!visitors || visitors.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            AI Memory — vizitatori activi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Nu sunt încă vizitatori cu scor &gt; 30. Sistemul învață în timp ce utilizatorii navighează.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary" />
          AI Memory — top vizitatori
          <Badge variant="secondary" className="ml-auto">{visitors.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[320px]">
          <div className="space-y-2">
            {visitors.map((v: any) => {
              const views = Array.isArray(v.viewed_properties) ? v.viewed_properties.length : 0;
              const searches = Array.isArray(v.search_history) ? v.search_history.length : 0;
              return (
                <div key={v.id} className="rounded-md p-2 bg-muted/30 border border-border/50 text-xs space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <code className="text-[10px] text-muted-foreground truncate flex-1">{v.session_id.slice(0, 12)}…</code>
                    <Badge variant="outline" className="bg-primary/10 text-primary text-[10px]">
                      <Target className="h-3 w-3 mr-1" /> {v.lead_score}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {v.last_intent && <Badge variant="secondary" className="text-[10px]">{v.last_intent}</Badge>}
                    {v.preferred_listing_type && <Badge variant="outline" className="text-[10px]">{v.preferred_listing_type}</Badge>}
                    {v.preferred_rooms && <Badge variant="outline" className="text-[10px]">{v.preferred_rooms} cam</Badge>}
                    {v.budget_max && <Badge variant="outline" className="text-[10px]">≤ {v.budget_max.toLocaleString()} €</Badge>}
                  </div>
                  {v.chatbot_summary && (
                    <p className="text-[11px] text-muted-foreground italic line-clamp-2">"{v.chatbot_summary}"</p>
                  )}
                  <div className="flex gap-3 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{views}</span>
                    <span className="flex items-center gap-1"><Search className="h-3 w-3" />{searches}</span>
                    {v.user_id && <Badge variant="default" className="text-[9px]">auth</Badge>}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
