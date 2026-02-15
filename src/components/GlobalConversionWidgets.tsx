import FloatingWhatsApp from "@/components/FloatingWhatsApp";
import AccessibilityPanel from "@/components/AccessibilityPanel";
import ExitIntentPopup from "@/components/ExitIntentPopup";
import SocialProofNotifications from "@/components/SocialProofNotifications";
import AIChatbot from "@/components/AIChatbot";
import MobileCTABar from "@/components/MobileCTABar";
import FloatingActionMenu from "@/components/FloatingActionMenu";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import OfflineIndicator from "@/components/OfflineIndicator";
import DesktopStickyContactBar from "@/components/DesktopStickyContactBar";
import { ElevenLabsWidget } from "@/components/ElevenLabsWidget";
import ReferralPopup from "@/components/ReferralPopup";

interface GlobalConversionWidgetsProps {
  showMobileCTA?: boolean;
  showExitIntent?: boolean;
  showSocialProof?: boolean;
  showChatbot?: boolean;
  showVoiceWidget?: boolean;
}

/**
 * Global conversion widgets that should appear on most pages.
 * Use props to toggle specific widgets per page.
 */
const GlobalConversionWidgets = ({
  showMobileCTA = true,
  showExitIntent = true,
  showSocialProof = true,
  showChatbot = true,
  showVoiceWidget = true,
}: GlobalConversionWidgetsProps) => {
  return (
    <>
      {/* PWA & Offline */}
      <OfflineIndicator />
      <PWAInstallPrompt />
      
      {showMobileCTA && <MobileCTABar />}
      {/* Desktop sticky contact bar */}
      <DesktopStickyContactBar />
      <AccessibilityPanel />
      {showChatbot && <AIChatbot />}
      {/* ElevenLabs Voice Widget - visible on all pages */}
      {showVoiceWidget && <ElevenLabsWidget />}
      {/* Mobile FAB menu - groups all floating buttons */}
      <FloatingActionMenu showChatbot={showChatbot} />
      {showExitIntent && <ExitIntentPopup />}
      {showSocialProof && <SocialProofNotifications />}
      <ReferralPopup />
    </>
  );
};

export default GlobalConversionWidgets;
