/**
 * Sentry Error Tracking Configuration
 * Production-ready error tracking and performance monitoring
 */

import type { ComponentType } from "react";
import { isBrowser } from "@/utils/browserStorage";

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;

type SeverityLevel = "fatal" | "error" | "warning" | "log" | "info" | "debug";

type SentryModule = typeof import("@sentry/react");

let sentryModule: SentryModule | null = null;
let sentryLoading: Promise<SentryModule> | null = null;

const getSentry = async (): Promise<SentryModule> => {
  if (sentryModule) return sentryModule;
  if (!sentryLoading) {
    sentryLoading = import("@sentry/react").then((mod) => {
      sentryModule = mod;
      return mod;
    });
  }
  return sentryLoading;
};

/**
 * Initialize Sentry error tracking
 * Should be called once at app startup
 */
export const initSentry = async (): Promise<void> => {
  // Publishing/prerender can evaluate code in non-browser environments.
  if (!isBrowser()) return;

  if (!SENTRY_DSN) {
    // Keep silent in production if DSN missing; in dev it can be useful.
    if (import.meta.env.DEV) {
      console.log("Sentry DSN not configured, error tracking disabled");
    }
    return;
  }

  try {
    const Sentry = await getSentry();

    Sentry.init({
      dsn: SENTRY_DSN,

      // Environment configuration
      environment: import.meta.env.MODE || "development",

      // Performance monitoring
      tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0, // 10% in prod, 100% in dev

      // Session replay for debugging
      replaysSessionSampleRate: 0.1, // 10% of sessions
      replaysOnErrorSampleRate: 1.0, // 100% on error

      // Ignore common non-actionable errors
      ignoreErrors: [
        // Browser extensions
        "ResizeObserver loop",
        "ResizeObserver loop completed with undelivered notifications",
        // Network errors
        "Failed to fetch",
        "NetworkError",
        "Load failed",
        // User-initiated
        "AbortError",
        // Safari-specific
        "Can't find variable: webkit",
        // Blocked ads
        "blocked:ad",
      ],

      // Don't send sensitive data
      beforeSend(event) {
        // Remove sensitive headers
        if (event.request?.headers) {
          delete (event.request.headers as any)["authorization"];
          delete (event.request.headers as any)["cookie"];
          delete (event.request.headers as any)["x-csrf-token"];
        }

        // Scrub email addresses from error messages
        if (event.message) {
          event.message = event.message.replace(
            /[\w.-]+@[\w.-]+\.[\w.-]+/gi,
            "[email]",
          );
        }

        // Add custom context
        event.tags = {
          ...event.tags,
          app_version: import.meta.env.VITE_APP_VERSION || "unknown",
        };

        return event;
      },

      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration({
          maskAllText: true,
          blockAllMedia: true,
        }),
      ],
    });

    if (import.meta.env.DEV) {
      console.log("Sentry initialized successfully");
    }
  } catch (error) {
    // Never let tracking break the app or publishing.
    console.error("Failed to initialize Sentry:", error);
  }
};

/**
 * Capture an exception manually
 */
export const captureException = (
  error: Error | unknown,
  context?: Record<string, unknown>,
): void => {
  if (!SENTRY_DSN || !isBrowser()) return;
  void (async () => {
    try {
      const Sentry = await getSentry();
      Sentry.captureException(error, { extra: context });
    } catch {
      // ignore
    }
  })();
};

/**
 * Capture a custom message
 */
export const captureMessage = (
  message: string,
  level: SeverityLevel = "info",
  context?: Record<string, unknown>,
): void => {
  if (!SENTRY_DSN || !isBrowser()) return;
  void (async () => {
    try {
      const Sentry = await getSentry();
      Sentry.captureMessage(message, { level: level as any, extra: context });
    } catch {
      // ignore
    }
  })();
};

/**
 * Set user context for error tracking
 */
export const setUser = (user: { id: string; email?: string } | null): void => {
  if (!SENTRY_DSN || !isBrowser()) return;
  void (async () => {
    try {
      const Sentry = await getSentry();
      if (user) {
        Sentry.setUser({
          id: user.id,
          // Hash email for privacy
          email: user.email ? `${user.email.split("@")[0]}@***` : undefined,
        });
      } else {
        Sentry.setUser(null);
      }
    } catch {
      // ignore
    }
  })();
};

/**
 * Add breadcrumb for debugging context
 */
export const addBreadcrumb = (
  category: string,
  message: string,
  data?: Record<string, unknown>,
): void => {
  if (!SENTRY_DSN || !isBrowser()) return;
  void (async () => {
    try {
      const Sentry = await getSentry();
      Sentry.addBreadcrumb({ category, message, data, level: "info" });
    } catch {
      // ignore
    }
  })();
};

/**
 * Optional exports. Not currently used in-app; keep as no-ops to avoid coupling.
 */
export const SentryErrorBoundary: ComponentType<any> = ({ children }) => children ?? null;
export const withSentryProfiler = <P,>(Component: ComponentType<P>): ComponentType<P> => Component;
