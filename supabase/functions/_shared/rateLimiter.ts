/**
 * Shared Rate Limiter for Edge Functions
 * Implements sliding window rate limiting with IP-based tracking
 */

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory store for edge function rate limiting
// Note: This resets on function cold starts, but provides basic protection
const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Check if a request should be rate limited
 */
export const checkRateLimit = (
  identifier: string,
  config: RateLimitConfig = { maxRequests: 100, windowMs: 60000 }
): { allowed: boolean; remaining: number; resetAt: number } => {
  const now = Date.now();
  const key = identifier;
  const entry = rateLimitStore.get(key);

  if (!entry || entry.resetAt < now) {
    // Create new entry
    const newEntry: RateLimitEntry = {
      count: 1,
      resetAt: now + config.windowMs,
    };
    rateLimitStore.set(key, newEntry);
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: newEntry.resetAt,
    };
  }

  if (entry.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
    };
  }

  entry.count++;
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
};

/**
 * Get client IP from request headers
 */
export const getClientIp = (req: Request): string => {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  
  const realIp = req.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  const cfConnectingIp = req.headers.get("cf-connecting-ip");
  if (cfConnectingIp) {
    return cfConnectingIp.trim();
  }

  return "unknown";
};

/**
 * Create rate limit response headers
 */
export const createRateLimitHeaders = (
  remaining: number,
  resetAt: number,
  limit: number
): Record<string, string> => {
  return {
    "X-RateLimit-Limit": String(limit),
    "X-RateLimit-Remaining": String(Math.max(0, remaining)),
    "X-RateLimit-Reset": String(Math.ceil(resetAt / 1000)),
  };
};

/**
 * Generate rate limit exceeded response
 */
export const rateLimitExceededResponse = (
  resetAt: number,
  corsHeaders: Record<string, string>
): Response => {
  const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);
  return new Response(
    JSON.stringify({
      error: "Too many requests",
      message: "Rate limit exceeded. Please try again later.",
      retryAfter,
    }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Retry-After": String(retryAfter),
      },
    }
  );
};

/**
 * Apply rate limiting to a request
 * Returns null if allowed, Response if rate limited
 */
export const applyRateLimit = (
  req: Request,
  corsHeaders: Record<string, string>,
  config: RateLimitConfig = { maxRequests: 100, windowMs: 60000 }
): Response | null => {
  const ip = getClientIp(req);
  const { allowed, remaining, resetAt } = checkRateLimit(ip, config);

  if (!allowed) {
    return rateLimitExceededResponse(resetAt, corsHeaders);
  }

  return null;
};
