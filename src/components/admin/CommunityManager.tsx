import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { 
  Trophy, 
  Plus, 
  Eye, 
  Check, 
  X, 
  Calendar, 
  Award,
  FileText,
  Users,
  ThumbsUp,
  Clock
} from "lucide-react";
import { format } from "date-fns";

interface ContestPeriod {
  id: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string;
  prize_description: string;
  is_active: boolean;
  winner_submission_id: string | null;
  winner_announced_at: string | null;
}

interface Submission {
  id: string;
  user_id: string;
  contest_period_id: string | null;
  title: string;
  content: string;
  excerpt: string | null;
  status: string;
  admin_feedback: string | null;
  vote_count: number;
  created_at: string;
  author_name?: string;
  author_email?: string;
}

const CommunityManager = () => {
  const queryClient = useQueryClient();
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [feedback, setFeedback] = useState("");
  const [newContestOpen, setNewContestOpen] = useState(false);
  const [newContest, setNewContest] = useState({
    name: "",
    description: "",
    start_date: "",
    end_date: "",
    prize_description: "1 noapte de cazare gratuită",
  });

  // Fetch contests
  const { data: contests, isLoading: contestsLoading } = useQuery({
    queryKey: ["admin-contests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contest_periods")
        .select("*")
        .order("start_date", { ascending: false });
      if (error) throw error;
      return data as ContestPeriod[];
    },
  });

  // Fetch submissions
  const { data: submissions, isLoading: submissionsLoading } = useQuery({
    queryKey: ["admin-submissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_article_submissions")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const userIds = [...new Set(data.map(s => s.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, { name: p.full_name, email: p.email }]) || []);
      
      return data.map(s => ({
        ...s,
        author_name: profileMap.get(s.user_id)?.name || "Necunoscut",
        author_email: profileMap.get(s.user_id)?.email || "",
      })) as Submission[];
    },
  });

  // Create contest mutation
  const createContestMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("contest_periods")
        .insert({
          name: newContest.name,
          description: newContest.description || null,
          start_date: newContest.start_date,
          end_date: newContest.end_date,
          prize_description: newContest.prize_description,
          is_active: true,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Concurs creat cu succes!");
      queryClient.invalidateQueries({ queryKey: ["admin-contests"] });
      setNewContestOpen(false);
      setNewContest({
        name: "",
        description: "",
        start_date: "",
        end_date: "",
        prize_description: "1 noapte de cazare gratuită",
      });
    },
    onError: () => {
      toast.error("Eroare la crearea concursului");
    },
  });

  // Toggle contest active
  const toggleContestMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      // If activating, deactivate others first
      if (is_active) {
        await supabase
          .from("contest_periods")
          .update({ is_active: false })
          .neq("id", id);
      }
      const { error } = await supabase
        .from("contest_periods")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-contests"] });
      toast.success("Status concurs actualizat!");
    },
  });

  // Send notification email
  const sendNotificationEmail = async (
    type: "approved" | "rejected" | "winner",
    submission: Submission,
    extraData?: { feedback?: string; contestName?: string; prizeName?: string }
  ) => {
    try {
      const { error } = await supabase.functions.invoke("send-article-notification", {
        body: {
          type,
          submissionId: submission.id,
          submissionTitle: submission.title,
          userEmail: submission.author_email,
          userName: submission.author_name || "Utilizator",
          feedback: extraData?.feedback,
          contestName: extraData?.contestName,
          prizeName: extraData?.prizeName,
        },
      });
      if (error) throw error;
      console.log(`${type} notification sent successfully`);
    } catch (error) {
      console.error(`Failed to send ${type} notification:`, error);
      // Don't throw - we don't want to block the main action
    }
  };

  // Select winner
  const selectWinnerMutation = useMutation({
    mutationFn: async ({ contestId, submissionId, submission }: { contestId: string; submissionId: string; submission: Submission }) => {
      // Get contest details for notification
      const contest = contests?.find(c => c.id === contestId);
      
      // Update contest with winner
      const { error: contestError } = await supabase
        .from("contest_periods")
        .update({ 
          winner_submission_id: submissionId,
          winner_announced_at: new Date().toISOString(),
          is_active: false,
        })
        .eq("id", contestId);
      if (contestError) throw contestError;

      // Update submission status
      const { error: subError } = await supabase
        .from("user_article_submissions")
        .update({ status: "winner" })
        .eq("id", submissionId);
      if (subError) throw subError;

      // Send winner notification
      await sendNotificationEmail("winner", submission, {
        contestName: contest?.name,
        prizeName: contest?.prize_description,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-contests"] });
      queryClient.invalidateQueries({ queryKey: ["admin-submissions"] });
      toast.success("Câștigător selectat și notificat!");
    },
  });

  // Update submission status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, feedback, submission }: { id: string; status: string; feedback?: string; submission?: Submission }) => {
      const { error } = await supabase
        .from("user_article_submissions")
        .update({ 
          status, 
          admin_feedback: feedback || null,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;

      // Send notification email
      if (submission && (status === "approved" || status === "rejected")) {
        await sendNotificationEmail(status as "approved" | "rejected", submission, { feedback });
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-submissions"] });
      setSelectedSubmission(null);
      setFeedback("");
      const action = variables.status === "approved" ? "aprobat" : "respins";
      toast.success(`Articol ${action} și notificare trimisă!`);
    },
  });

  const pendingCount = submissions?.filter(s => s.status === "pending").length || 0;
  const approvedCount = submissions?.filter(s => s.status === "approved").length || 0;
  const activeContest = contests?.find(c => c.is_active);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-amber-100 text-amber-800";
      case "approved": return "bg-green-100 text-green-800";
      case "rejected": return "bg-red-100 text-red-800";
      case "winner": return "bg-purple-100 text-purple-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingCount}</p>
                <p className="text-sm text-muted-foreground">În așteptare</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Check className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{approvedCount}</p>
                <p className="text-sm text-muted-foreground">Aprobate</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{submissions?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Total articole</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Trophy className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{contests?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Concursuri</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="submissions">
        <TabsList>
          <TabsTrigger value="submissions" className="gap-2">
            <FileText className="w-4 h-4" />
            Articole
            {pendingCount > 0 && (
              <Badge variant="destructive" className="ml-1">{pendingCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="contests" className="gap-2">
            <Trophy className="w-4 h-4" />
            Concursuri
          </TabsTrigger>
        </TabsList>

        <TabsContent value="submissions" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Articole Comunitate</CardTitle>
            </CardHeader>
            <CardContent>
              {submissionsLoading ? (
                <p>Se încarcă...</p>
              ) : !submissions || submissions.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Niciun articol trimis încă.</p>
              ) : (
                <div className="space-y-3">
                  {submissions.map((sub) => (
                    <div 
                      key={sub.id} 
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium">{sub.title}</h4>
                          <Badge className={getStatusColor(sub.status)}>{sub.status}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {sub.author_name} • {sub.author_email} • {format(new Date(sub.created_at), "dd MMM yyyy")}
                        </p>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <ThumbsUp className="w-3 h-3" />
                            {sub.vote_count} voturi
                          </span>
                          <span>{sub.content.length} caractere</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" onClick={() => setSelectedSubmission(sub)}>
                              <Eye className="w-4 h-4 mr-1" />
                              Vezi
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>{sub.title}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <span>{sub.author_name}</span>
                                <span>•</span>
                                <span>{sub.author_email}</span>
                                <span>•</span>
                                <Badge className={getStatusColor(sub.status)}>{sub.status}</Badge>
                              </div>
                              <div className="prose prose-sm max-w-none">
                                <p className="whitespace-pre-wrap">{sub.content}</p>
                              </div>
                              {sub.status === "pending" && (
                                <div className="border-t pt-4 space-y-4">
                                  <div>
                                    <Label>Feedback (opțional)</Label>
                                    <Textarea 
                                      value={feedback}
                                      onChange={(e) => setFeedback(e.target.value)}
                                      placeholder="Motivul respingerii sau sugestii de îmbunătățire..."
                                    />
                                  </div>
                                  <div className="flex gap-2">
                                    <Button 
                                      onClick={() => updateStatusMutation.mutate({ id: sub.id, status: "approved", submission: sub })}
                                      className="gap-1"
                                    >
                                      <Check className="w-4 h-4" />
                                      Aprobă
                                    </Button>
                                    <Button 
                                      variant="destructive"
                                      onClick={() => updateStatusMutation.mutate({ id: sub.id, status: "rejected", feedback, submission: sub })}
                                      className="gap-1"
                                    >
                                      <X className="w-4 h-4" />
                                      Respinge
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                        {sub.status === "pending" && (
                          <>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              className="text-green-600 hover:text-green-700"
                              onClick={() => updateStatusMutation.mutate({ id: sub.id, status: "approved", submission: sub })}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => updateStatusMutation.mutate({ id: sub.id, status: "rejected", submission: sub })}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contests" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Concursuri</CardTitle>
              <Dialog open={newContestOpen} onOpenChange={setNewContestOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="w-4 h-4" />
                    Concurs Nou
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Creează Concurs Nou</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Nume Concurs</Label>
                      <Input 
                        value={newContest.name}
                        onChange={(e) => setNewContest(p => ({ ...p, name: e.target.value }))}
                        placeholder="ex: Concurs Primăvară 2026"
                      />
                    </div>
                    <div>
                      <Label>Descriere (opțional)</Label>
                      <Textarea 
                        value={newContest.description}
                        onChange={(e) => setNewContest(p => ({ ...p, description: e.target.value }))}
                        placeholder="Descrierea concursului..."
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Data Start</Label>
                        <Input 
                          type="date"
                          value={newContest.start_date}
                          onChange={(e) => setNewContest(p => ({ ...p, start_date: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label>Data Final</Label>
                        <Input 
                          type="date"
                          value={newContest.end_date}
                          onChange={(e) => setNewContest(p => ({ ...p, end_date: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Premiu</Label>
                      <Input 
                        value={newContest.prize_description}
                        onChange={(e) => setNewContest(p => ({ ...p, prize_description: e.target.value }))}
                      />
                    </div>
                    <Button 
                      onClick={() => createContestMutation.mutate()}
                      disabled={!newContest.name || !newContest.start_date || !newContest.end_date}
                      className="w-full"
                    >
                      Creează Concurs
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {contestsLoading ? (
                <p>Se încarcă...</p>
              ) : !contests || contests.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Niciun concurs creat încă.</p>
              ) : (
                <div className="space-y-4">
                  {contests.map((contest) => {
                    const contestSubmissions = submissions?.filter(s => 
                      s.contest_period_id === contest.id && s.status === "approved"
                    ).sort((a, b) => b.vote_count - a.vote_count) || [];
                    const topSubmission = contestSubmissions[0];

                    return (
                      <div key={contest.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{contest.name}</h4>
                              {contest.is_active && (
                                <Badge className="bg-green-100 text-green-800">Activ</Badge>
                              )}
                              {contest.winner_submission_id && (
                                <Badge className="bg-purple-100 text-purple-800">
                                  <Trophy className="w-3 h-3 mr-1" />
                                  Încheiat
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(contest.start_date), "dd MMM yyyy")} - {format(new Date(contest.end_date), "dd MMM yyyy")}
                            </p>
                            <p className="text-sm text-muted-foreground">{contest.prize_description}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {!contest.winner_submission_id && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => toggleContestMutation.mutate({ 
                                  id: contest.id, 
                                  is_active: !contest.is_active 
                                })}
                              >
                                {contest.is_active ? "Dezactivează" : "Activează"}
                              </Button>
                            )}
                            {topSubmission && !contest.winner_submission_id && new Date(contest.end_date) < new Date() && (
                              <Button
                                size="sm"
                                onClick={() => selectWinnerMutation.mutate({
                                  contestId: contest.id,
                                  submissionId: topSubmission.id,
                                  submission: topSubmission,
                                })}
                                className="gap-1"
                              >
                                <Award className="w-4 h-4" />
                                Selectează Câștigător
                              </Button>
                            )}
                          </div>
                        </div>
                        {contestSubmissions.length > 0 && (
                          <div className="mt-3 pt-3 border-t">
                            <p className="text-sm text-muted-foreground mb-2">
                              Top 3 articole ({contestSubmissions.length} total):
                            </p>
                            <div className="space-y-1">
                              {contestSubmissions.slice(0, 3).map((sub, i) => (
                                <div key={sub.id} className="flex items-center justify-between text-sm">
                                  <span className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-xs">{i + 1}</Badge>
                                    {sub.title}
                                    {sub.status === "winner" && <Trophy className="w-3 h-3 text-amber-500" />}
                                  </span>
                                  <span className="text-muted-foreground">{sub.vote_count} voturi</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CommunityManager;