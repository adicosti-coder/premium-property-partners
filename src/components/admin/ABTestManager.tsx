import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, FlaskConical, BarChart3, Eye, RefreshCw, Plus, Save, Trash2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ro, enUS } from "date-fns/locale";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { toast } from "@/hooks/use-toast";

interface ABTest {
  id: string;
  email_type: string;
  variant_a_subject: string;
  variant_b_subject: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ABAssignment {
  id: string;
  user_id: string;
  test_id: string;
  variant: string;
  subject_used: string;
  created_at: string;
}

interface EmailOpen {
  id: string;
  user_id: string;
  email_type: string;
  ab_assignment_id: string | null;
  opened_at: string;
}

const ABTestManager = () => {
  const { language } = useLanguage();
  const dateLocale = language === "ro" ? ro : enUS;

  const [tests, setTests] = useState<ABTest[]>([]);
  const [assignments, setAssignments] = useState<ABAssignment[]>([]);
  const [opens, setOpens] = useState<EmailOpen[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Edit states
  const [editingTest, setEditingTest] = useState<ABTest | null>(null);
  const [newTest, setNewTest] = useState<Partial<ABTest> | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [testsRes, assignmentsRes, opensRes] = await Promise.all([
        supabase.from("email_ab_tests").select("*").order("created_at", { ascending: false }),
        supabase.from("email_ab_assignments").select("*"),
        supabase.from("email_open_tracking").select("*"),
      ]);

      if (testsRes.data) setTests(testsRes.data);
      if (assignmentsRes.data) setAssignments(assignmentsRes.data);
      if (opensRes.data) setOpens(opensRes.data);
    } catch (error) {
      console.error("Error fetching A/B test data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Calculate stats for each test
  const testStats = useMemo(() => {
    const stats: Record<string, {
      variantA: { sent: number; opens: number; openRate: number };
      variantB: { sent: number; opens: number; openRate: number };
      winner: string | null;
      confidence: number;
    }> = {};

    for (const test of tests) {
      const testAssignments = assignments.filter(a => a.test_id === test.id);
      const variantAAssignments = testAssignments.filter(a => a.variant === "A");
      const variantBAssignments = testAssignments.filter(a => a.variant === "B");

      const variantAIds = new Set(variantAAssignments.map(a => a.id));
      const variantBIds = new Set(variantBAssignments.map(a => a.id));

      const variantAOpens = opens.filter(o => o.ab_assignment_id && variantAIds.has(o.ab_assignment_id));
      const variantBOpens = opens.filter(o => o.ab_assignment_id && variantBIds.has(o.ab_assignment_id));

      const variantAOpenRate = variantAAssignments.length > 0 
        ? (variantAOpens.length / variantAAssignments.length) * 100 
        : 0;
      const variantBOpenRate = variantBAssignments.length > 0 
        ? (variantBOpens.length / variantBAssignments.length) * 100 
        : 0;

      // Simple winner determination (would need proper statistical test for real A/B)
      let winner: string | null = null;
      let confidence = 0;
      
      const totalSamples = variantAAssignments.length + variantBAssignments.length;
      if (totalSamples >= 20) { // Minimum sample size
        const diff = Math.abs(variantAOpenRate - variantBOpenRate);
        if (diff >= 5) { // At least 5% difference
          winner = variantAOpenRate > variantBOpenRate ? "A" : "B";
          // Simple confidence estimate based on sample size and difference
          confidence = Math.min(95, Math.round(50 + (totalSamples / 10) + (diff * 2)));
        }
      }

      stats[test.id] = {
        variantA: {
          sent: variantAAssignments.length,
          opens: variantAOpens.length,
          openRate: Math.round(variantAOpenRate * 10) / 10,
        },
        variantB: {
          sent: variantBAssignments.length,
          opens: variantBOpens.length,
          openRate: Math.round(variantBOpenRate * 10) / 10,
        },
        winner,
        confidence,
      };
    }

    return stats;
  }, [tests, assignments, opens]);

  const handleSaveTest = async (test: ABTest) => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("email_ab_tests")
        .update({
          variant_a_subject: test.variant_a_subject,
          variant_b_subject: test.variant_b_subject,
          is_active: test.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq("id", test.id);

      if (error) throw error;

      toast({
        title: language === "ro" ? "Test salvat" : "Test saved",
        description: language === "ro" ? "Modificările au fost salvate." : "Changes have been saved.",
      });

      setEditingTest(null);
      fetchData();
    } catch (error) {
      console.error("Error saving test:", error);
      toast({
        title: language === "ro" ? "Eroare" : "Error",
        description: String(error),
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateTest = async () => {
    if (!newTest?.email_type || !newTest?.variant_a_subject || !newTest?.variant_b_subject) {
      toast({
        title: language === "ro" ? "Eroare" : "Error",
        description: language === "ro" ? "Completează toate câmpurile." : "Fill in all fields.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("email_ab_tests")
        .insert({
          email_type: newTest.email_type,
          variant_a_subject: newTest.variant_a_subject,
          variant_b_subject: newTest.variant_b_subject,
          is_active: true,
        });

      if (error) throw error;

      toast({
        title: language === "ro" ? "Test creat" : "Test created",
        description: language === "ro" ? "Noul test A/B a fost creat." : "New A/B test has been created.",
      });

      setNewTest(null);
      fetchData();
    } catch (error) {
      console.error("Error creating test:", error);
      toast({
        title: language === "ro" ? "Eroare" : "Error",
        description: String(error),
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTest = async (testId: string) => {
    if (!confirm(language === "ro" ? "Sigur vrei să ștergi acest test?" : "Are you sure you want to delete this test?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("email_ab_tests")
        .delete()
        .eq("id", testId);

      if (error) throw error;

      toast({
        title: language === "ro" ? "Test șters" : "Test deleted",
      });

      fetchData();
    } catch (error) {
      console.error("Error deleting test:", error);
      toast({
        title: language === "ro" ? "Eroare" : "Error",
        description: String(error),
        variant: "destructive",
      });
    }
  };

  const tr = {
    ro: {
      title: "A/B Testing Email Subiecte",
      subtitle: "Testează diferite subiecte pentru a optimiza rata de deschidere",
      emailType: "Tip email",
      variantA: "Varianta A",
      variantB: "Varianta B",
      active: "Activ",
      sent: "Trimise",
      opens: "Deschideri",
      openRate: "Rată deschidere",
      winner: "Câștigător",
      confidence: "Încredere",
      noWinner: "Insuficiente date",
      refresh: "Reîmprospătează",
      save: "Salvează",
      cancel: "Anulează",
      edit: "Editează",
      delete: "Șterge",
      newTest: "Test nou",
      create: "Creează",
      firstFollowup: "Primul follow-up",
      secondFollowup: "Ofertă specială",
      performance: "Performanță comparativă",
      noTests: "Nu există teste A/B",
      placeholders: "Folosește {firstName}, {monthlyIncome}, {yearlyIncome}, {bonusAmount}",
    },
    en: {
      title: "A/B Testing Email Subjects",
      subtitle: "Test different subjects to optimize open rate",
      emailType: "Email type",
      variantA: "Variant A",
      variantB: "Variant B",
      active: "Active",
      sent: "Sent",
      opens: "Opens",
      openRate: "Open rate",
      winner: "Winner",
      confidence: "Confidence",
      noWinner: "Insufficient data",
      refresh: "Refresh",
      save: "Save",
      cancel: "Cancel",
      edit: "Edit",
      delete: "Delete",
      newTest: "New test",
      create: "Create",
      firstFollowup: "First follow-up",
      secondFollowup: "Special offer",
      performance: "Comparative performance",
      noTests: "No A/B tests",
      placeholders: "Use {firstName}, {monthlyIncome}, {yearlyIncome}, {bonusAmount}",
    },
  };

  const t = tr[language] || tr.en;

  const getEmailTypeLabel = (type: string) => {
    switch (type) {
      case "first_followup": return t.firstFollowup;
      case "second_followup": return t.secondFollowup;
      default: return type;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-serif font-bold text-foreground flex items-center gap-2">
            <FlaskConical className="w-6 h-6 text-primary" />
            {t.title}
          </h2>
          <p className="text-muted-foreground">{t.subtitle}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            {t.refresh}
          </Button>
          <Button size="sm" onClick={() => setNewTest({ email_type: "first_followup", is_active: true })}>
            <Plus className="w-4 h-4 mr-2" />
            {t.newTest}
          </Button>
        </div>
      </div>

      {/* New Test Form */}
      {newTest && (
        <Card className="border-primary/50">
          <CardHeader>
            <CardTitle className="text-lg">{t.newTest}</CardTitle>
            <CardDescription>{t.placeholders}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>{t.emailType}</Label>
              <select
                className="w-full mt-1 p-2 border rounded-md bg-background"
                value={newTest.email_type || "first_followup"}
                onChange={(e) => setNewTest({ ...newTest, email_type: e.target.value })}
              >
                <option value="first_followup">{t.firstFollowup}</option>
                <option value="second_followup">{t.secondFollowup}</option>
              </select>
            </div>
            <div>
              <Label>{t.variantA}</Label>
              <Input
                value={newTest.variant_a_subject || ""}
                onChange={(e) => setNewTest({ ...newTest, variant_a_subject: e.target.value })}
                placeholder="🏠 {firstName}, ai văzut câți bani poți câștiga?"
              />
            </div>
            <div>
              <Label>{t.variantB}</Label>
              <Input
                value={newTest.variant_b_subject || ""}
                onChange={(e) => setNewTest({ ...newTest, variant_b_subject: e.target.value })}
                placeholder="💰 {firstName}, nu uita de simularea ta!"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreateTest} disabled={isSaving}>
                {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                {t.create}
              </Button>
              <Button variant="outline" onClick={() => setNewTest(null)}>
                {t.cancel}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tests List */}
      {tests.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <FlaskConical className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>{t.noTests}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {tests.map((test) => {
            const stats = testStats[test.id];
            const isEditing = editingTest?.id === test.id;

            return (
              <Card key={test.id} className={!test.is_active ? "opacity-60" : ""}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant={test.is_active ? "default" : "secondary"}>
                        {getEmailTypeLabel(test.email_type)}
                      </Badge>
                      {!test.is_active && (
                        <Badge variant="outline">{language === "ro" ? "Inactiv" : "Inactive"}</Badge>
                      )}
                      {stats?.winner && (
                        <Badge variant="outline" className="bg-chart-2/10 text-chart-2 border-chart-2">
                          🏆 {t.winner}: {stats.winner} ({stats.confidence}% {t.confidence})
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {isEditing ? (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleSaveTest(editingTest!)}
                            disabled={isSaving}
                          >
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingTest(null)}
                          >
                            {t.cancel}
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingTest({ ...test })}
                          >
                            {t.edit}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteTest(test.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Variants */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-primary font-semibold">{t.variantA}</Label>
                        {stats && (
                          <Badge variant="secondary">
                            {stats.variantA.openRate}% {t.openRate}
                          </Badge>
                        )}
                      </div>
                      {isEditing ? (
                        <Input
                          value={editingTest?.variant_a_subject || ""}
                          onChange={(e) => setEditingTest({ ...editingTest!, variant_a_subject: e.target.value })}
                        />
                      ) : (
                        <p className="text-sm text-foreground">{test.variant_a_subject}</p>
                      )}
                      {stats && (
                        <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
                          <span>{stats.variantA.sent} {t.sent}</span>
                          <span>{stats.variantA.opens} {t.opens}</span>
                        </div>
                      )}
                    </div>

                    <div className="p-4 rounded-lg bg-chart-2/5 border border-chart-2/20">
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-chart-2 font-semibold">{t.variantB}</Label>
                        {stats && (
                          <Badge variant="secondary">
                            {stats.variantB.openRate}% {t.openRate}
                          </Badge>
                        )}
                      </div>
                      {isEditing ? (
                        <Input
                          value={editingTest?.variant_b_subject || ""}
                          onChange={(e) => setEditingTest({ ...editingTest!, variant_b_subject: e.target.value })}
                        />
                      ) : (
                        <p className="text-sm text-foreground">{test.variant_b_subject}</p>
                      )}
                      {stats && (
                        <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
                          <span>{stats.variantB.sent} {t.sent}</span>
                          <span>{stats.variantB.opens} {t.opens}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Active toggle */}
                  {isEditing && (
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={editingTest?.is_active}
                        onCheckedChange={(checked) => setEditingTest({ ...editingTest!, is_active: checked })}
                      />
                      <Label>{t.active}</Label>
                    </div>
                  )}

                  {/* Performance Chart */}
                  {stats && (stats.variantA.sent > 0 || stats.variantB.sent > 0) && (
                    <div>
                      <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                        <BarChart3 className="w-4 h-4" />
                        {t.performance}
                      </h4>
                      <div className="h-[180px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={[
                              {
                                name: t.sent,
                                A: stats.variantA.sent,
                                B: stats.variantB.sent,
                              },
                              {
                                name: t.opens,
                                A: stats.variantA.opens,
                                B: stats.variantB.opens,
                              },
                            ]}
                          >
                            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                            <XAxis dataKey="name" className="text-xs fill-muted-foreground" />
                            <YAxis className="text-xs fill-muted-foreground" />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "hsl(var(--card))",
                                border: "1px solid hsl(var(--border))",
                                borderRadius: "8px",
                              }}
                            />
                            <Legend />
                            <Bar dataKey="A" name={t.variantA} fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="B" name={t.variantB} fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {/* No data message */}
                  {stats && stats.variantA.sent === 0 && stats.variantB.sent === 0 && (
                    <div className="text-center py-6 text-muted-foreground">
                      <Eye className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">{t.noWinner}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ABTestManager;
