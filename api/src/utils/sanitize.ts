/**
 * Input sanitization utilities for user-generated content.
 * Strips HTML tags and normalizes whitespace to prevent stored XSS.
 */

const HTML_TAG_REGEX = /<[^>]*>/g
const MULTIPLE_SPACES_REGEX = /\s+/g
const DANGEROUS_SCHEMES = /^\s*(javascript|data|vbscript)\s*:/i

/**
 * Strip HTML tags from a string. Strips ALL tags (not just dangerous ones)
 * because user-facing fields should never contain HTML.
 */
export function stripHtml(input: string): string {
  return input.replace(HTML_TAG_REGEX, '').trim()
}

/**
 * Sanitize a free-text field: strip HTML, normalize whitespace, enforce max length.
 */
export function sanitizeText(input: string, maxLength = 500): string {
  return stripHtml(input).replace(MULTIPLE_SPACES_REGEX, ' ').slice(0, maxLength)
}

/**
 * Validate that a URL uses only safe schemes (http/https).
 * Blocks javascript:, data:, vbscript: XSS vectors.
 */
export function isSafeUrl(url: string): boolean {
  if (!url || !url.trim()) return true // empty is ok
  const trimmed = url.trim()
  // Relative URLs are safe
  if (trimmed.startsWith('/') || trimmed.startsWith('#')) return true
  // Check for dangerous schemes
  if (DANGEROUS_SCHEMES.test(trimmed)) return false
  // Must start with http:// or https://
  return /^https?:\/\//i.test(trimmed)
}

/**
 * Sanitize an email string (basic normalization, no HTML).
 */
export function sanitizeEmail(input: string): string {
  return input.trim().toLowerCase()
}
