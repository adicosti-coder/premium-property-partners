import { Navigate, useLocation } from "react-router-dom";
import { withPreservedQuery } from "@/lib/redirectWithQuery";

/**
 * Legacy-path redirect that keeps the visitor's query string and hash
 * (`?lang=en`, utm, …), so `/pentru-oaspeti?lang=en` lands on `/cazare?lang=en`
 * and the language variant keeps its own canonical/hreflang.
 */
const RedirectWithQuery = ({ to }: { to: string }) => {
  const { search, hash } = useLocation();
  return <Navigate to={withPreservedQuery(to, search, hash)} replace />;
};

export default RedirectWithQuery;
