import { Navigate, useParams } from "react-router-dom";
import { shortAnalysisTarget } from "@/lib/ownerSmsFallback";

/** Linkul scurt din SMS-ul către proprietari: /aa/{v|i}/{zona} → /analiza-anunt. */
const AnalizaShortLink = () => {
  const { tip, zona } = useParams();
  return <Navigate to={shortAnalysisTarget(tip, zona)} replace />;
};

export default AnalizaShortLink;
