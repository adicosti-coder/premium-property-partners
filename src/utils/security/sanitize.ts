/**
 * Content Sanitization Utilities
 * Comprehensive DOMPurify wrapper for user-generated content
 */

import DOMPurify from "dompurify";

/**
 * Sanitization presets for different content types
 */
export const SANITIZE_PRESETS = {
  // Strict: Only plain text, no HTML
  PLAIN_TEXT: {
    ALLOWED_TAGS: [] as string[],
    ALLOWED_ATTR: [] as string[],
  },
  
  // Basic: Minimal formatting
  BASIC: {
    ALLOWED_TAGS: ["b", "i", "em", "strong", "br", "p"] as string[],
    ALLOWED_ATTR: [] as string[],
  },
  
  // Rich text: Blog content, articles
  RICH_TEXT: {
    ALLOWED_TAGS: [
      "p", "br", "strong", "b", "em", "i", "u", "s",
      "a", "ul", "ol", "li",
      "h1", "h2", "h3", "h4", "h5", "h6",
      "blockquote", "pre", "code",
      "table", "thead", "tbody", "tr", "th", "td",
      "img", "figure", "figcaption",
      "span", "div", "hr",
    ] as string[],
    ALLOWED_ATTR: [
      "href", "target", "rel", "src", "alt", "title",
      "class", "id", "width", "height", "style",
    ] as string[],
    ALLOW_DATA_ATTR: false,
  },
  
  // Comments: User comments on articles
  COMMENTS: {
    ALLOWED_TAGS: ["b", "i", "em", "strong", "a", "br", "p", "code"] as string[],
    ALLOWED_ATTR: ["href", "target", "rel"] as string[],
    ALLOW_DATA_ATTR: false,
  },
};

/**
 * Sanitize HTML content with a preset configuration
 */
export const sanitizeHtml = (
  dirty: string,
  preset: keyof typeof SANITIZE_PRESETS = "RICH_TEXT"
): string => {
  if (!dirty) return "";
  
  const config = { ...SANITIZE_PRESETS[preset] };
  
  // Add security hooks
  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    // Ensure external links open in new tab with proper security
    if (node.tagName === "A") {
      const href = node.getAttribute("href");
      if (href && (href.startsWith("http://") || href.startsWith("https://"))) {
        node.setAttribute("target", "_blank");
        node.setAttribute("rel", "noopener noreferrer");
      }
    }
    
    // Remove javascript: URLs
    if (node.hasAttribute("href")) {
      const href = node.getAttribute("href")?.toLowerCase();
      if (href?.startsWith("javascript:")) {
        node.removeAttribute("href");
      }
    }
    
    // Remove on* event handlers from any element
    const attrs = Array.from(node.attributes || []);
    for (const attr of attrs) {
      if (attr.name.toLowerCase().startsWith("on")) {
        node.removeAttribute(attr.name);
      }
    }
  });

  const clean = DOMPurify.sanitize(dirty, config);
  
  // Remove hooks after use
  DOMPurify.removeHook("afterSanitizeAttributes");
  
  return clean;
};

/**
 * Sanitize plain text - escapes all HTML
 */
export const sanitizeText = (dirty: string): string => {
  if (!dirty) return "";
  return DOMPurify.sanitize(dirty, SANITIZE_PRESETS.PLAIN_TEXT);
};

/**
 * Sanitize URL to prevent XSS
 */
export const sanitizeUrl = (url: string): string => {
  if (!url) return "";
  
  const trimmed = url.trim().toLowerCase();
  
  // Block dangerous protocols
  const blockedProtocols = [
    "javascript:",
    "data:",
    "vbscript:",
    "file:",
  ];
  
  for (const protocol of blockedProtocols) {
    if (trimmed.startsWith(protocol)) {
      return "";
    }
  }
  
  // Allow relative URLs, http, https, mailto, tel
  const allowedProtocols = ["http://", "https://", "mailto:", "tel:", "/", "#"];
  const hasAllowedProtocol = allowedProtocols.some((p) => trimmed.startsWith(p));
  
  if (!hasAllowedProtocol && trimmed.includes(":")) {
    return "";
  }
  
  return url.trim();
};

/**
 * Escape HTML entities for safe display in text contexts
 */
export const escapeHtml = (str: string): string => {
  if (!str) return "";
  
  const htmlEntities: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
    "/": "&#x2F;",
    "`": "&#x60;",
    "=": "&#x3D;",
  };
  
  return str.replace(/[&<>"'`=/]/g, (char) => htmlEntities[char] || char);
};

/**
 * Sanitize JSON data to prevent prototype pollution
 */
export const sanitizeJson = <T>(data: unknown): T | null => {
  if (data === null || data === undefined) return null;
  
  try {
    // Parse and stringify to remove any dangerous properties
    const jsonString = JSON.stringify(data);
    const parsed = JSON.parse(jsonString);
    
    // Remove __proto__ and constructor properties
    const sanitize = (obj: unknown): unknown => {
      if (typeof obj !== "object" || obj === null) return obj;
      
      if (Array.isArray(obj)) {
        return obj.map((item) => sanitize(item));
      }
      
      const result: Record<string, unknown> = {};
      
      for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
        if (key === "__proto__" || key === "constructor" || key === "prototype") {
          continue;
        }
        result[key] = typeof value === "object" ? sanitize(value) : value;
      }
      
      return result;
    };
    
    return sanitize(parsed) as T;
  } catch {
    return null;
  }
};
