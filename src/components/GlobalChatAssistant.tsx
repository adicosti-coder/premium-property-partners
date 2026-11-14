import { lazy, Suspense, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

const AIChatbot = lazy(() => import("@/components/AIChatbot"));

const INTERACTION_EVENTS = ["pointerdown", "touchstart", "keydown", "scroll", "pointermove"] as const;

/**
 * Single global floating assistant (Andrei), hidden in admin.
 *
 * The chat bundle loads only after the visitor's first interaction (or when
 * another part of the page asks to open the chat), so it never competes with
 * the first paint. A chat opened through `open-ai-chatbot` before the bundle
 * was ready opens as soon as it mounts.
 */
const GlobalChatAssistant = () => {
  const { pathname } = useLocation();
  const [ready, setReady] = useState(false);
  const [openOnMount, setOpenOnMount] = useState(false);

  useEffect(() => {
    if (ready) return;
    const activate = () => setReady(true);
    const openRequested = () => { setOpenOnMount(true); setReady(true); };
    INTERACTION_EVENTS.forEach((e) => window.addEventListener(e, activate, { once: true, passive: true }));
    window.addEventListener("open-ai-chatbot", openRequested);
    return () => {
      INTERACTION_EVENTS.forEach((e) => window.removeEventListener(e, activate));
      window.removeEventListener("open-ai-chatbot", openRequested);
    };
  }, [ready]);

  if (/^\/admin(\/|$)/.test(pathname) || !ready) return null;
  return (
    <Suspense fallback={null}>
      <AIChatbot initialOpen={openOnMount} />
    </Suspense>
  );
};

export default GlobalChatAssistant;
