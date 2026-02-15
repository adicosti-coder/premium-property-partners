import { lazy, Suspense, useState, useEffect } from "react";
import AccessibilityPanel from "@/components/AccessibilityPanel";
import MobileCTABar from "@/components/MobileCTABar";
import FloatingActionMenu from "@/components/FloatingActionMenu";
import OfflineIndicator from "@/components/OfflineIndicator";
import DesktopStickyContactBar from "@/components/DesktopStickyContactBar";

// Defer non-critical widgets to reduce initial main-thread work
const ExitIntentPopup = lazy(() => import("@/components/ExitIntentPopup"));
const SocialProofNotifications = lazy(() => import("@/components/SocialProofNotifications"));
const AIChatbot = lazy(() => import("@/components/AIChatbot"));
const PWAInstallPrompt = lazy(() => import("@/components/PWAInstallPrompt"));
const ElevenLabsWidgetLazy = lazy(() => import("@/components/ElevenLabsWidget").then(m => ({ default: m.ElevenLabsWidget })));
const ReferralPopup = lazy(() => import("@/components/ReferralPopup"));
const FloatingWhatsApp = lazy(() => import("@/components/FloatingWhatsApp"));

interface GlobalConversionWidgetsProps {
  showMobileCTA?: boolean;
  showExitIntent?: boolean;
  showSocialProof?: boolean;
  showChatbot?: boolean;
  showVoiceWidget?: boolean;
}

/**
 * Global conversion widgets that should appear on most pages.
 * Non-critical widgets are deferred 3s after mount for better LCP/INP.
 */
const GlobalConversionWidgets = ({
  showMobileCTA = true,
  showExitIntent = true,
  showSocialProof = true,
  showChatbot = true,
  showVoiceWidget = true,
}: GlobalConversionWidgetsProps) => {
  const [deferredReady, setDeferredReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDeferredReady(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      {/* Critical: always loaded */}
      <OfflineIndicator />
      {showMobileCTA && <MobileCTABar />}
      <DesktopStickyContactBar />
      <AccessibilityPanel />
      <FloatingActionMenu showChatbot={showChatbot} />

      {/* Deferred: loaded after 3s */}
      {deferredReady && (
        <Suspense fallback={null}>
          <FloatingWhatsApp />

          <PWAInstallPrompt />
          {showChatbot && <AIChatbot />}
          {showVoiceWidget && <ElevenLabsWidgetLazy />}
          {showExitIntent && <ExitIntentPopup />}
          {showSocialProof && <SocialProofNotifications />}
          <ReferralPopup />
        </Suspense>
      )}
    </>
  );
};

export default GlobalConversionWidgets;
