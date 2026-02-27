import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, Loader2, Euro, Calendar } from "lucide-react";
import { format } from "date-fns";

interface PricingRule {
  id: string;
  property_id: string;
  label: string;
  price_per_night: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
}

interface Props {
  propertyId: string;
  basePricePerNight: number | null;
  weekendPricePerNight: number | null;
  onBasePriceChange: (val: string) => void;
  onWeekendPriceChange: (val: string) => void;
}

export default function PropertyPricingManager({
  propertyId,
  basePricePerNight,
  weekendPricePerNight,
  onBasePriceChange,
  onWeekendPriceChange,
}: Props) {
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newRule, setNewRule] = useState({
    label: "",
    price_per_night: "",
    start_date: "",
    end_date: "",
  });

  const fetchRules = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("property_pricing")
      .select("*")
      .eq("property_id", propertyId)
      .order("start_date", { ascending: true });

    if (!error && data) setRules(data);
    setIsLoading(false);
  };

  useEffect(() => {
    if (propertyId) fetchRules();
  }, [propertyId]);

  const handleAddRule = async () => {
    if (!newRule.label || !newRule.price_per_night || !newRule.start_date || !newRule.end_date) {
      toast({ title: "Completează toate câmpurile", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    const { error } = await supabase.from("property_pricing").insert({
      property_id: propertyId,
      label: newRule.label,
      price_per_night: parseFloat(newRule.price_per_night),
      start_date: newRule.start_date,
      end_date: newRule.end_date,
    });

    if (error) {
      toast({ title: "Eroare la salvare", variant: "destructive" });
    } else {
      toast({ title: "Regulă de preț adăugată!" });
      setNewRule({ label: "", price_per_night: "", start_date: "", end_date: "" });
      fetchRules();
    }
    setIsSaving(false);
  };

  const handleDeleteRule = async (id: string) => {
    const { error } = await supabase.from("property_pricing").delete().eq("id", id);
    if (!error) {
      setRules(rules.filter((r) => r.id !== id));
      toast({ title: "Regulă ștearsă" });
    }
  };

  const toggleRuleActive = async (rule: PricingRule) => {
    const { error } = await supabase
      .from("property_pricing")
      .update({ is_active: !rule.is_active })
      .eq("id", rule.id);

    if (!error) {
      setRules(rules.map((r) => (r.id === rule.id ? { ...r, is_active: !r.is_active } : r)));
    }
  };

  return (
    <div className="space-y-4 p-4 bg-primary/5 rounded-xl border border-primary/20">
      <div className="flex items-center gap-2 mb-2">
        <Euro className="w-5 h-5 text-primary" />
        <h4 className="font-semibold text-foreground">Prețuri</h4>
      </div>

      {/* Base prices */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Preț / noapte (€) - Standard</Label>
          <Input
            type="number"
            value={basePricePerNight ?? ""}
            onChange={(e) => onBasePriceChange(e.target.value)}
            placeholder="45"
          />
        </div>
        <div className="space-y-2">
          <Label>Preț / noapte (€) - Weekend</Label>
          <Input
            type="number"
            value={weekendPricePerNight ?? ""}
            onChange={(e) => onWeekendPriceChange(e.target.value)}
            placeholder="55"
          />
        </div>
      </div>

      {/* Seasonal pricing rules */}
      <div className="space-y-3 mt-4">
        <h5 className="text-sm font-medium text-foreground flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          Prețuri sezoniere / speciale
        </h5>

        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : rules.length > 0 ? (
          <div className="space-y-2">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  rule.is_active ? "border-border bg-card" : "border-border/50 bg-muted/30 opacity-60"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground">{rule.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(rule.start_date), "dd MMM")} – {format(new Date(rule.end_date), "dd MMM yyyy")} • {rule.price_per_night} €/noapte
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={rule.is_active} onCheckedChange={() => toggleRuleActive(rule)} />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() => handleDeleteRule(rule.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Nicio regulă sezonieră definită.</p>
        )}

        {/* Add new rule */}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
          <div className="space-y-1">
            <Label className="text-xs">Denumire</Label>
            <Input
              value={newRule.label}
              onChange={(e) => setNewRule({ ...newRule, label: e.target.value })}
              placeholder="Sezon vară"
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Preț / noapte (€)</Label>
            <Input
              type="number"
              value={newRule.price_per_night}
              onChange={(e) => setNewRule({ ...newRule, price_per_night: e.target.value })}
              placeholder="65"
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">De la</Label>
            <Input
              type="date"
              value={newRule.start_date}
              onChange={(e) => setNewRule({ ...newRule, start_date: e.target.value })}
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Până la</Label>
            <Input
              type="date"
              value={newRule.end_date}
              onChange={(e) => setNewRule({ ...newRule, end_date: e.target.value })}
              className="h-9 text-sm"
            />
          </div>
        </div>
        <Button onClick={handleAddRule} disabled={isSaving} size="sm" variant="outline" className="w-full">
          {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
          Adaugă regulă sezonieră
        </Button>
      </div>
    </div>
  );
}
