/**
 * Security Headers for Edge Functions
 * Provides consistent security headers across all API responses
 */

/**
 * Standard CORS headers for edge functions
 */
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-csrf-token, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

/**
 * Security headers to add to all responses
 */
export const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
};

/**
 * Combine CORS and security headers
 */
export const allHeaders = {
  ...corsHeaders,
  ...securityHeaders,
  'Content-Type': 'application/json',
};

/**
 * Create a secure JSON response
 */
export const secureJsonResponse = (
  data: unknown,
  status: number = 200,
  additionalHeaders: Record<string, string> = {}
): Response => {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...allHeaders,
      ...additionalHeaders,
    },
  });
};

/**
 * Create an error response with security headers
 */
export const secureErrorResponse = (
  message: string,
  status: number = 400,
  additionalHeaders: Record<string, string> = {}
): Response => {
  return new Response(
    JSON.stringify({ error: message }),
    {
      status,
      headers: {
        ...allHeaders,
        ...additionalHeaders,
      },
    }
  );
};

/**
 * Handle CORS preflight requests
 */
export const handleCorsPreflightRequest = (): Response => {
  return new Response('ok', { headers: corsHeaders });
};

/**
 * Validate Content-Type header for POST/PUT requests
 */
export const validateContentType = (req: Request): boolean => {
  if (req.method === 'GET' || req.method === 'DELETE' || req.method === 'OPTIONS') {
    return true;
  }
  
  const contentType = req.headers.get('content-type');
  if (!contentType) return false;
  
  return contentType.includes('application/json') || 
         contentType.includes('multipart/form-data') ||
         contentType.includes('application/x-www-form-urlencoded');
};
