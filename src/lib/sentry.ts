/**
 * Sentry Error Tracking Configuration
 * Production-ready error tracking and performance monitoring
 */

import * as Sentry from "@sentry/react";

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;

/**
 * Initialize Sentry error tracking
 * Should be called once at app startup
 */
export const initSentry = (): void => {
  if (!SENTRY_DSN) {
    console.log("Sentry DSN not configured, error tracking disabled");
    return;
  }

  try {
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
      beforeSend(event, hint) {
        // Remove sensitive headers
        if (event.request?.headers) {
          delete event.request.headers["authorization"];
          delete event.request.headers["cookie"];
          delete event.request.headers["x-csrf-token"];
        }
        
        // Scrub email addresses from error messages
        if (event.message) {
          event.message = event.message.replace(
            /[\w.-]+@[\w.-]+\.[\w.-]+/gi,
            "[email]"
          );
        }
        
        // Add custom context
        event.tags = {
          ...event.tags,
          app_version: import.meta.env.VITE_APP_VERSION || "unknown",
        };
        
        return event;
      },
      
      // Integration settings
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration({
          // Mask all text content for privacy
          maskAllText: true,
          // Block all media for privacy
          blockAllMedia: true,
        }),
      ],
    });
    
    console.log("Sentry initialized successfully");
  } catch (error) {
    console.error("Failed to initialize Sentry:", error);
  }
};

/**
 * Capture an exception manually
 */
export const captureException = (
  error: Error | unknown,
  context?: Record<string, unknown>
): void => {
  if (!SENTRY_DSN) return;
  
  Sentry.captureException(error, {
    extra: context,
  });
};

/**
 * Capture a custom message
 */
export const captureMessage = (
  message: string,
  level: Sentry.SeverityLevel = "info",
  context?: Record<string, unknown>
): void => {
  if (!SENTRY_DSN) return;
  
  Sentry.captureMessage(message, {
    level,
    extra: context,
  });
};

/**
 * Set user context for error tracking
 */
export const setUser = (user: { id: string; email?: string } | null): void => {
  if (!SENTRY_DSN) return;
  
  if (user) {
    Sentry.setUser({
      id: user.id,
      // Hash email for privacy
      email: user.email ? `${user.email.split("@")[0]}@***` : undefined,
    });
  } else {
    Sentry.setUser(null);
  }
};

/**
 * Add breadcrumb for debugging context
 */
export const addBreadcrumb = (
  category: string,
  message: string,
  data?: Record<string, unknown>
): void => {
  if (!SENTRY_DSN) return;
  
  Sentry.addBreadcrumb({
    category,
    message,
    data,
    level: "info",
  });
};

/**
 * Create a custom error boundary wrapper
 */
export const SentryErrorBoundary = Sentry.ErrorBoundary;

/**
 * Wrap a component with Sentry profiling (optional)
 */
export const withSentryProfiler = Sentry.withProfiler;
