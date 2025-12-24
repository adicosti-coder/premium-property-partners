import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useFavorites } from "./useFavorites";

export const useSharedFavorites = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { favorites } = useFavorites();

  // Check for shared favorites in URL on mount
  useEffect(() => {
    const sharedFavs = searchParams.get("favorites");
    if (sharedFavs) {
      try {
        const decoded = atob(sharedFavs);
        const sharedIds = decoded.split(",").filter(Boolean);
        if (sharedIds.length > 0) {
          // Store shared favorites in sessionStorage for viewing
          sessionStorage.setItem("shared_favorites", JSON.stringify(sharedIds));
        }
      } catch {
        // Invalid base64, ignore
      }
    }
  }, [searchParams]);

  const generateShareableLink = (): string => {
    if (favorites.length === 0) return "";
    
    const encoded = btoa(favorites.join(","));
    const url = new URL(window.location.href);
    url.hash = "portofoliu";
    url.searchParams.set("favorites", encoded);
    return url.toString();
  };

  const copyShareableLink = async (): Promise<boolean> => {
    const link = generateShareableLink();
    if (!link) return false;
    
    try {
      await navigator.clipboard.writeText(link);
      return true;
    } catch {
      return false;
    }
  };

  const getSharedFavorites = (): string[] => {
    try {
      const stored = sessionStorage.getItem("shared_favorites");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  };

  const clearSharedFavorites = () => {
    sessionStorage.removeItem("shared_favorites");
    // Remove the favorites param from URL
    const newParams = new URLSearchParams(searchParams);
    newParams.delete("favorites");
    setSearchParams(newParams, { replace: true });
  };

  return {
    generateShareableLink,
    copyShareableLink,
    getSharedFavorites,
    clearSharedFavorites,
  };
};
