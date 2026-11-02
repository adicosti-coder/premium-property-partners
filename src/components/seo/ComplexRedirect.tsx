import { Navigate, useLocation, useParams } from "react-router-dom";

/** Client fallback; an HTTP 301 requires the domain's edge/hosting layer. */
export default function ComplexRedirect() {
  const { slug } = useParams<{ slug: string }>();
  const { search, hash } = useLocation();
  return <Navigate replace to={slug ? `/complexe/${encodeURIComponent(slug)}${search}${hash}` : "/ansambluri-rezidentiale"} />;
}