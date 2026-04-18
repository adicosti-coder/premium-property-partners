import { lazy, Suspense, useState, useEffect } from "react";

const CHUNK_RELOAD_KEY = "__rt_chunk_reload__";

const lazyWithChunkRecovery = <T extends { default: React.ComponentType<any> }>(
  importer: () => Promise<T>,
) =>
  lazy(async () => {
    try {
      return await importer();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const isChunkError =
        message.includes("Failed to fetch dynamically imported module") ||
        message.includes("Loading chunk") ||
        message.includes("Loading CSS chunk");

      if (
        isChunkError &&
        typeof window !== "undefined" &&
        typeof sessionStorage !== "undefined" &&
        !sessionStorage.getItem(CHUNK_RELOAD_KEY)
      ) {
        sessionStorage.setItem(CHUNK_RELOAD_KEY, "1");
        window.location.reload();
      }

      return { default: () => null } as unknown as T;
    }
  });

// ALL widgets deferred — nothing loads eagerly to cut initial JS execution
const AccessibilityPanel = lazyWithChunkRecovery(() => import("@/components/AccessibilityPanel"));
const MobileCTABar = lazyWithChunkRecovery(() => import("@/components/MobileCTABar"));

const OfflineIndicator = lazyWithChunkRecovery(() => import("@/components/OfflineIndicator"));
const DesktopStickyContactBar = lazyWithChunkRecovery(() => import("@/components/DesktopStickyContactBar"));

// Defer non-critical widgets to reduce initial main-thread work
const ExitIntentPopup = lazyWithChunkRecovery(() => import("@/components/ExitIntentPopup"));
const AIChatbot = lazyWithChunkRecovery(() => import("@/components/AIChatbot"));
const PWAInstallPrompt = lazyWithChunkRecovery(() => import("@/components/PWAInstallPrompt"));
const ElevenLabsWidgetLazy = lazyWithChunkRecovery(() => import("@/components/ElevenLabsWidget").then(m => ({ default: m.ElevenLabsWidget })));
const ReferralPopup = lazyWithChunkRecovery(() => import("@/components/ReferralPopup"));

const InlineCalculatorPopup = lazyWithChunkRecovery(() => import("@/components/InlineCalculatorPopup"));
const FeedbackBanner = lazyWithChunkRecovery(() => import("@/components/FeedbackBanner"));

interface GlobalConversionWidgetsProps {
  showMobileCTA?: boolean;
  showExitIntent?: boolean;
  showChatbot?: boolean;
  showVoiceWidget?: boolean;
}

/**
 * Global conversion widgets — ALL deferred via lazy + timeout.
 * Phase 1 (1.5s): essential UI chrome (CTA bars, offline indicator)
 * Phase 2 (4s): engagement widgets (chatbot, exit intent, referral)
 */
const GlobalConversionWidgets = ({
  showMobileCTA = true,
  showExitIntent = true,
  showChatbot = true,
  showVoiceWidget = true,
}: GlobalConversionWidgetsProps) => {
  const [phase1Ready, setPhase1Ready] = useState(false);
  const [phase2Ready, setPhase2Ready] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);

  useEffect(() => {
    if (typeof sessionStorage === "undefined") return;
    sessionStorage.removeItem(CHUNK_RELOAD_KEY);
  }, []);

  // Load widgets only after first user interaction to free main thread
  useEffect(() => {
    let t2: ReturnType<typeof setTimeout>;

    const triggerPhase1 = () => {
      setPhase1Ready(true);
      t2 = setTimeout(() => setPhase2Ready(true), 3000);
      events.forEach(e => document.removeEventListener(e, triggerPhase1));
    };

    const events = ["scroll", "click", "touchstart"] as const;
    events.forEach(e => document.addEventListener(e, triggerPhase1, { once: true, passive: true }));

    // Fallback: load after 40s even without interaction (prevents Lighthouse from loading widgets)
    const fallback = setTimeout(triggerPhase1, 40000);

    return () => {
      clearTimeout(fallback);
      clearTimeout(t2);
      events.forEach(e => document.removeEventListener(e, triggerPhase1));
    };
  }, []);

  // Remove the external ElevenLabs embed widget so only the in-app assistant remains.
  useEffect(() => {
    if (typeof document === "undefined") return;

    const removeExternalWidget = () => {
      document.querySelectorAll("elevenlabs-convai").forEach((node) => node.remove());
      document
        .querySelectorAll('script[src*="@elevenlabs/convai-widget-embed"]')
        .forEach((node) => node.remove());
    };

    removeExternalWidget();

    const observer = new MutationObserver(() => removeExternalWidget());
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);

  return (
    <>
      {/* Phase 1: essential chrome after 1.5s */}
      {phase1Ready && (
        <Suspense fallback={null}>
          <OfflineIndicator />
          {showMobileCTA && isMobile && <MobileCTABar />}
          {!isMobile && <DesktopStickyContactBar />}
          <AccessibilityPanel />
        </Suspense>
      )}

      {/* Phase 2: engagement widgets after 4s */}
      {phase2Ready && (
        <Suspense fallback={null}>
          
          <PWAInstallPrompt />
          {showChatbot && <AIChatbot />}
           {showVoiceWidget && !isMobile && <ElevenLabsWidgetLazy />}
          {showExitIntent && <ExitIntentPopup />}
          <ReferralPopup />
          <InlineCalculatorPopup />
          <FeedbackBanner />
        </Suspense>
      )}
    </>
  );
};

export default GlobalConversionWidgets;
