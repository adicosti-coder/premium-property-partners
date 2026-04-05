const isPreviewLikeHost = (hostname: string) => {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.endsWith(".lovableproject.com") ||
    (hostname.endsWith(".lovable.app") && hostname.includes("--"))
  );
};

export const isPreviewServiceWorkerDisabledHost = (): boolean => {
  if (typeof window === "undefined") return false;
  return isPreviewLikeHost(window.location.hostname);
};

export async function resetPreviewServiceWorkers(cachePrefix = "realtrust-cache-"): Promise<boolean> {
  if (
    typeof window === "undefined" ||
    typeof navigator === "undefined" ||
    !("serviceWorker" in navigator)
  ) {
    return false;
  }

  const registrations = await navigator.serviceWorker.getRegistrations();
  const hadServiceWorker = registrations.length > 0 || Boolean(navigator.serviceWorker.controller);

  if (!hadServiceWorker) return false;

  await Promise.all(
    registrations.map((registration) => registration.unregister().catch(() => false)),
  );

  if ("caches" in window) {
    const cacheKeys = await caches.keys();
    await Promise.all(
      cacheKeys
        .filter((key) => key.startsWith(cachePrefix))
        .map((key) => caches.delete(key).catch(() => false)),
    );
  }

  return true;
}