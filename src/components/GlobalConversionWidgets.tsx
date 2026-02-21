import { lazy, Suspense, useState, useEffect } from "react";

// ALL widgets deferred — nothing loads eagerly to cut initial JS execution
const AccessibilityPanel = lazy(() => import("@/components/AccessibilityPanel"));
const MobileCTABar = lazy(() => import("@/components/MobileCTABar"));
const FloatingActionMenu = lazy(() => import("@/components/FloatingActionMenu"));
const OfflineIndicator = lazy(() => import("@/components/OfflineIndicator"));
const DesktopStickyContactBar = lazy(() => import("@/components/DesktopStickyContactBar"));

// Defer non-critical widgets to reduce initial main-thread work
const ExitIntentPopup = lazy(() => import("@/components/ExitIntentPopup"));
const AIChatbot = lazy(() => import("@/components/AIChatbot"));
const PWAInstallPrompt = lazy(() => import("@/components/PWAInstallPrompt"));
const ElevenLabsWidgetLazy = lazy(() => import("@/components/ElevenLabsWidget").then(m => ({ default: m.ElevenLabsWidget })));
const ReferralPopup = lazy(() => import("@/components/ReferralPopup"));
const FloatingWhatsApp = lazy(() => import("@/components/FloatingWhatsApp"));
const InlineCalculatorPopup = lazy(() => import("@/components/InlineCalculatorPopup"));

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

  useEffect(() => {
    const t1 = setTimeout(() => setPhase1Ready(true), 3000);
    const t2 = setTimeout(() => setPhase2Ready(true), 8000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <>
      {/* Phase 1: essential chrome after 1.5s */}
      {phase1Ready && (
        <Suspense fallback={null}>
          <OfflineIndicator />
          {showMobileCTA && <MobileCTABar />}
          <DesktopStickyContactBar />
          <AccessibilityPanel />
          <FloatingActionMenu showChatbot={showChatbot} />
        </Suspense>
      )}

      {/* Phase 2: engagement widgets after 4s */}
      {phase2Ready && (
        <Suspense fallback={null}>
          <FloatingWhatsApp />
          <PWAInstallPrompt />
          {showChatbot && <AIChatbot />}
          {showVoiceWidget && <ElevenLabsWidgetLazy />}
          {showExitIntent && <ExitIntentPopup />}
          <ReferralPopup />
          <InlineCalculatorPopup />
        </Suspense>
      )}
    </>
  );
};

export default GlobalConversionWidgets;
