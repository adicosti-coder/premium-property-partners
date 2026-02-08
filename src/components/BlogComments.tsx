import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Trash2, MessageCircle, User, LogIn } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/LanguageContext";
import { Link } from "react-router-dom";
import { sanitizeText } from "@/utils/security/sanitize";
import { blogCommentSchema, formatZodErrors } from "@/utils/security/validation";
import type { User as SupabaseUser } from "@supabase/supabase-js";

interface BlogComment {
  id: string;
  article_id: string;
  user_id: string;
  author_name: string;
  content: string;
  created_at: string;
}

interface BlogCommentsProps {
  articleId: string;
}

const translations = {
  ro: {
    title: "Comentarii",
    noComments: "Fii primul care comentează!",
    placeholder: "Scrie un comentariu...",
    submit: "Trimite comentariul",
    delete: "Șterge",
    loginToComment: "Autentifică-te pentru a comenta",
    login: "Autentificare",
    commenting: "Se trimite...",
    commentAdded: "Comentariul a fost adăugat",
    commentDeleted: "Comentariul a fost șters",
    errorAdding: "Eroare la adăugarea comentariului",
    errorDeleting: "Eroare la ștergerea comentariului",
    emptyComment: "Comentariul nu poate fi gol",
  },
  en: {
    title: "Comments",
    noComments: "Be the first to comment!",
    placeholder: "Write a comment...",
    submit: "Submit comment",
    delete: "Delete",
    loginToComment: "Log in to comment",
    login: "Log in",
    commenting: "Submitting...",
    commentAdded: "Comment added",
    commentDeleted: "Comment deleted",
    errorAdding: "Error adding comment",
    errorDeleting: "Error deleting comment",
    emptyComment: "Comment cannot be empty",
  },
};

const BlogComments = ({ articleId }: BlogCommentsProps) => {
  const { language } = useLanguage();
  const t = translations[language];
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [newComment, setNewComment] = useState("");

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_, session) => {
        setUser(session?.user ?? null);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const { data: comments, isLoading } = useQuery({
    queryKey: ["blog-comments", articleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_comments")
        .select("*")
        .eq("article_id", articleId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as BlogComment[];
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!user) throw new Error("Not authenticated");
      
      // Validate with Zod schema
      const validation = blogCommentSchema.safeParse({
        content: content.trim(),
        articleId,
      });
      
      if (!validation.success) {
        const errors = formatZodErrors(validation.error);
        throw new Error(Object.values(errors)[0] || t.emptyComment);
      }

      // Sanitize the content before storing
      const sanitizedContent = sanitizeText(validation.data.content);
      
      const { error } = await supabase.from("blog_comments").insert({
        article_id: articleId,
        user_id: user.id,
        author_name: sanitizeText(user.email?.split("@")[0] || "Anonim"),
        content: sanitizedContent,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blog-comments", articleId] });
      setNewComment("");
      toast({ title: t.commentAdded });
    },
    onError: (error: Error) => {
      toast({ title: error.message || t.errorAdding, variant: "destructive" });
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase
        .from("blog_comments")
        .delete()
        .eq("id", commentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blog-comments", articleId] });
      toast({ title: t.commentDeleted });
    },
    onError: () => {
      toast({ title: t.errorDeleting, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) {
      toast({ title: t.emptyComment, variant: "destructive" });
      return;
    }
    addCommentMutation.mutate(newComment);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(
      language === "ro" ? "ro-RO" : "en-US",
      { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }
    );
  };

  const getInitials = (name: string) => {
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <section className="mt-12 pt-8 border-t border-border">
      <h3 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
        <MessageCircle className="h-6 w-6" />
        {t.title} ({comments?.length || 0})
      </h3>

      {/* Add comment form */}
      {user ? (
        <form onSubmit={handleSubmit} className="mb-8">
          <div className="flex gap-3">
            <Avatar className="h-10 w-10 flex-shrink-0">
              <AvatarFallback className="bg-primary/10 text-primary">
                {getInitials(user.email?.split("@")[0] || "U")}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-3">
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder={t.placeholder}
                className="min-h-[100px] resize-none"
                maxLength={1000}
              />
              <Button
                type="submit"
                disabled={addCommentMutation.isPending || !newComment.trim()}
              >
                {addCommentMutation.isPending ? t.commenting : t.submit}
              </Button>
            </div>
          </div>
        </form>
      ) : (
        <div className="mb-8 p-6 bg-muted/50 rounded-lg text-center">
          <User className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground mb-4">{t.loginToComment}</p>
          <Button asChild>
            <Link to="/auth" className="gap-2">
              <LogIn className="h-4 w-4" />
              {t.login}
            </Link>
          </Button>
        </div>
      )}

      {/* Comments list */}
      <div className="space-y-6">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="h-10 w-10 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-muted rounded" />
                  <div className="h-16 bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : comments && comments.length > 0 ? (
          comments.map((comment) => (
            <div key={comment.id} className="flex gap-3 group">
              <Avatar className="h-10 w-10 flex-shrink-0">
                <AvatarFallback className="bg-primary/10 text-primary text-sm">
                  {getInitials(comment.author_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">
                      {comment.author_name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(comment.created_at)}
                    </span>
                  </div>
                  {user?.id === comment.user_id && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 transition-opacity h-8 px-2 text-destructive hover:text-destructive"
                      onClick={() => deleteCommentMutation.mutate(comment.id)}
                      disabled={deleteCommentMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <p className="text-foreground/90 whitespace-pre-wrap">
                  {sanitizeText(comment.content)}
                </p>
              </div>
            </div>
          ))
        ) : (
          <p className="text-center text-muted-foreground py-8">
            {t.noComments}
          </p>
        )}
      </div>
    </section>
  );
};

export default BlogComments;
