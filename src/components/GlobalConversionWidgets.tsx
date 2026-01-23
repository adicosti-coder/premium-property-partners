import FloatingWhatsApp from "@/components/FloatingWhatsApp";
import AccessibilityPanel from "@/components/AccessibilityPanel";
import ExitIntentPopup from "@/components/ExitIntentPopup";
import SocialProofNotifications from "@/components/SocialProofNotifications";
import AIChatbot from "@/components/AIChatbot";
import MobileCTABar from "@/components/MobileCTABar";

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
      <FloatingWhatsApp />
      <AccessibilityPanel />
      {showExitIntent && <ExitIntentPopup />}
      {showSocialProof && <SocialProofNotifications />}
      {showChatbot && <AIChatbot />}
    </>
  );
};

export default GlobalConversionWidgets;
