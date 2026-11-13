import { Navigate, useLocation } from "react-router-dom";

/** Client-side half of a legacy apartment redirect; keeps query and hash. */
const LegacyPropertyRedirect = ({ to }: { to: string }) => {
  const { search, hash } = useLocation();
  return <Navigate to={`${to}${search}${hash}`} replace />;
};

export default LegacyPropertyRedirect;
