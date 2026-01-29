import { useEffect, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface ScrollMilestone {
  depth: number;
  reached: boolean;
  timestamp?: number;
}

interface SessionData {
  sessionId: string;
  startTime: number;
  pages: Array<{
    path: string;
    enterTime: number;
    exitTime?: number;
    scrollDepth: number;
    interactions: number;
  }>;
  scrollMilestones: ScrollMilestone[];
  totalInteractions: number;
}

// Generate or retrieve session ID
const getSessionId = (): string => {
  let sessionId = sessionStorage.getItem("analytics_session_id");
  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    sessionStorage.setItem("analytics_session_id", sessionId);
  }
  return sessionId;
};

// Get or initialize session data
const getSessionData = (): SessionData => {
  const stored = sessionStorage.getItem("analytics_session_data");
  if (stored) {
    return JSON.parse(stored);
  }
  const newSession: SessionData = {
    sessionId: getSessionId(),
    startTime: Date.now(),
    pages: [],
    scrollMilestones: [
      { depth: 25, reached: false },
      { depth: 50, reached: false },
      { depth: 75, reached: false },
      { depth: 100, reached: false },
    ],
    totalInteractions: 0,
  };
  sessionStorage.setItem("analytics_session_data", JSON.stringify(newSession));
  return newSession;
};

const saveSessionData = (data: SessionData) => {
  sessionStorage.setItem("analytics_session_data", JSON.stringify(data));
};

export const useSessionAnalytics = () => {
  const location = useLocation();
  const scrollDepthRef = useRef(0);
  const interactionCountRef = useRef(0);
  const pageEnterTimeRef = useRef(Date.now());

  // Track page view
  useEffect(() => {
    const sessionData = getSessionData();
    
    // Close previous page if exists
    if (sessionData.pages.length > 0) {
      const lastPage = sessionData.pages[sessionData.pages.length - 1];
      if (!lastPage.exitTime) {
        lastPage.exitTime = Date.now();
        lastPage.scrollDepth = scrollDepthRef.current;
        lastPage.interactions = interactionCountRef.current;
      }
    }

    // Add new page
    pageEnterTimeRef.current = Date.now();
    scrollDepthRef.current = 0;
    interactionCountRef.current = 0;

    sessionData.pages.push({
      path: location.pathname,
      enterTime: pageEnterTimeRef.current,
      scrollDepth: 0,
      interactions: 0,
    });

    // Reset scroll milestones for new page
    sessionData.scrollMilestones = sessionData.scrollMilestones.map((m) => ({
      ...m,
      reached: false,
      timestamp: undefined,
    }));

    saveSessionData(sessionData);
  }, [location.pathname]);

  // Track scroll depth
  useEffect(() => {
    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollHeight <= 0) return;

      const currentDepth = Math.round((window.scrollY / scrollHeight) * 100);
      
      if (currentDepth > scrollDepthRef.current) {
        scrollDepthRef.current = currentDepth;
        
        const sessionData = getSessionData();
        
        // Check milestones
        sessionData.scrollMilestones.forEach((milestone) => {
          if (!milestone.reached && currentDepth >= milestone.depth) {
            milestone.reached = true;
            milestone.timestamp = Date.now();
          }
        });

        // Update current page scroll depth
        if (sessionData.pages.length > 0) {
          sessionData.pages[sessionData.pages.length - 1].scrollDepth = currentDepth;
        }

        saveSessionData(sessionData);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Track interactions (clicks)
  useEffect(() => {
    const handleInteraction = () => {
      interactionCountRef.current += 1;
      
      const sessionData = getSessionData();
      sessionData.totalInteractions += 1;
      
      if (sessionData.pages.length > 0) {
        sessionData.pages[sessionData.pages.length - 1].interactions = interactionCountRef.current;
      }
      
      saveSessionData(sessionData);
    };

    document.addEventListener("click", handleInteraction);
    return () => document.removeEventListener("click", handleInteraction);
  }, []);

  // Track element visibility (for conversion funnel)
  const trackElementView = useCallback((elementId: string, elementType: string) => {
    const sessionData = getSessionData();
    
    // Store in session for funnel analysis
    const funnelData = JSON.parse(sessionStorage.getItem("funnel_events") || "[]");
    funnelData.push({
      elementId,
      elementType,
      path: location.pathname,
      timestamp: Date.now(),
      sessionId: sessionData.sessionId,
    });
    sessionStorage.setItem("funnel_events", JSON.stringify(funnelData));
  }, [location.pathname]);

  // Send session data to backend
  const flushSessionData = useCallback(async () => {
    const sessionData = getSessionData();
    
    // Close current page
    if (sessionData.pages.length > 0) {
      const lastPage = sessionData.pages[sessionData.pages.length - 1];
      lastPage.exitTime = Date.now();
      lastPage.scrollDepth = scrollDepthRef.current;
      lastPage.interactions = interactionCountRef.current;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Store session analytics
      await supabase.from("cta_analytics").insert({
        cta_type: "session_end",
        page_path: location.pathname,
        user_id: user?.id || null,
        session_id: sessionData.sessionId,
        metadata: {
          duration: Date.now() - sessionData.startTime,
          pagesVisited: sessionData.pages.length,
          totalInteractions: sessionData.totalInteractions,
          maxScrollDepth: Math.max(...sessionData.pages.map(p => p.scrollDepth)),
          scrollMilestones: sessionData.scrollMilestones.filter(m => m.reached).map(m => m.depth),
          pages: sessionData.pages.map(p => ({
            path: p.path,
            duration: (p.exitTime || Date.now()) - p.enterTime,
            scrollDepth: p.scrollDepth,
            interactions: p.interactions,
          })),
        },
      });
    } catch (error) {
      console.error("Session flush error:", error);
    }
  }, [location.pathname]);

  // Flush on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      flushSessionData();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [flushSessionData]);

  return {
    getSessionData,
    trackElementView,
    flushSessionData,
    getCurrentScrollDepth: () => scrollDepthRef.current,
    getCurrentInteractions: () => interactionCountRef.current,
  };
};

// Conversion funnel tracking
export const useConversionFunnel = (funnelName: string) => {
  const location = useLocation();

  const trackFunnelStep = useCallback(async (
    stepName: string,
    stepOrder: number,
    metadata?: Record<string, unknown>
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const sessionId = getSessionId();

      await supabase.from("cta_analytics").insert({
        cta_type: "funnel_step",
        page_path: location.pathname,
        user_id: user?.id || null,
        session_id: sessionId,
        metadata: {
          funnelName,
          stepName,
          stepOrder,
          ...metadata,
        },
      });
    } catch (error) {
      console.error("Funnel tracking error:", error);
    }
  }, [funnelName, location.pathname]);

  const trackFunnelComplete = useCallback(async (
    conversionValue?: number,
    metadata?: Record<string, unknown>
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const sessionId = getSessionId();

      await supabase.from("cta_analytics").insert({
        cta_type: "funnel_complete",
        page_path: location.pathname,
        user_id: user?.id || null,
        session_id: sessionId,
        metadata: {
          funnelName,
          conversionValue,
          ...metadata,
        },
      });
    } catch (error) {
      console.error("Funnel complete error:", error);
    }
  }, [funnelName, location.pathname]);

  return {
    trackFunnelStep,
    trackFunnelComplete,
  };
};

