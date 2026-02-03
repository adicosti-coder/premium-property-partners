import { useState, useEffect, useCallback } from "react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface PWAStatus {
  isInstalled: boolean;
  isInstallable: boolean;
  isOnline: boolean;
  isStandalone: boolean;
}

export function usePWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [status, setStatus] = useState<PWAStatus>({
    isInstalled: false,
    isInstallable: false,
    isOnline: navigator.onLine,
    isStandalone: window.matchMedia("(display-mode: standalone)").matches,
  });

  useEffect(() => {
    // Check if already installed
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches ||
                         (window.navigator as any).standalone === true;
    
    setStatus(prev => ({ ...prev, isStandalone, isInstalled: isStandalone }));

    // Listen for install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setStatus(prev => ({ ...prev, isInstallable: true }));
    };

    // Listen for app installed
    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setStatus(prev => ({ 
        ...prev, 
        isInstalled: true, 
        isInstallable: false 
      }));
    };

    // Listen for online/offline
    const handleOnline = () => setStatus(prev => ({ ...prev, isOnline: true }));
    const handleOffline = () => setStatus(prev => ({ ...prev, isOnline: false }));

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleAppInstalled);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return false;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      setDeferredPrompt(null);
      setStatus(prev => ({ ...prev, isInstallable: false }));
      
      return outcome === "accepted";
    } catch {
      return false;
    }
  }, [deferredPrompt]);

  return {
    ...status,
    promptInstall,
    canPrompt: !!deferredPrompt,
  };
}

// Register service worker
export async function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    try {
      const registration = await navigator.serviceWorker.register("/pwa-sw.js", {
        scope: "/",
      });

      // Ensure we pick up updates ASAP (especially important on custom domains + aggressive caching)
      try {
        await registration.update();
      } catch {
        // ignore update errors
      }

      // Auto-reload when a new SW takes control
      let hasRefreshed = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (hasRefreshed) return;
        hasRefreshed = true;
        window.location.reload();
      });

      // Re-check for updates when the tab becomes active
      window.addEventListener("focus", () => {
        registration.update().catch(() => null);
      });
      
      // Check for updates
      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              // New content available -> activate immediately
              newWorker.postMessage({ type: "SKIP_WAITING" });
            }
          });
        }
      });
      
      return registration;
    } catch (error) {
      console.error("[PWA] Service worker registration failed:", error);
      return null;
    }
  }
  return null;
}
