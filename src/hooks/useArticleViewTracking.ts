import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

// Generate a unique session ID for view tracking
const getSessionId = (): string => {
  const storageKey = "realtrust_session_id";
  let sessionId = localStorage.getItem(storageKey);
  
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem(storageKey, sessionId);
  }
  
  return sessionId;
};

export const useArticleViewTracking = (articleId: string | undefined) => {
  const hasTracked = useRef(false);

  useEffect(() => {
    if (!articleId || hasTracked.current) return;

    const trackView = async () => {
      try {
        const sessionId = getSessionId();
        
        // Get current user if logged in
        const { data: { user } } = await supabase.auth.getUser();
        
        // Try to insert a view record (will fail silently if duplicate due to unique constraint)
        const { error } = await supabase
          .from("blog_article_views")
          .insert({
            article_id: articleId,
            session_id: sessionId,
            user_id: user?.id || null,
          });

        if (error && !error.message.includes("duplicate")) {
          console.error("Error tracking article view:", error);
        }
        
        hasTracked.current = true;
      } catch (err) {
        console.error("Failed to track article view:", err);
      }
    };

    // Small delay to ensure the article has actually been viewed
    const timeout = setTimeout(trackView, 2000);
    
    return () => clearTimeout(timeout);
  }, [articleId]);
};