// Hook for A/B testing
export const useABTest = (testName: string, variants: string[]) => {
  const getVariant = useCallback((): string => {
    const storageKey = `ab_test_${testName}`;
    let variant = localStorage.getItem(storageKey);
    
    if (!variant) {
      // Randomly assign variant
      const randomIndex = Math.floor(Math.random() * variants.length);
      variant = variants[randomIndex];
      localStorage.setItem(storageKey, variant);
      
      // Track assignment async
      const sessionId = getSessionId();
      (async () => {
        try {
          await supabase.from("cta_analytics").insert({
            cta_type: "ab_assignment",
            page_path: window.location.pathname,
            session_id: sessionId,
            metadata: {
              testName,
              variant,
              assignedAt: new Date().toISOString(),
            },
          });
        } catch (error) {
          console.error("A/B assignment error:", error);
        }
      })();
    }
    
    return variant;
  }, [testName, variants]);

  const trackConversion = useCallback(async (
    conversionType: string,
    value?: number
  ) => {
    const variant = localStorage.getItem(`ab_test_${testName}`);
    if (!variant) return;

    try {
      const sessionId = getSessionId();
      await supabase.from("cta_analytics").insert({
        cta_type: "ab_conversion",
        page_path: window.location.pathname,
        session_id: sessionId,
        metadata: {
          testName,
          variant,
          conversionType,
          value,
        },
      });
    } catch (error) {
      console.error("A/B conversion error:", error);
    }
  }, [testName]);

  return {
    variant: getVariant(),
    trackConversion,
  };
};
