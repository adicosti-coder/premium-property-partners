import { lazy, Suspense } from "react";
import { useLocation } from "react-router-dom";

const LeadEngagementWidget = lazy(() => import("@/components/LeadEngagementWidget"));

/** Single global bottom-right contact widget (hidden in admin). */
const GlobalLeadWidget = () => {
  const { pathname } = useLocation();
  if (/^\/admin(\/|$)/.test(pathname)) return null;
  return (
    <Suspense fallback={null}>
      <LeadEngagementWidget
        source={`lead_engagement_widget${pathname === "/" ? "" : `:${pathname}`.slice(0, 70)}`}
        className="bottom-[calc(5rem+env(safe-area-inset-bottom))] md:bottom-[136px]"
      />
    </Suspense>
  );
};

export default GlobalLeadWidget;
