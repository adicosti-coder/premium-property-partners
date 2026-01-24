import FloatingWhatsApp from "@/components/FloatingWhatsApp";
import AccessibilityPanel from "@/components/AccessibilityPanel";
import ExitIntentPopup from "@/components/ExitIntentPopup";
import SocialProofNotifications from "@/components/SocialProofNotifications";
import AIChatbot from "@/components/AIChatbot";
import MobileCTABar from "@/components/MobileCTABar";
import FloatingActionMenu from "@/components/FloatingActionMenu";

interface GlobalConversionWidgetsProps {
  showMobileCTA?: boolean;
  showExitIntent?: boolean;
  showSocialProof?: boolean;
  showChatbot?: boolean;
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
}: GlobalConversionWidgetsProps) => {
  return (
    <>
      {showMobileCTA && <MobileCTABar />}
      {/* Desktop floating buttons */}
      <FloatingWhatsApp />
      <AccessibilityPanel />
      {showChatbot && <AIChatbot />}
      {/* Mobile FAB menu - groups all floating buttons */}
      <FloatingActionMenu showChatbot={showChatbot} />
      {showExitIntent && <ExitIntentPopup />}
      {showSocialProof && <SocialProofNotifications />}
    </>
  );
};

export default GlobalConversionWidgets;
